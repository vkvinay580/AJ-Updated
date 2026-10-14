import { NextRequest, NextResponse } from "next/server";
import { apiError, sameOrigin } from "@/lib/api";
import { destroyHeadOfficeSession } from "@/lib/head-office-auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  await destroyHeadOfficeSession();
  return NextResponse.json({ ok: true });
}
