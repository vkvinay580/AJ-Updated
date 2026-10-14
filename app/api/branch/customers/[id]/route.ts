import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { one } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id)) return apiError("Invalid customer.");
  const customer = await one<RowDataPacket>("SELECT id,name,phone,email FROM customers WHERE id=? AND company_id=?", [id, actor.companyId]);
  return customer ? NextResponse.json({ customer }) : apiError("Customer not found.", 404);
}
