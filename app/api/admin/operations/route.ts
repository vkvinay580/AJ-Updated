import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { assignAttendanceEmployee, getAttendanceDirectory } from "@/lib/attendance";
import { apiError, cleanText } from "@/lib/api";
import { logAudit } from "@/lib/auth";
import { addFundEntry, addStockEntry, lockFundLedger, lockStockLedger } from "@/lib/branch-ledger";
import { execute, one, rows, transaction } from "@/lib/db";
import { authenticatedForOperations } from "@/lib/operations-auth";

const toPaise = (value: unknown) => Math.round(Number(value) * 100);

export async function GET(request: NextRequest) {
  const auth = await authenticatedForOperations(request);
  if (auth.error || !auth.access) return auth.error;
  let directory = null;
  let integrationError = "";
  try { directory = await getAttendanceDirectory(); }
  catch (error) { integrationError = error instanceof Error ? error.message : "Attendance service is unavailable."; }

  const [settings, transactions, funds, expenses, closings, goldTransfers, fundLedger, stockLedger, balances] = await Promise.all([
    one<RowDataPacket>("SELECT sale_rate_paise_per_gram AS saleRate,purchase_rate_paise_per_gram AS purchaseRate,updated_at AS updatedAt FROM business_settings WHERE id=1"),
    rows<RowDataPacket>(`SELECT t.id,t.bill_id AS billId,t.branch_id AS branchId,t.transaction_type AS type,t.business_mode AS businessMode,
      t.gold_weight_mg AS weightMg,t.rate_paise_per_gram AS ratePaise,t.amount_paise AS amountPaise,
      t.pledge_amount_paise AS pledgeAmountPaise,t.pledge_status AS pledgeStatus,b.release_place AS releasePlace,b.release_amount_paise AS releaseAmountPaise,
      COALESCE((SELECT SUM(bp.amount_paise) FROM bill_payments bp WHERE bp.bill_id=b.id AND bp.payment_method='cash'),CASE WHEN b.payment_method='cash' THEN t.amount_paise ELSE 0 END) AS cashPaymentPaise,
      COALESCE((SELECT SUM(bp.amount_paise) FROM bill_payments bp WHERE bp.bill_id=b.id AND bp.payment_method IN ('upi','bank_transfer')),CASE WHEN b.payment_method IN ('upi','bank_transfer') THEN t.amount_paise ELSE 0 END) AS onlinePaymentPaise,
      (t.pledge_document_path IS NOT NULL OR EXISTS(SELECT 1 FROM branch_pledge_documents d WHERE d.transaction_id=t.id)) AS hasPledgeDocument,t.status,t.notes,t.created_by_employee_id AS employeeId,
      t.created_at AS createdAt,c.name AS customerName,c.phone AS customerPhone FROM branch_transactions t
      JOIN branch_customers c ON c.id=t.customer_id LEFT JOIN bills b ON b.id=t.bill_id ORDER BY t.id DESC LIMIT 250`),
    rows<RowDataPacket>(`SELECT id,branch_id AS branchId,requested_amount_paise AS requestedPaise,approved_amount_paise AS approvedPaise,
      purpose,status,created_by_employee_id AS employeeId,admin_notes AS adminNotes,created_at AS createdAt FROM fund_requests ORDER BY id DESC LIMIT 250`),
    rows<RowDataPacket>(`SELECT id,branch_id AS branchId,DATE_FORMAT(expense_date,'%Y-%m-%d') AS expenseDate,category,amount_paise AS amountPaise,
      description,status,created_by_employee_id AS employeeId,admin_notes AS adminNotes,created_at AS createdAt FROM branch_expenses ORDER BY id DESC LIMIT 250`),
    rows<RowDataPacket>(`SELECT id,branch_id AS branchId,DATE_FORMAT(closing_date,'%Y-%m-%d') AS closingDate,
      opening_cash_paise AS openingCashPaise,transaction_count AS transactionCount,expenses_paise AS expensesPaise,
      gold_purchased_mg AS goldPurchasedMg,amount_paid_paise AS amountPaidPaise,gold_sent_to_ho_mg AS goldSentMg,
      gold_in_branch_stock_mg AS stockMg,notes,created_by_employee_id AS employeeId,submitted_at AS submittedAt
      FROM branch_daily_closings ORDER BY closing_date DESC,id DESC LIMIT 250`),
    rows<RowDataPacket>(`SELECT gt.id,gt.branch_id AS branchId,gt.weight_mg AS weightMg,gt.tare_weight_mg AS tareWeightMg,gt.bm_name AS bmName,gt.bm_phone AS bmPhone,gt.notes,gt.status,gt.created_by_employee_id AS employeeId,
      COUNT(DISTINCT ti.transaction_id) AS packetCount,
      gt.admin_notes AS adminNotes,gt.created_at AS createdAt FROM branch_gold_transfers gt LEFT JOIN branch_gold_transfer_items ti ON ti.transfer_id=gt.id
      GROUP BY gt.id ORDER BY gt.id DESC LIMIT 250`),
    rows<RowDataPacket>(`SELECT id,branch_id AS branchId,direction,amount_paise AS amountPaise,entry_type AS entryType,
      description,created_at AS createdAt FROM branch_fund_ledger ORDER BY id DESC LIMIT 300`),
    rows<RowDataPacket>(`SELECT id,branch_id AS branchId,direction,weight_mg AS weightMg,entry_type AS entryType,
      description,created_at AS createdAt FROM branch_stock_ledger ORDER BY id DESC LIMIT 300`),
    rows<RowDataPacket>(`SELECT b.branchId,
      COALESCE((SELECT SUM(CASE WHEN f.direction='credit' THEN f.amount_paise ELSE -f.amount_paise END) FROM branch_fund_ledger f WHERE f.branch_id=b.branchId),0) AS fundPaise,
      COALESCE((SELECT SUM(CASE WHEN s.direction='in' THEN s.weight_mg ELSE -s.weight_mg END) FROM branch_stock_ledger s WHERE s.branch_id=b.branchId),0) AS stockMg
      FROM (SELECT branch_id AS branchId FROM branch_transactions UNION SELECT branch_id FROM branch_fund_ledger UNION SELECT branch_id FROM branch_stock_ledger) b
      ORDER BY b.branchId`),
  ]);
  return NextResponse.json({ directory, integrationError, settings, transactions, funds, expenses, closings,
    goldTransfers, fundLedger, stockLedger, balances });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedForOperations(request);
  if (auth.error || !auth.access) return auth.error;
  const session = auth.access.session;
  const body = await request.json().catch(() => ({}));
  const action = cleanText(body.action, 40);

  if (action === "rates") {
    const sale = toPaise(body.saleRate);
    const purchase = toPaise(body.purchaseRate);
    if (!Number.isFinite(sale) || sale <= 0 || !Number.isFinite(purchase) || purchase <= 0) return apiError("Enter valid positive sale and purchase rates.");
    await execute("UPDATE business_settings SET sale_rate_paise_per_gram=?,purchase_rate_paise_per_gram=?,updated_by=? WHERE id=1", [sale, purchase, session.adminId]);
    await logAudit(session, "business_rates_updated", "business_settings", 1);
    return NextResponse.json({ ok: true, message: "Daily rates updated everywhere." });
  }

  if (action === "assignment") {
    const employeeId = cleanText(body.employeeId, 100);
    const branchId = cleanText(body.branchId, 100);
    const password = String(body.password || "");
    if (!employeeId || !branchId || (password && password.length < 6)) return apiError("Choose an employee and branch. New passwords must have at least 6 characters.");
    try {
      const result = await assignAttendanceEmployee({ employeeId, branchId, password: password || undefined });
      await logAudit(session, "employee_branch_assigned", "attendance_employee");
      return NextResponse.json({ ok: true, message: result.message });
    } catch (error) {
      return apiError(error instanceof Error ? error.message : "Unable to update Attendance.", 502);
    }
  }

  const id = Number(body.id);
  const status = cleanText(body.status, 20);
  const notes = cleanText(body.adminNotes, 500) || null;
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid record.");

  try {
    if (action === "transaction") {
      if (!["billed", "rejected"].includes(status)) return apiError("Choose billed or rejected.");
      await transaction(async (connection) => {
        const item = await one<RowDataPacket>(`SELECT t.id,t.branch_id AS branchId,t.transaction_type AS type,t.business_mode AS businessMode,
          t.gold_weight_mg AS weightMg,t.amount_paise AS amountPaise,t.pledge_amount_paise AS pledgeAmountPaise,t.pledge_status AS pledgeStatus,
          t.pledge_payment_method AS pledgePaymentMethod,b.payment_method AS paymentMethod,
          COALESCE((SELECT SUM(bp.amount_paise) FROM bill_payments bp WHERE bp.bill_id=b.id AND bp.payment_method='cash'),
            CASE WHEN b.payment_method='cash' THEN t.amount_paise ELSE 0 END) AS cashPaymentPaise,
          EXISTS(SELECT 1 FROM branch_fund_ledger f WHERE f.entry_type='purchase_submitted' AND f.reference_id=t.id AND f.direction='debit') AS cashReserved,
          COALESCE(b.release_amount_paise,t.pledge_amount_paise) AS releaseAmountPaise
          FROM branch_transactions t LEFT JOIN bills b ON b.id=t.bill_id WHERE t.id=? AND t.status IN ('submitted','transit') FOR UPDATE`, [id], connection);
        if (!item) throw new Error("ALREADY_REVIEWED");
        const branchId = String(item.branchId);
        if (status === "billed") {
          if (item.type === "purchase") {
            if (Number(item.cashPaymentPaise) > 0 && !Number(item.cashReserved)) {
              if (await lockFundLedger(branchId, connection) < Number(item.cashPaymentPaise)) throw new Error("INSUFFICIENT_FUNDS");
              await addFundEntry(connection, { branchId, direction: "debit", amountPaise: Number(item.cashPaymentPaise), entryType: "purchase_billed",
                referenceId: id, description: item.businessMode === "pledged" ? "Cash portion paid for released pledge purchase" : "Cash portion paid for walk-in gold purchase", adminId: session.adminId });
            }
            await addStockEntry(connection, { branchId, direction: "in", weightMg: Number(item.weightMg), entryType: "purchase_billed",
              referenceId: id, description: item.businessMode === "pledged" ? "Released pledge gold billed" : "Walk-in gold purchase billed", adminId: session.adminId });
          } else {
            if (await lockStockLedger(branchId, connection) < Number(item.weightMg)) throw new Error("INSUFFICIENT_STOCK");
            await addStockEntry(connection, { branchId, direction: "out", weightMg: Number(item.weightMg), entryType: "sale_billed",
              referenceId: id, description: "Gold sale billed", adminId: session.adminId });
            await addFundEntry(connection, { branchId, direction: "credit", amountPaise: Number(item.amountPaise), entryType: "sale_billed",
              referenceId: id, description: "Gold sale proceeds", adminId: session.adminId });
          }
        } else {
          if (Number(item.cashReserved) && Number(item.cashPaymentPaise) > 0) await addFundEntry(connection, { branchId, direction: "credit",
            amountPaise: Number(item.cashPaymentPaise), entryType: "purchase_rejected", referenceId: id,
            description: "Rejected purchase bill cash restored", adminId: session.adminId });
          if (item.businessMode === "pledged" && item.pledgeStatus === "released" && item.pledgePaymentMethod === "cash") {
            await addFundEntry(connection, { branchId, direction: "credit", amountPaise: Number(item.releaseAmountPaise), entryType: "pledge_admin_rejected",
              referenceId: id, description: "Rejected released pledge funds restored", adminId: session.adminId });
          }
        }
        await execute("UPDATE branch_transactions SET status=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?", [status, session.adminId, id], connection);
      });
    } else if (action === "fund") {
      if (!["approved", "rejected"].includes(status)) return apiError("Choose approved or rejected.");
      const approved = status === "approved" ? toPaise(body.approvedAmount) : null;
      if (status === "approved" && (!approved || approved <= 0)) return apiError("Enter a valid approved amount.");
      await transaction(async (connection) => {
        const item = await one<RowDataPacket>("SELECT id,branch_id AS branchId FROM fund_requests WHERE id=? AND status='pending' FOR UPDATE", [id], connection);
        if (!item) throw new Error("ALREADY_REVIEWED");
        await execute("UPDATE fund_requests SET status=?,approved_amount_paise=?,admin_notes=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?",
          [status, approved, notes, session.adminId, id], connection);
        if (status === "approved") await addFundEntry(connection, { branchId: String(item.branchId), direction: "credit", amountPaise: Number(approved),
          entryType: "fund_request_approved", referenceId: id, description: "Fund request approved", adminId: session.adminId });
      });
    } else if (action === "expense") {
      if (!["approved", "rejected"].includes(status)) return apiError("Choose approved or rejected.");
      await transaction(async (connection) => {
        const item = await one<RowDataPacket>("SELECT id,branch_id AS branchId,amount_paise AS amountPaise FROM branch_expenses WHERE id=? AND status='pending' FOR UPDATE", [id], connection);
        if (!item) throw new Error("ALREADY_REVIEWED");
        if (status === "approved" && await lockFundLedger(String(item.branchId), connection) < Number(item.amountPaise)) throw new Error("INSUFFICIENT_FUNDS");
        await execute("UPDATE branch_expenses SET status=?,admin_notes=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?",
          [status, notes, session.adminId, id], connection);
        if (status === "approved") await addFundEntry(connection, { branchId: String(item.branchId), direction: "debit", amountPaise: Number(item.amountPaise),
          entryType: "expense_approved", referenceId: id, description: "Branch expense approved", adminId: session.adminId });
      });
    } else if (action === "gold-transfer") {
      if (!["received", "rejected"].includes(status)) return apiError("Choose received or rejected.");
      await transaction(async (connection) => {
        const item = await one<RowDataPacket>("SELECT id,branch_id AS branchId,weight_mg AS weightMg FROM branch_gold_transfers WHERE id=? AND status='submitted' FOR UPDATE", [id], connection);
        if (!item) throw new Error("ALREADY_REVIEWED");
        await execute("UPDATE branch_gold_transfers SET status=?,admin_notes=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?",
          [status, notes, session.adminId, id], connection);
        if (status === "rejected") await addStockEntry(connection, { branchId: String(item.branchId), direction: "in", weightMg: Number(item.weightMg),
          entryType: "ho_transfer_rejected", referenceId: id, description: "Rejected Head Office transfer restored", adminId: session.adminId });
      });
    } else {
      return apiError("Unknown operation.");
    }
  } catch (error) {
    const message = String(error);
    if (message.includes("ALREADY_REVIEWED")) return apiError("This record has already been reviewed.", 409);
    if (message.includes("INSUFFICIENT_FUNDS")) return apiError("The branch does not have enough available funds for this approval.", 409);
    if (message.includes("INSUFFICIENT_STOCK")) return apiError("The branch does not have enough available gold stock for this approval.", 409);
    throw error;
  }

  await logAudit(session, `${action}_${status}`, action, id);
  return NextResponse.json({ ok: true, message: "Review saved and ledger updated." });
}
