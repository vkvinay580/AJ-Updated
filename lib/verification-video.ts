import "server-only";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ffprobe from "@ffprobe-installer/ffprobe";
import {
  removeVerificationPhoto,
  verificationUploadRoot,
} from "@/lib/verification-files";

const run = promisify(execFile);
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export class VerificationVideoValidationError extends Error {}

export async function storeVerificationVideo(file: File, requestId: number) {
  if (file.size < 1 || file.size > MAX_VIDEO_BYTES)
    throw new VerificationVideoValidationError(
      "The compressed video must be 25 MB or smaller.",
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp")
    throw new VerificationVideoValidationError("Upload a compressed MP4 video.");
  const relative = `${requestId}/${randomBytes(20).toString("hex")}.mp4`;
  const target = path.join(verificationUploadRoot, relative);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  try {
    const executable = process.env.FFPROBE_PATH || ffprobe.path;
    const { stdout } = await run(
      executable,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-show_entries",
        "format=duration,format_name:stream=codec_type,codec_name,duration,width,height",
        "-of",
        "json",
        target,
      ],
      { timeout: 15000, maxBuffer: 256 * 1024 },
    );
    const info = JSON.parse(stdout) as {
      format?: { duration?: string; format_name?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        duration?: string;
        width?: number;
        height?: number;
      }>;
    };
    const video =
      info.streams?.filter((stream) => stream.codec_type === "video") || [];
    const duration = Number(info.format?.duration);
    const streamDurations = (info.streams || [])
      .map((stream) => Number(stream.duration))
      .filter(Number.isFinite);
    if (
      video.length !== 1 ||
      video[0].codec_name !== "h264" ||
      !info.format?.format_name?.includes("mp4")
    )
      throw new VerificationVideoValidationError(
        "Upload a compressed H.264 MP4 video.",
      );
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      Math.max(duration, ...streamDurations) > 120
    )
      throw new VerificationVideoValidationError(
        "Videos must be no longer than 2 minutes.",
      );
    if (Math.max(video[0].width || 0, video[0].height || 0) > 1280)
      throw new VerificationVideoValidationError(
        "Compress the video before uploading (maximum 720p).",
      );
    return {
      path: relative,
      mime: "video/mp4",
      durationMs: Math.ceil(duration * 1000),
      byteSize: file.size,
    };
  } catch (caught) {
    removeVerificationPhoto(relative);
    if (caught instanceof VerificationVideoValidationError) throw caught;
    if (caught instanceof Error && "code" in caught && caught.code === "ENOENT")
      throw new Error("Video validation is unavailable on the server.");
    throw new VerificationVideoValidationError(
      "Unable to validate this video. Please record it again and retry.",
    );
  }
}
