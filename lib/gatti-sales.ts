import type { RowDataPacket } from "mysql2";
import { rows } from "@/lib/db";

export type GattiSaleRecord = {
  meltGroupId: number;
  gattiId: string;
  meltDate: string;
  completedAt: string | null;
  outputWeightMg: number;
  purity: number | null;
  saleId: number | null;
  saleDate: string | null;
  saleRatePaisePerGram: number | null;
  soldTo: string | null;
  saleAmountPaise: number | null;
  notes: string | null;
  soldAt: string | null;
};

type GattiSaleRow = RowDataPacket & GattiSaleRecord;

export async function getGattiSales(start?: string, end?: string, soldOnly = false) {
  const conditions = ["mg.status='completed'"];
  const values: string[] = [];
  if (start && end) {
    conditions.push("gs.sale_date BETWEEN ? AND ?");
    values.push(start, end);
  } else if (soldOnly) {
    conditions.push("gs.id IS NOT NULL");
  }

  const result = await rows<GattiSaleRow>(`SELECT mg.id AS meltGroupId,mg.gatti_id AS gattiId,
    DATE_FORMAT(mg.melt_date,'%Y-%m-%d') AS meltDate,
    DATE_FORMAT(mg.completed_at,'%Y-%m-%d %H:%i:%s') AS completedAt,
    COALESCE(mg.output_gatti_weight_mg,0) AS outputWeightMg,mg.purity,
    gs.id AS saleId,DATE_FORMAT(gs.sale_date,'%Y-%m-%d') AS saleDate,
    gs.sale_rate_paise_per_gram AS saleRatePaisePerGram,gs.sold_to AS soldTo,
    gs.sale_amount_paise AS saleAmountPaise,gs.notes,
    DATE_FORMAT(gs.created_at,'%Y-%m-%d %H:%i:%s') AS soldAt
    FROM melt_groups mg LEFT JOIN gatti_sales gs ON gs.melt_group_id=mg.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY COALESCE(gs.sale_date,mg.completed_at) DESC,mg.id DESC`, values);

  return result.map((row) => ({
    meltGroupId: Number(row.meltGroupId),
    gattiId: row.gattiId,
    meltDate: row.meltDate,
    completedAt: row.completedAt,
    outputWeightMg: Number(row.outputWeightMg),
    purity: row.purity === null ? null : Number(row.purity),
    saleId: row.saleId === null ? null : Number(row.saleId),
    saleDate: row.saleDate,
    saleRatePaisePerGram: row.saleRatePaisePerGram === null ? null : Number(row.saleRatePaisePerGram),
    soldTo: row.soldTo,
    saleAmountPaise: row.saleAmountPaise === null ? null : Number(row.saleAmountPaise),
    notes: row.notes,
    soldAt: row.soldAt,
  } satisfies GattiSaleRecord));
}
