import { NextRequest, NextResponse } from "next/server";
import { destroyAccountsSession } from "@/lib/accounts-auth";
import { apiError, sameOrigin } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  await destroyAccountsSession();
  return NextResponse.json({ ok: true });
}
