import { NextRequest, NextResponse } from "next/server";
import { destroyMiscSession } from "@/lib/misc-auth";
import { apiError, sameOrigin } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  await destroyMiscSession();
  return NextResponse.json({ ok: true });
}
