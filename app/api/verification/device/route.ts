import { NextRequest, NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/api";
import { execute } from "@/lib/db";
import { getTeSession } from "@/lib/verification-auth";

export async function POST(request: NextRequest) {
  const session = await getTeSession(request);
  if (!session) return apiError("Your TE session has expired.", 401);
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim().slice(0, 512);
  const platform = cleanText(body.platform, 30) || "android";
  if (token.length < 20) return apiError("Invalid notification token.");
  await execute(`INSERT INTO te_device_tokens (te_user_id,device_token,platform,last_seen_at) VALUES (?,?,?,UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE te_user_id=VALUES(te_user_id),platform=VALUES(platform),last_seen_at=UTC_TIMESTAMP()`, [session.teUserId, token, platform]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getTeSession(request);
  if (!session) return apiError("Your TE session has expired.", 401);
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim().slice(0, 512);
  if (token) await execute("DELETE FROM te_device_tokens WHERE te_user_id=? AND device_token=?", [session.teUserId, token]);
  return NextResponse.json({ ok: true });
}
