import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";
import { apiError, cleanText, sameOrigin } from "@/lib/api";
import { getChatActor, parseChatScope } from "@/lib/chat";
import { execute, one, rows, transaction } from "@/lib/db";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const attachmentTypes = new Map<string, { extension: string; mime: string }>([
  [".jpg", { extension: "jpg", mime: "image/jpeg" }], [".jpeg", { extension: "jpg", mime: "image/jpeg" }],
  [".png", { extension: "png", mime: "image/png" }], [".webp", { extension: "webp", mime: "image/webp" }],
  [".heic", { extension: "heic", mime: "image/heic" }], [".heif", { extension: "heif", mime: "image/heif" }],
  [".pdf", { extension: "pdf", mime: "application/pdf" }], [".txt", { extension: "txt", mime: "text/plain" }],
  [".csv", { extension: "csv", mime: "text/csv" }], [".xls", { extension: "xls", mime: "application/vnd.ms-excel" }],
  [".xlsx", { extension: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }],
  [".doc", { extension: "doc", mime: "application/msword" }],
  [".docx", { extension: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
  [".ppt", { extension: "ppt", mime: "application/vnd.ms-powerpoint" }],
  [".pptx", { extension: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }],
  [".odt", { extension: "odt", mime: "application/vnd.oasis.opendocument.text" }],
  [".ods", { extension: "ods", mime: "application/vnd.oasis.opendocument.spreadsheet" }],
  [".webm", { extension: "webm", mime: "audio/webm" }], [".ogg", { extension: "ogg", mime: "audio/ogg" }],
  [".mp3", { extension: "mp3", mime: "audio/mpeg" }], [".m4a", { extension: "m4a", mime: "audio/mp4" }],
  [".wav", { extension: "wav", mime: "audio/wav" }],
]);
const knownMimeTypes = new Set(Array.from(attachmentTypes.values(), value => value.mime));

type DirectoryRow = RowDataPacket & { id:number;username:string;displayName:string;roleLabel:string;actorType:string;unreadCount:number;lastMessageAt:Date|null };
type MessageRow = RowDataPacket & { id:number;senderUserId:number;recipientUserId:number;body:string|null;attachmentName:string|null;attachmentMime:string|null;attachmentSize:number|null;createdAt:Date;readAt:Date|null };
type LatestUnreadRow = RowDataPacket & { id:number;senderId:number;senderName:string;senderUsername:string };

async function authorize(request: NextRequest) {
  const scope = parseChatScope(request.nextUrl.searchParams.get("scope"));
  if (!scope) return { actor: null, error: apiError("A valid chat workspace is required.") };
  const actor = await getChatActor(scope);
  return actor ? { actor, error: null } : { actor: null, error: apiError("Your session has expired.", 401) };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.error || !auth.actor) return auth.error;
  const actor = auth.actor;
  const directory = await rows<DirectoryRow>(`SELECT u.id,u.username,u.display_name AS displayName,u.role_label AS roleLabel,u.actor_type AS actorType,
    (SELECT COUNT(*) FROM chat_messages unread WHERE unread.sender_user_id=u.id AND unread.recipient_user_id=? AND unread.read_at IS NULL) AS unreadCount,
    (SELECT MAX(recent.created_at) FROM chat_messages recent WHERE (recent.sender_user_id=u.id AND recent.recipient_user_id=?) OR (recent.sender_user_id=? AND recent.recipient_user_id=u.id)) AS lastMessageAt
    FROM chat_users u WHERE u.active=1 AND u.id<>?
    ORDER BY unreadCount DESC,(lastMessageAt IS NULL),lastMessageAt DESC,u.display_name`, [actor.id, actor.id, actor.id, actor.id]);
  const latestUnread = await one<LatestUnreadRow>(`SELECT m.id,m.sender_user_id AS senderId,u.display_name AS senderName,u.username AS senderUsername
    FROM chat_messages m JOIN chat_users u ON u.id=m.sender_user_id
    WHERE m.recipient_user_id=? AND m.read_at IS NULL ORDER BY m.id DESC LIMIT 1`, [actor.id]);
  const selectedId = Number(request.nextUrl.searchParams.get("with") || 0);
  let messages: MessageRow[] = [];
  if (Number.isSafeInteger(selectedId) && selectedId > 0 && selectedId !== actor.id) {
    const recipient = await one<RowDataPacket>("SELECT id FROM chat_users WHERE id=? AND active=1", [selectedId]);
    if (!recipient) return apiError("The selected user is unavailable.", 404);
    messages = await rows<MessageRow>(`SELECT id,sender_user_id AS senderUserId,recipient_user_id AS recipientUserId,body,
      attachment_name AS attachmentName,attachment_mime AS attachmentMime,attachment_size AS attachmentSize,
      created_at AS createdAt,read_at AS readAt FROM (
        SELECT id,sender_user_id,recipient_user_id,body,attachment_name,attachment_mime,attachment_size,created_at,read_at
        FROM chat_messages WHERE (sender_user_id=? AND recipient_user_id=?) OR (sender_user_id=? AND recipient_user_id=?)
        ORDER BY id DESC LIMIT 150
      ) recent_messages ORDER BY id`, [actor.id, selectedId, selectedId, actor.id]);
  }
  return NextResponse.json({ actor, directory: directory.map(user => ({ ...user, id:Number(user.id), unreadCount:Number(user.unreadCount) })),
    messages: messages.map(message => ({ ...message, id:Number(message.id), senderUserId:Number(message.senderUserId), recipientUserId:Number(message.recipientUserId),
      attachmentSize:message.attachmentSize===null?null:Number(message.attachmentSize), attachmentUrl:message.attachmentName ? `/api/chat/attachments/${message.id}?scope=${encodeURIComponent(request.nextUrl.searchParams.get("scope") || "")}` : null })),
    latestUnread: latestUnread ? { id:Number(latestUnread.id), senderId:Number(latestUnread.senderId), senderName:latestUnread.senderName, senderUsername:latestUnread.senderUsername } : null });
}

function validatedAttachment(file: File) {
  if (!file.size) return null;
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Attachments must be 20 MB or smaller.");
  const originalExtension = path.extname(file.name).toLowerCase();
  const definition = attachmentTypes.get(originalExtension);
  if (!definition) throw new Error("Use an image, PDF, Word, Excel, PowerPoint, OpenDocument, text, CSV, or audio file.");
  const suppliedMime = file.type.split(";")[0].toLowerCase();
  if (suppliedMime && suppliedMime !== "application/octet-stream" && !knownMimeTypes.has(suppliedMime) && !suppliedMime.startsWith("audio/")) {
    throw new Error("This attachment type is not supported.");
  }
  const originalName = file.name.replace(/[\r\n"\\/]/g, "_").slice(0, 255) || `attachment.${definition.extension}`;
  return { extension: definition.extension, mime: suppliedMime && suppliedMime !== "application/octet-stream" ? suppliedMime : definition.mime, originalName };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const auth = await authorize(request);
  if (auth.error || !auth.actor) return auth.error;
  const storedPaths: string[] = [];
  try {
    const form = await request.formData();
    const recipientId = Number(form.get("recipientId") || 0);
    if (!Number.isSafeInteger(recipientId) || recipientId <= 0 || recipientId === auth.actor.id) return apiError("Select another user to message.");
    const recipient = await one<RowDataPacket>("SELECT id FROM chat_users WHERE id=? AND active=1", [recipientId]);
    if (!recipient) return apiError("The selected user is unavailable.", 404);
    const body = cleanText(form.get("text"), 4000) || null;
    const suppliedFiles = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    const legacyFile = form.get("attachment");
    if (!suppliedFiles.length && legacyFile instanceof File && legacyFile.size) suppliedFiles.push(legacyFile);
    if (!body && !suppliedFiles.length) return apiError("Enter a message or add an attachment.");
    if (suppliedFiles.length > MAX_ATTACHMENTS) return apiError(`Select no more than ${MAX_ATTACHMENTS} attachments at once.`);
    if (suppliedFiles.reduce((total,file)=>total+file.size,0) > MAX_TOTAL_ATTACHMENT_BYTES) return apiError("The combined attachment size must be 50 MB or smaller.");
    const attachments = suppliedFiles.map(file => {
      const valid = validatedAttachment(file);
      if (!valid) throw new Error("An attachment is empty.");
      return { file, ...valid, storedPath:"" };
    });
    if (attachments.length) {
      const directory = path.join(process.cwd(), "storage", "chat");
      await mkdir(directory, { recursive:true });
      for (const attachment of attachments) {
        attachment.storedPath = `storage/chat/${randomBytes(24).toString("hex")}.${attachment.extension}`;
        await writeFile(path.join(process.cwd(), attachment.storedPath), new Uint8Array(await attachment.file.arrayBuffer()), { flag:"wx" });
        storedPaths.push(attachment.storedPath);
      }
    }
    const ids = await transaction(async connection => {
      const insertedIds: number[] = [];
      if (!attachments.length) {
        const result = await execute(`INSERT INTO chat_messages
          (sender_user_id,recipient_user_id,body,attachment_path,attachment_name,attachment_mime,attachment_size)
          VALUES (?,?,?,?,?,?,?)`, [auth.actor.id,recipientId,body,null,null,null,null], connection);
        insertedIds.push(Number(result.insertId));
      } else {
        for (const [index,attachment] of attachments.entries()) {
          const result = await execute(`INSERT INTO chat_messages
            (sender_user_id,recipient_user_id,body,attachment_path,attachment_name,attachment_mime,attachment_size)
            VALUES (?,?,?,?,?,?,?)`, [auth.actor.id,recipientId,index===0?body:null,attachment.storedPath,attachment.originalName,attachment.mime,attachment.file.size], connection);
          insertedIds.push(Number(result.insertId));
        }
      }
      return insertedIds;
    });
    return NextResponse.json({ ok:true, id:ids[0], ids, message:attachments.length>1?`${attachments.length} files sent.`:"Message sent." }, { status:201 });
  } catch (error) {
    await Promise.all(storedPaths.map(storedPath=>unlink(path.join(process.cwd(), storedPath)).catch(() => undefined)));
    return apiError(error instanceof Error ? error.message : "Unable to send this message.", 400);
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const auth = await authorize(request);
  if (auth.error || !auth.actor) return auth.error;
  const payload = await request.json().catch(() => ({})) as { senderId?:unknown };
  const senderId = Number(payload.senderId || 0);
  if (!Number.isSafeInteger(senderId) || senderId <= 0 || senderId === auth.actor.id) return apiError("Select a valid conversation.");
  await execute("UPDATE chat_messages SET read_at=UTC_TIMESTAMP() WHERE sender_user_id=? AND recipient_user_id=? AND read_at IS NULL", [senderId, auth.actor.id]);
  return NextResponse.json({ ok:true });
}
