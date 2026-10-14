import type { RowDataPacket } from "mysql2";
import type { NextRequest } from "next/server";
import { apiError, sameOrigin } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getBranchSession } from "@/lib/branch-auth";
import { one } from "@/lib/db";

export type BusinessActor = {
  companyId: number;
  companySlug: string;
  companyName: string;
  companyShortName: string;
  companyLogo: string;
  adminId: number | null;
  branchId: string | null;
  employeeId: string | null;
};

export async function businessAuthenticated(request: NextRequest) {
  if (!sameOrigin(request)) return { error: apiError("Invalid request origin.", 403), actor: null };
  const isBranchRequest = request.nextUrl.pathname.startsWith("/api/branch/");
  const admin = isBranchRequest ? null : await getSession();
  if (admin) return { error: null, actor: { companyId: admin.companyId, companySlug: admin.companySlug, companyName: admin.companyName,
    companyShortName: admin.companyShortName, companyLogo: admin.companyLogo, adminId: admin.adminId, branchId: null, employeeId: null } satisfies BusinessActor };
  const branch = isBranchRequest ? await getBranchSession() : null;
  if (!branch) return { error: apiError("Your session has expired.", 401), actor: null };
  const company = await one<RowDataPacket>("SELECT id,name,short_name AS shortName,logo_path AS logoPath FROM companies WHERE slug='aryan-gold' LIMIT 1");
  if (!company) return { error: apiError("Aryan Gold company configuration is unavailable.", 503), actor: null };
  return { error: null, actor: { companyId: Number(company.id), companySlug: "aryan-gold", companyName: String(company.name),
    companyShortName: String(company.shortName), companyLogo: String(company.logoPath), adminId: null,
    branchId: branch.branchId, employeeId: branch.employeeId } satisfies BusinessActor };
}
