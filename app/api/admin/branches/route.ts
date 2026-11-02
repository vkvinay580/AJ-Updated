import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, cleanText, sameOrigin } from "@/lib/api";
import { getSession, getSessionByToken } from "@/lib/auth";
import { deleteAttendanceBranch, getAttendanceBranches, upsertAttendanceBranch, type AttendanceBranchInput } from "@/lib/attendance";

function bearerToken(request: NextRequest) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1].trim() || "";
  return token.length <= 512 ? token : "";
}

function matchesConfiguredToken(provided: string) {
  const configured = process.env.BRANCH_ADMIN_API_TOKEN?.trim() || "";
  if (!provided || !configured) return false;
  const suppliedDigest = createHash("sha256").update(provided).digest();
  const configuredDigest = createHash("sha256").update(configured).digest();
  return timingSafeEqual(suppliedDigest, configuredDigest);
}

async function authorize(request: NextRequest) {
  if (!sameOrigin(request)) return false;
  const bearer = bearerToken(request);
  if (bearer) return matchesConfiguredToken(bearer) || Boolean(await getSessionByToken(bearer));
  return Boolean(await getSession());
}

export async function GET(request: NextRequest) {
  if (!await authorize(request)) return apiError("Invalid or expired admin credentials.", 401);
  try {
    const branches = await getAttendanceBranches();
    return NextResponse.json({ branches }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (caught) {
    return apiError(caught instanceof Error ? caught.message : "Unable to load the branch directory.", 502);
  }
}

function field(body: FormData | Record<string, unknown>, key: string) {
  return body instanceof FormData ? body.get(key) : body[key];
}

function statusValue(value: unknown): "active" | "inactive" | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (["active", "1", "true"].includes(normalized)) return "active";
  if (["inactive", "0", "false"].includes(normalized)) return "inactive";
  return null;
}

function validUrl(value: unknown) {
  const raw = String(value || "").trim().slice(0, 2048);
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.toString() : "";
  } catch { return ""; }
}

export async function POST(request: NextRequest) {
  if (!await authorize(request)) return apiError("Invalid or expired admin credentials.", 401);
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("multipart/form-data")
    ? await request.formData()
    : await request.json().catch(() => ({} as Record<string, unknown>));

  const branchId = cleanText(field(body, "branchId"), 100).toUpperCase();
  const name = cleanText(field(body, "name"), 190);
  const area = cleanText(field(body, "area"), 190);
  const city = cleanText(field(body, "city"), 120);
  const state = cleanText(field(body, "state"), 120);
  const pincode = String(field(body, "pincode") || "").replace(/\D/g, "");
  const timings = cleanText(field(body, "timings"), 255);
  const address = cleanText(field(body, "address"), 500);
  const status = statusValue(field(body, "status"));
  const latitude = Number(field(body, "latitude"));
  const longitude = Number(field(body, "longitude"));
  const url = validUrl(field(body, "url"));

  if (!/^[A-Z0-9][A-Z0-9_-]{1,99}$/.test(branchId)) return apiError("branchId must contain 2-100 letters, numbers, hyphens, or underscores.");
  if (!name || !area || !city || !state || !address || !timings) return apiError("name, area, city, state, address, and timings are required.");
  if (!/^\d{6}$/.test(pincode)) return apiError("pincode must be a valid 6-digit Indian postal code.");
  if (!status) return apiError("status must be active or inactive.");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return apiError("latitude must be between -90 and 90.");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return apiError("longitude must be between -180 and 180.");
  if (!url) return apiError("url must be a valid HTTP or HTTPS URL without embedded credentials.");

  const input: AttendanceBranchInput = { branchId, name, area, city, state, pincode, timings, address, status, latitude, longitude, url };
  try {
    const result = await upsertAttendanceBranch(input);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (caught) {
    return apiError(caught instanceof Error ? caught.message : "Unable to update the branch directory.", 502);
  }
}

export async function DELETE(request: NextRequest) {
  if (!await authorize(request)) return apiError("Invalid or expired admin credentials.", 401);
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("multipart/form-data")
    ? await request.formData()
    : await request.json().catch(() => ({} as Record<string, unknown>));
  const branchId = cleanText(request.nextUrl.searchParams.get("branchId") || field(body, "branchId"), 100).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,99}$/.test(branchId)) return apiError("branchId must contain 2-100 letters, numbers, hyphens, or underscores.");

  try {
    const result = await deleteAttendanceBranch(branchId);
    return NextResponse.json(result);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unable to delete the branch.";
    const status = /not found/i.test(message) ? 404 : /assigned|inactive/i.test(message) ? 409 : 502;
    return apiError(message, status);
  }
}
