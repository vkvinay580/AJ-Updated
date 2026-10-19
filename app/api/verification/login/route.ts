import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanText, requestIp } from "@/lib/api";
import { one, verifyPassword } from "@/lib/db";
import { createTeSession } from "@/lib/verification-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const now = Date.now();
  for (const [key, attempt] of attempts) if (attempt.resetAt <= now) attempts.delete(key);
  const ip = requestIp(request);
  const current = attempts.get(ip);
  if (current && current.count >= 8) return apiError("Too many login attempts. Please wait 15 minutes.", 429);
  const body = await request.json().catch(() => ({}));
  const userId = cleanText(body.userId, 100).toLowerCase();
  const password = String(body.password || "");
  if (!userId || !password || password.length > 256) return apiError("Enter your TE user ID and password.");
  attempts.set(ip, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + 15 * 60 * 1000 });
  const user = await one<RowDataPacket>("SELECT id,user_id AS userId,name,phone,password_hash AS passwordHash FROM te_users WHERE user_id=? AND active=1", [userId]);
  if (!user || !verifyPassword(password, String(user.passwordHash))) return apiError("Invalid TE user ID or password.", 401);
  attempts.delete(ip);
  const session = await createTeSession(Number(user.id));
  return NextResponse.json({ token: session.token, expiresAt: session.expiresAt, user: { id: Number(user.id), userId: String(user.userId), name: String(user.name), phone: user.phone ? String(user.phone) : null } });
}
