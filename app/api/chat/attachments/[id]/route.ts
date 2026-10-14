import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getChatActor, parseChatScope } from "@/lib/chat";
import { one } from "@/lib/db";

export const runtime = "nodejs";

type AttachmentRow = RowDataPacket & { attachmentPath:string;attachmentName:string;attachmentMime:string };

export async function GET(request: NextRequest, { params }: { params:Promise<{ id:string }> }) {
  const scope = parseChatScope(request.nextUrl.searchParams.get("scope"));
  if (!scope) return apiError("A valid chat workspace is required.");
  const actor = await getChatActor(scope);
  if (!actor) return apiError("Your session has expired.", 401);
  const messageId = Number((await params).id);
  if (!Number.isSafeInteger(messageId) || messageId <= 0) return apiError("Invalid attachment.");
  const attachment = await one<AttachmentRow>(`SELECT attachment_path AS attachmentPath,attachment_name AS attachmentName,attachment_mime AS attachmentMime
    FROM chat_messages WHERE id=? AND attachment_path IS NOT NULL AND (sender_user_id=? OR recipient_user_id=?)`, [messageId,actor.id,actor.id]);
  if (!attachment) return apiError("Attachment not found.", 404);
  const storageRoot = path.resolve(process.cwd(), "storage", "chat");
  const target = path.resolve(process.cwd(), attachment.attachmentPath);
  if (!target.startsWith(`${storageRoot}${path.sep}`)) return apiError("Invalid attachment path.", 400);
  try {
    const data = await readFile(target);
    const safeName = attachment.attachmentName.replace(/["\r\n]/g, "_");
    const inline = attachment.attachmentMime.startsWith("image/") || attachment.attachmentMime.startsWith("audio/") || attachment.attachmentMime === "application/pdf";
    return new NextResponse(new Uint8Array(data), { headers:{
      "Content-Type":attachment.attachmentMime,
      "Content-Length":String(data.length),
      "Content-Disposition":`${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff",
    } });
  } catch {
    return apiError("Attachment file is unavailable.", 404);
  }
}
