"use client";

import { CalendarSearch, LoaderCircle, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { GattiSaleRecord } from "@/lib/gatti-sales";

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const grams = (mg: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(mg / 1000)} g`;

export default function SaleReports({ initialStart, initialEnd, initialRecords }: { initialStart: string; initialEnd: string; initialRecords: GattiSaleRecord[] }) {
  const today = localDate();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [records, setRecords] = useState<GattiSaleRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const search = async () => {
    if (!start || !end || start > end) { setError("Select a valid date range."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/gatti-sales?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&soldOnly=1`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load sale reports.");
      setRecords(result.records);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load sale reports."); }
    finally { setLoading(false); }
  };
  const total = records.reduce((sum, record) => sum + Number(record.saleAmountPaise || 0), 0);
  return <div className="admin-page sale-reports-page">
    <div className="page-title"><div><p>Admin only</p><h1>Sale reports</h1><span>Search the completed Gatti sale register by sale date.</span></div></div>
    <section className="panel report-filter"><div className="panel-heading"><div><h2>Report period</h2><p>Use any historical date range.</p></div><CalendarSearch/></div><div className="report-filter-body"><label>From date<input type="date" value={start} max={end || today} onChange={(event) => setStart(event.target.value)}/></label><label>To date<input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)}/></label><button className="admin-primary" disabled={loading || !start || !end || start > end} onClick={() => void search()}>{loading ? <LoaderCircle className="spin"/> : <Search/>}Search sales</button></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="metric-grid sale-report-metrics"><article><div><span>Sales found</span><strong>{records.length}</strong></div><ShoppingBag/></article><article><div><span>Total sale amount</span><strong>{money(total)}</strong></div><ShoppingBag/></article></div>
    <section className="panel"><div className="panel-heading"><div><h2>Gatti sale register</h2><p>{start} to {end}</p></div></div>
      {loading ? <div className="sales-loading"><LoaderCircle/> Loading sale register…</div> : records.length ? <div className="responsive-table"><table><thead><tr><th>Sale date</th><th>Gatti</th><th>Melt date</th><th>Output</th><th>Purity</th><th>Sold to</th><th className="right">Rate / g</th><th className="right">Sale amount</th><th>Notes</th></tr></thead><tbody>{records.map((record) => <tr key={record.saleId}><td>{record.saleDate}</td><td className="strong">{record.gattiId}</td><td>{record.meltDate}</td><td>{grams(record.outputWeightMg)}</td><td>{record.purity === null ? "—" : `${record.purity}%`}</td><td>{record.soldTo}</td><td className="right">{money(Number(record.saleRatePaisePerGram))}</td><td className="right strong">{money(Number(record.saleAmountPaise))}</td><td>{record.notes || "—"}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><ShoppingBag/><h3>No sales in this period</h3><p>Try another date range or record a completed Gatti sale first.</p></div>}
    </section>
  </div>;
}
