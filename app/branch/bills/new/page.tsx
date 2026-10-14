import { Suspense } from "react";
import BillForm from "@/components/admin/BillForm";
import ChatDock from "@/components/chat/ChatDock";
import { requireBranchSession } from "@/lib/branch-auth";
import { fundBalance } from "@/lib/branch-ledger";
import { one } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export default async function BranchNewBillPage() {
  const session = await requireBranchSession();
  const [settings, availableFundPaise] = await Promise.all([
    one<RowDataPacket>("SELECT purchase_rate_paise_per_gram AS purchaseRate,sale_rate_paise_per_gram AS saleRate FROM business_settings WHERE id=1"),
    fundBalance(session.branchId),
  ]);
  return <div className="branch-form-page"><Suspense fallback={<div className="loading-state page-loading">Preparing billing…</div>}><BillForm portal="branch" fixedRates={{ purchaseRate:Number(settings?.purchaseRate||0), saleRate:Number(settings?.saleRate||0) }} availableFundPaise={availableFundPaise}/></Suspense><ChatDock scope="branch"/></div>;
}
