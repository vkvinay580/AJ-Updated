import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { createAccountsSession } from "@/lib/accounts-auth";
import { apiError, cleanText, requestIp, sameOrigin } from "@/lib/api";
import { one, verifyPassword } from "@/lib/db";

type LoginRow = RowDataPacket & { id: number; passwordHash: string };
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const ip = requestIp(request), now = Date.now(), current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 8) return apiError("Too many login attempts. Please wait 15 minutes.", 429);
  const body = await request.json().catch(() => ({}));
  const username = cleanText(body.username, 100).toLowerCase(), password = String(body.password || "");
  if (!username || !password) return apiError("Username and password are required.");
  const user = await one<LoginRow>("SELECT id,password_hash AS passwordHash FROM accounts_users WHERE LOWER(username)=LOWER(?) AND active=1", [username]);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    attempts.set(ip, { count: current?.resetAt && current.resetAt > now ? current.count + 1 : 1, resetAt: now + 15 * 60 * 1000 });
    return apiError("Invalid Accounts credentials.", 401);
  }
  attempts.delete(ip);
  await createAccountsSession(Number(user.id));
  return NextResponse.json({ ok: true });
}
