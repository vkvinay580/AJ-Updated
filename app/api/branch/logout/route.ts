import { NextRequest, NextResponse } from "next/server";
import { sameOrigin, apiError } from "@/lib/api";
import { destroyBranchSession } from "@/lib/branch-auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  await destroyBranchSession();
  return NextResponse.json({ ok: true });
}
