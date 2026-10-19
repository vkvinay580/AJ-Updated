import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanPhone, cleanText, requestIp } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { removeCustomerFile, storeCustomerFile } from "@/lib/customer-files";
import { encryptSensitive, execute, one, rows, stableHash, transaction } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error, actor: session } = await businessAuthenticated(request);
  if (error || !session) return error;
  const query = cleanText(request.nextUrl.searchParams.get("q"), 100);
  const phone = cleanPhone(query);
  const like = `%${query}%`;
  const customers = await rows<RowDataPacket>(`
    SELECT c.id, c.name, c.phone, c.email, c.city, c.state, c.created_at AS createdAt,
      COUNT(DISTINCT k.id) AS kycCount, COUNT(DISTINCT b.id) AS billCount
    FROM customers c
    LEFT JOIN kyc_records k ON k.customer_id = c.id AND k.company_id = c.company_id
    LEFT JOIN bills b ON b.customer_id = c.id AND b.company_id = c.company_id
    WHERE c.company_id = ? AND (? = '' OR c.name LIKE ? OR c.phone LIKE ?
      OR EXISTS (SELECT 1 FROM kyc_records search_kyc WHERE search_kyc.customer_id = c.id AND search_kyc.company_id = c.company_id
        AND (search_kyc.number_last4 LIKE ? OR search_kyc.document_type LIKE ?)))
    GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100
  `, [session.companyId, query, like, phone ? `%${phone}%` : like, like, like]);
  return NextResponse.json({ customers });
}

export async function POST(request: NextRequest) {
  const { error, actor: session } = await businessAuthenticated(request);
  if (error || !session) return error;
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
  const aadhaar = String(form.get("aadhaar") || "").replace(/\D/g, "");
  const pan = String(form.get("pan") || "").trim().toUpperCase();
  const employerName = cleanText(form.get("employerName"), 190);
  const employerAddress = cleanText(form.get("employerAddress"), 500);
  const employmentDesignation = cleanText(form.get("employmentDesignation"), 120);
  if (phone.length !== 10) return apiError("Enter a valid 10-digit phone number.");
  if (name.length < 2) return apiError("Customer name is required.");
  if (!/^\d{12}$/.test(aadhaar) && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return apiError("A valid Aadhaar or PAN is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Enter a valid email address.");
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return apiError("Enter a valid 15-character GSTIN.");
  if (stateCode && !/^\d{2}$/.test(stateCode)) return apiError("State code must contain 2 digits.");

  const existing = await one<RowDataPacket & { id: number }>("SELECT id FROM customers WHERE company_id = ? AND phone = ?", [session.companyId, phone]);
  if (existing) return NextResponse.json({ existing: true, customerId: existing.id }, { status: 409 });

  const savedFiles: string[] = [];
  try {
    const customerImage = form.get("customerImage");
    const aadhaarFile = form.get("aadhaarFile");
    const panFile = form.get("panFile");
    const companyIdCard = form.get("companyIdCard");
    const oldGoldWearingImage = form.get("oldGoldWearingImage");
    const storedCustomer = customerImage instanceof File && customerImage.size ? await storeCustomerFile(customerImage, session.companyId) : null;
    if (storedCustomer) savedFiles.push(storedCustomer.path);
    const storedAadhaar = aadhaarFile instanceof File && aadhaarFile.size ? await storeCustomerFile(aadhaarFile, session.companyId) : null;
    if (storedAadhaar) savedFiles.push(storedAadhaar.path);
    const storedPan = panFile instanceof File && panFile.size ? await storeCustomerFile(panFile, session.companyId) : null;
    if (storedPan) savedFiles.push(storedPan.path);
    const storedCompanyId = companyIdCard instanceof File && companyIdCard.size ? await storeCustomerFile(companyIdCard, session.companyId, false) : null;
    if (storedCompanyId) savedFiles.push(storedCompanyId.path);
    const storedOldGoldWearingImage = oldGoldWearingImage instanceof File && oldGoldWearingImage.size ? await storeCustomerFile(oldGoldWearingImage, session.companyId, false) : null;
    if (storedOldGoldWearingImage) savedFiles.push(storedOldGoldWearingImage.path);

    const customerId = await transaction(async (connection) => {
      const result = await execute(`INSERT INTO customers
        (company_id, phone, name, email, address, city, state, gstin, state_code, place_of_supply, postal_code, customer_image_path,
          employer_name, employer_address, employment_designation, company_id_card_path, company_id_card_original_name, company_id_card_mime_type,
          old_gold_wearing_image_path, old_gold_wearing_image_original_name, old_gold_wearing_image_mime_type,
          origin_branch_id, created_by_employee_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.companyId, phone, name, email || null, address || null, city || null, state || null, gstin || null, stateCode || null, placeOfSupply || state || null, postalCode || null, storedCustomer?.path || null,
          employerName || null, employerAddress || null, employmentDesignation || null, storedCompanyId?.path || null,
          companyIdCard instanceof File && companyIdCard.size ? cleanText(companyIdCard.name, 255) : null, storedCompanyId?.mime || null,
          storedOldGoldWearingImage?.path || null,
          oldGoldWearingImage instanceof File && oldGoldWearingImage.size ? cleanText(oldGoldWearingImage.name, 255) : null, storedOldGoldWearingImage?.mime || null,
          session.branchId, session.employeeId, session.adminId], connection);
      const newCustomerId = result.insertId;
      if (session.branchId && session.employeeId) await execute(`INSERT INTO branch_customers
        (branch_id,name,phone,address,created_by_employee_id) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE name=VALUES(name),address=VALUES(address)`, [session.branchId, name, phone, address || null, session.employeeId], connection);
      const insertKycSql = `INSERT INTO kyc_records
        (customer_id, company_id, document_type, number_encrypted, number_hash, number_last4, document_path, original_name, mime_type, created_by_employee_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      if (/^\d{12}$/.test(aadhaar)) await execute(insertKycSql, [newCustomerId, session.companyId, "aadhaar", encryptSensitive(aadhaar), stableHash(aadhaar), aadhaar.slice(-4), storedAadhaar?.path || null, aadhaarFile instanceof File ? cleanText(aadhaarFile.name, 150) : null, storedAadhaar?.mime || null, session.employeeId, session.adminId], connection);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) await execute(insertKycSql, [newCustomerId, session.companyId, "pan", encryptSensitive(pan), stableHash(pan), pan.slice(-4), storedPan?.path || null, panFile instanceof File ? cleanText(panFile.name, 150) : null, storedPan?.mime || null, session.employeeId, session.adminId], connection);
      await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'customer_created', 'customer', ?, ?)",
        [session.adminId, session.companyId, newCustomerId, requestIp(request)], connection);
      return newCustomerId;
    });
    return NextResponse.json({ customerId }, { status: 201 });
  } catch (caught) {
    for (const file of savedFiles) removeCustomerFile(file);
    const message = caught instanceof Error ? caught.message : "Unable to create customer.";
    if (message.includes("Duplicate entry")) return apiError("This phone, Aadhaar, or PAN is already registered in this company.", 409);
    return apiError(message, 500);
  }
}
