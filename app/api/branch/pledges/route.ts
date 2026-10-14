import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanText } from "@/lib/api";
import { addFundEntry, lockFundLedger } from "@/lib/branch-ledger";
import { businessAuthenticated } from "@/lib/business-actor";
import { encryptSensitive, execute, one, transaction } from "@/lib/db";

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const documentTypes = new Map([["application/pdf", "pdf"], ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

function paymentDetails(form: FormData, paymentMethod: string) {
  const accountNumber = cleanText(form.get("accountNumber"), 34).replace(/\s/g, "");
  const ifscCode = cleanText(form.get("ifscCode"), 11).toUpperCase();
  const upiId = cleanText(form.get("upiId"), 100);
  const chequeNumber = cleanText(form.get("chequeNumber"), 20);
  const cardNumber = cleanText(form.get("cardNumber"), 19).replace(/\D/g, "");
  if (!["bank_transfer", "upi", "cash", "card", "cheque"].includes(paymentMethod)) throw new Error("Select a valid payment method.");
  if (paymentMethod === "bank_transfer" && (!/^[A-Za-z0-9-]{4,34}$/.test(accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode))) throw new Error("Enter a valid account number and IFSC code.");
  if (paymentMethod === "upi" && !/^[\w.+-]{2,}@[A-Za-z0-9.-]{2,}$/.test(upiId)) throw new Error("Enter a valid UPI ID.");
  if (paymentMethod === "cheque" && !/^[A-Za-z0-9/-]{1,20}$/.test(chequeNumber)) throw new Error("Enter a valid cheque number.");
  if (paymentMethod === "card" && !/^\d{12,19}$/.test(cardNumber)) throw new Error("Enter a valid card number.");
  return JSON.stringify({
    accountNumber: paymentMethod === "bank_transfer" ? encryptSensitive(accountNumber) : null,
    ifscCode: paymentMethod === "bank_transfer" ? ifscCode : null,
    upiId: paymentMethod === "upi" ? upiId : null,
    chequeNumber: paymentMethod === "cheque" ? chequeNumber : null,
    cardNumber: paymentMethod === "card" ? encryptSensitive(cardNumber) : null,
  });
}

function storeDocument(file: File) {
  if (!file.size || file.size > MAX_DOCUMENT_SIZE || !documentTypes.has(file.type)) throw new Error("Each pledge bill must be PDF, JPG, PNG, or WebP and no larger than 10 MB.");
  const directory = path.join(process.cwd(), "storage", "pledges");
  mkdirSync(directory, { recursive: true });
  const relative = `storage/pledges/${randomBytes(20).toString("hex")}.${documentTypes.get(file.type)}`;
  return file.arrayBuffer().then(buffer => {
    writeFileSync(path.join(process.cwd(), relative), new Uint8Array(buffer), { flag: "wx" });
    return relative.replace(/\\/g, "/");
  });
}

export async function POST(request: NextRequest) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor?.branchId || !actor.employeeId) return error || apiError("Branch authentication required.", 401);
  const form = await request.formData();
  const customerId = Number(form.get("customerId"));
  const pledgeAmountPaise = Math.round(Number(form.get("pledgeAmount")) * 100);
  const releasePlace = cleanText(form.get("releasePlace"), 190);
  const releaseAmountPaise = Math.round(Number(form.get("releaseAmount")) * 100);
  const paymentMethod = cleanText(form.get("paymentMethod"), 40);
  const notes = cleanText(form.get("notes"), 500);
  const documents = form.getAll("pledgeDocument").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!Number.isInteger(customerId)) return apiError("Select a customer.");
  if (!Number.isFinite(pledgeAmountPaise) || pledgeAmountPaise <= 0) return apiError("Enter a valid pledge amount.");
  if (!releasePlace || !Number.isFinite(releaseAmountPaise) || releaseAmountPaise <= 0) return apiError("Enter a valid release place and release amount.");
  if (!documents.length || documents.length > 4) return apiError("Attach between 1 and 4 pledge bill documents.");
  let details: string;
  try { details = paymentDetails(form, paymentMethod); } catch (caught) { return apiError(caught instanceof Error ? caught.message : "Invalid payment details."); }
  const customer = await one<RowDataPacket>("SELECT id,name,phone,address FROM customers WHERE id=? AND company_id=?", [customerId, actor.companyId]);
  if (!customer) return apiError("Customer not found in Aryan Gold.", 404);

  const stored: Array<{ path: string; name: string }> = [];
  try {
    for (const document of documents) stored.push({ path: await storeDocument(document), name: cleanText(document.name, 255) || "pledge-document" });
    const result = await transaction(async connection => {
      if (paymentMethod === "cash" && await lockFundLedger(actor.branchId!, connection) < pledgeAmountPaise) throw new Error("INSUFFICIENT_FUNDS");
      let branchCustomer = await one<RowDataPacket>("SELECT id FROM branch_customers WHERE branch_id=? AND phone=? FOR UPDATE", [actor.branchId, customer.phone], connection);
      if (!branchCustomer) {
        const createdCustomer = await execute("INSERT INTO branch_customers (branch_id,name,phone,address,created_by_employee_id) VALUES (?,?,?,?,?)", [actor.branchId, customer.name, customer.phone, customer.address || null, actor.employeeId], connection);
        branchCustomer = { id: createdCustomer.insertId } as RowDataPacket;
      }
      const created = await execute(`INSERT INTO branch_transactions
        (branch_id,customer_id,transaction_type,business_mode,gold_weight_mg,rate_paise_per_gram,amount_paise,pledge_amount_paise,release_place,release_amount_paise,
         pledge_payment_method,pledge_payment_details,pledge_status,status,notes,created_by_employee_id)
        VALUES (?,?,'purchase','pledged',0,0,?,?,?,?,?,?,?,'awaiting_pledge',?,?)`,
        [actor.branchId, Number(branchCustomer.id), pledgeAmountPaise, pledgeAmountPaise, releasePlace, releaseAmountPaise, paymentMethod, details, "awaiting_release", notes || null, actor.employeeId], connection);
      for (const document of stored) await execute("INSERT INTO branch_pledge_documents (transaction_id,document_path,document_name) VALUES (?,?,?)", [created.insertId, document.path, document.name], connection);
      if (paymentMethod === "cash") await addFundEntry(connection, { branchId: actor.branchId!, direction: "debit", amountPaise: pledgeAmountPaise, entryType: "pledge_reserved", referenceId: created.insertId, description: "Cash reserved for pledged gold", employeeId: actor.employeeId! });
      return created.insertId;
    });
    return NextResponse.json({ ok: true, pledgeId: result, message: "Pledge saved. Complete purchase billing after the gold is released." }, { status: 201 });
  } catch (caught) {
    for (const document of stored) { try { unlinkSync(path.join(process.cwd(), document.path)); } catch {} }
    if (caught instanceof Error && caught.message === "INSUFFICIENT_FUNDS") return apiError("The branch does not have enough available funds for this pledge.", 409);
    return apiError(caught instanceof Error ? caught.message : "Unable to save pledge.", 500);
  }
}
