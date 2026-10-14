import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated, requestIp } from "@/lib/api";
import { execute, one, rows, transaction } from "@/lib/db";
import { getCompanyInvoiceProfile, getCompanySeal } from "@/lib/company-invoice";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  const bill = await one<RowDataPacket>(`SELECT b.id, b.bill_number AS billNumber, b.transaction_type AS transactionType,
    DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS billDate, b.subtotal_paise AS subtotalPaise, b.tax_paise AS taxPaise,
    b.cgst_paise AS cgstPaise, b.sgst_paise AS sgstPaise, b.cgst_rate_bps AS cgstRateBps, b.sgst_rate_bps AS sgstRateBps,
    b.adjustment_paise AS adjustmentPaise, b.total_paise AS totalPaise, b.release_place AS releasePlace,
    b.release_amount_paise AS releaseAmountPaise, b.payment_method AS paymentMethod,
    b.notes, b.ornament_image_path AS ornamentImagePaths, b.signature_image_path IS NOT NULL AS hasSignatureImage, b.created_at AS createdAt, c.id AS customerId, c.name AS customerName, c.phone AS customerPhone,
    c.email AS customerEmail, c.address AS customerAddress, c.city AS customerCity, c.state AS customerState,
    c.gstin AS customerGstin, c.state_code AS customerStateCode, c.place_of_supply AS placeOfSupply,
    c.postal_code AS customerPostalCode, c.customer_image_path IS NOT NULL AS hasCustomerImage,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='aadhaar' LIMIT 1) AS aadhaarLast4,
    (SELECT number_last4 FROM kyc_records WHERE customer_id=c.id AND company_id=c.company_id AND document_type='pan' LIMIT 1) AS panLast4
    FROM bills b JOIN customers c ON c.id = b.customer_id AND c.company_id = b.company_id
    WHERE b.id = ? AND b.company_id = ?`, [id, session.companyId]);
  if (!bill) return apiError("Bill not found.", 404);
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
  return NextResponse.json({ bill, items, payments, company: { name: session.companyName, shortName: session.companyShortName, logo: session.companyLogo, seal: getCompanySeal(session.companySlug), ...getCompanyInvoiceProfile(session.companySlug) } });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid bill.");
  const bill = await one<RowDataPacket & { billNumber: string }>("SELECT bill_number AS billNumber FROM bills WHERE id = ? AND company_id = ?", [id, session.companyId]);
  if (!bill) return apiError("Bill not found.", 404);
  await transaction(async (connection) => {
    await execute("DELETE FROM bills WHERE id = ? AND company_id = ?", [id, session.companyId], connection);
    await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'bill_deleted', 'bill', ?, ?)", [session.adminId, session.companyId, id, requestIp(request)], connection);
  });
  return NextResponse.json({ ok: true, billNumber: bill.billNumber });
}
