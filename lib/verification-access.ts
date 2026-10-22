import "server-only";
import type { RowDataPacket } from "mysql2";
import { getBranchSession } from "@/lib/branch-auth";
import { one } from "@/lib/db";
import { getOperationsAccess } from "@/lib/operations-auth";

export type VerificationViewer = {
  role: "admin" | "floor" | "branch";
  key: string;
  request: RowDataPacket;
};

export async function verificationViewer(requestId: number): Promise<VerificationViewer | null> {
  const operations = await getOperationsAccess();
  if (operations) {
    const request = await one<RowDataPacket>(
      "SELECT id,status,company_id AS companyId FROM customer_verification_requests WHERE id=? AND company_id=?",
      [requestId, operations.session.companyId],
    );
    return request ? { role: operations.mode, key: String(operations.session.adminId), request } : null;
  }

  const branch = await getBranchSession();
  if (!branch) return null;
  const request = await one<RowDataPacket>(
    `SELECT id,status,company_id AS companyId FROM customer_verification_requests
    WHERE id=? AND branch_id=?`,
    [requestId, branch.branchId],
  );
  return request ? { role: "branch", key: branch.branchId, request } : null;
}
