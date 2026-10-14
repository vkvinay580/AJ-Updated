import { NextRequest, NextResponse } from "next/server";
import { authenticated, requestIp } from "@/lib/api";
import { execute, hashPassword, one, verifyPassword } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  if (currentPassword === newPassword) return NextResponse.json({ error: "Choose a password different from your current password." }, { status: 400 });
  const admin = await one<RowDataPacket & { passwordHash: string }>("SELECT password_hash AS passwordHash FROM admins WHERE id = ? AND active = 1", [session.adminId]);
  if (!admin || !verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  await execute("UPDATE admins SET password_hash = ? WHERE id = ?", [hashPassword(newPassword), session.adminId]);
  await execute("DELETE FROM sessions WHERE admin_id = ? AND id <> ?", [session.adminId, session.sessionId]);
  await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, ip_address) VALUES (?, ?, 'password_changed', 'admin', ?)", [session.adminId, session.companyId, requestIp(request)]);
  return NextResponse.json({ ok: true });
}
