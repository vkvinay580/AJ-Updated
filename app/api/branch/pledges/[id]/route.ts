import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@/lib/api";
import { businessAuthenticated } from "@/lib/business-actor";
import { one } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { error, actor } = await businessAuthenticated(request);
  if (error || !actor?.branchId) return error || apiError("Branch authentication required.", 401);
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError("Invalid pledge.");
  const pledge = await one<RowDataPacket>(`SELECT t.id,t.pledge_amount_paise AS pledgeAmountPaise,t.release_place AS releasePlace,
    t.release_amount_paise AS releaseAmountPaise,t.pledge_payment_method AS pledgePaymentMethod,t.pledge_status AS pledgeStatus,t.status,
    c.id AS customerId,c.name AS customerName,c.phone AS customerPhone,c.email AS customerEmail
    FROM branch_transactions t JOIN branch_customers bc ON bc.id=t.customer_id
    JOIN companies co ON co.slug='aryan-gold'
    JOIN customers c ON c.company_id=co.id AND c.phone=bc.phone
    WHERE t.id=? AND t.branch_id=? AND t.business_mode='pledged' AND t.pledge_status='released' AND t.status='awaiting_pledge' AND t.bill_id IS NULL
    LIMIT 1`, [id, actor.branchId]);
  if (!pledge) return apiError("This pledge is not ready for billing.", 404);
  return NextResponse.json({ pledge, customer: { id: Number(pledge.customerId), name: pledge.customerName, phone: pledge.customerPhone, email: pledge.customerEmail || undefined } });
}
