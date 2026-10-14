import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getAccountsSession } from "@/lib/accounts-auth";
import { getAttendanceDirectory } from "@/lib/attendance";
import { apiError, cleanText, sameOrigin } from "@/lib/api";
import { decryptSensitive, execute, one, rows, transaction } from "@/lib/db";

async function authorized(request: NextRequest) {
  if (!sameOrigin(request)) return { session: null, error: apiError("Invalid request origin.", 403) };
  const session = await getAccountsSession();
  return session ? { session, error: null } : { session: null, error: apiError("Your Accounts session has expired.", 401) };
}

function accountNumber(value: unknown) {
  if (!value) return "";
  try { return decryptSensitive(String(value)); } catch { return ""; }
}

export async function GET(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const payments = await rows<RowDataPacket>(`SELECT bp.id AS paymentId,bp.payment_method AS paymentMethod,bp.amount_paise AS amountPaise,
    bp.reference_text AS referenceText,bp.account_number AS accountNumber,bp.ifsc_code AS ifscCode,bp.upi_id AS upiId,
    bp.payment_status AS paymentStatus,bp.utr_number AS utrNumber,bp.paid_at AS paidAt,
    b.id AS billId,b.bill_number AS billNumber,DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS billDate,
    t.id AS transactionId,t.branch_id AS branchId,t.created_by_employee_id AS employeeId,t.reviewed_at AS billedAt,
    c.name AS customerName,c.phone AS customerPhone,paid_user.name AS paidBy
    FROM bill_payments bp JOIN bills b ON b.id=bp.bill_id
    JOIN branch_transactions t ON t.bill_id=b.id AND t.status='billed'
    JOIN customers c ON c.id=b.customer_id
    LEFT JOIN accounts_users paid_user ON paid_user.id=bp.paid_by_account_user_id
    WHERE b.transaction_type='purchase' AND bp.payment_method IN ('upi','bank_transfer')
    ORDER BY (bp.payment_status='pending') DESC,t.reviewed_at DESC,bp.id DESC`);
  let directoryError = "";
  try {
    const directory = await getAttendanceDirectory();
    const employees = new Map(directory.employees.map(employee => [String(employee.employeeId), employee]));
    const branches = new Map(directory.branches.map(branch => [String(branch.branchId), branch]));
    for (const payment of payments) {
      const employee = employees.get(String(payment.employeeId)), branch = branches.get(String(payment.branchId));
      payment.branchName = branch?.branchName || payment.branchId;
      payment.branchContact = employee?.contact || "";
    }
  } catch (error) { directoryError = error instanceof Error ? error.message : "Attendance directory is unavailable."; }
  return NextResponse.json({ payments: payments.map(payment => ({ ...payment, accountNumber: accountNumber(payment.accountNumber) })), directoryError });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const body = await request.json().catch(() => ({}));
  const paymentId = Number(body.paymentId), utrNumber = cleanText(body.utrNumber, 100).toUpperCase();
  if (!Number.isInteger(paymentId) || paymentId <= 0) return apiError("Invalid payment record.");
  if (!/^[A-Z0-9][A-Z0-9\-/]{3,99}$/.test(utrNumber)) return apiError("Enter a valid UTR or transaction reference number.");
  try {
    await transaction(async connection => {
      const payment = await one<RowDataPacket>(`SELECT bp.id FROM bill_payments bp JOIN bills b ON b.id=bp.bill_id
        JOIN branch_transactions t ON t.bill_id=b.id
        WHERE bp.id=? AND bp.payment_method IN ('upi','bank_transfer') AND bp.payment_status='pending'
        AND b.transaction_type='purchase' AND t.status='billed' FOR UPDATE`, [paymentId], connection);
      if (!payment) throw new Error("PAYMENT_UNAVAILABLE");
      await execute("UPDATE bill_payments SET payment_status='paid',utr_number=?,paid_by_account_user_id=?,paid_at=UTC_TIMESTAMP() WHERE id=?",
        [utrNumber, auth.session.userId, paymentId], connection);
    });
  } catch (error) {
    if (String(error).includes("PAYMENT_UNAVAILABLE")) return apiError("This payment was already completed or is no longer available.", 409);
    throw error;
  }
  return NextResponse.json({ ok: true, message: "Payment marked as paid and shared with the branch." });
}
