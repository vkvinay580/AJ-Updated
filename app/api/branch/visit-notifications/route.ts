import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { execute, one, rows } from "@/lib/db";

async function authorize(request: NextRequest) {
  if (!sameOrigin(request)) return { session: null, error: apiError("Invalid request origin.", 403) };
  const session = await getBranchSession();
  return session
    ? { session, error: null }
    : { session: null, error: apiError("Your branch session has expired.", 401) };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.error || !auth.session) return auth.error;
  const [notifications, total] = await Promise.all([
    rows<RowDataPacket>(`SELECT n.id,n.notification_kind AS kind,n.title,n.body,n.deliver_at AS deliveredAt,
      v.id AS visitId,v.contact_external_id AS contactId,v.contact_name AS contactName,v.contact_mobile AS contactMobile,
      v.contact_city AS contactCity,v.branch_name AS branchName,v.branch_area AS branchArea,v.branch_city AS branchCity,
      v.branch_address AS branchAddress,DATE_FORMAT(v.visit_date,'%Y-%m-%d') AS visitDate,
      TIME_FORMAT(v.visit_time,'%H:%i') AS visitTime,v.visit_timezone AS visitTimezone,r.read_at AS readAt
      FROM branch_visit_notifications n
      JOIN contact_branch_visits v ON v.id=n.visit_id
      LEFT JOIN branch_visit_notification_reads r ON r.notification_id=n.id AND r.employee_id=?
      WHERE n.branch_id=? AND n.deliver_at<=UTC_TIMESTAMP()
      ORDER BY n.deliver_at DESC,n.id DESC LIMIT 50`, [auth.session.employeeId, auth.session.branchId]),
    one<RowDataPacket>(`SELECT COUNT(*) AS unreadCount FROM branch_visit_notifications n
      LEFT JOIN branch_visit_notification_reads r ON r.notification_id=n.id AND r.employee_id=?
      WHERE n.branch_id=? AND n.deliver_at<=UTC_TIMESTAMP() AND r.notification_id IS NULL`,
    [auth.session.employeeId, auth.session.branchId]),
  ]);
  return NextResponse.json({ notifications, unreadCount: Number(total?.unreadCount || 0) });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.error || !auth.session) return auth.error;
  const body = await request.json().catch(() => ({}));
  const notificationId = Number(body.notificationId);
  if (!Number.isInteger(notificationId) || notificationId < 1) return apiError("Invalid notification.");
  const result = await execute(`INSERT INTO branch_visit_notification_reads (notification_id,employee_id,read_at)
    SELECT id,?,UTC_TIMESTAMP() FROM branch_visit_notifications WHERE id=? AND branch_id=? AND deliver_at<=UTC_TIMESTAMP()
    ON DUPLICATE KEY UPDATE read_at=VALUES(read_at)`, [auth.session.employeeId, notificationId, auth.session.branchId]);
  if (!result.affectedRows) return apiError("Notification not found.", 404);
  return NextResponse.json({ ok: true });
}
