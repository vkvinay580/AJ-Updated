import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authenticated, cleanText, requestIp } from "@/lib/api";
import { execute, one, transaction } from "@/lib/db";
import { getGattiSales } from "@/lib/gatti-sales";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string | null) {
  if (!value || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

export async function GET(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if ((start || end) && (!validDate(start) || !validDate(end) || start! > end!)) {
    return NextResponse.json({ error: "Select a valid date range." }, { status: 400 });
  }
  const records = await getGattiSales(start || undefined, end || undefined, request.nextUrl.searchParams.get("soldOnly") === "1");
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Enter the sale details." }, { status: 400 });
  const meltGroupId = positiveInteger(body.meltGroupId);
  const saleRatePaisePerGram = positiveInteger(body.saleRatePaisePerGram);
  const saleAmountPaise = positiveInteger(body.saleAmountPaise);
  const saleDate = cleanText(body.saleDate, 10);
  const soldTo = cleanText(body.soldTo, 190);
  const notes = cleanText(body.notes, 500);
  if (!meltGroupId || !validDate(saleDate) || !saleRatePaisePerGram || !saleAmountPaise || soldTo.length < 2) {
    return NextResponse.json({ error: "Enter a valid sale date, rate, buyer, and sale amount." }, { status: 400 });
  }

  try {
    const saleId = await transaction(async (connection) => {
      const group = await one<RowDataPacket & { id: number; status: string; outputWeightMg: number }>(
        "SELECT id,status,output_gatti_weight_mg AS outputWeightMg FROM melt_groups WHERE id=? FOR UPDATE", [meltGroupId], connection);
      if (!group || group.status !== "completed" || Number(group.outputWeightMg) <= 0) throw new Error("GATTI_NOT_READY");
      const existing = await one<RowDataPacket & { id: number }>("SELECT id FROM gatti_sales WHERE melt_group_id=?", [meltGroupId], connection);
      if (existing) throw new Error("GATTI_ALREADY_SOLD");
      const result = await execute(`INSERT INTO gatti_sales
        (melt_group_id,sale_date,sale_rate_paise_per_gram,sold_to,sale_amount_paise,notes,created_by)
        VALUES (?,?,?,?,?,?,?)`, [meltGroupId, saleDate, saleRatePaisePerGram, soldTo, saleAmountPaise, notes || null, session.adminId], connection);
      return result.insertId;
    });
    await execute("INSERT INTO audit_logs (admin_id,company_id,action,entity_type,entity_id,ip_address) VALUES (?,?,?,'gatti_sale',?,?)",
      [session.adminId, session.companyId, "gatti_sale_created", saleId, requestIp(request)]);
    return NextResponse.json({ ok: true, saleId }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    if (message === "GATTI_NOT_READY") return NextResponse.json({ error: "Only a completed Gatti with an output weight can be sold." }, { status: 409 });
    if (message === "GATTI_ALREADY_SOLD") return NextResponse.json({ error: "This Gatti already has a sale entry." }, { status: 409 });
    if (caught && typeof caught === "object" && "code" in caught && caught.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "This Gatti already has a sale entry." }, { status: 409 });
    }
    throw caught;
  }
}
