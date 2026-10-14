"use client";

import { CalendarSearch, Eye, IndianRupee, LoaderCircle, ReceiptText, Scale, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PnlRow } from "@/lib/pnl";

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const grams = (mg: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(mg / 1000)} g`;

export default function PnlReport({ initialStart, initialEnd, initialRows }: { initialStart: string; initialEnd: string; initialRows: PnlRow[] }) {
  const today = localDate();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [rows, setRows] = useState<PnlRow[]>(initialRows);
  const [selected, setSelected] = useState<PnlRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const search = async () => {
    if (!start || !end || start > end) { setError("Select a valid date range."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/pnl?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to calculate P&L.");
      setRows(result.rows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to calculate P&L."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected]);

  const revenue = rows.reduce((sum, row) => sum + row.saleAmountPaise, 0);
  const goldCost = rows.reduce((sum, row) => sum + row.goldCostPaise, 0);
  const expenses = rows.reduce((sum, row) => sum + row.expensePaise, 0);
  const profit = rows.reduce((sum, row) => sum + row.profitPaise, 0);
  return <div className="admin-page pnl-page">
    <div className="page-title"><div><p>Admin only</p><h1>Profit &amp; loss</h1><span>Trace every sold Gatti from sale value to gold cost and allocated branch expenses.</span></div></div>
    <section className="panel report-filter"><div className="panel-heading"><div><h2>Historical search</h2><p>Results use the Gatti sale date.</p></div><CalendarSearch/></div><div className="report-filter-body"><label>From date<input type="date" value={start} max={end || today} onChange={(event) => setStart(event.target.value)}/></label><label>To date<input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)}/></label><button className="admin-primary" disabled={loading || !start || !end || start > end} onClick={() => void search()}>{loading ? <LoaderCircle className="spin"/> : <Search/>}Calculate P&amp;L</button></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="metric-grid pnl-metrics">
      <article><div><span>Sale revenue</span><strong>{money(revenue)}</strong></div><IndianRupee/></article>
      <article><div><span>Gold purchase cost</span><strong>{money(goldCost)}</strong></div><Scale/></article>
      <article><div><span>Allocated expenses</span><strong>{money(expenses)}</strong></div><ReceiptText/></article>
      <article className={profit < 0 ? "loss" : "profit"}><div><span>Net P&amp;L</span><strong>{money(profit)}</strong></div>{profit < 0 ? <TrendingDown/> : <TrendingUp/>}</article>
    </div>
    <section className="panel"><div className="panel-heading"><div><h2>Gatti P&amp;L register</h2><p>{start} to {end}</p></div><span>{rows.length} sale{rows.length === 1 ? "" : "s"}</span></div>
      {loading ? <div className="sales-loading"><LoaderCircle/> Calculating P&amp;L…</div> : rows.length ? <div className="responsive-table"><table><thead><tr><th>Sale date</th><th>Gatti</th><th>Business date(s)</th><th>Sold to</th><th className="right">Revenue</th><th className="right">Gold cost</th><th className="right">Expenses</th><th className="right">P&amp;L</th><th>Calculation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.saleId}><td>{row.saleDate}</td><td><strong>{row.gattiId}</strong><small>{grams(row.outputWeightMg)}</small></td><td>{row.businessDates.join(", ") || "—"}</td><td>{row.soldTo}</td><td className="right strong">{money(row.saleAmountPaise)}</td><td className="right">{money(row.goldCostPaise)}</td><td className="right">{money(row.expensePaise)}</td><td className={`right strong pnl-value ${row.profitPaise < 0 ? "negative" : "positive"}`}>{money(row.profitPaise)}</td><td><button className="calculation-button" onClick={() => setSelected(row)}><Eye/>View details</button></td></tr>)}</tbody></table></div> : <div className="empty-inline"><TrendingUp/><h3>No sold Gattis in this period</h3><p>Use a different sale-date range or enter a Gatti sale first.</p></div>}
    </section>
    {selected && <div className="calculation-modal" role="dialog" aria-modal="true" aria-labelledby="calculation-title"><button className="calculation-scrim" onClick={() => setSelected(null)} aria-label="Close calculation"/><section className="calculation-card">
      <header><div><p>Calculation details</p><h2 id="calculation-title">{selected.gattiId} · {selected.saleDate}</h2><span>{selected.soldTo}</span></div><button onClick={() => setSelected(null)} aria-label="Close"><X/></button></header>
      <div className="calculation-formula"><span><small>Sale amount</small><strong>{money(selected.saleAmountPaise)}</strong></span><b>−</b><span><small>Gold cost</small><strong>{money(selected.goldCostPaise)}</strong></span><b>−</b><span><small>Expenses</small><strong>{money(selected.expensePaise)}</strong></span><b>=</b><span className={selected.profitPaise < 0 ? "negative" : "positive"}><small>Net P&amp;L</small><strong>{money(selected.profitPaise)}</strong></span></div>
      <div className="calculation-section"><h3>Gold purchase cost included</h3>{selected.goldDetails.length ? <div className="responsive-table"><table><thead><tr><th>Branch</th><th>Business date</th><th>Source purchase</th><th>Gatti input</th><th className="right">Amount paid</th><th className="right">Cost allocated</th></tr></thead><tbody>{selected.goldDetails.map((detail) => <tr key={detail.transactionId}><td>{detail.branchId}</td><td>{detail.businessDate}</td><td>{grams(detail.purchaseWeightMg)}</td><td>{grams(detail.gattiInputWeightMg)}</td><td className="right">{money(detail.amountPaidPaise)}</td><td className="right strong">{money(detail.allocatedCostPaise)}</td></tr>)}</tbody></table></div> : <p className="calculation-empty">No linked billed purchase was found.</p>}</div>
      <div className="calculation-section"><h3>Approved expenses included</h3>{selected.expenseDetails.length ? <div className="responsive-table"><table><thead><tr><th>Branch</th><th>Expense date</th><th>Applied to business</th><th>Category / description</th><th className="right">Original</th><th className="right">Allocated</th></tr></thead><tbody>{selected.expenseDetails.map((detail) => <tr key={`${detail.expenseId}-${detail.businessDate}`}><td>{detail.branchId}</td><td>{detail.expenseDate}</td><td>{detail.businessDate}</td><td><strong>{detail.category}</strong><small>{detail.description}</small></td><td className="right">{money(detail.originalAmountPaise)}</td><td className="right strong">{money(detail.allocatedAmountPaise)}</td></tr>)}</tbody></table></div> : <p className="calculation-empty">No approved expenses were allocated to this Gatti’s business dates.</p>}</div>
    </section></div>}
  </div>;
}
