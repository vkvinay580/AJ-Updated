"use client";

import { CalendarDays, Download, Eye, FileSignature, HandCoins, Plus, RefreshCw, Scale, ScrollText, WalletCards } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";

type Quotation = {
  id: number; quotationNumber: string; businessMode: "walkin" | "pledged"; totalWeightMg: number; totalPaise: number;
  pledgeAmountPaise: number | null; originBranchId: string | null; createdAt: string; customerName: string; customerPhone: string;
};
type Summary = {
  quotationCount: number; totalWeightMg: number; totalPaise: number; walkinCount: number; walkinPaise: number;
  pledgedCount: number; pledgedPaise: number; pledgeAmountPaise: number;
};
type Response = { quotations?: Quotation[]; summary?: Summary; limited?: boolean; error?: string };

function indiaToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100);
const grams = (mg: number) => `${(Number(mg || 0) / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;
const dateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(value));
const emptySummary: Summary = { quotationCount: 0, totalWeightMg: 0, totalPaise: 0, walkinCount: 0, walkinPaise: 0, pledgedCount: 0, pledgedPaise: 0, pledgeAmountPaise: 0 };

export default function QuotationRegister() {
  const today = indiaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: today, to: today });
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [limited, setLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { response, data } = await requestJson<Response>(`/api/admin/quotations?from=${encodeURIComponent(applied.from)}&to=${encodeURIComponent(applied.to)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(data.error || "Unable to load quotations.");
      setQuotations(data.quotations || []);
      setSummary(data.summary || emptySummary);
      setLimited(Boolean(data.limited));
    } catch (caught) { setError(messageFrom(caught, "Unable to load quotations.")); }
    finally { if (!silent) setLoading(false); }
  }, [applied]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeData(() => load(true));

  function apply(event: FormEvent) {
    event.preventDefault();
    if (!from || !to || from > to) { setError("Choose a valid From and To date."); return; }
    setApplied({ from, to });
  }
  function selectToday() { setFrom(today); setTo(today); setApplied({ from: today, to: today }); }
  const rangeLabel = applied.from === today && applied.to === today ? "Today · IST" : `${new Date(`${applied.from}T00:00:00`).toLocaleDateString("en-IN")} – ${new Date(`${applied.to}T00:00:00`).toLocaleDateString("en-IN")} · IST`;

  return <div className="admin-page quotation-register-page">
    <div className="page-title"><div><p>Customer valuations</p><h1>Quotation register</h1><span>Daily totals and quotation history, reported in Indian Standard Time.</span></div><Link className="admin-primary" href="/admin/quotations/new"><Plus/> Create quotation</Link></div>
    <form className="panel quotation-date-filter" onSubmit={apply}><div><CalendarDays/><span><strong>Quotation period</strong><small>{rangeLabel}</small></span></div><label>From<input type="date" value={from} max={to || today} onChange={event => setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from} max={today} onChange={event => setTo(event.target.value)}/></label><button type="button" className="admin-secondary" onClick={selectToday}>Today</button><button className="admin-primary" disabled={loading}>Apply</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="metric-grid quotation-kpis" aria-label="Quotation totals">
      <article><div><span>Total quotations</span><strong>{summary.quotationCount.toLocaleString("en-IN")}</strong><small>{rangeLabel}</small></div><ScrollText/></article>
      <article><div><span>Total quoted value</span><strong>{money(summary.totalPaise)}</strong><small>All quotation types</small></div><WalletCards/></article>
      <article><div><span>Total net gold</span><strong>{grams(summary.totalWeightMg)}</strong><small>After all deductions</small></div><Scale/></article>
      <article><div><span>Walk-in sales</span><strong>{money(summary.walkinPaise)}</strong><small>{summary.walkinCount} quotation{summary.walkinCount === 1 ? "" : "s"}</small></div><FileSignature/></article>
      <article><div><span>Pledged quotations</span><strong>{money(summary.pledgedPaise)}</strong><small>{summary.pledgedCount} quotation{summary.pledgedCount === 1 ? "" : "s"}</small></div><HandCoins/></article>
      <article><div><span>Total pledge amount</span><strong>{money(summary.pledgeAmountPaise)}</strong><small>Entered against pledged gold</small></div><HandCoins/></article>
    </section>
    <section className="panel quotation-register-list"><header><div><RefreshCw className={loading ? "spinning" : ""}/><span><strong>Quotation list</strong><small>{rangeLabel}</small></span></div><b>{quotations.length}</b></header>
      {loading ? <div className="loading-state">Loading quotation totals…</div> : quotations.length ? <div className="responsive-table"><table><thead><tr><th>Date & time (IST)</th><th>Quotation</th><th>Customer</th><th>Type</th><th>Net gold</th><th className="right">Pledge amount</th><th className="right">Quoted value</th><th className="right">PDF</th></tr></thead><tbody>{quotations.map(quotation => <tr key={quotation.id}><td>{dateTime(quotation.createdAt)}</td><td><strong>{quotation.quotationNumber}</strong>{quotation.originBranchId && <small>Branch: {quotation.originBranchId}</small>}</td><td><strong>{quotation.customerName}</strong><small>+91 {quotation.customerPhone}</small></td><td><span className={`quotation-type ${quotation.businessMode}`}>{quotation.businessMode === "pledged" ? "Pledged" : "Walk-in Sale"}</span></td><td>{grams(quotation.totalWeightMg)}</td><td className="right">{quotation.businessMode === "pledged" ? money(quotation.pledgeAmountPaise || 0) : "—"}</td><td className="right strong">{money(quotation.totalPaise)}</td><td className="right"><span className="quotation-pdf-actions"><a href={`/api/admin/quotations/${quotation.id}/pdf?view=1`} target="_blank" rel="noreferrer" title="View PDF"><Eye/></a><a href={`/api/admin/quotations/${quotation.id}/pdf`} download title="Download PDF"><Download/></a></span></td></tr>)}</tbody></table></div> : <div className="empty-inline"><FileSignature/><h3>No quotations in this period</h3><p>Choose another date range or create a new quotation.</p></div>}
      {limited && <p className="quotation-list-limit">Showing the latest 1,000 quotations. KPI totals include the complete selected period.</p>}
    </section>
  </div>;
}
