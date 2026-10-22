import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { execute, one, rows } from "@/lib/db";
import { verificationViewer } from "@/lib/verification-access";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return apiError("Invalid verification request.");
  const viewer = await verificationViewer(id);
  if (!viewer) return apiError("Verification request not found or unavailable.", 404);

  const verification = await one<RowDataPacket>(`SELECT r.id,r.status,r.branch_id AS branchId,r.branch_name AS branchName,
    r.bm_name AS bmName,r.bm_phone AS bmPhone,r.request_notes AS requestNotes,
    r.authentication_person_name AS authenticationPersonName,r.authentication_person_relationship AS authenticationPersonRelationship,
    r.authentication_person_phone AS authenticationPersonPhone,r.verification_notes AS verificationNotes,r.failure_reason AS failureReason,
    r.latitude,r.longitude,r.assigned_at AS assignedAt,r.started_at AS startedAt,r.completed_at AS completedAt,
    c.id AS customerId,c.name AS customerName,c.phone AS customerPhone,c.address AS customerAddress,c.city AS customerCity,
    c.state AS customerState,c.postal_code AS customerPostalCode,c.recommendation_name AS recommendationName,
    c.recommendation_relationship AS recommendationRelationship,c.recommendation_phone AS recommendationPhone,
    c.recommendation_address AS recommendationAddress,u.name AS teName,u.user_id AS teUserId
    FROM customer_verification_requests r JOIN customers c ON c.id=r.customer_id AND c.company_id=r.company_id
    JOIN te_users u ON u.id=r.te_user_id WHERE r.id=?`, [id]);
  if (!verification) return apiError("Verification request not found.", 404);

  const [photos, videos, references] = await Promise.all([
    rows<RowDataPacket>(`SELECT id,original_name AS originalName,mime_type AS mimeType,latitude,longitude,captured_at AS capturedAt,created_at AS createdAt
      FROM customer_verification_photos WHERE request_id=? ORDER BY id`, [id]),
    rows<RowDataPacket>(`SELECT id,duration_ms AS durationMs,byte_size AS byteSize,latitude,longitude,captured_at AS capturedAt,created_at AS createdAt
      FROM customer_verification_videos WHERE request_id=? ORDER BY id`, [id]),
    rows<RowDataPacket>(`SELECT id,name,relationship,phone,notes FROM customer_verification_references WHERE request_id=? ORDER BY id`, [id]),
  ]);

  if (["verified", "could_not_verify"].includes(String(verification.status))) {
    await execute(`INSERT INTO verification_result_views (request_id,viewer_role,viewer_key,viewed_at)
      VALUES (?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE viewed_at=UTC_TIMESTAMP()`, [id, viewer.role, viewer.key]);
  }
  return NextResponse.json({ verification, photos, videos, references, viewerRole: viewer.role });
}
