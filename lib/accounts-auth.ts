import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { execute, one } from "@/lib/db";

export const ACCOUNTS_SESSION_COOKIE = "aryan_accounts_session";
const SESSION_HOURS = 12;

export type AccountsSession = { sessionId: number; userId: number; username: string; name: string };
type SessionRow = AccountsSession & RowDataPacket;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAccountsSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await execute("DELETE FROM accounts_sessions WHERE expires_at<=UTC_TIMESTAMP()");
  await execute("INSERT INTO accounts_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)", [digest(token), userId, expires]);
  (await cookies()).set(ACCOUNTS_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires });
}

export async function getAccountsSession(): Promise<AccountsSession | null> {
  const token = (await cookies()).get(ACCOUNTS_SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<SessionRow>(`SELECT s.id AS sessionId,u.id AS userId,u.username,u.name
    FROM accounts_sessions s JOIN accounts_users u ON u.id=s.user_id AND u.active=1
    WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()`, [digest(token)]);
  return row ? { sessionId: Number(row.sessionId), userId: Number(row.userId), username: row.username, name: row.name } : null;
}

export async function requireAccountsSession() {
  const session = await getAccountsSession();
  if (!session) redirect("/accounts/login");
  return session;
}

export async function destroyAccountsSession() {
  const store = await cookies();
  const token = store.get(ACCOUNTS_SESSION_COOKIE)?.value;
  if (token) await execute("DELETE FROM accounts_sessions WHERE token_hash=?", [digest(token)]);
  store.delete(ACCOUNTS_SESSION_COOKIE);
}
