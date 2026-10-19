import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
export const verificationUploadRoot = path.resolve(process.cwd(), "storage", "verification");

function imageKind(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export async function storeVerificationPhoto(file: File, requestId: number) {
  if (file.size < 1 || file.size > MAX_IMAGE_SIZE) throw new Error("Each verification photo must be 8 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) throw new Error("Only JPG, PNG and WebP verification photos are accepted.");
  const folder = path.join(verificationUploadRoot, String(requestId));
  mkdirSync(folder, { recursive: true });
  const relative = `${requestId}/${randomBytes(20).toString("hex")}.${kind.ext}`;
  writeFileSync(path.join(verificationUploadRoot, relative), bytes, { flag: "wx" });
  return { path: relative.replace(/\\/g, "/"), mime: kind.mime };
}

export function removeVerificationPhoto(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const target = path.resolve(verificationUploadRoot, relativePath);
  if (!target.startsWith(`${verificationUploadRoot}${path.sep}`)) return;
  try { unlinkSync(target); } catch {}
}
