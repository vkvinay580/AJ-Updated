import { createReadStream, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { one } from "@/lib/db";
import { verificationViewer } from "@/lib/verification-access";
import { verificationUploadRoot } from "@/lib/verification-files";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; kind: string; mediaId: string }> }) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const params = await context.params;
  const id = Number(params.id), mediaId = Number(params.mediaId);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(mediaId) || mediaId < 1 || !["photo", "video"].includes(params.kind))
    return apiError("Invalid verification media.");
  if (!await verificationViewer(id)) return apiError("Verification media is unavailable.", 404);
  const table = params.kind === "photo" ? "customer_verification_photos" : "customer_verification_videos";
  const media = await one<RowDataPacket>(`SELECT file_path AS filePath,original_name AS originalName,mime_type AS mimeType FROM ${table} WHERE id=? AND request_id=?`, [mediaId, id]);
  if (!media) return apiError("Verification media not found.", 404);
  const target = path.resolve(verificationUploadRoot, String(media.filePath));
  if (!target.startsWith(`${verificationUploadRoot}${path.sep}`)) return apiError("Invalid verification media path.", 403);
  if (params.kind === "photo") {
    try {
      return new NextResponse(readFileSync(target), { headers: { "Content-Type": String(media.mimeType),
        "Content-Disposition": `inline; filename="${String(media.originalName).replace(/["\r\n]/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch { return apiError("Verification photo is unavailable.", 404); }
  }
  let size: number;
  try { size = statSync(target).size; } catch { return apiError("Verification video is unavailable.", 404); }
  const range = request.headers.get("range");
  let start = 0, end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size)
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const headers: Record<string,string> = { "Content-Type": String(media.mimeType || "video/mp4"), "Content-Length": String(end-start+1),
    "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "Content-Disposition": 'inline; filename="visit-video.mp4"', "X-Content-Type-Options": "nosniff" };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  return new NextResponse(Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream, { status: range ? 206 : 200, headers });
}
