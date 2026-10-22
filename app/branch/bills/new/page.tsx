import { Suspense } from "react";
import BillForm from "@/components/admin/BillForm";
import ChatDock from "@/components/chat/ChatDock";
import { requireBranchSession } from "@/lib/branch-auth";
import { fundBalance } from "@/lib/branch-ledger";
import { one } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { GoldRateSettings } from "@/lib/gold-rates";

export default async function BranchNewBillPage() {
  const session = await requireBranchSession();
  const [settings, availableFundPaise] = await Promise.all([
    one<RowDataPacket>(`SELECT
      purchase_rate_999_paise_per_gram AS purchaseRate999,sale_rate_999_paise_per_gram AS saleRate999,
      purchase_rate_916_paise_per_gram AS purchaseRate916,sale_rate_916_paise_per_gram AS saleRate916,
      purchase_rate_750_paise_per_gram AS purchaseRate750,sale_rate_750_paise_per_gram AS saleRate750
      FROM business_settings WHERE id=1`),
    fundBalance(session.branchId),
  ]);
  const fixedRates:GoldRateSettings = {
    purchaseRate999:Number(settings?.purchaseRate999||0), saleRate999:Number(settings?.saleRate999||0),
    purchaseRate916:Number(settings?.purchaseRate916||0), saleRate916:Number(settings?.saleRate916||0),
    purchaseRate750:Number(settings?.purchaseRate750||0), saleRate750:Number(settings?.saleRate750||0),
  };
  return <div className="branch-form-page"><Suspense fallback={<div className="loading-state page-loading">Preparing billing…</div>}><BillForm portal="branch" fixedRates={fixedRates} availableFundPaise={availableFundPaise}/></Suspense><ChatDock scope="branch"/></div>;
}
