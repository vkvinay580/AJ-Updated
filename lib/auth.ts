import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { execute, one } from "@/lib/db";

export const SESSION_COOKIE = "aryan_admin_session";
const SESSION_DAYS = 7;

export type AdminSession = {
  sessionId: number;
  adminId: number;
  adminName: string;
  email: string;
  companyId: number;
  companySlug: string;
  companyName: string;
  companyShortName: string;
  companyLogo: string;
};

type SessionRow = AdminSession & RowDataPacket;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: number, companyId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  // Keep other devices signed in; logout revokes this session and password changes revoke others.
  await execute("DELETE FROM sessions WHERE admin_id = ? AND expires_at <= UTC_TIMESTAMP()", [adminId]);
  await execute("INSERT INTO sessions (token_hash, admin_id, company_id, expires_at) VALUES (?, ?, ?, ?)", [tokenHash(token), adminId, companyId, expires]);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<SessionRow>(`
    SELECT s.id AS sessionId, a.id AS adminId, a.name AS adminName, a.email,
      c.id AS companyId, c.slug AS companySlug, c.name AS companyName,
      c.short_name AS companyShortName, c.logo_path AS companyLogo
    FROM sessions s
    JOIN admins a ON a.id = s.admin_id AND a.active = 1
    JOIN companies c ON c.id = s.company_id
    JOIN admin_company_access aca ON aca.admin_id = a.id AND aca.company_id = c.id
    WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
  `, [tokenHash(token)]);
  return row ? { sessionId: row.sessionId, adminId: row.adminId, adminName: row.adminName, email: row.email,
    companyId: row.companyId, companySlug: row.companySlug, companyName: row.companyName,
    companyShortName: row.companyShortName, companyLogo: row.companyLogo } : null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await execute("DELETE FROM sessions WHERE token_hash = ?", [tokenHash(token)]);
  store.delete(SESSION_COOKIE);
}

export async function logAudit(session: AdminSession, action: string, entityType?: string, entityId?: number, ip?: string) {
  await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
    [session.adminId, session.companyId, action, entityType || null, entityId || null, ip || null]);
}
