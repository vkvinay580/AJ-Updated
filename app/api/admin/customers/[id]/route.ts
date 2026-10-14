import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated, cleanPhone, cleanText, requestIp } from "@/lib/api";
import { execute, one, rows, transaction } from "@/lib/db";

const uploadRoot = path.resolve(process.cwd(), "storage", "kyc");

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id)) return apiError("Invalid customer.");
  const customer = await one<RowDataPacket>(`SELECT id, name, phone, email, address, city, state, gstin, state_code AS stateCode,
    place_of_supply AS placeOfSupply, postal_code AS postalCode,
    customer_image_path IS NOT NULL AS hasImage, created_at AS createdAt
    FROM customers WHERE id = ? AND company_id = ?`, [id, session.companyId]);
  if (!customer) return apiError("Customer not found.", 404);
  const kyc = await rows<RowDataPacket>(`SELECT id, document_type AS documentType, number_last4 AS last4,
    document_path IS NOT NULL AS hasDocument, verified, created_at AS createdAt
    FROM kyc_records WHERE customer_id = ? AND company_id = ? ORDER BY document_type`, [id, session.companyId]);
  const bills = await rows<RowDataPacket>(`SELECT id, bill_number AS billNumber, transaction_type AS transactionType,
    DATE_FORMAT(bill_date, '%Y-%m-%d') AS billDate, total_paise AS totalPaise FROM bills WHERE customer_id = ? AND company_id = ? ORDER BY id DESC LIMIT 25`, [id, session.companyId]);
  const signatureBill=await one<RowDataPacket>("SELECT id FROM bills WHERE customer_id = ? AND company_id = ? AND signature_image_path IS NOT NULL ORDER BY id DESC LIMIT 1",[id,session.companyId]);
  return NextResponse.json({ customer, kyc, bills, signatureBillId:signatureBill?.id||null });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid customer.");
  const form = await request.formData();
  const phone = cleanPhone(form.get("phone"));
  const name = cleanText(form.get("name"), 120);
  const email = cleanText(form.get("email"), 150).toLowerCase();
  const address = cleanText(form.get("address"), 400);
  const city = cleanText(form.get("city"), 80);
  const state = cleanText(form.get("state"), 80);
  const gstin = cleanText(form.get("gstin"), 15).toUpperCase();
  const stateCode = cleanText(form.get("stateCode"), 2);
  const placeOfSupply = cleanText(form.get("placeOfSupply"), 80);
  const postalCode = cleanText(form.get("postalCode"), 10);
  if (phone.length !== 10) return apiError("Enter a valid 10-digit phone number.");
  if (name.length < 2) return apiError("Customer name is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Enter a valid email address.");
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return apiError("Enter a valid 15-character GSTIN.");
  if (stateCode && !/^\d{2}$/.test(stateCode)) return apiError("State code must contain 2 digits.");
  const customer = await one<RowDataPacket & { id:number }>("SELECT id FROM customers WHERE id = ? AND company_id = ?", [id, session.companyId]);
  if (!customer) return apiError("Customer not found.", 404);
  const duplicate = await one<RowDataPacket>("SELECT id FROM customers WHERE company_id = ? AND phone = ? AND id <> ?", [session.companyId, phone, id]);
  if (duplicate) return apiError("This phone number is already used by another customer.", 409);
  await transaction(async (connection) => {
    await execute(`UPDATE customers SET phone = ?, name = ?, email = ?, address = ?, city = ?, state = ?, gstin = ?, state_code = ?, place_of_supply = ?, postal_code = ? WHERE id = ? AND company_id = ?`,
      [phone, name, email || null, address || null, city || null, state || null, gstin || null, stateCode || null, placeOfSupply || state || null, postalCode || null, id, session.companyId], connection);
    await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'customer_updated', 'customer', ?, ?)", [session.adminId, session.companyId, id, requestIp(request)], connection);
  });
  return NextResponse.json({ ok: true, customerId: id });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid customer.");
  const customer = await one<RowDataPacket & { name: string; customerImagePath: string | null; billCount: number }>(`SELECT c.name,
    c.customer_image_path AS customerImagePath, COUNT(b.id) AS billCount FROM customers c
    LEFT JOIN bills b ON b.customer_id = c.id AND b.company_id = c.company_id
    WHERE c.id = ? AND c.company_id = ? GROUP BY c.id`, [id, session.companyId]);
  if (!customer) return apiError("Customer not found.", 404);
  if (Number(customer.billCount) > 0) return apiError(`This customer has ${customer.billCount} bill${Number(customer.billCount) === 1 ? "" : "s"}. Delete those bills before deleting the customer.`, 409);
  const documents = await rows<RowDataPacket & { documentPath: string | null }>("SELECT document_path AS documentPath FROM kyc_records WHERE customer_id = ? AND company_id = ?", [id, session.companyId]);
  await transaction(async (connection) => {
    await execute("DELETE FROM customers WHERE id = ? AND company_id = ?", [id, session.companyId], connection);
    await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'customer_deleted', 'customer', ?, ?)", [session.adminId, session.companyId, id, requestIp(request)], connection);
  });
  const storedPaths = [customer.customerImagePath, ...documents.map((document) => document.documentPath)].filter((value): value is string => Boolean(value));
  await Promise.all(storedPaths.map(async (storedPath) => {
    const resolved = path.resolve(uploadRoot, storedPath);
    if (resolved.startsWith(`${uploadRoot}${path.sep}`)) await unlink(resolved).catch(() => undefined);
  }));
  return NextResponse.json({ ok: true, customerName: customer.name });
}
