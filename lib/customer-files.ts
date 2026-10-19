import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const customerUploadRoot = path.resolve(process.cwd(), "storage", "kyc");

function fileKind(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export async function storeCustomerFile(file: File, companyId: number, allowPdf = true) {
  if (file.size > MAX_FILE_SIZE) throw new Error("Each document must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = fileKind(bytes);
  if (!kind || (!allowPdf && kind.mime === "application/pdf")) {
    throw new Error(allowPdf
      ? "Only JPG, PNG, WebP and PDF documents are accepted."
      : "Only JPG, PNG and WebP images are accepted.");
  }
  const companyFolder = path.join(customerUploadRoot, String(companyId));
  mkdirSync(companyFolder, { recursive: true });
  const relative = `${companyId}/${randomBytes(20).toString("hex")}.${kind.ext}`;
  writeFileSync(path.join(customerUploadRoot, relative), bytes, { flag: "wx" });
  return { path: relative.replace(/\\/g, "/"), mime: kind.mime };
}

export function removeCustomerFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const target = path.resolve(customerUploadRoot, relativePath);
  if (!target.startsWith(`${customerUploadRoot}${path.sep}`)) return;
  try { unlinkSync(target); } catch {}
}
