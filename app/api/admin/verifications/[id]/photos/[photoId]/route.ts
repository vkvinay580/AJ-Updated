import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated } from "@/lib/api";
import { one } from "@/lib/db";
import { verificationUploadRoot } from "@/lib/verification-files";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; photoId: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const params = await context.params;
  const id = Number(params.id), photoId = Number(params.photoId);
  if (!Number.isInteger(id) || !Number.isInteger(photoId)) return apiError("Invalid verification photo.");
  const photo = await one<RowDataPacket>(`SELECT p.file_path AS filePath,p.original_name AS originalName,p.mime_type AS mimeType
    FROM customer_verification_photos p JOIN customer_verification_requests r ON r.id=p.request_id
    WHERE p.id=? AND p.request_id=? AND r.company_id=?`, [photoId, id, session.companyId]);
  if (!photo) return apiError("Verification photo not found.", 404);
  const target = path.resolve(verificationUploadRoot, String(photo.filePath));
  if (!target.startsWith(`${verificationUploadRoot}${path.sep}`)) return apiError("Invalid verification photo path.", 403);
  try {
    return new NextResponse(readFileSync(target), { headers: { "Content-Type": String(photo.mimeType),
      "Content-Disposition": `inline; filename="${String(photo.originalName).replace(/["\r\n]/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return apiError("Verification photo file is unavailable.", 404); }
}
