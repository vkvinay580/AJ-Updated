import type { RowDataPacket } from "mysql2";
import { rows } from "@/lib/db";

export type PnlGoldDetail = {
  transactionId: number;
  branchId: string;
  businessDate: string;
  amountPaidPaise: number;
  purchaseWeightMg: number;
  gattiInputWeightMg: number;
  allocatedCostPaise: number;
};

export type PnlExpenseDetail = {
  expenseId: number;
  branchId: string;
  expenseDate: string;
  businessDate: string;
  category: string;
  description: string;
  originalAmountPaise: number;
  allocatedAmountPaise: number;
};

export type PnlRow = {
  saleId: number;
  meltGroupId: number;
  gattiId: string;
  saleDate: string;
  soldTo: string;
  saleRatePaisePerGram: number;
  saleAmountPaise: number;
  outputWeightMg: number;
  goldCostPaise: number;
  expensePaise: number;
  profitPaise: number;
  businessDates: string[];
  goldDetails: PnlGoldDetail[];
  expenseDetails: PnlExpenseDetail[];
};

type SaleRow = RowDataPacket & {
  saleId: number; meltGroupId: number; gattiId: string; saleDate: string; soldTo: string;
  saleRatePaisePerGram: number; saleAmountPaise: number; outputWeightMg: number;
};
type SourceRow = RowDataPacket & {
  meltGroupId: number; transactionId: number; branchId: string; businessDate: string;
  amountPaidPaise: number; purchaseWeightMg: number; gattiInputWeightMg: number;
};
type DayRow = RowDataPacket & { branchId: string; businessDate: string; dayWeightMg: number };
type ExpenseRow = RowDataPacket & {
  expenseId: number; branchId: string; expenseDate: string; category: string;
  description: string; amountPaise: number;
};

const placeholders = (count: number) => Array.from({ length: count }, () => "?").join(",");

export async function getPnlRows(start: string, end: string): Promise<PnlRow[]> {
  const sales = await rows<SaleRow>(`SELECT gs.id AS saleId,mg.id AS meltGroupId,mg.gatti_id AS gattiId,
    DATE_FORMAT(gs.sale_date,'%Y-%m-%d') AS saleDate,gs.sold_to AS soldTo,
    gs.sale_rate_paise_per_gram AS saleRatePaisePerGram,gs.sale_amount_paise AS saleAmountPaise,
    COALESCE(mg.output_gatti_weight_mg,0) AS outputWeightMg
    FROM gatti_sales gs JOIN melt_groups mg ON mg.id=gs.melt_group_id
    WHERE gs.sale_date BETWEEN ? AND ? ORDER BY gs.sale_date DESC,gs.id DESC`, [start, end]);
  if (!sales.length) return [];

  const groupIds = sales.map((sale) => Number(sale.meltGroupId));
  const sources = await rows<SourceRow>(`SELECT mgi.melt_group_id AS meltGroupId,ti.transaction_id AS transactionId,
    t.branch_id AS branchId,DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS businessDate,
    t.amount_paise AS amountPaidPaise,t.gold_weight_mg AS purchaseWeightMg,
    SUM(mgi.audited_weight_mg) AS gattiInputWeightMg
    FROM melt_group_items mgi
    JOIN branch_gold_transfer_items ti ON ti.id=mgi.transfer_item_id
    JOIN branch_transactions t ON t.id=ti.transaction_id
    JOIN bills b ON b.id=t.bill_id
    WHERE mgi.melt_group_id IN (${placeholders(groupIds.length)})
    GROUP BY mgi.melt_group_id,ti.transaction_id,t.branch_id,b.bill_date,t.amount_paise,t.gold_weight_mg`, groupIds);

  const branchIds = [...new Set(sources.map((source) => source.branchId))];
  const maxBusinessDate = sources.reduce((latest, source) => source.businessDate > latest ? source.businessDate : latest, "0000-00-00");
  const dayRows = branchIds.length ? await rows<DayRow>(`SELECT t.branch_id AS branchId,
    DATE_FORMAT(b.bill_date,'%Y-%m-%d') AS businessDate,SUM(t.gold_weight_mg) AS dayWeightMg
    FROM branch_transactions t JOIN bills b ON b.id=t.bill_id
    WHERE t.transaction_type='purchase' AND t.status='billed' AND t.branch_id IN (${placeholders(branchIds.length)})
      AND b.bill_date<=?
    GROUP BY t.branch_id,b.bill_date ORDER BY t.branch_id,b.bill_date`, [...branchIds, maxBusinessDate]) : [];
  const expenseRows = branchIds.length ? await rows<ExpenseRow>(`SELECT id AS expenseId,branch_id AS branchId,
    DATE_FORMAT(expense_date,'%Y-%m-%d') AS expenseDate,category,description,amount_paise AS amountPaise
    FROM branch_expenses WHERE status='approved' AND branch_id IN (${placeholders(branchIds.length)})
      AND expense_date<=? ORDER BY branch_id,expense_date,id`, [...branchIds, maxBusinessDate]) : [];

  const businessDays = new Map<string, string[]>();
  const dayWeights = new Map<string, number>();
  for (const day of dayRows) {
    const dates = businessDays.get(day.branchId) || [];
    dates.push(day.businessDate);
    businessDays.set(day.branchId, dates);
    dayWeights.set(`${day.branchId}|${day.businessDate}`, Number(day.dayWeightMg));
  }

  const sourcesByGroup = new Map<number, SourceRow[]>();
  for (const source of sources) {
    const id = Number(source.meltGroupId);
    const group = sourcesByGroup.get(id) || [];
    group.push(source);
    sourcesByGroup.set(id, group);
  }

  return sales.map((sale) => {
    const groupSources = sourcesByGroup.get(Number(sale.meltGroupId)) || [];
    const goldDetails = groupSources.map((source) => {
      const purchaseWeight = Number(source.purchaseWeightMg);
      const gattiWeight = Number(source.gattiInputWeightMg);
      const ratio = purchaseWeight > 0 ? Math.min(1, gattiWeight / purchaseWeight) : 0;
      return {
        transactionId: Number(source.transactionId), branchId: source.branchId, businessDate: source.businessDate,
        amountPaidPaise: Number(source.amountPaidPaise), purchaseWeightMg: purchaseWeight,
        gattiInputWeightMg: gattiWeight, allocatedCostPaise: Math.round(Number(source.amountPaidPaise) * ratio),
      } satisfies PnlGoldDetail;
    });

    const groupDayWeights = new Map<string, { branchId: string; businessDate: string; gattiWeightMg: number }>();
    for (const source of groupSources) {
      const key = `${source.branchId}|${source.businessDate}`;
      const current = groupDayWeights.get(key);
      if (current) current.gattiWeightMg += Number(source.gattiInputWeightMg);
      else groupDayWeights.set(key, { branchId: source.branchId, businessDate: source.businessDate, gattiWeightMg: Number(source.gattiInputWeightMg) });
    }

    const expenseDetails: PnlExpenseDetail[] = [];
    for (const allocation of groupDayWeights.values()) {
      const days = businessDays.get(allocation.branchId) || [];
      const currentIndex = days.indexOf(allocation.businessDate);
      const previousBusinessDate = currentIndex > 0 ? days[currentIndex - 1] : null;
      const totalDayWeight = dayWeights.get(`${allocation.branchId}|${allocation.businessDate}`) || 0;
      const ratio = totalDayWeight > 0 ? Math.min(1, allocation.gattiWeightMg / totalDayWeight) : 0;
      for (const expense of expenseRows) {
        if (expense.branchId !== allocation.branchId || expense.expenseDate > allocation.businessDate) continue;
        if (previousBusinessDate && expense.expenseDate <= previousBusinessDate) continue;
        expenseDetails.push({
          expenseId: Number(expense.expenseId), branchId: expense.branchId, expenseDate: expense.expenseDate,
          businessDate: allocation.businessDate, category: expense.category, description: expense.description,
          originalAmountPaise: Number(expense.amountPaise), allocatedAmountPaise: Math.round(Number(expense.amountPaise) * ratio),
        });
      }
    }

    const goldCostPaise = goldDetails.reduce((sum, item) => sum + item.allocatedCostPaise, 0);
    const expensePaise = expenseDetails.reduce((sum, item) => sum + item.allocatedAmountPaise, 0);
    const saleAmountPaise = Number(sale.saleAmountPaise);
    return {
      saleId: Number(sale.saleId), meltGroupId: Number(sale.meltGroupId), gattiId: sale.gattiId,
      saleDate: sale.saleDate, soldTo: sale.soldTo, saleRatePaisePerGram: Number(sale.saleRatePaisePerGram),
      saleAmountPaise, outputWeightMg: Number(sale.outputWeightMg), goldCostPaise, expensePaise,
      profitPaise: saleAmountPaise - goldCostPaise - expensePaise,
      businessDates: [...new Set(groupSources.map((source) => source.businessDate))].sort(), goldDetails, expenseDetails,
    };
  });
}
