import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

export function cleanText(value: unknown, max = 200) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowedOrigins = new Set([request.nextUrl.origin, getSiteUrl()]);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    allowedOrigins.add(`${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`);
  }

  return allowedOrigins.has(origin);
}

export async function authenticated(request: NextRequest) {
  if (!sameOrigin(request)) return { error: apiError("Invalid request origin.", 403), session: null };
  const session = await getSession();
  if (!session) return { error: apiError("Your session has expired.", 401), session: null };
  return { error: null, session };
}

export function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
