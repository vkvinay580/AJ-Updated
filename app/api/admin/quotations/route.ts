import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError, cleanText, requestIp } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { execute, one, rows, transaction } from "@/lib/db";
import { goldPurityCode } from "@/lib/gold-rates";

type QuotationItemInput = {
  description?: unknown;
  purity?: unknown;
  weightGrams?: unknown;
  grossWeightGrams?: unknown;
  stoneWeightGrams?: unknown;
  wastageWeightGrams?: unknown;
  rateRupeesPerGram?: unknown;
};

function indiaYear(date = new Date()) {
  const year = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric" }).format(date);
  return Number(year);
}

function indiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) || indiaDate(date) !== value ? null : date;
}

export async function GET(request: NextRequest) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor) return error;
  const today = indiaDate();
  const from = request.nextUrl.searchParams.get("from") || today;
  const to = request.nextUrl.searchParams.get("to") || today;
  const fromDate = dateStart(from);
  const toDate = dateStart(to);
  if (!fromDate || !toDate || fromDate > toDate) return apiError("Choose a valid From and To date.");
  const toExclusive = new Date(toDate.getTime() + 86_400_000);
  const scope = [actor.companyId, actor.branchId, actor.branchId, fromDate, toExclusive];
  const [quotations, totals] = await Promise.all([
    rows<RowDataPacket>(`SELECT q.id,q.quotation_number AS quotationNumber,q.business_mode AS businessMode,
      q.total_weight_mg AS totalWeightMg,q.total_paise AS totalPaise,q.pledge_amount_paise AS pledgeAmountPaise,
      q.origin_branch_id AS originBranchId,q.created_at AS createdAt,c.name AS customerName,c.phone AS customerPhone
      FROM quotations q JOIN customers c ON c.id=q.customer_id AND c.company_id=q.company_id
      WHERE q.company_id=? AND (? IS NULL OR q.origin_branch_id=?) AND q.created_at>=? AND q.created_at<?
      ORDER BY q.id DESC LIMIT 1000`, scope),
    one<RowDataPacket>(`SELECT COUNT(*) AS quotationCount,COALESCE(SUM(q.total_weight_mg),0) AS totalWeightMg,
      COALESCE(SUM(q.total_paise),0) AS totalPaise,
      COALESCE(SUM(CASE WHEN q.business_mode='walkin' THEN 1 ELSE 0 END),0) AS walkinCount,
      COALESCE(SUM(CASE WHEN q.business_mode='walkin' THEN q.total_paise ELSE 0 END),0) AS walkinPaise,
      COALESCE(SUM(CASE WHEN q.business_mode='pledged' THEN 1 ELSE 0 END),0) AS pledgedCount,
      COALESCE(SUM(CASE WHEN q.business_mode='pledged' THEN q.total_paise ELSE 0 END),0) AS pledgedPaise,
      COALESCE(SUM(CASE WHEN q.business_mode='pledged' THEN q.pledge_amount_paise ELSE 0 END),0) AS pledgeAmountPaise
      FROM quotations q WHERE q.company_id=? AND (? IS NULL OR q.origin_branch_id=?) AND q.created_at>=? AND q.created_at<?`, scope),
  ]);
  const summary = {
    quotationCount: Number(totals?.quotationCount || 0), totalWeightMg: Number(totals?.totalWeightMg || 0), totalPaise: Number(totals?.totalPaise || 0),
    walkinCount: Number(totals?.walkinCount || 0), walkinPaise: Number(totals?.walkinPaise || 0), pledgedCount: Number(totals?.pledgedCount || 0),
    pledgedPaise: Number(totals?.pledgedPaise || 0), pledgeAmountPaise: Number(totals?.pledgeAmountPaise || 0),
  };
  return NextResponse.json({ from, to, quotations, summary, limited: summary.quotationCount > quotations.length });
}

export async function POST(request: NextRequest) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor) return error;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const customerId = Number(body.customerId);
  const businessMode = body.businessMode === "walkin" || body.businessMode === "pledged" ? body.businessMode : "";
  const pledgeAmountPaise = businessMode === "pledged" ? Math.round(Number(body.pledgeAmount) * 100) : null;
  const notes = cleanText(body.notes, 1000);
  const suppliedItems = Array.isArray(body.items) ? body.items as QuotationItemInput[] : [];
  if (!Number.isInteger(customerId) || customerId < 1) return apiError("Select a customer.");
  if (!businessMode) return apiError("Choose Walk-in Sale or Pledged.");
  if (businessMode === "pledged" && (!Number.isSafeInteger(pledgeAmountPaise) || Number(pledgeAmountPaise) <= 0)) return apiError("Enter a valid pledge amount.");
  if (!suppliedItems.length || suppliedItems.length > 12) return apiError("Add between one and twelve ornaments.");

  const customer = await one<RowDataPacket>("SELECT id FROM customers WHERE id=? AND company_id=?", [customerId, actor.companyId]);
  if (!customer) return apiError("Customer not found in this company.", 404);
  const items = suppliedItems.map((item, index) => {
    const description = cleanText(item.description, 190) || `Gold ornament ${index + 1}`;
    const purityCode = goldPurityCode(item.purity);
    const grossWeightMg = Math.round(Number(item.grossWeightGrams ?? item.weightGrams) * 1000);
    const stoneWeightMg = Math.round(Number(item.stoneWeightGrams || 0) * 1000);
    const wastageWeightMg = Math.round(Number(item.wastageWeightGrams || 0) * 1000);
    const weightMg = grossWeightMg - stoneWeightMg - wastageWeightMg;
    const purity = purityCode === "999" ? "24K / 999" : purityCode === "916" ? "22K / 916" : purityCode === "750" ? "18K / 750" : "";
    const ratePaisePerGram = Math.round(Number(item.rateRupeesPerGram) * 100);
    const amountPaise = Math.round(weightMg * ratePaisePerGram / 1000);
    return { description, purity, grossWeightMg, stoneWeightMg, wastageWeightMg, weightMg, ratePaisePerGram, amountPaise };
  });
  if (items.some(item => !item.purity)) return apiError("Choose 24K / 999, 22K / 916, or 18K / 750 for every ornament.");
  if (items.some(item => !Number.isFinite(item.grossWeightMg) || item.grossWeightMg <= 0 || item.grossWeightMg > 100_000_000
    || !Number.isFinite(item.stoneWeightMg) || item.stoneWeightMg < 0
    || !Number.isFinite(item.wastageWeightMg) || item.wastageWeightMg < 0
    || item.weightMg <= 0)) return apiError("Enter valid weights for every ornament. Stone and wastage deductions together must be less than the gross weight.");
  if (items.some(item => !Number.isSafeInteger(item.ratePaisePerGram) || item.ratePaisePerGram <= 0 || item.ratePaisePerGram > 1_000_000_000)) return apiError("Enter a valid rate for every ornament.");
  const totalWeightMg = items.reduce((sum, item) => sum + item.weightMg, 0);
  const totalPaise = items.reduce((sum, item) => sum + item.amountPaise, 0);
  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) return apiError("The quotation total is invalid.");
  if (businessMode === "pledged" && Number(pledgeAmountPaise) > totalPaise) return apiError("Pledge amount cannot exceed the quoted value.");

  try {
    const created = await transaction(async connection => {
      const company = await one<RowDataPacket & { prefix: string }>("SELECT invoice_prefix AS prefix FROM companies WHERE id=? FOR UPDATE", [actor.companyId], connection);
      if (!company) throw new Error("Company configuration not found.");
      const quotationYear = indiaYear();
      await execute("INSERT IGNORE INTO quotation_sequences (company_id,quotation_year,last_number) VALUES (?,?,0)", [actor.companyId, quotationYear], connection);
      const sequence = await one<RowDataPacket & { lastNumber: number }>("SELECT last_number AS lastNumber FROM quotation_sequences WHERE company_id=? AND quotation_year=? FOR UPDATE", [actor.companyId, quotationYear], connection);
      const nextNumber = Number(sequence?.lastNumber || 0) + 1;
      await execute("UPDATE quotation_sequences SET last_number=? WHERE company_id=? AND quotation_year=?", [nextNumber, actor.companyId, quotationYear], connection);
      const quotationNumber = `${company.prefix}/QTN/${quotationYear}/${String(nextNumber).padStart(4, "0")}`;
      const result = await execute(`INSERT INTO quotations
        (company_id,customer_id,quotation_number,business_mode,total_weight_mg,total_paise,pledge_amount_paise,notes,origin_branch_id,created_by_employee_id,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [actor.companyId, customerId, quotationNumber, businessMode, totalWeightMg, totalPaise, pledgeAmountPaise, notes || null, actor.branchId, actor.employeeId, actor.adminId], connection);
      for (const item of items) await execute(`INSERT INTO quotation_items
        (quotation_id,description,purity,gross_weight_mg,stone_weight_mg,wastage_weight_mg,weight_mg,rate_paise_per_gram,amount_paise)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [result.insertId, item.description, item.purity, item.grossWeightMg, item.stoneWeightMg, item.wastageWeightMg, item.weightMg, item.ratePaisePerGram, item.amountPaise], connection);
      await execute("INSERT INTO audit_logs (admin_id,company_id,action,entity_type,entity_id,ip_address) VALUES (?,?,'quotation_created','quotation',?,?)",
        [actor.adminId, actor.companyId, result.insertId, requestIp(request)], connection);
      return { quotationId: result.insertId, quotationNumber };
    });
    return NextResponse.json(created, { status: 201 });
  } catch (caught) {
    return apiError(caught instanceof Error ? caught.message : "Unable to create quotation.", 500);
  }
}
