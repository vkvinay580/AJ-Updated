import { NextRequest, NextResponse } from "next/server";
import { apiError, authenticated, cleanText, requestIp } from "@/lib/api";
import { execute, transaction } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const data = await request.json().catch(() => null);
  const metal = data?.metal === "silver" ? "silver" : data?.metal === "gold" ? "gold" : null;
  const movement = data?.movement === "remove" ? "remove" : data?.movement === "add" ? "add" : null;
  const weightMg = Math.round(Number(data?.weightGrams) * 1000);
  const notes = cleanText(data?.notes, 500);
  if (!metal || !movement) return apiError("Select a metal and movement type.");
  if (!Number.isSafeInteger(weightMg) || weightMg <= 0) return apiError("Enter a valid weight greater than zero.");
  const result = await transaction(async (connection) => {
    const created = await execute("INSERT INTO stock_adjustments (company_id, metal, movement, weight_mg, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)", [session.companyId, metal, movement, weightMg, notes || null, session.adminId], connection);
    await execute("INSERT INTO audit_logs (admin_id, company_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, 'stock_adjustment', ?, ?)", [session.adminId, session.companyId, `stock_${movement}`, created.insertId, requestIp(request)], connection);
    return created.insertId;
  });
  return NextResponse.json({ id: result }, { status: 201 });
}
