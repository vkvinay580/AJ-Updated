import GattiSales from "@/components/admin/GattiSales";
import { getGattiSales } from "@/lib/gatti-sales";
import { requireSession } from "@/lib/auth";

export default async function GattiSalesPage() {
  await requireSession();
  return <GattiSales initialRecords={await getGattiSales()}/>;
}
