import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { rows, type DatabaseValue } from "@/lib/db";
import { getOperationsAccess } from "@/lib/operations-auth";

export async function GET(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);

  const operations = await getOperationsAccess();
  const branch = operations ? null : await getBranchSession();
  if (!operations && !branch) return apiError("Your session has expired.", 401);

  const all = request.nextUrl.searchParams.get("scope") === "all";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Math.min(
    500,
    Math.max(1, Number.isInteger(requestedLimit) ? requestedLimit : all ? 300 : 8),
  );
  const viewerRole = operations?.mode ?? "branch";
  const viewerKey = operations
    ? String(operations.session.adminId)
    : String(branch!.branchId);
  const accessClause = operations ? "r.company_id=?" : "r.branch_id=?";
  const accessValue: DatabaseValue = operations
    ? operations.session.companyId
    : branch!.branchId;
  const dayClause = all
    ? ""
    : "AND DATE(DATE_ADD(r.completed_at,INTERVAL 330 MINUTE))=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 330 MINUTE))";

  const results = await rows<RowDataPacket>(
    `SELECT r.id,r.status,r.branch_id AS branchId,r.branch_name AS branchName,
      r.bm_name AS bmName,r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,
      r.completed_at AS completedAt,c.id AS customerId,c.name AS customerName,c.phone AS customerPhone,
      u.name AS teName,u.user_id AS teUserId,vv.viewed_at AS viewedAt
    FROM customer_verification_requests r
    JOIN customers c ON c.id=r.customer_id AND c.company_id=r.company_id
    JOIN te_users u ON u.id=r.te_user_id
    LEFT JOIN verification_result_views vv ON vv.request_id=r.id AND vv.viewer_role=? AND vv.viewer_key=?
    WHERE ${accessClause} AND r.status IN ('verified','could_not_verify') ${dayClause}
    ORDER BY r.completed_at DESC,r.id DESC LIMIT ?`,
    [viewerRole, viewerKey, accessValue, limit],
  );

  return NextResponse.json({
    scope: all ? "all" : "today",
    viewerRole,
    results,
    unreadCount: results.filter((result) => !result.viewedAt).length,
  });
}

