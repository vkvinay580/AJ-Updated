import "server-only";

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { execute, one } from "@/lib/db";

export type InvoiceStateCode = "KA" | "TN";

export function invoiceStateCode(state: string | null | undefined): InvoiceStateCode {
  const normalized = String(state || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (normalized === "ka" || normalized === "karnataka") return "KA";
  if (normalized === "tn" || normalized === "tamilnadu") return "TN";
  throw new Error("Billing is supported only for Karnataka and Tamil Nadu branches.");
}

export function invoiceFinancialYear(date: string | Date = new Date()) {
  const parsed =
    typeof date === "string"
      ? new Date(`${date.slice(0, 10)}T00:00:00Z`)
      : date;
  if (Number.isNaN(parsed.valueOf())) throw new Error("Invalid invoice date.");
  const calendarYear = parsed.getUTCFullYear();
  return parsed.getUTCMonth() >= 3 ? calendarYear : calendarYear - 1;
}

export async function nextInvoiceNumber(input: {
  companyId: number;
  stateCode: InvoiceStateCode;
  invoiceDate?: string | Date;
  connection: PoolConnection;
}) {
  const company = await one<RowDataPacket & { prefix: string }>(
    "SELECT invoice_prefix AS prefix FROM companies WHERE id = ? FOR UPDATE",
    [input.companyId],
    input.connection,
  );
  if (!company) throw new Error("Company configuration not found.");
  const financialYear = invoiceFinancialYear(input.invoiceDate);
  await execute(
    `INSERT IGNORE INTO invoice_sequences
    (company_id, state_code, invoice_year, last_number) VALUES (?, ?, ?, 0)`,
    [input.companyId, input.stateCode, financialYear],
    input.connection,
  );
  const sequence = await one<RowDataPacket & { lastNumber: number }>(
    `SELECT last_number AS lastNumber FROM invoice_sequences
    WHERE company_id = ? AND state_code = ? AND invoice_year = ? FOR UPDATE`,
    [input.companyId, input.stateCode, financialYear],
    input.connection,
  );
  const nextNumber = Number(sequence?.lastNumber || 0) + 1;
  await execute(
    `UPDATE invoice_sequences SET last_number = ?
    WHERE company_id = ? AND state_code = ? AND invoice_year = ?`,
    [nextNumber, input.companyId, input.stateCode, financialYear],
    input.connection,
  );
  const financialYearCode = `${String(financialYear).slice(-2)}${String(financialYear + 1).slice(-2)}`;
  return `${company.prefix}/${input.stateCode}/${financialYearCode}/${String(nextNumber).padStart(2, "0")}`;
}
