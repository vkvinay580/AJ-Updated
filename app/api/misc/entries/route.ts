import { NextRequest, NextResponse } from "next/server";
import { getMiscSession } from "@/lib/misc-auth";
import { apiError, cleanText, sameOrigin } from "@/lib/api";
import { addMiscEntry, listMiscEntries, type MiscEntry } from "@/lib/misc-store";

function indiaDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function summary(entries: MiscEntry[]) {
  const today = indiaDate();
  const currentMonth = today.slice(0, 7);
  const daily = new Map<string, { date: string; count: number; valuePaise: number }>();
  for (const entry of entries) {
    const item = daily.get(entry.date) || { date: entry.date, count: 0, valuePaise: 0 };
    item.count += 1;
    item.valuePaise += entry.valuePaise;
    daily.set(entry.date, item);
  }
  return {
    totalEntries: entries.length,
    totalValuePaise: entries.reduce((total, entry) => total + entry.valuePaise, 0),
    todayValuePaise: entries.filter((entry) => entry.date === today).reduce((total, entry) => total + entry.valuePaise, 0),
    monthValuePaise: entries.filter((entry) => entry.date.startsWith(currentMonth)).reduce((total, entry) => total + entry.valuePaise, 0),
    uniqueNames: new Set(entries.map((entry) => entry.name.trim().toLowerCase())).size,
    daily: [...daily.values()].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 7),
  };
}

function noStoreJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export async function GET() {
  const session = await getMiscSession();
  if (!session) return apiError("Your session has expired.", 401);
  try {
    const allEntries = await listMiscEntries();
    const entries = session.role === "admin" ? allEntries : allEntries.filter((entry) => entry.createdBy === session.username).slice(0, 10);
    return noStoreJson({ entries, summary: session.role === "admin" ? summary(allEntries) : null });
  } catch (error) {
    console.error("Unable to read Misc entries:", error);
    return apiError("The secure Misc store is unavailable.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const session = await getMiscSession();
  if (!session) return apiError("Your session has expired.", 401);
  if (session.role !== "acc") return apiError("Only the Accounts entry login can add records.", 403);

  const body = await request.json().catch(() => ({}));
  const date = cleanText(body.date, 10);
  const time = cleanText(body.time, 5);
  const name = cleanText(body.name, 100);
  const description = cleanText(body.description, 500);
  const value = String(body.value ?? "").trim().replace(/,/g, "");
  if (!validDate(date)) return apiError("Enter a valid date.");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return apiError("Enter a valid time.");
  if (!name) return apiError("Name is required.");
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0) return apiError("Enter a valid value greater than zero.");
  if (!description) return apiError("Description is required.");
  const valuePaise = Math.round(Number(value) * 100);

  try {
    const entry = await addMiscEntry({ date, time, name, valuePaise, description, createdBy: session.username });
    return noStoreJson({ ok: true, entry }, 201);
  } catch (error) {
    console.error("Unable to save Misc entry:", error);
    return apiError("The entry could not be saved securely.", 500);
  }
}
