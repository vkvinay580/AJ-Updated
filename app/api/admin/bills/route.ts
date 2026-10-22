import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanText, requestIp } from "@/lib/api";
import { addFundEntry, lockFundLedger } from "@/lib/branch-ledger";
import { businessAuthenticated } from "@/lib/business-actor";
import { encryptSensitive, execute, one, rows, transaction } from "@/lib/db";
import { goldPurityCode } from "@/lib/gold-rates";

type ItemInput = { metal?: unknown; description?: unknown; itemDescription?: unknown; hsnCode?: unknown; purity?: unknown; grossWeightGrams?: unknown; stoneWeightGrams?: unknown; netWeightGrams?: unknown; weightGrams?: unknown; ratePerGram?: unknown; making?: unknown };
type PaymentInput = { method?: unknown; amount?: unknown; accountNumber?: unknown; ifscCode?: unknown; upiId?: unknown; chequeNumber?: unknown; cardNumber?: unknown };
const toPaise = (value: unknown) => Math.round(Number(value) * 100);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const storageRoot = path.join(process.cwd(), "storage");

async function storeImage(file: File, companyId: number, kind: "ornaments" | "signatures") {
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Ornament image must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let ext = "";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ext = "jpg";
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ext = "png";
  else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") ext = "webp";
  if (!ext) throw new Error("Only JPG, PNG and WebP ornament images are accepted.");
  const root = path.join(storageRoot, kind), companyFolder = path.join(root, String(companyId));
  mkdirSync(companyFolder, { recursive: true });
  const relative = `${companyId}/${randomBytes(20).toString("hex")}.${ext}`;
  writeFileSync(path.join(root, relative), bytes, { flag: "wx" });
  return relative.replace(/\\/g, "/");
}

export async function GET(request: NextRequest) {
  const { error, actor: session } = await businessAuthenticated(request);
  if (error || !session) return error;
  const query = cleanText(request.nextUrl.searchParams.get("q"), 100);
  const like = `%${query}%`;
  const bills = await rows<RowDataPacket>(`SELECT b.id, b.bill_number AS billNumber, b.transaction_type AS transactionType,
    DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS billDate, IF(b.transaction_type = 'purchase', b.subtotal_paise + b.adjustment_paise - COALESCE(b.release_amount_paise,0), b.total_paise) AS totalPaise, b.payment_method AS paymentMethod,
    c.id AS customerId, c.name AS customerName, c.phone AS customerPhone
    FROM bills b JOIN customers c ON c.id = b.customer_id AND c.company_id = b.company_id
    WHERE b.company_id = ? AND (? = '' OR b.bill_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)
    ORDER BY b.id DESC LIMIT 150`, [session.companyId, query, like, like, like]);
  return NextResponse.json({ bills });
}

export async function POST(request: NextRequest) {
  const { error, actor: session } = await businessAuthenticated(request);
  if (error || !session) return error;
  const form = await request.formData();
  const customerId = Number(form.get("customerId"));
  const pledgeValue = form.get("pledgeId");
  const pledgeId = session.branchId && pledgeValue !== null ? Number(pledgeValue) : 0;
  const transactionType = session.branchId ? "purchase" : form.get("transactionType") === "purchase" ? "purchase" : "sale";
  const businessMode = pledgeId > 0 ? "pledged" : "walkin";
  const notes = cleanText(form.get("notes"), 500);
  const cgstRate = transactionType === "purchase" ? 0 : Number(form.get("cgstRate") || 0);
  const sgstRate = transactionType === "purchase" ? 0 : Number(form.get("sgstRate") || 0);
  const adjustmentPaise = toPaise(form.get("adjustment") || 0);
  let parsedItems: unknown = [];
  try { parsedItems = JSON.parse(String(form.get("items") || "[]")); } catch { return apiError("Invalid bill items."); }
  const items = Array.isArray(parsedItems) ? parsedItems as ItemInput[] : [];
  let parsedPayments: unknown = [];
  try { parsedPayments = JSON.parse(String(form.get("payments") || "[]")); } catch { return apiError("Invalid payment allocation."); }
  const suppliedPayments = Array.isArray(parsedPayments) ? parsedPayments as PaymentInput[] : [];
  const paymentInputs: PaymentInput[] = suppliedPayments;
  if (!paymentInputs.length || paymentInputs.length > 10) return apiError("Add between one and ten payment channels.");
  const normalizedPayments = paymentInputs.map((payment) => {
    const method = cleanText(payment.method, 40);
    const amountPaise = toPaise(payment.amount);
    const paymentAccount = cleanText(payment.accountNumber, 34).replace(/\s/g, "");
    const paymentIfsc = cleanText(payment.ifscCode, 11).toUpperCase();
    const paymentUpi = cleanText(payment.upiId, 100);
    const paymentCheque = cleanText(payment.chequeNumber, 20);
    const paymentCard = cleanText(payment.cardNumber, 19).replace(/\D/g, "");
    let referenceText: string | null = null;
    if (method === "bank_transfer") referenceText = `A/C ••••${paymentAccount.slice(-4)} · ${paymentIfsc}`;
    if (method === "upi") referenceText = paymentUpi;
    if (method === "cheque") referenceText = `Cheque ${paymentCheque}`;
    if (method === "card") referenceText = `Card ••••${paymentCard.slice(-4)}`;
    return { method, amountPaise, accountNumber: paymentAccount, ifscCode: paymentIfsc, upiId: paymentUpi, chequeNumber: paymentCheque, cardNumber: paymentCard, referenceText };
  });
  if (!Number.isInteger(customerId)) return apiError("Select a customer.");
  if (session.branchId && pledgeValue !== null && (!Number.isInteger(pledgeId) || pledgeId <= 0)) return apiError("Invalid pledge.");
  const customer = await one<RowDataPacket>("SELECT id,name,phone,address FROM customers WHERE id = ? AND company_id = ?", [customerId, session.companyId]);
  if (!customer) return apiError("Customer not found in this company.", 404);
  if (!items.length || items.length > 50) return apiError("Add at least one valid bill item.");
  if (normalizedPayments.some(payment => !["bank_transfer", "upi", "cash", "card", "cheque"].includes(payment.method) || !Number.isFinite(payment.amountPaise) || payment.amountPaise <= 0)) return apiError("Every payment channel needs a valid method and positive amount.");
  if (transactionType === "purchase" && normalizedPayments.some(payment => !["bank_transfer", "upi", "cash"].includes(payment.method))) return apiError("Purchase bills support only cash, UPI, or bank transfer payments.");
  if (normalizedPayments.some(payment => payment.method === "bank_transfer" && (!/^[A-Za-z0-9-]{4,34}$/.test(payment.accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payment.ifscCode)))) return apiError("Enter a valid account number and IFSC code for each bank payment.");
  if (normalizedPayments.some(payment => payment.method === "upi" && !/^[\w.+-]{2,}@[A-Za-z0-9.-]{2,}$/.test(payment.upiId))) return apiError("Enter a valid UPI ID for each UPI payment.");
  if (normalizedPayments.some(payment => payment.method === "cheque" && !/^[A-Za-z0-9/-]{1,20}$/.test(payment.chequeNumber))) return apiError("Enter a valid cheque number for each cheque payment.");
  if (normalizedPayments.some(payment => payment.method === "card" && !/^\d{12,19}$/.test(payment.cardNumber))) return apiError("Enter a valid card number for each card payment.");

  const normalized = items.map((item) => {
    const description = cleanText(item.description, 150);
    const grossWeightGrams = Number(item.grossWeightGrams ?? item.netWeightGrams ?? item.weightGrams);
    const stoneWeightGrams = Number(item.stoneWeightGrams || 0);
    const netWeightGrams = grossWeightGrams - stoneWeightGrams;
    const weightMg = Math.round(netWeightGrams * 1000), grossWeightMg = Math.round(grossWeightGrams * 1000), stoneWeightMg = Math.round(stoneWeightGrams * 1000);
    const metal = item.metal === "silver" || /silver/i.test(description) ? "silver" : "gold";
    const purity = cleanText(item.purity, 20);
    const purityCode = metal === "gold" ? goldPurityCode(purity) : null;
    const ratePaise = toPaise(item.ratePerGram);
    const makingPaise = toPaise(item.making || 0);
    const amountPaise = Math.round(netWeightGrams * ratePaise + makingPaise);
    return { metal, description, itemDescription: cleanText(item.itemDescription, 190), hsnCode: cleanText(item.hsnCode, 20), purity, purityCode, grossWeightMg, stoneWeightMg, weightMg, ratePaise, makingPaise, amountPaise };
  });
  if (normalized.some((item) => item.metal === "gold" && !item.purityCode)) return apiError("Choose 24K / 999, 22K / 916, or 18K / 750 for every gold item.");
  if (normalized.some((item) => !item.description || !/^\d{4,8}$/.test(item.hsnCode) || item.weightMg <= 0 || item.stoneWeightMg < 0 || item.grossWeightMg !== item.weightMg + item.stoneWeightMg || item.ratePaise <= 0 || !Number.isFinite(item.amountPaise))) return apiError("Check the description, HSN/SAC, gross weight, stone weight and rate for every item. Stone weight must be below gross weight.");
  if (![cgstRate, sgstRate].every((rate) => Number.isFinite(rate) && rate >= 0 && rate <= 50)) return apiError("Invalid CGST or SGST/UTGST rate.");
  const subtotalPaise = normalized.reduce((sum, item) => sum + item.amountPaise, 0);
  const cgstPaise = Math.round(subtotalPaise * cgstRate / 100);
  const sgstPaise = Math.round(subtotalPaise * sgstRate / 100);
  const taxPaise = cgstPaise + sgstPaise;
  const totalPaise = subtotalPaise + taxPaise + adjustmentPaise;
  if (totalPaise < 0 || totalPaise > 900000000000) return apiError("Invalid bill total.");
  if (session.branchId && !normalized.some((item) => item.metal === "gold")) return apiError("Branch purchase bills must include at least one gold item.");

  const ornamentImagePaths: string[] = []; let signatureImagePath: string | null = null;
  try {
    const ornamentImages = form.getAll("ornamentImage").filter((value):value is File=>value instanceof File&&value.size>0).slice(0,4);
    for(const ornamentImage of ornamentImages)ornamentImagePaths.push(await storeImage(ornamentImage, session.companyId, "ornaments"));
    const ornamentImagePath=ornamentImagePaths.length>1?JSON.stringify(ornamentImagePaths):ornamentImagePaths[0]||null;
    const signatureImage = form.get("signatureImage");
    if (signatureImage instanceof File && signatureImage.size) signatureImagePath = await storeImage(signatureImage, session.companyId, "signatures");
    const created = await transaction(async (connection) => {
      const releasedPledge = pledgeId > 0 && session.branchId ? await one<RowDataPacket>(`SELECT t.id,t.pledge_amount_paise AS pledgeAmountPaise,
        t.release_place AS releasePlace,t.release_amount_paise AS releaseAmountPaise,t.pledge_payment_method AS pledgePaymentMethod,bc.phone
        FROM branch_transactions t JOIN branch_customers bc ON bc.id=t.customer_id
        WHERE t.id=? AND t.branch_id=? AND t.business_mode='pledged' AND t.pledge_status='released' AND t.status='awaiting_pledge' AND t.bill_id IS NULL FOR UPDATE`, [pledgeId, session.branchId], connection) : null;
      if (pledgeId > 0 && (!releasedPledge || String(releasedPledge.phone) !== String(customer.phone))) throw new Error("PLEDGE_NOT_READY");
      const releasePlace = releasedPledge ? cleanText(releasedPledge.releasePlace, 190) : "";
      const releaseAmountPaise = releasedPledge ? Number(releasedPledge.releaseAmountPaise) : 0;
      if (releasedPledge && (!releasePlace || !Number.isFinite(releaseAmountPaise) || releaseAmountPaise <= 0)) throw new Error("PLEDGE_RELEASE_DETAILS");
      if (releasedPledge && releaseAmountPaise > totalPaise) throw new Error("RELEASE_EXCEEDS_PURCHASE");
      const payablePaise = totalPaise - releaseAmountPaise;
      const allocatedPaise = normalizedPayments.reduce((sum, payment) => sum + payment.amountPaise, 0);
      if (allocatedPaise !== payablePaise) throw new Error("PAYMENT_TOTAL_MISMATCH");
      const cashPaymentPaise = normalizedPayments.filter(payment => payment.method === "cash").reduce((sum, payment) => sum + payment.amountPaise, 0);
      const storedPaymentMethod = normalizedPayments.length > 1 ? "split" : normalizedPayments[0].method;
      const primaryPayment = normalizedPayments[0];
      const company = await one<RowDataPacket & { prefix: string }>("SELECT invoice_prefix AS prefix FROM companies WHERE id = ? FOR UPDATE", [session.companyId], connection);
      if (!company) throw new Error("Company configuration not found.");
      const now = new Date(), calendarYear = now.getUTCFullYear(), financialYear = now.getUTCMonth() >= 3 ? calendarYear : calendarYear - 1;
      await execute("INSERT IGNORE INTO invoice_sequences (company_id, invoice_year, last_number) VALUES (?, ?, 0)", [session.companyId, financialYear], connection);
      const sequence = await one<RowDataPacket & { lastNumber: number }>("SELECT last_number AS lastNumber FROM invoice_sequences WHERE company_id = ? AND invoice_year = ? FOR UPDATE", [session.companyId, financialYear], connection);
      const nextNumber = Number(sequence?.lastNumber || 0) + 1;
      await execute("UPDATE invoice_sequences SET last_number = ? WHERE company_id = ? AND invoice_year = ?", [nextNumber, session.companyId, financialYear], connection);
      const financialYearCode = `${String(financialYear).slice(-2)}${String(financialYear + 1).slice(-2)}`;
      const billNumber = `${company.prefix}/${financialYearCode}/${String(nextNumber).padStart(2, "0")}`;
      const billDate = new Date().toISOString().slice(0, 10);
      const result = await execute(`INSERT INTO bills
        (company_id, customer_id, bill_number, transaction_type, bill_date, subtotal_paise, tax_paise, cgst_paise, sgst_paise, cgst_rate_bps, sgst_rate_bps, adjustment_paise, total_paise, payment_method, account_number, ifsc_code, upi_id, cheque_number, card_number, ornament_image_path, signature_image_path, notes, release_place, release_amount_paise, origin_branch_id, created_by_employee_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.companyId, customerId, billNumber, transactionType, billDate, subtotalPaise, taxPaise, cgstPaise, sgstPaise, Math.round(cgstRate * 100), Math.round(sgstRate * 100), adjustmentPaise, totalPaise, storedPaymentMethod, normalizedPayments.length === 1 && primaryPayment.method === "bank_transfer" ? encryptSensitive(primaryPayment.accountNumber) : null, normalizedPayments.length === 1 && primaryPayment.method === "bank_transfer" ? primaryPayment.ifscCode : null, normalizedPayments.length === 1 && primaryPayment.method === "upi" ? primaryPayment.upiId : null, normalizedPayments.length === 1 && primaryPayment.method === "cheque" ? primaryPayment.chequeNumber : null, normalizedPayments.length === 1 && primaryPayment.method === "card" ? encryptSensitive(primaryPayment.cardNumber) : null, ornamentImagePath, signatureImagePath, notes || null, pledgeId > 0 ? releasePlace : null, pledgeId > 0 ? releaseAmountPaise : null, session.branchId, session.employeeId, session.adminId], connection);
      const billId = result.insertId;
      for (const payment of normalizedPayments) await execute(`INSERT INTO bill_payments
        (bill_id,payment_method,amount_paise,reference_text,account_number,ifsc_code,upi_id,payment_status) VALUES (?,?,?,?,?,?,?,?)`,
        [billId, payment.method, payment.amountPaise, payment.referenceText,
          payment.method === "bank_transfer" ? encryptSensitive(payment.accountNumber) : null,
          payment.method === "bank_transfer" ? payment.ifscCode : null,
          payment.method === "upi" ? payment.upiId : null,
          ["bank_transfer", "upi"].includes(payment.method) ? "pending" : "not_required"], connection);
      const itemSql = `INSERT INTO bill_items
        (bill_id, description, item_description, hsn_code, purity, metal, gross_weight_mg, stone_weight_mg, weight_mg, rate_paise_per_gram, making_paise, amount_paise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      for (const item of normalized) await execute(itemSql, [billId, item.description, item.itemDescription || null, item.hsnCode || null, item.purity || null, item.metal, item.grossWeightMg, item.stoneWeightMg, item.weightMg, item.ratePaise, item.makingPaise, item.amountPaise], connection);
      if (session.branchId && session.employeeId) {
        let branchCustomer = await one<RowDataPacket>("SELECT id FROM branch_customers WHERE branch_id=? AND phone=? FOR UPDATE", [session.branchId, customer.phone], connection);
        if (!branchCustomer) {
          const branchCustomerResult = await execute("INSERT INTO branch_customers (branch_id,name,phone,address,created_by_employee_id) VALUES (?,?,?,?,?)",
            [session.branchId, customer.name, customer.phone, customer.address || null, session.employeeId], connection);
          branchCustomer = { id: branchCustomerResult.insertId } as RowDataPacket;
        }
        const goldItems = normalized.filter((item) => item.metal === "gold");
        const goldWeightMg = goldItems.reduce((sum, item) => sum + item.weightMg, 0);
        const goldAmountPaise = goldItems.reduce((sum, item) => sum + item.amountPaise, 0);
        const capturedRate = goldWeightMg > 0 ? Math.round(goldAmountPaise * 1000 / goldWeightMg) : 0;
        let availableCashPaise = await lockFundLedger(session.branchId, connection);
        let transactionId: number;
        if (releasedPledge) {
          const reservedPaise = Number(releasedPledge.pledgeAmountPaise);
          const difference = releaseAmountPaise - reservedPaise;
          if (releasedPledge.pledgePaymentMethod === "cash" && difference > 0) {
            if (availableCashPaise < difference) throw new Error("INSUFFICIENT_PLEDGE_FUNDS");
            await addFundEntry(connection, { branchId: session.branchId, direction: "debit", amountPaise: difference, entryType: "pledge_release_adjustment", referenceId: pledgeId, description: "Additional funds paid for pledge release", employeeId: session.employeeId });
            availableCashPaise -= difference;
          } else if (releasedPledge.pledgePaymentMethod === "cash" && difference < 0) {
            await addFundEntry(connection, { branchId: session.branchId, direction: "credit", amountPaise: Math.abs(difference), entryType: "pledge_release_adjustment", referenceId: pledgeId, description: "Unused pledge reservation restored", employeeId: session.employeeId });
            availableCashPaise += Math.abs(difference);
          }
          await execute(`UPDATE branch_transactions SET gold_weight_mg=?,rate_paise_per_gram=?,amount_paise=?,bill_id=?,status='submitted',
            notes=CONCAT_WS(' · ',notes,?) WHERE id=?`, [goldWeightMg, capturedRate, totalPaise - releaseAmountPaise, billId, `Detailed bill ${billNumber}${notes ? ` · ${notes}` : ""}`, pledgeId], connection);
          transactionId = pledgeId;
        } else {
          const branchTransaction = await execute(`INSERT INTO branch_transactions
            (branch_id,customer_id,transaction_type,business_mode,gold_weight_mg,rate_paise_per_gram,amount_paise,bill_id,notes,status,created_by_employee_id)
            VALUES (?,?,?,?,?,?,?,?,?,'submitted',?)`, [session.branchId, Number(branchCustomer.id), "purchase", businessMode, goldWeightMg,
            capturedRate, totalPaise, billId, `Detailed bill ${billNumber}${notes ? ` · ${notes}` : ""}`, session.employeeId], connection);
          transactionId = branchTransaction.insertId;
        }
        if (cashPaymentPaise > availableCashPaise) throw new Error(`INSUFFICIENT_BILL_CASH:${availableCashPaise}`);
        if (cashPaymentPaise > 0) await addFundEntry(connection, { branchId: session.branchId, direction: "debit", amountPaise: cashPaymentPaise,
          entryType: "purchase_submitted", referenceId: transactionId, description: "Cash reserved for submitted purchase bill", employeeId: session.employeeId });
      }
      await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'bill_created', 'bill', ?, ?)",
        [session.adminId, session.companyId, billId, requestIp(request)], connection);
      return { billId, billNumber };
    });
    return NextResponse.json({ ...created, companyName: session.companyName }, { status: 201 });
  } catch (caught) {
    for(const ornamentImagePath of ornamentImagePaths){try { unlinkSync(path.join(storageRoot, "ornaments", ornamentImagePath)); } catch {}}
    if (signatureImagePath) { try { unlinkSync(path.join(storageRoot, "signatures", signatureImagePath)); } catch {} }
    if (caught instanceof Error && caught.message === "PLEDGE_NOT_READY") return apiError("This pledge is not ready for billing or belongs to another customer.", 409);
    if (caught instanceof Error && caught.message === "PLEDGE_RELEASE_DETAILS") return apiError("This pledge does not have valid saved release details.", 409);
    if (caught instanceof Error && caught.message === "RELEASE_EXCEEDS_PURCHASE") return apiError("Release amount cannot be more than the purchase value.");
    if (caught instanceof Error && caught.message === "PAYMENT_TOTAL_MISMATCH") return apiError("Payment channel amounts must exactly match the payable bill amount.");
    if (caught instanceof Error && caught.message === "INSUFFICIENT_PLEDGE_FUNDS") return apiError("The branch does not have enough available funds for the pledged release amount.", 409);
    if (caught instanceof Error && caught.message.startsWith("INSUFFICIENT_BILL_CASH:")) {
      const availablePaise = Number(caught.message.split(":")[1] || 0);
      const available = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(availablePaise / 100);
      return apiError(`Only ${available} is available in branch cash. Reduce the cash amount and split the remaining payment through UPI or bank transfer.`, 409);
    }
    return apiError(caught instanceof Error ? caught.message : "Unable to save bill.", 500);
  }
}
