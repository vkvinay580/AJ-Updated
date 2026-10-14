import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { execute, one } from "@/lib/db";

export const HEAD_OFFICE_SESSION_COOKIE = "aryan_head_office_session";
const SESSION_HOURS = 12;

export type HeadOfficeRole = "auditor" | "melter" | "floor";
export type HeadOfficeSession = {
  sessionId: number;
  userId: number;
  username: string;
  name: string;
  role: HeadOfficeRole;
};

type SessionRow = HeadOfficeSession & RowDataPacket;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createHeadOfficeSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await execute("DELETE FROM head_office_sessions WHERE expires_at <= UTC_TIMESTAMP()");
  await execute("INSERT INTO head_office_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)", [digest(token), userId, expires]);
  (await cookies()).set(HEAD_OFFICE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
}

export async function getHeadOfficeSession(): Promise<HeadOfficeSession | null> {
  const token = (await cookies()).get(HEAD_OFFICE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<SessionRow>(`SELECT s.id AS sessionId,u.id AS userId,u.username,u.name,u.role
    FROM head_office_sessions s JOIN head_office_users u ON u.id=s.user_id AND u.active=1
    WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()`, [digest(token)]);
  return row ? { sessionId: Number(row.sessionId), userId: Number(row.userId), username: row.username,
    name: row.name, role: row.role } : null;
}

export async function requireHeadOfficeSession() {
  const session = await getHeadOfficeSession();
  if (!session) redirect("/head-office/login");
  return session;
}

export async function destroyHeadOfficeSession() {
  const store = await cookies();
  const token = store.get(HEAD_OFFICE_SESSION_COOKIE)?.value;
  if (token) await execute("DELETE FROM head_office_sessions WHERE token_hash=?", [digest(token)]);
  store.delete(HEAD_OFFICE_SESSION_COOKIE);
}
