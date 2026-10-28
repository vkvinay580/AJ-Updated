import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@/lib/api";
import { mysqlUtc, parseContactBranchVisit } from "@/lib/branch-visits";
import { execute, one, transaction } from "@/lib/db";

function authorized(request: NextRequest) {
  const expected = process.env.CONTACT_VISIT_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-webhook-secret")?.trim() || "";
  const expectedDigest = createHash("sha256").update(expected).digest();
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

export async function POST(request: NextRequest) {
  if (!process.env.CONTACT_VISIT_WEBHOOK_SECRET?.trim()) {
    return apiError("Contact visit webhook is not configured.", 503);
  }
  if (!authorized(request)) return apiError("Invalid webhook credentials.", 401);

  const payload = await request.json().catch(() => null);
  let visit;
  try {
    visit = parseContactBranchVisit(payload);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Invalid contact visit payload.");
  }

  const result = await transaction(async (connection) => {
    const existing = await one<RowDataPacket>("SELECT id FROM contact_branch_visits WHERE event_key=? FOR UPDATE", [visit.eventKey], connection);
    if (existing) return { id: Number(existing.id), duplicate: true };

    const created = await execute(`INSERT INTO contact_branch_visits
      (event_key,event_name,status,contact_external_id,contact_name,contact_mobile,contact_city,
       branch_id,branch_name,branch_area,branch_city,branch_address,visit_date,visit_time,visit_timezone,visit_at_utc,received_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())`, [
      visit.eventKey, visit.event, visit.status, visit.contact.id, visit.contact.name, visit.contact.mobile, visit.contact.city || null,
      visit.branch.id, visit.branch.name, visit.branch.area || null, visit.branch.city || null, visit.branch.address || null,
      visit.visit.date, `${visit.visit.time}:00`, visit.visit.timezone, mysqlUtc(visit.visit.atUtc),
    ], connection);
    const visitId = created.insertId;
    const formattedTime = `${visit.visit.date} at ${visit.visit.time} (${visit.visit.timezone})`;
    const notifications = [
      ["arrival", "Customer visit scheduled", `${visit.contact.name} is coming to ${visit.branch.name} branch on ${formattedTime}.`, new Date()],
      ["30_minutes", "Customer arriving in 30 minutes", `${visit.contact.name} is expected at ${visit.branch.name} branch at ${visit.visit.time}.`, new Date(visit.visit.atUtc.getTime() - 30 * 60 * 1000)],
      ["15_minutes", "Customer arriving in 15 minutes", `${visit.contact.name} is expected at ${visit.branch.name} branch at ${visit.visit.time}.`, new Date(visit.visit.atUtc.getTime() - 15 * 60 * 1000)],
    ] as const;
    for (const [kind, title, body, deliverAt] of notifications) {
      await execute(`INSERT INTO branch_visit_notifications
        (visit_id,branch_id,notification_kind,title,body,deliver_at) VALUES (?,?,?,?,?,?)`,
      [visitId, visit.branch.id, kind, title, body, mysqlUtc(deliverAt)], connection);
    }
    return { id: visitId, duplicate: false };
  });

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    visitId: result.id,
    branchId: visit.branch.id,
    visitAt: visit.visit.atUtc.toISOString(),
    message: result.duplicate ? "This visit was already received." : "Visit received and branch notifications scheduled.",
  }, { status: result.duplicate ? 200 : 201 });
}
