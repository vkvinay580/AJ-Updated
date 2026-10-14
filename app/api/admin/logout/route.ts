import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession, logAudit } from "@/lib/auth";
import { sameOrigin } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getSession();
  if (session) await logAudit(session, "logout");
  await destroySession();
  return NextResponse.json({ ok: true });
}
