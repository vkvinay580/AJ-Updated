import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated, requestIp } from "@/lib/api";
import { execute, one, rows, transaction } from "@/lib/db";
import { getBillInvoiceIssuer } from "@/lib/company-invoice";

const lastFour = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(-4);
  return digits.length === 4 ? digits : "";
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  const bill = await one<RowDataPacket>(`SELECT b.id, b.bill_number AS billNumber, b.transaction_type AS transactionType,
    DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS billDate, b.subtotal_paise AS subtotalPaise, b.tax_paise AS taxPaise,
    b.cgst_paise AS cgstPaise, b.sgst_paise AS sgstPaise, b.cgst_rate_bps AS cgstRateBps, b.sgst_rate_bps AS sgstRateBps,
    b.adjustment_paise AS adjustmentPaise, b.total_paise AS totalPaise, b.release_place AS releasePlace,
    b.release_amount_paise AS releaseAmountPaise, b.payment_method AS paymentMethod, b.origin_branch_id AS originBranchId,
    b.notes, b.ornament_image_path AS ornamentImagePaths, b.signature_image_path IS NOT NULL AS hasSignatureImage, b.created_at AS createdAt, c.id AS customerId, c.name AS customerName, c.phone AS customerPhone,
    c.email AS customerEmail, c.address AS customerAddress, c.city AS customerCity, c.state AS customerState,
    c.gstin AS customerGstin, c.state_code AS customerStateCode, c.place_of_supply AS placeOfSupply,
    c.postal_code AS customerPostalCode, c.customer_image_path IS NOT NULL AS hasCustomerImage,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='aadhaar' ORDER BY id DESC LIMIT 1) AS aadhaarLast4,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='pan' ORDER BY id DESC LIMIT 1) AS panLast4
    FROM bills b JOIN customers c ON c.id = b.customer_id AND c.company_id = b.company_id
    WHERE b.id = ? AND b.company_id = ?`, [id, session.companyId]);
  if (!bill) return apiError("Bill not found.", 404);
  bill.aadhaarLast4 = lastFour(bill.aadhaarLast4);
  bill.panLast4 = lastFour(bill.panLast4);
  let issuer;
  try { issuer = await getBillInvoiceIssuer(session.companySlug, session.companyName, bill.originBranchId ? String(bill.originBranchId) : null); }
  catch (caught) { return apiError(caught instanceof Error ? caught.message : "Unable to load the invoice address.", 502); }
  if (bill.transactionType === "purchase") {
    bill.taxPaise = 0; bill.cgstPaise = 0; bill.sgstPaise = 0; bill.cgstRateBps = 0; bill.sgstRateBps = 0;
    bill.totalPaise = Number(bill.subtotalPaise) + Number(bill.adjustmentPaise);
  }
  bill.payablePaise = Math.max(0, Number(bill.totalPaise) - Number(bill.releaseAmountPaise || 0));
  let ornamentPaths:string[]=[];try{const parsed=JSON.parse(String(bill.ornamentImagePaths||""));ornamentPaths=Array.isArray(parsed)?parsed:[]}catch{if(bill.ornamentImagePaths)ornamentPaths=[String(bill.ornamentImagePaths)]}bill.ornamentImageCount=ornamentPaths.length;bill.hasOrnamentImage=ornamentPaths.length>0;delete bill.ornamentImagePaths;
  const items = await rows<RowDataPacket>(`SELECT description, item_description AS itemDescription, hsn_code AS hsnCode, purity, gross_weight_mg AS grossWeightMg, stone_weight_mg AS stoneWeightMg, weight_mg AS weightMg,
    rate_paise_per_gram AS ratePaisePerGram, making_paise AS makingPaise, amount_paise AS amountPaise
    FROM bill_items WHERE bill_id = ? ORDER BY id`, [id]);
  const payments = await rows<RowDataPacket>(`SELECT payment_method AS method,amount_paise AS amountPaise,reference_text AS referenceText
    FROM bill_payments WHERE bill_id=? ORDER BY id`, [id]);
  if (!payments.length) payments.push({ method: bill.paymentMethod, amountPaise: bill.payablePaise, referenceText: null } as RowDataPacket);
  items.forEach((item) => { if ((!item.hsnCode || item.hsnCode === "710319") && /gold ornament/i.test(String(item.description))) item.hsnCode = "711319"; });
  if (Number(bill.taxPaise) && !Number(bill.cgstPaise) && !Number(bill.sgstPaise)) {
    bill.cgstPaise = Math.floor(Number(bill.taxPaise) / 2);
    bill.sgstPaise = Number(bill.taxPaise) - Number(bill.cgstPaise);
    const totalRateBps = Number(bill.subtotalPaise) ? Math.round(Number(bill.taxPaise) * 10000 / Number(bill.subtotalPaise)) : 0;
    bill.cgstRateBps = Math.floor(totalRateBps / 2); bill.sgstRateBps = totalRateBps - Number(bill.cgstRateBps);
  }
  return NextResponse.json({ bill, items, payments, company: { ...issuer, shortName: session.companyShortName, logo: session.companyLogo } });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid bill.");
  try {
    const billNumber = await transaction(async (connection) => {
      const bill = await one<RowDataPacket & { billNumber: string }>("SELECT bill_number AS billNumber FROM bills WHERE id = ? AND company_id = ? FOR UPDATE", [id, session.companyId], connection);
      if (!bill) throw new Error("BILL_NOT_FOUND");
      const linkedTransaction = await one<RowDataPacket & { id: number; branchId: string }>(
        "SELECT id,branch_id AS branchId FROM branch_transactions WHERE bill_id = ? LIMIT 1 FOR UPDATE",
        [id],
        connection,
      );
      if (linkedTransaction) {
        const dispatchedItem = await one<RowDataPacket>(
          "SELECT id FROM branch_gold_transfer_items WHERE transaction_id = ? LIMIT 1 FOR UPDATE",
          [Number(linkedTransaction.id)],
          connection,
        );
        if (dispatchedItem) throw new Error("BRANCH_BILL_DISPATCHED");

        // Serialize balance changes with the approval and branch-payment paths. Keep
        // the original ledger history and post an equal reversal for the admin delete.
        await rows<RowDataPacket>("SELECT id FROM branch_fund_ledger WHERE branch_id = ? FOR UPDATE", [String(linkedTransaction.branchId)], connection);
        await rows<RowDataPacket>("SELECT id FROM branch_stock_ledger WHERE branch_id = ? FOR UPDATE", [String(linkedTransaction.branchId)], connection);
        const fundEffect = await one<RowDataPacket>(`SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount_paise ELSE -amount_paise END),0) AS balanceEffect
          FROM branch_fund_ledger WHERE reference_id = ? AND entry_type IN
          ('pledge_reserved','pledge_cancelled','pledge_release_adjustment','purchase_submitted','purchase_billed','purchase_rejected','pledge_admin_rejected')`,
          [Number(linkedTransaction.id)], connection);
        const stockEffect = await one<RowDataPacket>(`SELECT COALESCE(SUM(CASE WHEN direction='in' THEN weight_mg ELSE -weight_mg END),0) AS balanceEffect
          FROM branch_stock_ledger WHERE reference_id = ? AND entry_type IN ('purchase_billed','sale_billed')`,
          [Number(linkedTransaction.id)], connection);
        const fundBalanceEffect = Number(fundEffect?.balanceEffect || 0);
        if (fundBalanceEffect !== 0) await execute(`INSERT INTO branch_fund_ledger
          (branch_id,direction,amount_paise,entry_type,reference_id,description,created_by_admin_id) VALUES (?,?,?,?,?,?,?)`,
          [String(linkedTransaction.branchId), fundBalanceEffect > 0 ? "debit" : "credit", Math.abs(fundBalanceEffect), "bill_deleted_reversal",
            Number(linkedTransaction.id), `Admin deletion reversal for bill ${bill.billNumber}`, session.adminId], connection);
        const stockBalanceEffect = Number(stockEffect?.balanceEffect || 0);
        if (stockBalanceEffect !== 0) await execute(`INSERT INTO branch_stock_ledger
          (branch_id,direction,weight_mg,entry_type,reference_id,description,created_by_admin_id) VALUES (?,?,?,?,?,?,?)`,
          [String(linkedTransaction.branchId), stockBalanceEffect > 0 ? "out" : "in", Math.abs(stockBalanceEffect), "bill_deleted_reversal",
            Number(linkedTransaction.id), `Admin deletion reversal for bill ${bill.billNumber}`, session.adminId], connection);
        await execute("DELETE FROM branch_transactions WHERE id = ? AND bill_id = ?", [Number(linkedTransaction.id), id], connection);
      }
      await execute("DELETE FROM bills WHERE id = ? AND company_id = ?", [id, session.companyId], connection);
      await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'bill_deleted', 'bill', ?, ?)", [session.adminId, session.companyId, id, requestIp(request)], connection);
      return String(bill.billNumber);
    });
    return NextResponse.json({ ok: true, billNumber });
  } catch (caught) {
    if (caught instanceof Error && caught.message === "BILL_NOT_FOUND") return apiError("Bill not found.", 404);
    if (caught instanceof Error && caught.message === "BRANCH_BILL_DISPATCHED") return apiError("This purchase invoice cannot be deleted because its gold was already dispatched to Head Office.", 409);
    throw caught;
  }
}
