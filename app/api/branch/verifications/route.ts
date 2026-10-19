import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanPhone, cleanText, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { execute, one, rows, transaction } from "@/lib/db";
import { notifyTe } from "@/lib/verification-push";

async function branchAuth(request: NextRequest) {
  if (!sameOrigin(request)) return { session: null, error: apiError("Invalid request origin.", 403) };
  const session = await getBranchSession();
  return session ? { session, error: null } : { session: null, error: apiError("Your branch session has expired.", 401) };
}

export async function GET(request: NextRequest) {
  const auth = await branchAuth(request);
  if (auth.error || !auth.session) return auth.error;
  const customerId = Number(request.nextUrl.searchParams.get("customerId") || 0);
  const [tes, notifications, requests] = await Promise.all([
    rows<RowDataPacket>(`SELECT id,user_id AS userId,name,phone,
      (SELECT COUNT(*) FROM customer_verification_requests r WHERE r.te_user_id=te_users.id AND r.status IN ('assigned','in_progress')) AS openCount
      FROM te_users WHERE active=1 ORDER BY openCount,name`),
    rows<RowDataPacket>(`SELECT n.id,n.title,n.body,n.verification_request_id AS requestId,n.read_at AS readAt,n.created_at AS createdAt,
      r.status,c.name AS customerName,u.name AS teName FROM branch_notifications n
      LEFT JOIN customer_verification_requests r ON r.id=n.verification_request_id
      LEFT JOIN customers c ON c.id=r.customer_id LEFT JOIN te_users u ON u.id=r.te_user_id
      WHERE n.branch_id=? AND n.employee_id=? ORDER BY n.id DESC LIMIT 50`, [auth.session.branchId, auth.session.employeeId]),
    customerId > 0 ? rows<RowDataPacket>(`SELECT r.id,r.status,r.bm_phone AS bmPhone,r.request_notes AS requestNotes,
      r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,r.assigned_at AS assignedAt,r.completed_at AS completedAt,
      u.name AS teName,u.user_id AS teUserId FROM customer_verification_requests r JOIN te_users u ON u.id=r.te_user_id
      WHERE r.customer_id=? AND r.branch_id=? ORDER BY r.id DESC LIMIT 10`, [customerId, auth.session.branchId]) : Promise.resolve([]),
  ]);
  return NextResponse.json({ tes, notifications, requests });
}

export async function POST(request: NextRequest) {
  const auth = await branchAuth(request);
  if (auth.error || !auth.session) return auth.error;
  const body = await request.json().catch(() => ({}));
  const customerId = Number(body.customerId);
  const teUserId = Number(body.teUserId);
  const bmPhone = cleanPhone(body.bmPhone);
  const notes = cleanText(body.notes, 1000);
  if (!Number.isInteger(customerId) || customerId < 1 || !Number.isInteger(teUserId) || teUserId < 1) return apiError("Select a customer and TE.");
  if (bmPhone.length !== 10) return apiError("Enter the branch manager's valid 10-digit mobile number.");
  const company = await one<RowDataPacket>("SELECT id FROM companies WHERE slug='aryan-gold' LIMIT 1");
  if (!company) return apiError("Aryan Gold company configuration is unavailable.", 503);
  const customer = await one<RowDataPacket>("SELECT id,name FROM customers WHERE id=? AND company_id=?", [customerId, Number(company.id)]);
  if (!customer) return apiError("Customer not found.", 404);
  const te = await one<RowDataPacket>("SELECT id,name FROM te_users WHERE id=? AND active=1", [teUserId]);
  if (!te) return apiError("The selected TE account is unavailable.", 409);
  const created = await transaction(async (connection) => {
    await one<RowDataPacket>("SELECT id FROM customers WHERE id=? FOR UPDATE", [customerId], connection);
    const active = await one<RowDataPacket>("SELECT id FROM customer_verification_requests WHERE customer_id=? AND status IN ('assigned','in_progress') LIMIT 1 FOR UPDATE", [customerId], connection);
    if (active) return null;
    const result = await execute(`INSERT INTO customer_verification_requests
      (company_id,customer_id,te_user_id,branch_id,branch_name,bm_employee_id,bm_name,bm_phone,request_notes)
      VALUES (?,?,?,?,?,?,?,?,?)`, [Number(company.id), customerId, teUserId, auth.session.branchId, auth.session.branchName,
      auth.session.employeeId, auth.session.employeeName, bmPhone, notes || null], connection);
    return result.insertId;
  });
  if (!created) return apiError("This customer already has an active verification request.", 409);
  const push = await notifyTe(teUserId, created, String(customer.name), auth.session.branchName).catch(() => ({ configured: false, delivered: 0 }));
  const delivery = push.delivered ? " Phone notification sent." : " It is available in the Aryan Verification app.";
  return NextResponse.json({ ok: true, requestId: created, message: `Verification assigned to ${te.name}.${delivery}` }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await branchAuth(request);
  if (auth.error || !auth.session) return auth.error;
  const body = await request.json().catch(() => ({}));
  const id = Number(body.notificationId);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid notification.");
  await execute("UPDATE branch_notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE id=? AND branch_id=? AND employee_id=?",
    [id, auth.session.branchId, auth.session.employeeId]);
  return NextResponse.json({ ok: true });
}
