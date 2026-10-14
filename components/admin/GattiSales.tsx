"use client";

import { BadgeIndianRupee, CheckCircle2, Flame, LoaderCircle, Scale, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { GattiSaleRecord } from "@/lib/gatti-sales";

type SaleForm = { saleDate: string; rate: string; soldTo: string; amount: string; notes: string };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const grams = (mg: number) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(mg / 1000)} g`;

export default function GattiSales({ initialRecords }: { initialRecords: GattiSaleRecord[] }) {
  const [records, setRecords] = useState<GattiSaleRecord[]>(initialRecords);
  const [forms, setForms] = useState<Record<number, SaleForm>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/gatti-sales", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load Gatti sales.");
      setRecords(result.records);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load Gatti sales."); }
    finally { setLoading(false); }
  };

  const formFor = (record: GattiSaleRecord) => forms[record.meltGroupId] || { saleDate: today(), rate: "", soldTo: "", amount: "", notes: "" };
  const update = (record: GattiSaleRecord, field: keyof SaleForm, value: string) => {
    const current = formFor(record);
    const next = { ...current, [field]: value };
    if (field === "rate" && value && !Number.isNaN(Number(value))) next.amount = (Number(value) * record.outputWeightMg / 1000).toFixed(2);
    setForms((existing) => ({ ...existing, [record.meltGroupId]: next }));
  };
  const submit = async (record: GattiSaleRecord) => {
    const form = formFor(record);
    setSaving(record.meltGroupId); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/gatti-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        meltGroupId: record.meltGroupId, saleDate: form.saleDate, soldTo: form.soldTo,
        saleRatePaisePerGram: Math.round(Number(form.rate) * 100), saleAmountPaise: Math.round(Number(form.amount) * 100), notes: form.notes,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save the sale.");
      setSuccess(`${record.gattiId} sale recorded.`);
      setForms((existing) => { const next = { ...existing }; delete next[record.meltGroupId]; return next; });
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the sale."); }
    finally { setSaving(null); }
  };

  const awaiting = records.filter((record) => !record.saleId);
  const sold = records.filter((record) => record.saleId);
  const soldValue = sold.reduce((sum, record) => sum + Number(record.saleAmountPaise || 0), 0);
  return <div className="admin-page gatti-sales-page">
    <div className="page-title"><div><p>Admin only</p><h1>Gatti sales</h1><span>Record the buyer, rate, and final sale amount for each completed Gatti.</span></div></div>
    <div className="metric-grid gatti-sale-metrics">
      <article><div><span>Completed Gattis</span><strong>{records.length}</strong></div><Flame/></article>
      <article><div><span>Awaiting sale</span><strong>{awaiting.length}</strong></div><Scale/></article>
      <article><div><span>Sold Gattis</span><strong>{sold.length}</strong></div><ShoppingBag/></article>
      <article><div><span>Total sale value</span><strong>{money(soldValue)}</strong></div><BadgeIndianRupee/></article>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="form-success"><CheckCircle2/>{success}</p>}
    <section className="panel"><div className="panel-heading"><div><h2>Ready for sale</h2><p>Only completed Gattis without an existing sale are shown here.</p></div><span>{awaiting.length} pending</span></div>
      {loading ? <div className="sales-loading"><LoaderCircle/> Loading completed Gattis…</div> : awaiting.length ? <div className="gatti-sale-list">{awaiting.map((record) => { const form = formFor(record); return <article className="gatti-sale-card" key={record.meltGroupId}>
        <header><div><small>Gatti ID</small><strong>{record.gattiId}</strong><span>Melted {record.meltDate}</span></div><div><small>Output weight</small><strong>{grams(record.outputWeightMg)}</strong><span>{record.purity === null ? "Purity not recorded" : `${record.purity}% purity`}</span></div></header>
        <div className="gatti-sale-form">
          <label>Sale date<input type="date" max={today()} value={form.saleDate} onChange={(event) => update(record, "saleDate", event.target.value)}/></label>
          <label>Sale rate / gram (₹)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.rate} onChange={(event) => update(record, "rate", event.target.value)} placeholder="0.00"/></label>
          <label>Sold to<input value={form.soldTo} maxLength={190} onChange={(event) => update(record, "soldTo", event.target.value)} placeholder="Buyer or company name"/></label>
          <label>Sale amount (₹)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => update(record, "amount", event.target.value)} placeholder="0.00"/><small>Auto-calculated from rate × output weight; adjust if the final invoice differs.</small></label>
          <label className="wide">Notes (optional)<input value={form.notes} maxLength={500} onChange={(event) => update(record, "notes", event.target.value)} placeholder="Reference or payment note"/></label>
          <button className="admin-primary" disabled={saving === record.meltGroupId || !form.saleDate || Number(form.rate) <= 0 || Number(form.amount) <= 0 || form.soldTo.trim().length < 2} onClick={() => void submit(record)}>{saving === record.meltGroupId ? <LoaderCircle className="spin"/> : <ShoppingBag/>}{saving === record.meltGroupId ? "Saving…" : "Record sale"}</button>
        </div>
      </article>; })}</div> : <div className="empty-inline"><CheckCircle2/><h3>All completed Gattis are recorded</h3><p>New completed Gattis will appear here automatically.</p></div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Recent recorded sales</h2><p>The complete register is available under Sale reports.</p></div></div>
      {sold.length ? <div className="responsive-table"><table><thead><tr><th>Sale date</th><th>Gatti</th><th>Weight</th><th>Sold to</th><th className="right">Rate / g</th><th className="right">Sale amount</th></tr></thead><tbody>{sold.slice(0, 10).map((record) => <tr key={record.saleId}><td>{record.saleDate}</td><td className="strong">{record.gattiId}</td><td>{grams(record.outputWeightMg)}</td><td>{record.soldTo}</td><td className="right">{money(Number(record.saleRatePaisePerGram))}</td><td className="right strong">{money(Number(record.saleAmountPaise))}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><ShoppingBag/><h3>No Gatti sales yet</h3><p>Recorded sales will appear here.</p></div>}
    </section>
  </div>;
}
