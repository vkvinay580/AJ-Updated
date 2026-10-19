import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated } from "@/lib/api";
import { customerUploadRoot } from "@/lib/customer-files";
import { one } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid customer.");
  const image = await one<RowDataPacket & { documentPath: string | null; mimeType: string | null; originalName: string | null }>(
    `SELECT old_gold_wearing_image_path AS documentPath, old_gold_wearing_image_mime_type AS mimeType,
      old_gold_wearing_image_original_name AS originalName FROM customers WHERE id = ? AND company_id = ?`,
    [id, session.companyId]);
  if (!image?.documentPath) return apiError("Old gold wearing image not found.", 404);
  const target = path.resolve(customerUploadRoot, image.documentPath);
  if (!target.startsWith(`${customerUploadRoot}${path.sep}`)) return apiError("Invalid image path.", 403);
  try {
    return new NextResponse(readFileSync(target), { headers: {
      "Content-Type": image.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(image.originalName || "old-gold-wearing-image").replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return apiError("Old gold wearing image file is unavailable.", 404);
  }
}
