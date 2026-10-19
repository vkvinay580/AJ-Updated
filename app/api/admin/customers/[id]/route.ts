import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  apiError,
  authenticated,
  cleanPhone,
  cleanText,
  requestIp,
} from "@/lib/api";
import { removeCustomerFile, storeCustomerFile } from "@/lib/customer-files";
import { removeVerificationPhoto } from "@/lib/verification-files";
import { execute, one, rows, transaction } from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id)) return apiError("Invalid customer.");
  const customer = await one<RowDataPacket>(
    `SELECT id, name, phone, email, address, city, state, gstin, state_code AS stateCode,
    place_of_supply AS placeOfSupply, postal_code AS postalCode,
    customer_image_path IS NOT NULL AS hasImage, employer_name AS employerName, employer_address AS employerAddress,
    employment_designation AS employmentDesignation, company_id_card_path IS NOT NULL AS hasCompanyIdCard,
    old_gold_wearing_image_path IS NOT NULL AS hasOldGoldWearingImage, created_at AS createdAt
    FROM customers WHERE id = ? AND company_id = ?`,
    [id, session.companyId],
  );
  if (!customer) return apiError("Customer not found.", 404);
  const kyc = await rows<RowDataPacket>(
    `SELECT id, document_type AS documentType, number_last4 AS last4,
    document_path IS NOT NULL AS hasDocument, verified, created_at AS createdAt
    FROM kyc_records WHERE customer_id = ? AND company_id = ? ORDER BY document_type`,
    [id, session.companyId],
  );
  const bills = await rows<RowDataPacket>(
    `SELECT id, bill_number AS billNumber, transaction_type AS transactionType,
    DATE_FORMAT(bill_date, '%Y-%m-%d') AS billDate, total_paise AS totalPaise FROM bills WHERE customer_id = ? AND company_id = ? ORDER BY id DESC LIMIT 25`,
    [id, session.companyId],
  );
  const verifications = await rows<RowDataPacket>(
    `SELECT r.id,r.status,r.branch_id AS branchId,r.branch_name AS branchName,r.bm_name AS bmName,r.bm_phone AS bmPhone,
    r.request_notes AS requestNotes,r.authentication_person_name AS authenticationPersonName,
    r.authentication_person_relationship AS authenticationPersonRelationship,r.authentication_person_phone AS authenticationPersonPhone,
    r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,r.latitude,r.longitude,
    r.assigned_at AS assignedAt,r.started_at AS startedAt,r.completed_at AS completedAt,u.name AS teName,u.user_id AS teUserId
    FROM customer_verification_requests r JOIN te_users u ON u.id=r.te_user_id
    WHERE r.customer_id=? AND r.company_id=? ORDER BY r.id DESC`,
    [id, session.companyId],
  );
  const verificationIds = verifications.map((verification) =>
    Number(verification.id),
  );
  let verificationPhotos: RowDataPacket[] = [],
    verificationReferences: RowDataPacket[] = [];
  if (verificationIds.length) {
    const placeholders = verificationIds.map(() => "?").join(",");
    verificationPhotos = await rows<RowDataPacket>(
      `SELECT id,request_id AS requestId,original_name AS originalName,mime_type AS mimeType,created_at AS createdAt
      FROM customer_verification_photos WHERE request_id IN (${placeholders}) ORDER BY id`,
      verificationIds,
    );
    verificationReferences = await rows<RowDataPacket>(
      `SELECT id,request_id AS requestId,name,relationship,phone,notes
      FROM customer_verification_references WHERE request_id IN (${placeholders}) ORDER BY id`,
      verificationIds,
    );
  }
  const signatureBill = await one<RowDataPacket>(
    "SELECT id FROM bills WHERE customer_id = ? AND company_id = ? AND signature_image_path IS NOT NULL ORDER BY id DESC LIMIT 1",
    [id, session.companyId],
  );
  const verificationVideos = await rows<RowDataPacket>(
    `SELECT v.id,v.request_id AS requestId,v.duration_ms AS durationMs,v.byte_size AS byteSize FROM customer_verification_videos v
    JOIN customer_verification_requests r ON r.id=v.request_id WHERE r.customer_id=? AND r.company_id=? ORDER BY v.id`,
    [id, session.companyId],
  );
  return NextResponse.json({
    customer,
    kyc,
    bills,
    verifications,
    verificationPhotos,
    verificationVideos,
    verificationReferences,
    signatureBillId: signatureBill?.id || null,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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
  const employerName = cleanText(form.get("employerName"), 190);
  const employerAddress = cleanText(form.get("employerAddress"), 500);
  const employmentDesignation = cleanText(
    form.get("employmentDesignation"),
    120,
  );
  if (phone.length !== 10)
    return apiError("Enter a valid 10-digit phone number.");
  if (name.length < 2) return apiError("Customer name is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return apiError("Enter a valid email address.");
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin))
    return apiError("Enter a valid 15-character GSTIN.");
  if (stateCode && !/^\d{2}$/.test(stateCode))
    return apiError("State code must contain 2 digits.");
  const customer = await one<
    RowDataPacket & {
      id: number;
      companyIdCardPath: string | null;
      oldGoldWearingImagePath: string | null;
    }
  >(
    "SELECT id, company_id_card_path AS companyIdCardPath, old_gold_wearing_image_path AS oldGoldWearingImagePath FROM customers WHERE id = ? AND company_id = ?",
    [id, session.companyId],
  );
  if (!customer) return apiError("Customer not found.", 404);
  const duplicate = await one<RowDataPacket>(
    "SELECT id FROM customers WHERE company_id = ? AND phone = ? AND id <> ?",
    [session.companyId, phone, id],
  );
  if (duplicate)
    return apiError(
      "This phone number is already used by another customer.",
      409,
    );
  const companyIdCard = form.get("companyIdCard");
  const oldGoldWearingImage = form.get("oldGoldWearingImage");
  let storedCompanyId: Awaited<ReturnType<typeof storeCustomerFile>> | null =
    null;
  let storedOldGoldWearingImage: Awaited<
    ReturnType<typeof storeCustomerFile>
  > | null = null;
  try {
    storedCompanyId =
      companyIdCard instanceof File && companyIdCard.size
        ? await storeCustomerFile(companyIdCard, session.companyId, false)
        : null;
    storedOldGoldWearingImage =
      oldGoldWearingImage instanceof File && oldGoldWearingImage.size
        ? await storeCustomerFile(oldGoldWearingImage, session.companyId, false)
        : null;
    await transaction(async (connection) => {
      await execute(
        `UPDATE customers SET phone = ?, name = ?, email = ?, address = ?, city = ?, state = ?, gstin = ?, state_code = ?, place_of_supply = ?, postal_code = ?,
        employer_name = ?, employer_address = ?, employment_designation = ?,
        company_id_card_path = COALESCE(?, company_id_card_path), company_id_card_original_name = COALESCE(?, company_id_card_original_name),
        company_id_card_mime_type = COALESCE(?, company_id_card_mime_type),
        old_gold_wearing_image_path = COALESCE(?, old_gold_wearing_image_path), old_gold_wearing_image_original_name = COALESCE(?, old_gold_wearing_image_original_name),
        old_gold_wearing_image_mime_type = COALESCE(?, old_gold_wearing_image_mime_type) WHERE id = ? AND company_id = ?`,
        [
          phone,
          name,
          email || null,
          address || null,
          city || null,
          state || null,
          gstin || null,
          stateCode || null,
          placeOfSupply || state || null,
          postalCode || null,
          employerName || null,
          employerAddress || null,
          employmentDesignation || null,
          storedCompanyId?.path || null,
          storedCompanyId && companyIdCard instanceof File
            ? cleanText(companyIdCard.name, 255)
            : null,
          storedCompanyId?.mime || null,
          storedOldGoldWearingImage?.path || null,
          storedOldGoldWearingImage && oldGoldWearingImage instanceof File
            ? cleanText(oldGoldWearingImage.name, 255)
            : null,
          storedOldGoldWearingImage?.mime || null,
          id,
          session.companyId,
        ],
        connection,
      );
      await execute(
        "INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'customer_updated', 'customer', ?, ?)",
        [session.adminId, session.companyId, id, requestIp(request)],
        connection,
      );
    });
  } catch (caught) {
    removeCustomerFile(storedCompanyId?.path);
    removeCustomerFile(storedOldGoldWearingImage?.path);
    return apiError(
      caught instanceof Error ? caught.message : "Unable to update customer.",
      500,
    );
  }
  if (storedCompanyId) removeCustomerFile(customer.companyIdCardPath);
  if (storedOldGoldWearingImage)
    removeCustomerFile(customer.oldGoldWearingImagePath);
  return NextResponse.json({ ok: true, customerId: id });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid customer.");
  const customer = await one<
    RowDataPacket & {
      name: string;
      customerImagePath: string | null;
      companyIdCardPath: string | null;
      oldGoldWearingImagePath: string | null;
      billCount: number;
    }
  >(
    `SELECT c.name,
    c.customer_image_path AS customerImagePath, c.company_id_card_path AS companyIdCardPath,
    c.old_gold_wearing_image_path AS oldGoldWearingImagePath, COUNT(b.id) AS billCount FROM customers c
    LEFT JOIN bills b ON b.customer_id = c.id AND b.company_id = c.company_id
    WHERE c.id = ? AND c.company_id = ? GROUP BY c.id`,
    [id, session.companyId],
  );
  if (!customer) return apiError("Customer not found.", 404);
  if (Number(customer.billCount) > 0)
    return apiError(
      `This customer has ${customer.billCount} bill${Number(customer.billCount) === 1 ? "" : "s"}. Delete those bills before deleting the customer.`,
      409,
    );
  const documents = await rows<RowDataPacket & { documentPath: string | null }>(
    "SELECT document_path AS documentPath FROM kyc_records WHERE customer_id = ? AND company_id = ?",
    [id, session.companyId],
  );
  const verificationPhotos = await rows<RowDataPacket & { filePath: string }>(
    `SELECT p.file_path AS filePath FROM customer_verification_photos p
    JOIN customer_verification_requests r ON r.id=p.request_id WHERE r.customer_id=? AND r.company_id=?`,
    [id, session.companyId],
  );
  const verificationVideos = await rows<RowDataPacket & { filePath: string }>(
    `SELECT v.file_path AS filePath FROM customer_verification_videos v
    JOIN customer_verification_requests r ON r.id=v.request_id WHERE r.customer_id=? AND r.company_id=?`,
    [id, session.companyId],
  );
  await transaction(async (connection) => {
    await execute(
      "DELETE FROM customers WHERE id = ? AND company_id = ?",
      [id, session.companyId],
      connection,
    );
    await execute(
      "INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, 'customer_deleted', 'customer', ?, ?)",
      [session.adminId, session.companyId, id, requestIp(request)],
      connection,
    );
  });
  const storedPaths = [
    customer.customerImagePath,
    customer.companyIdCardPath,
    customer.oldGoldWearingImagePath,
    ...documents.map((document) => document.documentPath),
  ];
  for (const storedPath of storedPaths) removeCustomerFile(storedPath);
  for (const photo of verificationPhotos)
    removeVerificationPhoto(photo.filePath);
  for (const video of verificationVideos)
    removeVerificationPhoto(video.filePath);
  return NextResponse.json({ ok: true, customerName: customer.name });
}
