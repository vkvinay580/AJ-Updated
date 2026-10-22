import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanPhone, cleanText, sameOrigin } from "@/lib/api";
import { getBranchSession } from "@/lib/branch-auth";
import { addFundEntry, addStockEntry, fundBalance, lockStockLedger, stockBalance } from "@/lib/branch-ledger";
import { execute, one, rows, transaction, type DatabaseValue } from "@/lib/db";

const paise = (value: unknown) => Math.round(Number(value) * 100);
const milligrams = (value: unknown) => Math.round(Number(value) * 1000);
const positive = (value: number) => Number.isFinite(value) && value > 0;
const nonNegative = (value: number) => Number.isFinite(value) && value >= 0;

async function authorized(request: NextRequest) {
  if (!sameOrigin(request)) return { session: null, error: apiError("Invalid request origin.", 403) };
  const session = await getBranchSession();
  return session ? { session, error: null } : { session: null, error: apiError("Your branch session has expired.", 401) };
}

function value(body: Record<string, unknown> | FormData, key: string) {
  return body instanceof FormData ? body.get(key) : body[key];
}

export async function GET(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const branchId = auth.session.branchId;
  const [settings, customers, transactions, pledgeDocuments, funds, expenses, closings, fundLedger, stockLedger, goldTransfers, eligibleTransferItems, verificationNotifications, availableFunds, availableStock] = await Promise.all([
    one<RowDataPacket>(`SELECT
      sale_rate_999_paise_per_gram AS saleRate999,purchase_rate_999_paise_per_gram AS purchaseRate999,
      sale_rate_916_paise_per_gram AS saleRate916,purchase_rate_916_paise_per_gram AS purchaseRate916,
      sale_rate_750_paise_per_gram AS saleRate750,purchase_rate_750_paise_per_gram AS purchaseRate750,
      updated_at AS updatedAt FROM business_settings WHERE id=1`),
    rows<RowDataPacket>("SELECT id,name,phone,address,created_at AS createdAt FROM branch_customers WHERE branch_id=? ORDER BY id DESC LIMIT 100", [branchId]),
    rows<RowDataPacket>(`SELECT t.id,t.bill_id AS billId,t.transaction_type AS type,t.business_mode AS businessMode,t.gold_weight_mg AS weightMg,
      t.rate_paise_per_gram AS ratePaise,t.amount_paise AS amountPaise,t.pledge_amount_paise AS pledgeAmountPaise,
      t.pledge_payment_method AS pledgePaymentMethod,t.pledge_status AS pledgeStatus,
      COALESCE((SELECT SUM(bp.amount_paise) FROM bill_payments bp WHERE bp.bill_id=t.bill_id AND bp.payment_method IN ('upi','bank_transfer')),0) AS onlinePaymentPaise,
      COALESCE((SELECT SUM(bp.amount_paise) FROM bill_payments bp WHERE bp.bill_id=t.bill_id AND bp.payment_method IN ('upi','bank_transfer') AND bp.payment_status='paid'),0) AS paidOnlinePaymentPaise,
      CASE WHEN NOT EXISTS(SELECT 1 FROM bill_payments bp WHERE bp.bill_id=t.bill_id AND bp.payment_method IN ('upi','bank_transfer')) THEN 'not_required'
        WHEN NOT EXISTS(SELECT 1 FROM bill_payments bp WHERE bp.bill_id=t.bill_id AND bp.payment_method IN ('upi','bank_transfer') AND bp.payment_status<>'paid') THEN 'paid' ELSE 'pending' END AS onlinePaymentStatus,
      (t.pledge_document_path IS NOT NULL OR EXISTS(SELECT 1 FROM branch_pledge_documents d WHERE d.transaction_id=t.id)) AS hasPledgeDocument,t.status,t.notes,
      t.created_at AS createdAt,c.name AS customerName FROM branch_transactions t JOIN branch_customers c ON c.id=t.customer_id
      WHERE t.branch_id=? ORDER BY t.id DESC LIMIT 100`, [branchId]),
    rows<RowDataPacket>(`SELECT d.id,d.transaction_id AS transactionId,d.document_name AS documentName
      FROM branch_pledge_documents d JOIN branch_transactions t ON t.id=d.transaction_id WHERE t.branch_id=? ORDER BY d.id`, [branchId]),
    rows<RowDataPacket>("SELECT id,requested_amount_paise AS requestedPaise,approved_amount_paise AS approvedPaise,purpose,status,admin_notes AS adminNotes,created_at AS createdAt FROM fund_requests WHERE branch_id=? ORDER BY id DESC LIMIT 100", [branchId]),
    rows<RowDataPacket>("SELECT id,DATE_FORMAT(expense_date,'%Y-%m-%d') AS expenseDate,category,amount_paise AS amountPaise,description,status,admin_notes AS adminNotes,created_at AS createdAt FROM branch_expenses WHERE branch_id=? ORDER BY id DESC LIMIT 100", [branchId]),
    rows<RowDataPacket>(`SELECT id,DATE_FORMAT(closing_date,'%Y-%m-%d') AS closingDate,opening_cash_paise AS openingCashPaise,
      transaction_count AS transactionCount,expenses_paise AS expensesPaise,gold_purchased_mg AS goldPurchasedMg,
      amount_paid_paise AS amountPaidPaise,gold_sent_to_ho_mg AS goldSentMg,gold_in_branch_stock_mg AS stockMg,
      notes,submitted_at AS submittedAt FROM branch_daily_closings WHERE branch_id=? ORDER BY closing_date DESC LIMIT 31`, [branchId]),
    rows<RowDataPacket>(`SELECT id,direction,amount_paise AS amountPaise,entry_type AS entryType,description,created_at AS createdAt
      FROM branch_fund_ledger WHERE branch_id=? ORDER BY id DESC LIMIT 150`, [branchId]),
    rows<RowDataPacket>(`SELECT id,direction,weight_mg AS weightMg,entry_type AS entryType,description,created_at AS createdAt
      FROM branch_stock_ledger WHERE branch_id=? ORDER BY id DESC LIMIT 150`, [branchId]),
    rows<RowDataPacket>(`SELECT gt.id,gt.weight_mg AS weightMg,gt.tare_weight_mg AS tareWeightMg,gt.bm_name AS bmName,gt.bm_phone AS bmPhone,gt.notes,gt.status,gt.admin_notes AS adminNotes,gt.created_at AS createdAt,
      COUNT(ti.id) AS itemCount,COUNT(DISTINCT ti.transaction_id) AS packetCount,COUNT(DISTINCT ti.bill_id) AS billCount FROM branch_gold_transfers gt
      LEFT JOIN branch_gold_transfer_items ti ON ti.transfer_id=gt.id WHERE gt.branch_id=? GROUP BY gt.id ORDER BY gt.id DESC LIMIT 100`, [branchId]),
    rows<RowDataPacket>(`SELECT bi.id AS billItemId,t.id AS transactionId,b.id AS billId,b.bill_number AS billNumber,
      DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS billDate,c.name AS customerName,bi.description,bi.item_description AS itemDescription,
      bi.purity,bi.gross_weight_mg AS grossWeightMg,bi.stone_weight_mg AS stoneWeightMg,bi.weight_mg AS weightMg
      FROM branch_transactions t JOIN bills b ON b.id=t.bill_id JOIN customers c ON c.id=b.customer_id
      JOIN bill_items bi ON bi.bill_id=b.id LEFT JOIN branch_gold_transfer_items ti ON ti.bill_item_id=bi.id
      WHERE t.branch_id=? AND t.transaction_type='purchase' AND t.status='billed' AND bi.metal='gold' AND ti.id IS NULL
      ORDER BY b.bill_date,b.id,bi.id`, [branchId]),
    rows<RowDataPacket>(`SELECT n.id,n.title,n.body,n.verification_request_id AS requestId,n.read_at AS readAt,n.created_at AS createdAt,
      r.status,c.name AS customerName,u.name AS teName FROM branch_notifications n
      LEFT JOIN customer_verification_requests r ON r.id=n.verification_request_id LEFT JOIN customers c ON c.id=r.customer_id
      LEFT JOIN te_users u ON u.id=r.te_user_id WHERE n.branch_id=? AND n.employee_id=? ORDER BY n.id DESC LIMIT 25`, [branchId, auth.session.employeeId]),
    fundBalance(branchId), stockBalance(branchId),
  ]);
  return NextResponse.json({ session: auth.session, settings, customers, transactions, pledgeDocuments, funds, expenses, closings,
    balances: { fundPaise: availableFunds, stockMg: availableStock }, fundLedger, stockLedger, goldTransfers, eligibleTransferItems, verificationNotifications });
}

export async function POST(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const isForm = request.headers.get("content-type")?.includes("multipart/form-data");
  const body = isForm ? await request.formData() : await request.json().catch(() => ({} as Record<string, unknown>));
  const action = cleanText(value(body, "action"), 40);
  const { branchId, employeeId } = auth.session;

  if (action === "customer") {
    const name = cleanText(value(body, "name"), 190);
    const phone = cleanPhone(value(body, "phone"));
    const address = cleanText(value(body, "address"), 500);
    if (!name || phone.length !== 10) return apiError("Enter a customer name and valid 10-digit phone number.");
    try {
      const result = await execute("INSERT INTO branch_customers (branch_id,name,phone,address,created_by_employee_id) VALUES (?,?,?,?,?)", [branchId, name, phone, address || null, employeeId]);
      return NextResponse.json({ ok: true, id: result.insertId, message: "Customer added." });
    } catch (error) {
      if (String(error).includes("uq_branch_customer_phone")) return apiError("A customer with this phone number already exists at your branch.", 409);
      throw error;
    }
  }

  if (action === "pledge") {
    const id = Number(value(body, "id"));
    const resolution = value(body, "resolution") === "cancelled" ? "cancelled" : "released";
    try {
      await transaction(async (connection) => {
        const item = await one<RowDataPacket>(`SELECT id,pledge_amount_paise AS pledgeAmount,pledge_payment_method AS pledgePaymentMethod FROM branch_transactions
          WHERE id=? AND branch_id=? AND business_mode='pledged' AND pledge_status='awaiting_release' AND status='awaiting_pledge' FOR UPDATE`, [id, branchId], connection);
        if (!item) throw new Error("PLEDGE_REVIEWED");
        await execute("UPDATE branch_transactions SET pledge_status=?,pledge_resolved_at=UTC_TIMESTAMP(),status=? WHERE id=?",
          [resolution, resolution === "cancelled" ? "rejected" : "awaiting_pledge", id], connection);
        if (resolution === "cancelled" && item.pledgePaymentMethod === "cash") await addFundEntry(connection, { branchId, direction: "credit", amountPaise: Number(item.pledgeAmount),
          entryType: "pledge_cancelled", referenceId: id, description: "Cancelled pledge funds restored", employeeId });
      });
    } catch (error) {
      if (String(error).includes("PLEDGE_REVIEWED")) return apiError("This pledge has already been resolved.", 409);
      throw error;
    }
    return NextResponse.json({ ok: true, message: resolution === "cancelled" ? "Pledge cancelled and funds restored." : "Pledge released. Complete the purchase bill now." });
  }

  if (action === "gold-transfer") {
    const rawIds = body instanceof FormData ? body.getAll("packetIds") : (body as Record<string, unknown>).packetIds;
    const packetIds = [...new Set((Array.isArray(rawIds) ? rawIds : []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
    const tareWeightMg = milligrams(value(body, "tareWeightGrams") || 0);
    const bmName = cleanText(value(body, "bmName"), 190);
    const bmPhone = cleanPhone(value(body, "bmPhone"));
    if (!packetIds.length) return apiError("Select at least one billed packet.");
    if (!nonNegative(tareWeightMg)) return apiError("Enter a valid tare weight.");
    if ((bmName && bmPhone.length !== 10) || (!bmName && bmPhone)) return apiError("Enter both the BM name and a valid 10-digit BM phone number.");
    try {
      await transaction(async (connection) => {
        const placeholders = packetIds.map(() => "?").join(",");
        const selected = await rows<RowDataPacket>(`SELECT bi.id AS billItemId,bi.weight_mg AS weightMg,b.id AS billId,t.id AS transactionId
          FROM branch_transactions t JOIN bills b ON b.id=t.bill_id JOIN bill_items bi ON bi.bill_id=b.id
          LEFT JOIN branch_gold_transfer_items ti ON ti.bill_item_id=bi.id
          WHERE t.id IN (${placeholders}) AND t.branch_id=? AND t.transaction_type='purchase' AND t.status='billed'
          AND bi.metal='gold' AND ti.id IS NULL FOR UPDATE`, [...packetIds, branchId] as DatabaseValue[], connection);
        const selectedPackets = new Set(selected.map(item => Number(item.transactionId)));
        if (!selected.length || selectedPackets.size !== packetIds.length) throw new Error("ITEM_UNAVAILABLE");
        const weightMg = selected.reduce((sum, item) => sum + Number(item.weightMg), 0);
        if (await lockStockLedger(branchId, connection) < weightMg) throw new Error("INSUFFICIENT_STOCK");
        const created = await execute("INSERT INTO branch_gold_transfers (branch_id,weight_mg,tare_weight_mg,bm_name,bm_phone,notes,created_by_employee_id) VALUES (?,?,?,?,?,?,?)",
          [branchId, weightMg, tareWeightMg, bmName || null, bmPhone || null, cleanText(value(body, "notes"), 500) || null, employeeId], connection);
        for (const item of selected) await execute(`INSERT INTO branch_gold_transfer_items
          (transfer_id,transaction_id,bill_id,bill_item_id,sent_weight_mg) VALUES (?,?,?,?,?)`,
          [created.insertId, Number(item.transactionId), Number(item.billId), Number(item.billItemId), Number(item.weightMg)], connection);
        await addStockEntry(connection, { branchId, direction: "out", weightMg, entryType: "ho_transfer_sent", referenceId: created.insertId,
          description: "Gold sent to Head Office", employeeId });
      });
    } catch (error) {
      if (String(error).includes("INSUFFICIENT_STOCK")) return apiError("The branch does not have enough available gold stock.", 409);
      if (String(error).includes("ITEM_UNAVAILABLE") || String(error).includes("uq_gold_transfer_bill_item")) return apiError("One or more ornaments were already sent or are no longer available.", 409);
      throw error;
    }
    return NextResponse.json({ ok: true, message: `${packetIds.length} packet${packetIds.length === 1 ? "" : "s"} sent to Head Office with tare weight recorded.` });
  }

  if (action === "transit") {
    const id = Number(value(body, "id"));
    const result = await execute("UPDATE branch_transactions SET status='transit' WHERE id=? AND branch_id=? AND status='submitted'", [id, branchId]);
    if (!result.affectedRows) return apiError("Only submitted business can be moved to transit.", 409);
    return NextResponse.json({ ok: true, message: "Business moved to transit." });
  }

  if (action === "fund") {
    const amount = paise(value(body, "amount"));
    const purpose = cleanText(value(body, "purpose"), 500);
    if (!positive(amount) || !purpose) return apiError("Enter a valid amount and purpose.");
    await execute("INSERT INTO fund_requests (branch_id,requested_amount_paise,purpose,created_by_employee_id) VALUES (?,?,?,?)", [branchId, amount, purpose, employeeId]);
    return NextResponse.json({ ok: true, message: "Fund request sent to admin." });
  }

  if (action === "expense") {
    const amount = paise(value(body, "amount"));
    const date = cleanText(value(body, "date"), 10);
    const category = cleanText(value(body, "category"), 100);
    const description = cleanText(value(body, "description"), 500);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !positive(amount) || !category || !description) return apiError("Complete all expense fields with valid values.");
    await execute("INSERT INTO branch_expenses (branch_id,expense_date,category,amount_paise,description,created_by_employee_id) VALUES (?,?,?,?,?,?)", [branchId, date, category, amount, description, employeeId]);
    return NextResponse.json({ ok: true, message: "Expense sent for review." });
  }

  if (action === "closing") {
    const date = cleanText(value(body, "date"), 10);
    const values = { openingCash: paise(value(body, "openingCash")), transactions: Number(value(body, "transactions")), expenses: paise(value(body, "expenses")),
      goldPurchased: milligrams(value(body, "goldPurchased")), amountPaid: paise(value(body, "amountPaid")), goldSent: milligrams(value(body, "goldSent")), stock: milligrams(value(body, "stock")) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(values.transactions) || values.transactions < 0 || !Object.entries(values).filter(([key]) => key !== "transactions").every(([, item]) => nonNegative(item))) return apiError("Enter a valid date and non-negative closing figures.");
    await execute(`INSERT INTO branch_daily_closings
      (branch_id,closing_date,opening_cash_paise,transaction_count,expenses_paise,gold_purchased_mg,amount_paid_paise,gold_sent_to_ho_mg,gold_in_branch_stock_mg,notes,created_by_employee_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE opening_cash_paise=VALUES(opening_cash_paise),transaction_count=VALUES(transaction_count),
      expenses_paise=VALUES(expenses_paise),gold_purchased_mg=VALUES(gold_purchased_mg),amount_paid_paise=VALUES(amount_paid_paise),
      gold_sent_to_ho_mg=VALUES(gold_sent_to_ho_mg),gold_in_branch_stock_mg=VALUES(gold_in_branch_stock_mg),notes=VALUES(notes),created_by_employee_id=VALUES(created_by_employee_id)`,
      [branchId, date, values.openingCash, values.transactions, values.expenses, values.goldPurchased, values.amountPaid, values.goldSent, values.stock, cleanText(value(body, "notes"), 1000) || null, employeeId]);
    return NextResponse.json({ ok: true, message: "Daily closing submitted." });
  }

  return apiError("Unknown operation.");
}
