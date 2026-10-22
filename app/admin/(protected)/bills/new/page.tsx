import { Suspense } from "react";
import type { RowDataPacket } from "mysql2";
import BillForm from "@/components/admin/BillForm";
import { one } from "@/lib/db";
import type { GoldRateSettings } from "@/lib/gold-rates";

export const dynamic = "force-dynamic";

export default async function NewBillPage() {
  const settings = await one<RowDataPacket>(`SELECT
    purchase_rate_999_paise_per_gram AS purchaseRate999,sale_rate_999_paise_per_gram AS saleRate999,
    purchase_rate_916_paise_per_gram AS purchaseRate916,sale_rate_916_paise_per_gram AS saleRate916,
    purchase_rate_750_paise_per_gram AS purchaseRate750,sale_rate_750_paise_per_gram AS saleRate750
    FROM business_settings WHERE id=1`);
  const fixedRates: GoldRateSettings = {
    purchaseRate999: Number(settings?.purchaseRate999 || 0), saleRate999: Number(settings?.saleRate999 || 0),
    purchaseRate916: Number(settings?.purchaseRate916 || 0), saleRate916: Number(settings?.saleRate916 || 0),
    purchaseRate750: Number(settings?.purchaseRate750 || 0), saleRate750: Number(settings?.saleRate750 || 0),
  };
  return <Suspense fallback={<div className="loading-state page-loading">Preparing billing…</div>}><BillForm fixedRates={fixedRates}/></Suspense>;
}
