import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated } from "@/lib/api";
import { one } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const id = Number((await context.params).id);
  const document = await one<RowDataPacket & { documentPath: string | null; mimeType: string | null; originalName: string | null }>(
    "SELECT document_path AS documentPath, mime_type AS mimeType, original_name AS originalName FROM kyc_records WHERE id = ? AND company_id = ?", [id, session.companyId]);
  if (!document?.documentPath) return apiError("Document not found.", 404);
  const root = path.resolve(process.cwd(), "storage", "kyc");
  const target = path.resolve(root, document.documentPath);
  if (!target.startsWith(root + path.sep)) return apiError("Invalid document path.", 403);
  try {
    const body = readFileSync(target);
    return new NextResponse(body, { headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(document.originalName || "kyc-document").replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch { return apiError("Document file is unavailable.", 404); }
}
