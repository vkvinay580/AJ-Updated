import "server-only";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, sameOrigin } from "@/lib/api";
import { getSession, type AdminSession } from "@/lib/auth";
import { one } from "@/lib/db";
import { getHeadOfficeSession } from "@/lib/head-office-auth";

export type OperationsAccess = {
  mode: "admin" | "floor";
  session: AdminSession;
};

type FloorActorRow = RowDataPacket & {
  adminId: number;
  companyId: number;
  companySlug: string;
  companyName: string;
  companyShortName: string;
  companyLogo: string;
};

export async function getOperationsAccess(): Promise<OperationsAccess | null> {
  const headOffice = await getHeadOfficeSession();
  if (headOffice?.role === "floor") {
    const actor = await one<FloorActorRow>(`SELECT u.operations_admin_id AS adminId,c.id AS companyId,c.slug AS companySlug,
      c.name AS companyName,c.short_name AS companyShortName,c.logo_path AS companyLogo
      FROM head_office_users u JOIN companies c ON c.slug='aryan-gold'
      WHERE u.id=? AND u.active=1 AND u.operations_admin_id IS NOT NULL`, [headOffice.userId]);
    if (!actor) return null;
    return {
      mode: "floor",
      session: {
        sessionId: headOffice.sessionId,
        adminId: Number(actor.adminId),
        adminName: headOffice.name,
        email: headOffice.username,
        companyId: Number(actor.companyId),
        companySlug: actor.companySlug,
        companyName: actor.companyName,
        companyShortName: "FLOOR",
        companyLogo: actor.companyLogo,
      },
    };
  }

  const admin = await getSession();
  return admin ? { mode: "admin", session: admin } : null;
}

export async function requireOperationsAccess() {
  const access = await getOperationsAccess();
  if (!access) redirect("/login");
  return access;
}

export async function authenticatedForOperations(request: NextRequest) {
  if (!sameOrigin(request)) return { error: apiError("Invalid request origin.", 403), access: null };
  const access = await getOperationsAccess();
  if (!access) return { error: apiError("Your session has expired.", 401), access: null };
  return { error: null, access };
}
