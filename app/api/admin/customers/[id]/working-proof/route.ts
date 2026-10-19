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
  const proof = await one<RowDataPacket & { documentPath: string | null; mimeType: string | null; originalName: string | null }>(
    `SELECT company_id_card_path AS documentPath, company_id_card_mime_type AS mimeType,
      company_id_card_original_name AS originalName FROM customers WHERE id = ? AND company_id = ?`,
    [id, session.companyId]);
  if (!proof?.documentPath) return apiError("Company ID card not found.", 404);
  const target = path.resolve(customerUploadRoot, proof.documentPath);
  if (!target.startsWith(`${customerUploadRoot}${path.sep}`)) return apiError("Invalid document path.", 403);
  try {
    return new NextResponse(readFileSync(target), { headers: {
      "Content-Type": proof.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(proof.originalName || "company-id-card").replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return apiError("Company ID card file is unavailable.", 404);
  }
}
