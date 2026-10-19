import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, authenticated, cleanPhone, cleanText, requestIp } from "@/lib/api";
import { execute, hashPassword, one, rows, transaction } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const [tes, requests] = await Promise.all([
    rows<RowDataPacket>(`SELECT id,user_id AS userId,name,phone,active,created_at AS createdAt,
      (SELECT COUNT(*) FROM customer_verification_requests r WHERE r.te_user_id=te_users.id AND r.status IN ('assigned','in_progress')) AS openCount
      FROM te_users ORDER BY active DESC,name`),
    rows<RowDataPacket>(`SELECT r.id,r.status,r.branch_id AS branchId,r.branch_name AS branchName,r.bm_name AS bmName,r.bm_phone AS bmPhone,
      r.request_notes AS requestNotes,r.authentication_person_name AS authenticationPersonName,
      r.authentication_person_relationship AS authenticationPersonRelationship,r.authentication_person_phone AS authenticationPersonPhone,
      r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,r.assigned_at AS assignedAt,
      r.started_at AS startedAt,r.completed_at AS completedAt,c.id AS customerId,c.name AS customerName,c.phone AS customerPhone,
      c.address AS customerAddress,c.city,c.state,u.id AS teId,u.user_id AS teUserId,u.name AS teName,
      (SELECT COUNT(*) FROM customer_verification_photos p WHERE p.request_id=r.id) AS photoCount,
      (SELECT COUNT(*) FROM customer_verification_references ref WHERE ref.request_id=r.id) AS referenceCount
      FROM customer_verification_requests r JOIN customers c ON c.id=r.customer_id AND c.company_id=r.company_id
      JOIN te_users u ON u.id=r.te_user_id WHERE r.company_id=? ORDER BY r.id DESC LIMIT 300`, [session.companyId]),
  ]);
  return NextResponse.json({ tes, requests });
}

export async function POST(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const body = await request.json().catch(() => ({}));
  const action = cleanText(body.action, 30);
  if (action === "create-te") {
    const userId = cleanText(body.userId, 100).toLowerCase();
    const name = cleanText(body.name, 190);
    const phone = cleanPhone(body.phone);
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{3,100}$/.test(userId)) return apiError("TE user ID must contain 3–100 letters, numbers, dots, underscores, or hyphens.");
    if (name.length < 2) return apiError("Enter the TE name.");
    if (phone && phone.length !== 10) return apiError("Enter a valid 10-digit TE phone number.");
    if (password.length < 8) return apiError("TE passwords must have at least 8 characters.");
    try {
      const result = await transaction(async (connection) => {
        const created = await execute("INSERT INTO te_users (user_id,name,phone,password_hash,created_by) VALUES (?,?,?,?,?)",
          [userId, name, phone || null, hashPassword(password), session.adminId], connection);
        await execute("INSERT INTO audit_logs (admin_id,company_id,action,entity_type,entity_id,ip_address) VALUES (?,?,'te_user_created','te_user',?,?)",
          [session.adminId, session.companyId, created.insertId, requestIp(request)], connection);
        return created;
      });
      return NextResponse.json({ ok: true, id: result.insertId, message: `TE ${name} created.` }, { status: 201 });
    } catch (caught) {
      if (String(caught).includes("uq_te_users_user_id") || String(caught).includes("Duplicate entry")) return apiError("This TE user ID already exists.", 409);
      throw caught;
    }
  }
  if (action === "update-te") {
    const id = Number(body.id);
    const name = cleanText(body.name, 190);
    const phone = cleanPhone(body.phone);
    const password = String(body.password || "");
    const active = body.active !== false;
    if (!Number.isInteger(id) || id < 1 || name.length < 2 || (phone && phone.length !== 10) || (password && password.length < 8)) return apiError("Enter valid TE details. New passwords require at least 8 characters.");
    const existing = await one<RowDataPacket>("SELECT id FROM te_users WHERE id=?", [id]);
    if (!existing) return apiError("TE not found.", 404);
    if (password) await execute("UPDATE te_users SET name=?,phone=?,password_hash=?,active=? WHERE id=?", [name, phone || null, hashPassword(password), active, id]);
    else await execute("UPDATE te_users SET name=?,phone=?,active=? WHERE id=?", [name, phone || null, active, id]);
    if (!active || password) await execute("DELETE FROM te_sessions WHERE te_user_id=?", [id]);
    await execute("INSERT INTO audit_logs (admin_id,company_id,action,entity_type,entity_id,ip_address) VALUES (?,?,'te_user_updated','te_user',?,?)",
      [session.adminId, session.companyId, id, requestIp(request)]);
    return NextResponse.json({ ok: true, message: "TE account updated." });
  }
  return apiError("Unknown verification administration action.");
}
