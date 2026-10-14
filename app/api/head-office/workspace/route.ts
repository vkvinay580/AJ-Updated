import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanText, sameOrigin } from "@/lib/api";
import { execute, one, rows, transaction, type DatabaseValue } from "@/lib/db";
import { getHeadOfficeSession, type HeadOfficeRole } from "@/lib/head-office-auth";

const milligrams = (value: unknown) => Math.round(Number(value) * 1000);
const validId = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;

async function authorized(request: NextRequest, role?: HeadOfficeRole) {
  if (!sameOrigin(request)) return { session: null, error: apiError("Invalid request origin.", 403) };
  const session = await getHeadOfficeSession();
  if (!session) return { session: null, error: apiError("Your Head Office session has expired.", 401) };
  if (session.role === "floor") return { session: null, error: apiError("Floor users can access Branch Operations only.", 403) };
  if (role && session.role !== role) return { session: null, error: apiError(`Only the ${role} account can perform this action.`, 403) };
  return { session, error: null };
}

function indiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { sql: `${value.year}-${value.month}-${value.day}`, compact: `${value.year}${value.month}${value.day}` };
}

const itemSelect = `SELECT ti.id AS transferItemId,ti.transfer_id AS transferId,ti.sent_weight_mg AS sentWeightMg,
  gt.branch_id AS branchId,gt.weight_mg AS dispatchNetWeightMg,gt.tare_weight_mg AS tareWeightMg,gt.bm_name AS bmName,gt.bm_phone AS bmPhone,gt.created_by_employee_id AS sentBy,gt.status AS transferStatus,gt.notes AS transferNotes,gt.created_at AS sentAt,
  t.id AS transactionId,t.business_mode AS businessMode,t.created_by_employee_id AS billedBy,
  b.id AS billId,b.bill_number AS billNumber,DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS billDate,b.transaction_type AS transactionType,
  b.subtotal_paise AS subtotalPaise,b.tax_paise AS taxPaise,b.cgst_paise AS cgstPaise,b.sgst_paise AS sgstPaise,
  b.adjustment_paise AS adjustmentPaise,b.total_paise AS totalPaise,b.payment_method AS paymentMethod,b.notes AS billNotes,
  c.name AS customerName,c.phone AS customerPhone,c.address AS customerAddress,c.city AS customerCity,c.state AS customerState,c.gstin,
  bi.description,bi.item_description AS itemDescription,bi.hsn_code AS hsnCode,bi.purity,bi.metal,
  bi.gross_weight_mg AS grossWeightMg,bi.stone_weight_mg AS stoneWeightMg,bi.weight_mg AS netWeightMg,
  bi.rate_paise_per_gram AS ratePaise,bi.making_paise AS makingPaise,bi.amount_paise AS amountPaise,
  a.status AS auditStatus,a.audited_weight_mg AS auditedWeightMg,a.notes AS auditNotes,a.audited_at AS auditedAt,
  auditor.name AS auditorName,mgi.melt_group_id AS meltGroupId
  FROM branch_gold_transfer_items ti
  JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id
  JOIN branch_transactions t ON t.id=ti.transaction_id
  JOIN bills b ON b.id=ti.bill_id
  JOIN customers c ON c.id=b.customer_id
  JOIN bill_items bi ON bi.id=ti.bill_item_id
  LEFT JOIN head_office_ornament_audits a ON a.transfer_item_id=ti.id
  LEFT JOIN head_office_users auditor ON auditor.id=a.audited_by
  LEFT JOIN melt_group_items mgi ON mgi.transfer_item_id=ti.id`;

export async function GET(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const [items, groups, groupItems] = await Promise.all([
    rows<RowDataPacket>(`${itemSelect} ORDER BY gt.id DESC,ti.id`),
    rows<RowDataPacket>(`SELECT mg.id,mg.gatti_id AS gattiId,DATE_FORMAT(mg.melt_date,'%Y-%m-%d') AS meltDate,mg.status,
      mg.audited_total_weight_mg AS auditedTotalWeightMg,mg.input_weight_mg AS inputWeightMg,
      mg.output_gatti_weight_mg AS outputWeightMg,mg.matti_weight_mg AS mattiWeightMg,mg.purity,mg.notes,mg.melter_notes AS melterNotes,
      mg.created_at AS createdAt,mg.completed_at AS completedAt,creator.name AS createdBy,melter.name AS completedBy,
      COUNT(mgi.id) AS itemCount,COUNT(DISTINCT ti.transaction_id) AS packetCount,COUNT(DISTINCT gt.branch_id) AS branchCount
      FROM melt_groups mg JOIN head_office_users creator ON creator.id=mg.created_by
      LEFT JOIN head_office_users melter ON melter.id=mg.completed_by
      LEFT JOIN melt_group_items mgi ON mgi.melt_group_id=mg.id
      LEFT JOIN branch_gold_transfer_items ti ON ti.id=mgi.transfer_item_id
      LEFT JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id
      GROUP BY mg.id ORDER BY mg.id DESC LIMIT 200`),
    rows<RowDataPacket>(`SELECT mgi.melt_group_id AS meltGroupId,ti.id AS transferItemId,gt.branch_id AS branchId,
      b.bill_number AS billNumber,bi.description,bi.item_description AS itemDescription,mgi.audited_weight_mg AS auditedWeightMg
      FROM melt_group_items mgi JOIN branch_gold_transfer_items ti ON ti.id=mgi.transfer_item_id
      JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id JOIN bills b ON b.id=ti.bill_id JOIN bill_items bi ON bi.id=ti.bill_item_id
      ORDER BY mgi.id`),
  ]);
  return NextResponse.json({ session: auth.session, items, groups, groupItems });
}

export async function POST(request: NextRequest) {
  const auth = await authorized(request);
  if (auth.error || !auth.session) return auth.error;
  const body = await request.json().catch(() => ({}));
  const action = cleanText(body.action, 40);

  if (action === "audit-item") {
    if (auth.session.role !== "auditor") return apiError("Only the auditor can receive and audit ornaments.", 403);
    const transferItemId = Number(body.transferItemId);
    const auditedWeightMg = milligrams(body.auditedWeightGrams);
    const notes = cleanText(body.notes, 500) || null;
    if (!validId(transferItemId) || !Number.isFinite(auditedWeightMg) || auditedWeightMg <= 0) return apiError("Enter a valid audited weight.");
    try {
      await transaction(async connection => {
        const item = await one<RowDataPacket>(`SELECT ti.id,ti.transfer_id AS transferId FROM branch_gold_transfer_items ti
          JOIN branch_gold_transfers gt ON gt.id=ti.transfer_id WHERE ti.id=? AND gt.status IN ('submitted','received') FOR UPDATE`, [transferItemId], connection);
        if (!item) throw new Error("ITEM_NOT_AVAILABLE");
        const existing = await one<RowDataPacket>("SELECT id FROM head_office_ornament_audits WHERE transfer_item_id=? FOR UPDATE", [transferItemId], connection);
        if (existing) throw new Error("ALREADY_AUDITED");
        await execute(`INSERT INTO head_office_ornament_audits
          (transfer_item_id,status,audited_weight_mg,received_by,audited_by,received_at,audited_at,notes)
          VALUES (?,'audited',?,?,?,?,?,?)`, [transferItemId, auditedWeightMg, auth.session.userId, auth.session.userId, new Date(), new Date(), notes], connection);
        const outstanding = await one<RowDataPacket>(`SELECT COUNT(*) AS remaining FROM branch_gold_transfer_items ti
          LEFT JOIN head_office_ornament_audits a ON a.transfer_item_id=ti.id WHERE ti.transfer_id=? AND a.id IS NULL`, [Number(item.transferId)], connection);
        if (Number(outstanding?.remaining || 0) === 0) await execute("UPDATE branch_gold_transfers SET status='received',reviewed_at=UTC_TIMESTAMP() WHERE id=?", [Number(item.transferId)], connection);
      });
    } catch (error) {
      const message = String(error);
      if (message.includes("ALREADY_AUDITED")) return apiError("This ornament has already been audited.", 409);
      if (message.includes("ITEM_NOT_AVAILABLE")) return apiError("This ornament is no longer available for audit.", 409);
      throw error;
    }
    return NextResponse.json({ ok: true, message: "Ornament received and audited." });
  }

  if (action === "create-melt-group") {
    if (auth.session.role !== "auditor") return apiError("Only the auditor can create a melt group.", 403);
    const itemIds = [...new Set((Array.isArray(body.itemIds) ? body.itemIds : []).map(Number).filter(validId))];
    const notes = cleanText(body.notes, 1000) || null;
    if (!itemIds.length) return apiError("Select at least one audited ornament.");
    let gattiId = "";
    try {
      await transaction(async connection => {
        const placeholders = itemIds.map(() => "?").join(",");
        const selected = await rows<RowDataPacket>(`SELECT a.transfer_item_id AS transferItemId,a.audited_weight_mg AS auditedWeightMg
          FROM head_office_ornament_audits a LEFT JOIN melt_group_items mgi ON mgi.transfer_item_id=a.transfer_item_id
          WHERE a.transfer_item_id IN (${placeholders}) AND a.status='audited' AND mgi.id IS NULL FOR UPDATE`, itemIds as DatabaseValue[], connection);
        if (selected.length !== itemIds.length) throw new Error("ITEM_UNAVAILABLE");
        const date = indiaDate();
        await execute("INSERT IGNORE INTO melt_daily_sequences (melt_date,last_number) VALUES (?,0)", [date.sql], connection);
        const sequence = await one<RowDataPacket>("SELECT last_number AS lastNumber FROM melt_daily_sequences WHERE melt_date=? FOR UPDATE", [date.sql], connection);
        const next = Number(sequence?.lastNumber || 0) + 1;
        await execute("UPDATE melt_daily_sequences SET last_number=? WHERE melt_date=?", [next, date.sql], connection);
        gattiId = `${date.compact}-agbpl-${String(next).padStart(3, "0")}`;
        const total = selected.reduce((sum, row) => sum + Number(row.auditedWeightMg), 0);
        const created = await execute(`INSERT INTO melt_groups (gatti_id,melt_date,status,audited_total_weight_mg,notes,created_by)
          VALUES (?,?,'created',?,?,?)`, [gattiId, date.sql, total, notes, auth.session.userId], connection);
        for (const item of selected) await execute("INSERT INTO melt_group_items (melt_group_id,transfer_item_id,audited_weight_mg) VALUES (?,?,?)",
          [created.insertId, Number(item.transferItemId), Number(item.auditedWeightMg)], connection);
        await execute(`UPDATE head_office_ornament_audits SET status='grouped' WHERE transfer_item_id IN (${placeholders})`, itemIds as DatabaseValue[], connection);
      });
    } catch (error) {
      if (String(error).includes("ITEM_UNAVAILABLE")) return apiError("One or more ornaments were already grouped or are not audited.", 409);
      throw error;
    }
    return NextResponse.json({ ok: true, message: `Melt group ${gattiId} created.`, gattiId });
  }

  if (action === "complete-melt-group") {
    if (auth.session.role !== "melter") return apiError("Only the melter can complete a melt group.", 403);
    const groupId = Number(body.groupId);
    const inputWeightMg = milligrams(body.inputWeightGrams);
    const outputWeightMg = milligrams(body.outputWeightGrams);
    const mattiWeightMg = milligrams(body.mattiWeightGrams);
    const purity = Number(body.purity);
    const notes = cleanText(body.notes, 1000) || null;
    if (!validId(groupId) || inputWeightMg <= 0 || outputWeightMg <= 0 || mattiWeightMg < 0 || !Number.isFinite(purity) || purity <= 0 || purity > 100) {
      return apiError("Enter valid input, Gatti output, Matti, and purity values.");
    }
    if (outputWeightMg + mattiWeightMg < inputWeightMg) return apiError("Gatti output plus Matti cannot be less than the weight given for melting.");
    const result = await execute(`UPDATE melt_groups SET status='completed',input_weight_mg=?,output_gatti_weight_mg=?,matti_weight_mg=?,
      purity=?,melter_notes=?,completed_by=?,completed_at=UTC_TIMESTAMP() WHERE id=? AND status='created'`,
      [inputWeightMg, outputWeightMg, mattiWeightMg, purity, notes, auth.session.userId, groupId]);
    if (!result.affectedRows) return apiError("This Gatti was already completed or is unavailable.", 409);
    return NextResponse.json({ ok: true, message: "Gatti melting result saved." });
  }

  return apiError("Unknown Head Office operation.");
}
