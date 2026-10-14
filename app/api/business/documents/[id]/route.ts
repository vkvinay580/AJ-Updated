import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSession } from "@/lib/auth";
import { getBranchSession } from "@/lib/branch-auth";
import { one } from "@/lib/db";

const mimeTypes: Record<string, string> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  const [admin, branch] = await Promise.all([getSession(), getBranchSession()]);
  if (!admin && !branch) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const documentId = Number(new URL(request.url).searchParams.get("documentId"));
  const item = Number.isInteger(documentId) && documentId > 0
    ? await one<RowDataPacket>(`SELECT t.branch_id AS branchId,d.document_path AS documentPath,d.document_name AS documentName
      FROM branch_pledge_documents d JOIN branch_transactions t ON t.id=d.transaction_id WHERE t.id=? AND d.id=?`, [transactionId, documentId])
    : await one<RowDataPacket>(`SELECT t.branch_id AS branchId,
      COALESCE(t.pledge_document_path,(SELECT d.document_path FROM branch_pledge_documents d WHERE d.transaction_id=t.id ORDER BY d.id LIMIT 1)) AS documentPath,
      COALESCE(t.pledge_document_name,(SELECT d.document_name FROM branch_pledge_documents d WHERE d.transaction_id=t.id ORDER BY d.id LIMIT 1)) AS documentName
      FROM branch_transactions t WHERE t.id=?`, [transactionId]);
  if (!item?.documentPath || (branch && !admin && item.branchId !== branch.branchId)) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const storageRoot = path.resolve(process.cwd(), "storage", "pledges");
  const documentPath = path.resolve(process.cwd(), String(item.documentPath));
  if (!documentPath.startsWith(`${storageRoot}${path.sep}`)) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    const file = await readFile(documentPath);
    const originalName = String(item.documentName || `pledge${path.extname(documentPath)}`).replace(/["\r\n]/g, "");
    return new NextResponse(file, { headers: { "Content-Type": mimeTypes[path.extname(documentPath).toLowerCase()] || "application/octet-stream",
      "Content-Disposition": `inline; filename="${originalName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
}
