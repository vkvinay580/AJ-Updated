import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/api";
import { getPnlRows } from "@/lib/pnl";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string | null) {
  if (!value || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const { error, session } = await authenticated(request);
  if (error || !session) return error;
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!validDate(start) || !validDate(end) || start! > end!) {
    return NextResponse.json({ error: "Select a valid date range." }, { status: 400 });
  }
  return NextResponse.json({ rows: await getPnlRows(start!, end!) });
}
