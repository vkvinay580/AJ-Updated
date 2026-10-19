import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated } from "@/lib/api";
import { one } from "@/lib/db";
import { verificationUploadRoot } from "@/lib/verification-files";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; videoId: string }> },
) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const params = await context.params;
  const id = Number(params.id),
    videoId = Number(params.videoId);
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    !Number.isInteger(videoId) ||
    videoId < 1
  )
    return apiError("Invalid verification video.");
  const video = await one<RowDataPacket>(
    `SELECT v.file_path AS filePath FROM customer_verification_videos v
    JOIN customer_verification_requests r ON r.id=v.request_id WHERE v.id=? AND v.request_id=? AND r.company_id=?`,
    [videoId, id, session.companyId],
  );
  if (!video) return apiError("Verification video not found.", 404);
  const target = path.resolve(verificationUploadRoot, String(video.filePath));
  if (!target.startsWith(`${verificationUploadRoot}${path.sep}`))
    return apiError("Invalid video path.", 403);
  let size: number;
  try {
    size = statSync(target).size;
  } catch {
    return apiError("Video file is unavailable.", 404);
  }
  const range = request.headers.get("range");
  let start = 0,
    end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end =
      match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= size
    )
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
  }
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": 'inline; filename="visit-video.mp4"',
    "X-Content-Type-Options": "nosniff",
  };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  return new NextResponse(
    Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream,
    { status: range ? 206 : 200, headers },
  );
}
