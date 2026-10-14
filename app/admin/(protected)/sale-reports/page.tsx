import SaleReports from "@/components/admin/SaleReports";
import { getGattiSales } from "@/lib/gatti-sales";

export default async function SaleReportsPage() {
  const end = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const start = `${end.slice(0, 8)}01`;
  return <SaleReports initialStart={start} initialEnd={end} initialRecords={await getGattiSales(start, end, true)}/>;
}
