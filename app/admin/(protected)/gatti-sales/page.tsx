import GattiSales from "@/components/admin/GattiSales";
import { getGattiSales } from "@/lib/gatti-sales";

export default async function GattiSalesPage() {
  return <GattiSales initialRecords={await getGattiSales()}/>;
}
