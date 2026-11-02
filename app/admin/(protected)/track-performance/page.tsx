import type { RowDataPacket } from "mysql2";
import TrackPerformance, { type PerformanceCustomer } from "@/components/admin/TrackPerformance";
import { getAttendanceBranches } from "@/lib/attendance";
import { requireSession } from "@/lib/auth";
import { rows } from "@/lib/db";

type PerformanceRow = RowDataPacket & {
  id: number; name: string; phone: string; branchId: string; employeeId: string | null;
  joinedAt: Date | string; valuationAt: Date | string | null; billId: number | null;
  billNumber: string | null; billedAt: Date | string | null; paymentAt: Date | string | null;
  notBilledAt: Date | string | null;
};
type BranchNameRow = RowDataPacket & { branchId: string; branchName: string };

function timestamp(value: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default async function TrackPerformancePage() {
  const session = await requireSession();
  const [customerRows, sessionBranches, verificationBranches, attendanceBranches] = await Promise.all([
    rows<PerformanceRow>(`SELECT
      c.id,c.name,c.phone,c.origin_branch_id AS branchId,c.created_by_employee_id AS employeeId,
      c.created_at AS joinedAt,
      CASE WHEN q.created_at IS NULL THEN b.created_at WHEN b.created_at IS NULL THEN q.created_at
        ELSE LEAST(q.created_at,b.created_at) END AS valuationAt,
      b.id AS billId,b.bill_number AS billNumber,b.created_at AS billedAt,
      outcome.marked_at AS notBilledAt,
      CASE WHEN b.id IS NULL THEN NULL WHEN COALESCE(payments.tracked_count,0)=0 THEN b.created_at
        WHEN payments.pending_count=0 THEN COALESCE(payments.paid_at,b.created_at) ELSE NULL END AS paymentAt
    FROM customers c
    LEFT JOIN quotations q ON q.id=(SELECT q2.id FROM quotations q2
      WHERE q2.customer_id=c.id AND q2.company_id=c.company_id AND q2.origin_branch_id=c.origin_branch_id
      ORDER BY q2.created_at,q2.id LIMIT 1)
    LEFT JOIN bills b ON b.id=(SELECT b2.id FROM bills b2
      WHERE b2.customer_id=c.id AND b2.company_id=c.company_id AND b2.origin_branch_id=c.origin_branch_id
      ORDER BY b2.created_at,b2.id LIMIT 1)
    LEFT JOIN customer_workflow_outcomes outcome ON outcome.id=(SELECT outcome2.id FROM customer_workflow_outcomes outcome2
      WHERE outcome2.customer_id=c.id AND outcome2.company_id=c.company_id AND outcome2.status='not_billed'
      ORDER BY outcome2.outcome_date DESC,outcome2.id DESC LIMIT 1)
    LEFT JOIN (SELECT bill_id,SUM(payment_method IN ('upi','bank_transfer')) AS tracked_count,
      SUM(payment_method IN ('upi','bank_transfer') AND payment_status<>'paid') AS pending_count,
      MAX(CASE WHEN payment_method IN ('upi','bank_transfer') THEN paid_at END) AS paid_at
      FROM bill_payments GROUP BY bill_id) payments ON payments.bill_id=b.id
    WHERE c.company_id=? AND c.origin_branch_id IS NOT NULL AND c.origin_branch_id<>''
    ORDER BY c.created_at DESC,c.id DESC`, [session.companyId]),
    rows<BranchNameRow>(`SELECT s.branch_id AS branchId,s.branch_name AS branchName FROM branch_sessions s
      JOIN (SELECT branch_id,MAX(id) AS latest_id FROM branch_sessions GROUP BY branch_id) latest ON latest.latest_id=s.id`),
    rows<BranchNameRow>(`SELECT branch_id AS branchId,MAX(branch_name) AS branchName
      FROM customer_verification_requests WHERE company_id=? GROUP BY branch_id`, [session.companyId]),
    getAttendanceBranches(),
  ]);
  const branchNames = new Map<string, string>();
  for (const branch of verificationBranches) branchNames.set(String(branch.branchId), String(branch.branchName));
  for (const branch of sessionBranches) branchNames.set(String(branch.branchId), String(branch.branchName));
  for (const branch of attendanceBranches) branchNames.set(String(branch.branchId), String(branch.branchName));
  const customers: PerformanceCustomer[] = customerRows.map((customer) => ({
    id: Number(customer.id), name: String(customer.name), phone: String(customer.phone), branchId: String(customer.branchId),
    branchName: branchNames.get(String(customer.branchId)) || String(customer.branchId),
    employeeId: customer.employeeId ? String(customer.employeeId) : null,
    joinedAt: timestamp(customer.joinedAt) as string, valuationAt: timestamp(customer.valuationAt),
    billId: customer.billId ? Number(customer.billId) : null, billNumber: customer.billNumber ? String(customer.billNumber) : null,
    billedAt: timestamp(customer.billedAt), paymentAt: timestamp(customer.paymentAt), notBilledAt: timestamp(customer.notBilledAt),
  }));
  return <TrackPerformance customers={customers}/>;
}
