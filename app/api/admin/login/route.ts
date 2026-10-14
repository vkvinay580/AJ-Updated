import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { createSession } from "@/lib/auth";
import { apiError, cleanText, requestIp, sameOrigin } from "@/lib/api";
import { execute, one, verifyPassword } from "@/lib/db";

const attempts = new Map<string, { count: number; resetAt: number }>();
type LoginRow = RowDataPacket & { adminId: number; passwordHash: string; companyId: number };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const ip = requestIp(request);
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 8) {
    return apiError("Too many login attempts. Please wait 15 minutes.", 429);
  }

  const body = await request.json().catch(() => ({}));
  const email = cleanText(body.email, 150).toLowerCase();
  const password = String(body.password || "");
  const companySlug = cleanText(body.company, 50);
  if (!email || !password || !companySlug) return apiError("Email, password and company are required.");

  const row = await one<LoginRow>(`
    SELECT a.id AS adminId, a.password_hash AS passwordHash, c.id AS companyId
    FROM admins a
    JOIN admin_company_access aca ON aca.admin_id = a.id
    JOIN companies c ON c.id = aca.company_id
    WHERE LOWER(a.email) = LOWER(?) AND c.slug = ? AND a.active = 1
  `, [email, companySlug]);

  if (!row || !verifyPassword(password, row.passwordHash)) {
    attempts.set(ip, { count: (current?.resetAt && current.resetAt > now ? current.count : 0) + 1, resetAt: now + 15 * 60 * 1000 });
    return apiError("Invalid credentials or company access.", 401);
  }

  attempts.delete(ip);
  await createSession(row.adminId, row.companyId);
  await execute("DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()");
  await execute("INSERT INTO audit_logs (admin_id, company_id, action, ip_address) VALUES (?, ?, 'login', ?)", [row.adminId, row.companyId, ip]);
  return NextResponse.json({ ok: true });
}
