import { NextRequest, NextResponse } from "next/server";
import { changeAttendancePassword } from "@/lib/attendance";
import { apiError, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { execute } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const session = await getBranchSession();
  if (!session) return apiError("Your branch session has expired.", 401);
  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (newPassword.length < 8) return apiError("New password must be at least 8 characters.");
  if (newPassword !== confirmPassword) return apiError("New passwords do not match.");
  if (newPassword === currentPassword) return apiError("Choose a password different from your current password.");
  try {
    await changeAttendancePassword({ employeeId: session.employeeId, branchId: session.branchId, currentPassword, newPassword });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Unable to change password.", 400);
  }
  await execute("DELETE FROM branch_sessions WHERE employee_id=? AND branch_id=? AND id<>?", [session.employeeId, session.branchId, session.sessionId]);
  return NextResponse.json({ ok: true, message: "Password changed successfully. Other branch sessions were signed out." });
}
