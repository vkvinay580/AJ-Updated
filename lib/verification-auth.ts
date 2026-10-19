import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, one } from "@/lib/db";

const SESSION_DAYS = 30;

export type TeSession = {
  sessionId: number;
  teUserId: number;
  userId: string;
  name: string;
  phone: string | null;
};

type TeSessionRow = TeSession & RowDataPacket;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createTeSession(teUserId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await execute("DELETE FROM te_sessions WHERE te_user_id=? AND expires_at<=UTC_TIMESTAMP()", [teUserId]);
  const result = await execute("INSERT INTO te_sessions (token_hash,te_user_id,expires_at) VALUES (?,?,?)", [digest(token), teUserId, expires]);
  return { token, sessionId: result.insertId, expiresAt: expires.toISOString() };
}

export async function getTeSession(request: NextRequest): Promise<TeSession | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;
  const row = await one<TeSessionRow>(`SELECT s.id AS sessionId,u.id AS teUserId,u.user_id AS userId,u.name,u.phone
    FROM te_sessions s JOIN te_users u ON u.id=s.te_user_id AND u.active=1
    WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()`, [digest(token)]);
  return row ? { sessionId: Number(row.sessionId), teUserId: Number(row.teUserId), userId: String(row.userId), name: String(row.name), phone: row.phone ? String(row.phone) : null } : null;
}

export async function destroyTeSession(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token) await execute("DELETE FROM te_sessions WHERE token_hash=?", [digest(token)]);
}
