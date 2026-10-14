import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { execute, one, pool, rows } from "@/lib/db";

export async function lockFundLedger(branchId: string, connection: PoolConnection) {
  await rows<RowDataPacket>("SELECT id FROM branch_fund_ledger WHERE branch_id=? FOR UPDATE", [branchId], connection);
  return fundBalance(branchId, connection);
}

export async function fundBalance(branchId: string, connection?: PoolConnection) {
  const result = await one<RowDataPacket>(`SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount_paise ELSE -amount_paise END),0) AS balance
    FROM branch_fund_ledger WHERE branch_id=?`, [branchId], connection || pool);
  return Number(result?.balance || 0);
}

export async function lockStockLedger(branchId: string, connection: PoolConnection) {
  await rows<RowDataPacket>("SELECT id FROM branch_stock_ledger WHERE branch_id=? FOR UPDATE", [branchId], connection);
  return stockBalance(branchId, connection);
}

export async function stockBalance(branchId: string, connection?: PoolConnection) {
  const result = await one<RowDataPacket>(`SELECT COALESCE(SUM(CASE WHEN direction='in' THEN weight_mg ELSE -weight_mg END),0) AS balance
    FROM branch_stock_ledger WHERE branch_id=?`, [branchId], connection || pool);
  return Number(result?.balance || 0);
}

export async function addFundEntry(connection: PoolConnection, input: {
  branchId: string; direction: "credit" | "debit"; amountPaise: number; entryType: string;
  referenceId: number; description: string; employeeId?: string; adminId?: number;
}) {
  return execute(`INSERT INTO branch_fund_ledger
    (branch_id,direction,amount_paise,entry_type,reference_id,description,created_by_employee_id,created_by_admin_id)
    VALUES (?,?,?,?,?,?,?,?)`, [input.branchId, input.direction, input.amountPaise, input.entryType, input.referenceId,
    input.description, input.employeeId || null, input.adminId || null], connection);
}

export async function addStockEntry(connection: PoolConnection, input: {
  branchId: string; direction: "in" | "out"; weightMg: number; entryType: string;
  referenceId: number; description: string; employeeId?: string; adminId?: number;
}) {
  return execute(`INSERT INTO branch_stock_ledger
    (branch_id,direction,weight_mg,entry_type,reference_id,description,created_by_employee_id,created_by_admin_id)
    VALUES (?,?,?,?,?,?,?,?)`, [input.branchId, input.direction, input.weightMg, input.entryType, input.referenceId,
    input.description, input.employeeId || null, input.adminId || null], connection);
}
