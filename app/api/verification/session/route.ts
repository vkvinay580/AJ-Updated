import { NextRequest, NextResponse } from "next/server";
import { destroyTeSession, getTeSession } from "@/lib/verification-auth";

export async function GET(request: NextRequest) {
  const session = await getTeSession(request);
  return session ? NextResponse.json({ user: session }) : NextResponse.json({ error: "Your TE session has expired." }, { status: 401 });
}

export async function DELETE(request: NextRequest) {
  await destroyTeSession(request);
  return NextResponse.json({ ok: true });
}
