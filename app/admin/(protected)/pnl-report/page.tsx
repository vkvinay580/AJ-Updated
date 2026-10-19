import PnlReport from "@/components/admin/PnlReport";
import { getPnlRows } from "@/lib/pnl";
import { requireSession } from "@/lib/auth";

export default async function PnlReportPage() {
  await requireSession();
  const end = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const start = `${end.slice(0, 8)}01`;
  return <PnlReport initialStart={start} initialEnd={end} initialRows={await getPnlRows(start, end)}/>;
}
