import { NextRequest, NextResponse } from "next/server";
import { apiError, cleanText, requestIp, sameOrigin } from "@/lib/api";
import { createBranchSession } from "@/lib/branch-auth";
import { verifyAttendanceLogin } from "@/lib/attendance";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const ip = requestIp(request);
  const now = Date.now();
  const body = await request.json().catch(() => ({}));
  const branchId = cleanText(body.branchId, 100).toUpperCase();
  const employeeId = cleanText(body.employeeId, 100);
  const password = String(body.password || "");
  if (!branchId || !employeeId || !password) return apiError("Branch ID, employee ID, and password are required.");
  if (!/^\d+$/.test(employeeId)) return apiError("Employee ID must contain numbers only.");
  const attemptKey = `${ip}:${branchId}:${employeeId.toLowerCase()}`;
  const attempt = attempts.get(attemptKey);
  if (attempt && attempt.resetAt > now && attempt.count >= 8) return apiError("Too many attempts for this employee. Try again in 15 minutes.", 429);

  try {
    const result = await verifyAttendanceLogin({ branchId, employeeId, password });
    await createBranchSession({
      branchId: result.branch.branchId,
      branchName: result.branch.branchName,
      employeeId: result.employee.employeeId,
      employeeName: result.employee.name,
    });
    attempts.delete(attemptKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    attempts.set(attemptKey, { count: attempt?.resetAt && attempt.resetAt > now ? attempt.count + 1 : 1, resetAt: now + 15 * 60 * 1000 });
    return apiError(error instanceof Error ? error.message : "Unable to sign in.", 401);
  }
}
