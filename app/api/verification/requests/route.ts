import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanPhone, cleanText } from "@/lib/api";
import { execute, one, rows, transaction } from "@/lib/db";
import { getTeSession } from "@/lib/verification-auth";
import {
  removeVerificationPhoto,
  storeVerificationPhoto,
} from "@/lib/verification-files";
import {
  storeVerificationVideo,
  VerificationVideoValidationError,
} from "@/lib/verification-video";

export async function GET(request: NextRequest) {
  const session = await getTeSession(request);
  if (!session) return apiError("Your TE session has expired.", 401);
  const requests = await rows<RowDataPacket>(
    `SELECT r.id,r.status,r.branch_id AS branchId,r.branch_name AS branchName,r.bm_name AS bmName,r.bm_phone AS bmPhone,
    r.request_notes AS requestNotes,r.authentication_person_name AS authenticationPersonName,
    r.authentication_person_relationship AS authenticationPersonRelationship,r.authentication_person_phone AS authenticationPersonPhone,
    r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,r.latitude,r.longitude,
    r.assigned_at AS assignedAt,r.started_at AS startedAt,r.completed_at AS completedAt,
    c.id AS customerId,c.name AS customerName,c.phone AS customerPhone,c.email AS customerEmail,c.address AS customerAddress,
    c.city AS customerCity,c.state AS customerState,c.postal_code AS customerPostalCode,
    (SELECT COUNT(*) FROM customer_verification_photos p WHERE p.request_id=r.id) AS photoCount,
    (SELECT COUNT(*) FROM customer_verification_videos v WHERE v.request_id=r.id) AS videoCount,
    (SELECT COUNT(*) FROM customer_verification_references ref WHERE ref.request_id=r.id) AS referenceCount
    FROM customer_verification_requests r JOIN customers c ON c.id=r.customer_id AND c.company_id=r.company_id
    WHERE r.te_user_id=? ORDER BY FIELD(r.status,'assigned','in_progress','verified','could_not_verify'),r.assigned_at DESC LIMIT 200`,
    [session.teUserId],
  );
  return NextResponse.json({ user: session, requests });
}

type ReferenceInput = {
  name?: unknown;
  relationship?: unknown;
  phone?: unknown;
  notes?: unknown;
};

export async function POST(request: NextRequest) {
  const session = await getTeSession(request);
  if (!session) return apiError("Your TE session has expired.", 401);
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1)
      return apiError("Invalid verification request.");
    const result = await execute(
      "UPDATE customer_verification_requests SET status='in_progress',started_at=COALESCE(started_at,UTC_TIMESTAMP()) WHERE id=? AND te_user_id=? AND status='assigned'",
      [id, session.teUserId],
    );
    if (!result.affectedRows) {
      const existing = await one<RowDataPacket>(
        "SELECT status FROM customer_verification_requests WHERE id=? AND te_user_id=?",
        [id, session.teUserId],
      );
      if (!existing) return apiError("Verification request not found.", 404);
      if (existing.status !== "in_progress")
        return apiError("This verification request is already complete.", 409);
    }
    return NextResponse.json({
      ok: true,
      message: "Visit marked in progress.",
    });
  }

  const form = await request.formData();
  const id = Number(form.get("id"));
  const outcome =
    form.get("outcome") === "verified"
      ? "verified"
      : form.get("outcome") === "could_not_verify"
        ? "could_not_verify"
        : "";
  const authenticationPersonName = cleanText(
    form.get("authenticationPersonName"),
    190,
  );
  const authenticationPersonRelationship = cleanText(
    form.get("authenticationPersonRelationship"),
    120,
  );
  const authenticationPersonPhone = cleanPhone(
    form.get("authenticationPersonPhone"),
  );
  const verificationNotes = cleanText(form.get("verificationNotes"), 2000);
  const failureReason = cleanText(form.get("failureReason"), 1000);
  const latitude = String(form.get("latitude") || "").trim();
  const longitude = String(form.get("longitude") || "").trim();
  if (!Number.isInteger(id) || id < 1 || !outcome)
    return apiError("Choose a valid verification request and result.");
  if (
    outcome === "verified" &&
    (authenticationPersonName.length < 2 ||
      authenticationPersonPhone.length !== 10)
  )
    return apiError(
      "Verified visits require the authentication person's name and 10-digit mobile number.",
    );
  if (outcome === "could_not_verify" && !failureReason)
    return apiError("Enter why the customer could not be verified.");
  let parsedReferences: unknown = [];
  try {
    parsedReferences = JSON.parse(String(form.get("references") || "[]"));
  } catch {
    return apiError("Invalid reference details.");
  }
  if (
    !Array.isArray(parsedReferences) ||
    parsedReferences.length > 10 ||
    parsedReferences.some(
      (reference) =>
        !reference || typeof reference !== "object" || Array.isArray(reference),
    )
  )
    return apiError("Provide up to 10 valid reference records.");
  const rawReferences = parsedReferences as ReferenceInput[];
  const references = rawReferences
    .map((reference) => ({
      name: cleanText(reference.name, 190),
      relationship: cleanText(reference.relationship, 120),
      phone: cleanPhone(reference.phone),
      notes: cleanText(reference.notes, 500),
    }))
    .filter((reference) => reference.name || reference.phone);
  if (
    references.some(
      (reference) => reference.name.length < 2 || reference.phone.length !== 10,
    )
  )
    return apiError(
      "Each reference needs a name and valid 10-digit mobile number.",
    );
  if (outcome === "verified" && !references.length)
    return apiError(
      "Add at least one customer reference before marking verified.",
    );
  const photoFiles = form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photoFiles.length > 12)
    return apiError("Upload at most 12 visit photos.");
  if (
    photoFiles.reduce((total, file) => total + file.size, 0) >
    40 * 1024 * 1024
  )
    return apiError("Visit photos must total 40 MB or less.");
  if (outcome === "verified" && photoFiles.length < 2)
    return apiError("Take at least two visit photos before marking verified.");
  const videoFiles = form
    .getAll("video")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (videoFiles.length > 1)
    return apiError("Attach at most one video per visit.");
  if (videoFiles.some((file) => file.size > 25 * 1024 * 1024))
    return apiError("The compressed video must be 25 MB or smaller.");
  if (
    photoFiles.reduce((sum, file) => sum + file.size, 0) +
      (videoFiles[0]?.size || 0) >
    40 * 1024 * 1024
  )
    return apiError("Photos and video together must be 40 MB or smaller.");
  const item = await one<RowDataPacket>(
    `SELECT r.id,r.status,r.branch_id AS branchId,r.bm_employee_id AS bmEmployeeId,c.name AS customerName
    FROM customer_verification_requests r JOIN customers c ON c.id=r.customer_id WHERE r.id=? AND r.te_user_id=?`,
    [id, session.teUserId],
  );
  if (!item) return apiError("Verification request not found.", 404);
  if (!["assigned", "in_progress"].includes(String(item.status)))
    return apiError("This verification request is already complete.", 409);
  const stored: Array<{ path: string; mime: string; name: string }> = [];
  let video: Awaited<ReturnType<typeof storeVerificationVideo>> | null = null;
  try {
    if (videoFiles[0]) video = await storeVerificationVideo(videoFiles[0], id);
    for (const file of photoFiles) {
      const saved = await storeVerificationPhoto(file, id);
      stored.push({
        ...saved,
        name: cleanText(file.name, 255) || "verification-photo",
      });
    }
    await transaction(async (connection) => {
      const locked = await one<RowDataPacket>(
        "SELECT id FROM customer_verification_requests WHERE id=? AND te_user_id=? AND status IN ('assigned','in_progress') FOR UPDATE",
        [id, session.teUserId],
        connection,
      );
      if (!locked) throw new Error("ALREADY_COMPLETE");
      await execute(
        `UPDATE customer_verification_requests SET status=?,authentication_person_name=?,authentication_person_relationship=?,
        authentication_person_phone=?,verification_notes=?,failure_reason=?,latitude=?,longitude=?,started_at=COALESCE(started_at,UTC_TIMESTAMP()),completed_at=UTC_TIMESTAMP()
        WHERE id=?`,
        [
          outcome,
          authenticationPersonName || null,
          authenticationPersonRelationship || null,
          authenticationPersonPhone || null,
          verificationNotes || null,
          failureReason || null,
          latitude && Number.isFinite(Number(latitude))
            ? Number(latitude)
            : null,
          longitude && Number.isFinite(Number(longitude))
            ? Number(longitude)
            : null,
          id,
        ],
        connection,
      );
      await execute(
        "DELETE FROM customer_verification_references WHERE request_id=?",
        [id],
        connection,
      );
      for (const reference of references)
        await execute(
          `INSERT INTO customer_verification_references
        (request_id,name,relationship,phone,notes) VALUES (?,?,?,?,?)`,
          [
            id,
            reference.name,
            reference.relationship || null,
            reference.phone,
            reference.notes || null,
          ],
          connection,
        );
      for (const photo of stored)
        await execute(
          `INSERT INTO customer_verification_photos
        (request_id,file_path,original_name,mime_type) VALUES (?,?,?,?)`,
          [id, photo.path, photo.name, photo.mime],
          connection,
        );
      if (video)
        await execute(
          `INSERT INTO customer_verification_videos (request_id,file_path,original_name,mime_type,duration_ms,byte_size)
        VALUES (?,?,?,?,?,?)`,
          [
            id,
            video.path,
            "visit-video.mp4",
            video.mime,
            video.durationMs,
            video.byteSize,
          ],
          connection,
        );
      const readableOutcome =
        outcome === "verified" ? "verified" : "could not be verified";
      await execute(
        `INSERT INTO branch_notifications (branch_id,employee_id,verification_request_id,title,body)
        VALUES (?,?,?,?,?)`,
        [
          String(item.branchId),
          String(item.bmEmployeeId),
          id,
          "Customer verification completed",
          `${item.customerName} was ${readableOutcome} by ${session.name}.`,
        ],
        connection,
      );
    });
  } catch (caught) {
    for (const photo of stored) removeVerificationPhoto(photo.path);
    removeVerificationPhoto(video?.path);
    if (String(caught).includes("ALREADY_COMPLETE"))
      return apiError("This verification request is already complete.", 409);
    if (caught instanceof VerificationVideoValidationError)
      return apiError(caught.message, 400);
    return apiError(
      caught instanceof Error ? caught.message : "Unable to save verification.",
      500,
    );
  }
  return NextResponse.json({
    ok: true,
    status: outcome,
    message:
      outcome === "verified"
        ? "Customer marked verified."
        : "Customer marked as could not be verified.",
  });
}
