import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { execute, one } from "@/lib/db";

export const BRANCH_SESSION_COOKIE = "aryan_branch_session";
const SESSION_HOURS = 12;

export type BranchSession = {
  sessionId: number;
  branchId: string;
  branchName: string;
  employeeId: string;
  employeeName: string;
};

type BranchSessionRow = BranchSession & RowDataPacket;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createBranchSession(data: Omit<BranchSession, "sessionId">) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await execute("DELETE FROM branch_sessions WHERE expires_at <= UTC_TIMESTAMP()");
  await execute(`INSERT INTO branch_sessions (token_hash, branch_id, branch_name, employee_id, employee_name, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)`, [digest(token), data.branchId, data.branchName, data.employeeId, data.employeeName, expires]);
  (await cookies()).set(BRANCH_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
}

export async function getBranchSession(): Promise<BranchSession | null> {
  const token = (await cookies()).get(BRANCH_SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await one<BranchSessionRow>(`SELECT id AS sessionId, branch_id AS branchId, branch_name AS branchName,
    employee_id AS employeeId, employee_name AS employeeName FROM branch_sessions
    WHERE token_hash=? AND expires_at > UTC_TIMESTAMP()`, [digest(token)]);
  return row ? { sessionId: Number(row.sessionId), branchId: row.branchId, branchName: row.branchName, employeeId: row.employeeId, employeeName: row.employeeName } : null;
}

export async function requireBranchSession() {
  const session = await getBranchSession();
  if (!session) redirect("/branch/login");
  return session;
}

export async function destroyBranchSession() {
  const store = await cookies();
  const token = store.get(BRANCH_SESSION_COOKIE)?.value;
  if (token) await execute("DELETE FROM branch_sessions WHERE token_hash=?", [digest(token)]);
  store.delete(BRANCH_SESSION_COOKIE);
}
