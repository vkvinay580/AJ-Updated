import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { execute, hashPassword, one, verifyPassword } from "@/lib/db";
import { getHeadOfficeSession } from "@/lib/head-office-auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const session = await getHeadOfficeSession();
  if (!session) return apiError("Your Head Office session has expired.", 401);
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (newPassword.length < 8) return apiError("New password must be at least 8 characters.");
  if (newPassword !== confirmPassword) return apiError("New passwords do not match.");
  if (newPassword === currentPassword) return apiError("Choose a password different from your current password.");
  const user = await one<RowDataPacket & { passwordHash: string }>("SELECT password_hash AS passwordHash FROM head_office_users WHERE id=? AND active=1", [session.userId]);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) return apiError("Current password is incorrect.", 401);
  await execute("UPDATE head_office_users SET password_hash=? WHERE id=?", [hashPassword(newPassword), session.userId]);
  await execute("DELETE FROM head_office_sessions WHERE user_id=? AND id<>?", [session.userId, session.sessionId]);
  return NextResponse.json({ ok: true, message: "Password changed successfully. Other Head Office sessions were signed out." });
}
