"use client";

import { ArrowLeft, Download, Eye, FileSignature, Plus, Search, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";
import { GOLD_PURITY_OPTIONS, goldRateFor, type GoldRateSettings } from "@/lib/gold-rates";

type Customer = { id: number; name: string; phone: string; email?: string };
type BusinessMode = "walkin" | "pledged";
type QuoteItem = { description: string; purity: string; grossWeightGrams: string; stoneWeightGrams: string; wastageWeightGrams: string; rateRupeesPerGram: string };
type CreatedQuotation = { quotationId: number; quotationNumber: string };

const ORNAMENTS = ["Gold Ornament", "Chain", "Ring", "Bangle", "Necklace", "Earrings", "Bracelet", "Pendant", "Gold Coin", "Other Gold Article"];
const blankItem = (rates: GoldRateSettings): QuoteItem => ({ description: "Gold Ornament", purity: "916", grossWeightGrams: "", stoneWeightGrams: "0", wastageWeightGrams: "0", rateRupeesPerGram: (goldRateFor(rates, "purchase", "916") / 100).toFixed(2) });
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100);

export default function QuotationForm({ portal = "admin", fixedRates }: { portal?: "admin" | "branch"; fixedRates: GoldRateSettings }) {
  const searchParams = useSearchParams();
  const requestedCustomerId = Number(searchParams.get("customerId"));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>(() => [blankItem(fixedRates)]);
  const [businessMode, setBusinessMode] = useState<BusinessMode>("walkin");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedQuotation | null>(null);
  const apiBase = `/api/${portal}`;
  const pageBase = `/${portal}`;
  const backHref = portal === "admin" ? "/admin/quotations" : pageBase;

  useEffect(() => {
    if (!Number.isInteger(requestedCustomerId) || requestedCustomerId < 1) return;
    let cancelled = false;
    void requestJson<{ customer?: Customer; error?: string }>(`${apiBase}/customers/${requestedCustomerId}`, { cache: "no-store" })
      .then(({ response, data }) => { if (!cancelled) { if (response.ok && data.customer) setCustomer(data.customer); else setError(data.error || "Unable to load customer."); } })
      .catch(caught => { if (!cancelled) setError(messageFrom(caught, "Unable to load customer.")); });
    return () => { cancelled = true; };
  }, [apiBase, requestedCustomerId]);

  async function searchCustomers(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError("");
    try {
      const { response, data } = await requestJson<{ customers?: Customer[]; error?: string }>(`${apiBase}/customers?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      if (!response.ok) throw new Error(data.error || "Unable to search customers.");
      setResults(data.customers || []);
    } catch (caught) { setError(messageFrom(caught, "Unable to search customers.")); }
    finally { setSearching(false); }
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string) {
    setItems(current => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (field === "purity") return { ...item, purity: value, rateRupeesPerGram: (goldRateFor(fixedRates, "purchase", value) / 100).toFixed(2) };
      return { ...item, [field]: value };
    }));
    setCreated(null);
  }

  const calculated = useMemo(() => items.map(item => {
    const ratePaise = Math.round(Number(item.rateRupeesPerGram) * 100);
    const rateValid = Number.isSafeInteger(ratePaise) && ratePaise > 0 && ratePaise <= 1_000_000_000;
    const grossWeightMg = Math.round((Number(item.grossWeightGrams) || 0) * 1000);
    const stoneWeightMg = Math.round((Number(item.stoneWeightGrams) || 0) * 1000);
    const wastageWeightMg = Math.round((Number(item.wastageWeightGrams) || 0) * 1000);
    const weightsValid = grossWeightMg > 0 && stoneWeightMg >= 0 && wastageWeightMg >= 0 && stoneWeightMg + wastageWeightMg < grossWeightMg;
    const netWeightMg = weightsValid ? grossWeightMg - stoneWeightMg - wastageWeightMg : 0;
    return { ...item, ratePaise, rateValid, grossWeightMg, stoneWeightMg, wastageWeightMg, netWeightMg, weightsValid, amountPaise: rateValid ? Math.round(netWeightMg * ratePaise / 1000) : 0 };
  }), [items]);
  const totalGrossWeightMg = calculated.reduce((sum, item) => sum + item.grossWeightMg, 0);
  const totalStoneWeightMg = calculated.reduce((sum, item) => sum + item.stoneWeightMg, 0);
  const totalWastageWeightMg = calculated.reduce((sum, item) => sum + item.wastageWeightMg, 0);
  const totalNetWeightMg = calculated.reduce((sum, item) => sum + item.netWeightMg, 0);
  const totalPaise = calculated.reduce((sum, item) => sum + item.amountPaise, 0);
  const hasInvalidWeights = calculated.some(item => !item.weightsValid);
  const hasInvalidRates = calculated.some(item => !item.rateValid);
  const pledgeAmountPaise = Math.round(Number(pledgeAmount) * 100);
  const hasInvalidPledge = businessMode === "pledged" && (!Number.isSafeInteger(pledgeAmountPaise) || pledgeAmountPaise <= 0 || pledgeAmountPaise > totalPaise);

  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || saving) return;
    setSaving(true); setError(""); setCreated(null);
    try {
      const { response, data } = await requestJson<CreatedQuotation & { error?: string }>(`${apiBase}/quotations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customer.id, businessMode, pledgeAmount: businessMode === "pledged" ? pledgeAmount : null, items, notes }),
      });
      if (!response.ok) throw new Error(data.error || "Unable to create quotation.");
      setCreated({ quotationId: data.quotationId, quotationNumber: data.quotationNumber });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) { setError(messageFrom(caught, "Unable to create quotation.")); }
    finally { setSaving(false); }
  }

  const pdfUrl = created ? `${apiBase}/quotations/${created.quotationId}/pdf` : "";
  return <div className="admin-page quotation-page">
    <div className="page-title"><div><Link href={backHref} className="back-link"><ArrowLeft/> {portal === "admin" ? "Back to quotations" : "Back to overview"}</Link><p>Customer valuation</p><h1>Create gold quotation</h1><span>Choose the sale type, enter ornaments, and set the rate that applies only to this quotation.</span></div></div>
    {created && <section className="quotation-success" role="status"><span><FileSignature/></span><div><small>QUOTATION READY</small><h2>{created.quotationNumber}</h2><p>Saved with the issue date, time, customer details, rates, and item totals.</p></div><div><a className="admin-secondary" href={`${pdfUrl}?view=1`} target="_blank" rel="noreferrer"><Eye/> View quotation</a><a className="admin-primary" href={pdfUrl} download><Download/> Download PDF</a></div></section>}
    {!customer ? <section className="panel quotation-customer-search"><div className="quotation-section-title"><span><UserRound/></span><div><small>STEP 1</small><h2>Select customer</h2><p>Search by customer name or mobile number, or add a new customer first.</p></div></div><form onSubmit={searchCustomers}><div className="search-box"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or 10-digit mobile number" autoFocus/></div><button className="admin-primary" disabled={searching}>{searching ? "Searching…" : "Search"}</button><Link className="admin-secondary" href={`${pageBase}/customers/new`}><Plus/> Add customer</Link></form>{results.length > 0 && <div className="quotation-customer-results">{results.map(result => <button type="button" key={result.id} onClick={() => { setCustomer(result); setResults([]); setError(""); }}><span><strong>{result.name}</strong><small>+91 {result.phone}{result.email ? ` · ${result.email}` : ""}</small></span><b>Select</b></button>)}</div>}</section>
    : <form className="quotation-builder" onSubmit={createQuotation}>
      <section className="panel quotation-customer-card"><div className="quotation-section-title"><span><UserRound/></span><div><small>QUOTATION FOR</small><h2>{customer.name}</h2><p>+91 {customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p></div></div><button type="button" className="admin-secondary" onClick={() => { setCustomer(null); setCreated(null); }}>Change customer</button></section>
      <section className="panel quotation-mode-panel"><div><small>STEP 2</small><h2>Sale type</h2><p>Select whether this is a walk-in sale or pledged gold.</p></div><div className="quotation-mode-options"><label className={businessMode === "walkin" ? "selected" : ""}><input type="radio" name="businessMode" value="walkin" checked={businessMode === "walkin"} onChange={() => { setBusinessMode("walkin"); setPledgeAmount(""); setCreated(null); }}/><span><strong>Walk-in Sale</strong><small>Direct gold sale quotation</small></span></label><label className={businessMode === "pledged" ? "selected" : ""}><input type="radio" name="businessMode" value="pledged" checked={businessMode === "pledged"} onChange={() => { setBusinessMode("pledged"); setCreated(null); }}/><span><strong>Pledged</strong><small>Gold linked to an existing pledge</small></span></label></div>{businessMode === "pledged" && <label className="quotation-pledge-amount">Pledge amount (₹)<input type="number" min="0.01" max={Math.max(totalPaise / 100, 0.01)} step="0.01" value={pledgeAmount} onChange={event => { setPledgeAmount(event.target.value); setCreated(null); }} required placeholder="0.00"/><small>Must not exceed the quoted value.</small></label>}</section>
      <section className="panel quotation-items-panel"><div className="quotation-panel-head"><div><small>STEP 3</small><h2>Ornaments and valuation</h2><p>Rates start with the current Head Office purchase rate. Any change applies only to this quotation.</p></div><button type="button" className="admin-secondary" disabled={items.length >= 12} onClick={() => setItems(current => [...current, blankItem(fixedRates)])}><Plus/> Add ornament</button></div>
        <div className="quotation-item-list">{calculated.map((item, index) => <article key={index} className="quotation-item"><span className="quotation-item-number">{String(index + 1).padStart(2, "0")}</span><label>Ornament<select value={item.description} onChange={event => updateItem(index, "description", event.target.value)}>{ORNAMENTS.map(value => <option key={value}>{value}</option>)}</select></label><label>Purity<select value={item.purity} onChange={event => updateItem(index, "purity", event.target.value)}>{GOLD_PURITY_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><label>Rate / g (₹)<input type="number" min="0.01" max="10000000" step="0.01" value={item.rateRupeesPerGram} onChange={event => updateItem(index, "rateRupeesPerGram", event.target.value)} required/></label><label>Gross W (g)<input type="number" min="0.001" max="100000" step="0.001" value={item.grossWeightGrams} onChange={event => updateItem(index, "grossWeightGrams", event.target.value)} required placeholder="0.000"/></label><label>Stone W (g)<input type="number" min="0" max="100000" step="0.001" value={item.stoneWeightGrams} onChange={event => updateItem(index, "stoneWeightGrams", event.target.value)} required/></label><label>Wastage / deduction (g)<input type="number" min="0" max="100000" step="0.001" value={item.wastageWeightGrams} onChange={event => updateItem(index, "wastageWeightGrams", event.target.value)} required/></label><div className={`quotation-item-value ${item.weightsValid && item.rateValid ? "" : "invalid"}`}><small>{!item.rateValid ? "Enter a valid rate" : item.weightsValid ? `Net ${(item.netWeightMg / 1000).toFixed(3)} g · ${money(item.ratePaise)} / g` : "Deductions must be below gross weight"}</small><strong>{money(item.amountPaise)}</strong></div><button type="button" className="quotation-remove" disabled={items.length === 1} onClick={() => { setItems(current => current.filter((_, itemIndex) => itemIndex !== index)); setCreated(null); }} aria-label={`Remove ornament ${index + 1}`}><Trash2/></button></article>)}</div>
      </section>
      <section className="quotation-footer-grid"><div className="panel quotation-notes"><label>Quotation notes (optional)<textarea rows={4} maxLength={1000} value={notes} onChange={event => { setNotes(event.target.value); setCreated(null); }} placeholder="Condition, deductions, or customer-specific notes"/></label><p>The PDF will state that the quotation expires at branch closing or midnight and may be revoked without prior notice.</p></div><aside className="panel quotation-summary"><small>ESTIMATED PURCHASE VALUE</small><dl><div><dt>Sale type</dt><dd>{businessMode === "pledged" ? "Pledged" : "Walk-in Sale"}</dd></div><div><dt>Ornaments</dt><dd>{items.length}</dd></div><div><dt>Gross weight</dt><dd>{(totalGrossWeightMg / 1000).toFixed(3)} g</dd></div><div><dt>Stone deduction</dt><dd>{(totalStoneWeightMg / 1000).toFixed(3)} g</dd></div><div><dt>Wastage deduction</dt><dd>{(totalWastageWeightMg / 1000).toFixed(3)} g</dd></div><div><dt>Net gold weight</dt><dd>{(totalNetWeightMg / 1000).toFixed(3)} g</dd></div>{businessMode === "pledged" && <div><dt>Pledge amount</dt><dd>{money(pledgeAmountPaise)}</dd></div>}<div><dt>Quoted total</dt><dd>{money(totalPaise)}</dd></div></dl>{hasInvalidPledge && totalPaise > 0 && <p className="form-error">Enter a pledge amount greater than zero and not above the quoted value.</p>}{error && <p className="form-error">{error}</p>}<button className="admin-primary" disabled={saving || hasInvalidWeights || hasInvalidRates || hasInvalidPledge || totalPaise <= 0}><FileSignature/>{saving ? "Generating…" : "Generate quotation"}</button></aside></section>
    </form>}
    {!customer && error && <p className="form-error quotation-page-error">{error}</p>}
  </div>;
}
