"use client";

import { ArrowLeft, ArrowRight, BellRing, Plus, Search, Send, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import CameraField from "@/components/admin/CameraField";
import { androidFile } from "@/lib/android";
import { messageFrom, requestJson } from "@/lib/client-api";

type Customer = { id: number; name: string; phone: string; email?: string };
type Item = { metal: "gold" | "silver"; description: string; itemDescription: string; hsnCode: string; purity: string; grossWeightGrams: string; stoneWeightGrams: string; netWeightGrams: string; ratePerGram: string; making: string };
type BusinessMode = "walkin" | "pledged";
type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "cheque";
type Payment = { method: PaymentMethod; amount: string; accountNumber: string; ifscCode: string; upiId: string; chequeNumber: string; cardNumber: string };
type VerificationOption = { id:number; userId:string; name:string; phone?:string; openCount:number };
type VerificationHistory = { id:number; status:string; teName:string; teUserId:string; assignedAt:string; completedAt?:string; verificationNotes?:string; failureReason?:string };

const ITEM_OPTIONS = [
  { description: "Gold Ornament", hsnCode: "711319", metal: "gold" },
  { description: "Gold Bullion", hsnCode: "710812", metal: "gold" },
  { description: "Gold Coin", hsnCode: "711890", metal: "gold" },
  { description: "Silver Bullion", hsnCode: "710691", metal: "silver" },
  { description: "Silver Article", hsnCode: "711411", metal: "silver" },
  { description: "Silver Ornament", hsnCode: "711311", metal: "silver" },
] as const;
const blank = (): Item => ({ metal: "gold", description: "Gold Ornament", itemDescription: "", hsnCode: "711319", purity: "24K / 999", grossWeightGrams: "", stoneWeightGrams: "0", netWeightGrams: "", ratePerGram: "", making: "0" });
const blankPayment = (method: PaymentMethod = "cash"): Payment => ({ method, amount: "", accountNumber: "", ifscCode: "", upiId: "", chequeNumber: "", cardNumber: "" });
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

export default function BillForm({ portal = "admin", fixedRates, availableFundPaise = 0 }: { portal?: "admin" | "branch"; fixedRates?: { purchaseRate: number; saleRate: number }; availableFundPaise?: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const isBranch = portal === "branch";
  const apiBase = `/api/${portal}`;
  const pageBase = `/${portal}`;
  const initial = params.get("customerId");
  const verificationRequestedAtCreation = params.get("verificationRequested") === "1";
  const pledgeId = isBranch ? params.get("pledgeId") : null;
  const fixedRate = (nextType: string) => Number(nextType === "purchase" ? fixedRates?.purchaseRate : fixedRates?.saleRate) / 100;
  const newItem = () => ({ ...blank(), ratePerGram: fixedRates ? String(fixedRate("purchase")) : "" });
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [type, setType] = useState<"sale" | "purchase">(isBranch ? "purchase" : "sale");
  const [businessMode, setBusinessMode] = useState<BusinessMode>(pledgeId ? "pledged" : "walkin");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgePaymentMethod, setPledgePaymentMethod] = useState("");
  const [releasePlace, setReleasePlace] = useState("");
  const [releaseAmount, setReleaseAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [payments, setPayments] = useState<Payment[]>([blankPayment()]);
  const [cgstRate, setCgstRate] = useState("1.5");
  const [sgstRate, setSgstRate] = useState("1.5");
  const [adjustment, setAdjustment] = useState("0");
  const [shareAfterSave, setShareAfterSave] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationOptions,setVerificationOptions]=useState<VerificationOption[]>([]);
  const [verificationHistory,setVerificationHistory]=useState<VerificationHistory[]>([]);
  const [verificationTe,setVerificationTe]=useState("");
  const [bmPhone,setBmPhone]=useState("");
  const [verificationNotes,setVerificationNotes]=useState("");
  const [verificationNotice,setVerificationNotice]=useState("");
  const [sendingVerification,setSendingVerification]=useState(false);

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    void requestJson<{ customer?: Customer; error?: string }>(`${apiBase}/customers/${initial}`)
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "Unable to load the selected customer.");
        if (data.customer) setCustomer(data.customer);
      })
      .catch(caught => { if (!cancelled) setError(messageFrom(caught, "Unable to load the selected customer.")); });
    return () => { cancelled = true; };
  }, [initial, apiBase]);
  useEffect(() => {
    if (!pledgeId) return;
    let cancelled = false;
    void requestJson<{ customer?: Customer; pledge?: Record<string, unknown>; error?: string }>(`${apiBase}/pledges/${pledgeId}`)
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "Unable to load the pledge details.");
        if (data.customer) setCustomer(data.customer);
        if (data.pledge?.pledgeAmountPaise) setPledgeAmount(String(Number(data.pledge.pledgeAmountPaise) / 100));
        if (data.pledge?.pledgePaymentMethod) setPledgePaymentMethod(String(data.pledge.pledgePaymentMethod));
        if (data.pledge?.releasePlace) setReleasePlace(String(data.pledge.releasePlace));
        if (data.pledge?.releaseAmountPaise) setReleaseAmount(String(Number(data.pledge.releaseAmountPaise) / 100));
      })
      .catch(caught => { if (!cancelled) setError(messageFrom(caught, "Unable to load the pledge details.")); });
    return () => { cancelled = true; };
  }, [pledgeId, apiBase]);
  useEffect(() => {
    if (customer || query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setSearching(true); setSearchAttempted(false);
      void requestJson<{ customers?: Customer[]; error?: string }>(`${apiBase}/customers?q=${encodeURIComponent(query)}`)
        .then(({ response, data }) => {
          if (cancelled) return;
          if (!response.ok) throw new Error(data.error || "Unable to search customers.");
          setResults(data.customers || []); setSearchAttempted(true);
        })
        .catch(caught => { if (!cancelled) { setResults([]); setError(messageFrom(caught, "Unable to search customers.")); } })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, customer, apiBase]);
  useEffect(()=>{
    if(!isBranch||!customer)return;
    let cancelled=false;
    void requestJson<{tes?:VerificationOption[];requests?:VerificationHistory[];error?:string}>(`/api/branch/verifications?customerId=${customer.id}`,{cache:"no-store"}).then(({response,data})=>{
      if(cancelled)return;if(!response.ok)throw new Error(data.error||"Unable to load verification options.");setVerificationOptions(data.tes||[]);setVerificationHistory(data.requests||[]);setVerificationNotice(verificationRequestedAtCreation?"House verification was assigned when this customer was added.":"");setVerificationTe("");setVerificationNotes("");
    }).catch(caught=>{if(!cancelled)setVerificationNotice(messageFrom(caught,"Unable to load verification options."));});
    return()=>{cancelled=true;};
  },[isBranch,customer,verificationRequestedAtCreation]);

  async function sendForVerification(){
    if(!customer||!verificationTe||bmPhone.replace(/\D/g,"").length!==10){setVerificationNotice("Select a TE and enter the branch manager's 10-digit mobile number.");return;}
    setSendingVerification(true);setVerificationNotice("");
    try{const{response,data}=await requestJson<{message?:string;error?:string}>("/api/branch/verifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:customer.id,teUserId:Number(verificationTe),bmPhone,notes:verificationNotes})});setVerificationNotice(data.message||data.error||"Verification request saved.");if(response.ok){setVerificationTe("");setVerificationNotes("");const refreshed=await requestJson<{tes?:VerificationOption[];requests?:VerificationHistory[]}>(`/api/branch/verifications?customerId=${customer.id}`,{cache:"no-store"});if(refreshed.response.ok){setVerificationOptions(refreshed.data.tes||[]);setVerificationHistory(refreshed.data.requests||[]);}}}catch(caught){setVerificationNotice(messageFrom(caught,"Unable to send verification request."));}finally{setSendingVerification(false);}
  }

  const totals = useMemo(() => {
    const subtotalPaise = items.reduce((sum, item) => sum + Math.round(((Number(item.netWeightGrams) || 0) * (Number(item.ratePerGram) || 0) + (Number(item.making) || 0)) * 100), 0);
    const cgstPaise = type === "sale" ? Math.round(subtotalPaise * (Number(cgstRate) || 0) / 100) : 0;
    const sgstPaise = type === "sale" ? Math.round(subtotalPaise * (Number(sgstRate) || 0) / 100) : 0;
    const adjustmentPaise = Math.round((Number(adjustment) || 0) * 100);
    return { subtotal: subtotalPaise / 100, cgst: cgstPaise / 100, sgst: sgstPaise / 100, total: (subtotalPaise + cgstPaise + sgstPaise + adjustmentPaise) / 100 };
  }, [items, type, cgstRate, sgstRate, adjustment]);
  const isPledgeIntake = isBranch && businessMode === "pledged" && !pledgeId;
  const finalPayablePaise = Math.max(0, Math.round(totals.total * 100) - Math.round((Number(releaseAmount) || 0) * 100));
  const finalPayable = finalPayablePaise / 100;
  const paymentTargetPaise = pledgeId ? finalPayablePaise : Math.round(totals.total * 100);
  const paymentTarget = paymentTargetPaise / 100;
  const allocatedPaymentsPaise = payments.reduce((sum, payment) => sum + Math.round((Number(payment.amount) || 0) * 100), 0);
  const allocatedPayments = allocatedPaymentsPaise / 100;
  const paymentDifferencePaise = paymentTargetPaise - allocatedPaymentsPaise;
  const paymentDifference = paymentDifferencePaise / 100;
  const cashAllocatedPaise = payments.filter(payment => payment.method === "cash").reduce((sum, payment) => sum + Math.round((Number(payment.amount) || 0) * 100), 0);
  const pledgeAdjustmentPaise = pledgeId && pledgePaymentMethod === "cash" ? Math.round((Number(pledgeAmount) - Number(releaseAmount)) * 100) : 0;
  const effectiveAvailableFundPaise = Math.max(0, availableFundPaise + pledgeAdjustmentPaise);
  const cashShortfallPaise = isBranch ? Math.max(0, cashAllocatedPaise - effectiveAvailableFundPaise) : 0;

  const update = (index: number, key: keyof Item, value: string) => setItems(current => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const next = { ...item, [key]: value };
    if (key === "grossWeightGrams" || key === "stoneWeightGrams") {
      const gross = Number(next.grossWeightGrams), stone = Number(next.stoneWeightGrams);
      next.netWeightGrams = Number.isFinite(gross) && Number.isFinite(stone) && gross >= stone ? (gross - stone).toFixed(3) : "";
    }
    return next;
  }));
  const selectDescription = (index: number, description: string) => setItems(current => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const option = ITEM_OPTIONS.find(entry => entry.description === description);
    return option ? { ...item, description, hsnCode: option.hsnCode, metal: option.metal } : { ...item, description };
  }));
  const selectType = (nextType: "sale" | "purchase") => {
    setType(nextType);
    if (fixedRates) setItems(current => current.map(item => item.metal === "gold" ? { ...item, ratePerGram: String(fixedRate(nextType)) } : item));
    if (nextType === "purchase") setPayments(current => current.map(payment => ["card", "cheque"].includes(payment.method) ? { ...blankPayment("cash"), amount: payment.amount } : payment));
  };
  const updatePayment = (index: number, key: keyof Payment, value: string) => setPayments(current => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, [key]: value } : payment));
  const addPaymentChannel = () => setPayments(current => {
    const allocatedPaise = current.reduce((sum, payment) => sum + Math.round((Number(payment.amount) || 0) * 100), 0);
    const remainingPaise = Math.max(0, paymentTargetPaise - allocatedPaise);
    return [...current, { ...blankPayment("upi"), amount: remainingPaise > 0 ? (remainingPaise / 100).toFixed(2) : "" }];
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) { setError("Select a customer before creating the bill."); return; }
    if (!isPledgeIntake && paymentDifferencePaise !== 0) { setError("Payment channel amounts must exactly match the payable bill amount."); return; }
    if (!isPledgeIntake && cashShortfallPaise > 0) { setError(`Only ${money(effectiveAvailableFundPaise / 100)} is available in branch cash. Reduce the cash amount and split the remaining ${money(cashShortfallPaise / 100)} through UPI or bank transfer.`); return; }
    setSaving(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("customerId", String(customer.id));
      if (isPledgeIntake) {
        const { response, data } = await requestJson<{ error?: string }>(`${apiBase}/pledges`, { method: "POST", body: form });
        if (!response.ok) { setError(data.error || "Unable to save pledge."); return; }
        router.push("/branch?created=pledge");
        return;
      }
      form.set("transactionType", isBranch ? "purchase" : type);
      form.set("businessMode", isBranch ? businessMode : "walkin");
      if (pledgeId) form.set("pledgeId", pledgeId);
      form.set("cgstRate", cgstRate); form.set("sgstRate", sgstRate); form.set("adjustment", adjustment); form.set("items", JSON.stringify(items)); form.set("payments", JSON.stringify(payments));
      const { response, data } = await requestJson<{ error?: string; billId?: number; billNumber?: string; companyName?: string }>(`${apiBase}/bills`, { method: "POST", body: form });
      if (!response.ok || !data.billId || !data.billNumber) { setError(data.error || "Unable to save bill."); return; }
      const companyName = data.companyName || "the company";
      const pdfUrl = `${apiBase}/bills/${data.billId}/pdf`;
      if (shareAfterSave && !androidFile("share", pdfUrl, `${data.billNumber}.pdf`, `Find your bill ${data.billNumber} attached. Thank you for ${type === "sale" ? `buying from ${companyName}` : `selling at ${companyName}`}.`)) {
        try {
          const pdfResponse = await fetch(pdfUrl);
          if (!pdfResponse.ok) throw new Error("The bill was saved, but its PDF could not be prepared for sharing.");
          const blob = await pdfResponse.blob(), file = new File([blob], `${data.billNumber}.pdf`, { type: "application/pdf" });
          const direction = type === "sale" ? `buying from ${companyName}` : `selling at ${companyName}`, text = `Find your bill ${data.billNumber} attached. Thank you for ${direction}.`;
          if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ title: `Bill ${data.billNumber}`, text, files: [file] });
          else { const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(`${text}\n\nThe PDF has been downloaded. Please attach ${file.name} to this chat.`)}`, "_blank", "noopener,noreferrer"); }
        } catch { /* The saved bill remains available when sharing is cancelled or unavailable. */ }
      }
      if (isBranch) { router.push("/branch?created=purchase"); return; }
      router.push(`/admin/bills/${data.billId}?created=1${shareAfterSave ? "&share=1" : ""}`);
    } catch (caught) {
      setError(messageFrom(caught, isPledgeIntake ? "Unable to save pledge." : "Unable to save bill."));
    } finally {
      setSaving(false);
    }
  }

  return <div className="admin-page">
    <div className="page-title"><div><Link href={isBranch ? "/branch" : "/admin/bills"} className="back-link"><ArrowLeft/> {isBranch ? "Branch workspace" : "Bill register"}</Link><p>Billing</p><h1>{pledgeId ? "Complete released pledge purchase" : isBranch ? "Create a purchase" : "Create a new bill"}</h1><span>{pledgeId ? "Add the released gold purchase details and calculate the balance payable to the customer." : isBranch ? "Choose walk-in or pledged and follow the appropriate purchase workflow." : "Record a gold sale or purchase with a complete invoice."}</span></div></div>
    <div className="stepper compact" aria-label="Billing progress"><div className="active" aria-current={!customer ? "step" : undefined}><i>1</i><span>Customer</span></div><b/><div className={customer ? "active" : ""} aria-current={customer ? "step" : undefined}><i>2</i><span>Bill details</span></div><b/><div><i>3</i><span>Complete</span></div></div>
    <form onSubmit={save} className="billing-layout"><div className="billing-main">
      <section className="panel form-panel"><div className="form-section-heading"><span>01</span><div><h2>Customer</h2><p>Every bill is tied to a company customer.</p></div></div>{customer ? <div className="selected-customer"><div className="user-avatar">{customer.name[0]}</div><div><strong>{customer.name}</strong><span>+91 {customer.phone}{customer.email ? ` · ${customer.email}` : ""}</span></div><button type="button" onClick={() => { setCustomer(null); setResults([]); setSearching(false); setSearchAttempted(false); setError(""); }}>Change</button></div> : <div className="customer-search"><Search/><input value={query} inputMode="numeric" maxLength={10} aria-label="Search customers by phone number" onChange={event => { const value = event.target.value.replace(/\D/g, "").slice(0, 10); setQuery(value); setSearching(false); setSearchAttempted(false); setError(""); if (value.length < 2) setResults([]); }} placeholder="Search by 10-digit phone number…"/>{results.length > 0 && <div>{results.map(result => <button type="button" key={result.id} onClick={() => { setCustomer(result); setQuery(""); setResults([]); setSearching(false); setSearchAttempted(false); setError(""); }}><strong>{result.name}</strong><span>+91 {result.phone}</span></button>)}</div>}{searching && <span className="customer-search-status" role="status">Searching customers…</span>}{!searching && searchAttempted && results.length === 0 && <span className="customer-search-status" role="status">No customer found for this phone number.</span>}<p>Not registered? <Link href={`${pageBase}/customers/new`}>Add a new customer</Link></p></div>}</section>

      {isBranch&&customer&&<section className="panel form-panel verification-request-panel"><div className="form-section-heading"><span><ShieldCheck/></span><div><h2>Customer field verification</h2><p>Assign an active TE now; billing can continue while the home visit is pending.</p></div></div><div className="verification-request-grid"><label>Assign TE<select value={verificationTe} onChange={event=>setVerificationTe(event.target.value)}><option value="">Select TE</option>{verificationOptions.map(te=><option key={te.id} value={te.id}>{te.name} · {te.userId} · {te.openCount||0} open</option>)}</select></label><label>Branch manager mobile<input value={bmPhone} onChange={event=>setBmPhone(event.target.value.replace(/\D/g,"").slice(0,10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number"/></label><label className="full">Instructions for TE<textarea value={verificationNotes} onChange={event=>setVerificationNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Landmark, visit timing, or special verification instructions"/></label><button type="button" className="admin-secondary" onClick={()=>void sendForVerification()} disabled={sendingVerification||!verificationOptions.length}><Send/> {sendingVerification?"Sending…":"Send for verification"}</button><a className="verification-app-link" href="/downloads/aryan-verification.apk" download="Aryan-Verification.apk"><BellRing/> Aryan Verification app</a></div>{verificationNotice&&<p className="verification-inline-notice" role="status">{verificationNotice}</p>}{verificationHistory.length>0&&<div className="verification-history-inline">{verificationHistory.map(item=><div key={item.id}><span className={`verification-status ${item.status}`}>{item.status.replaceAll("_"," ")}</span><strong>{item.teName}</strong><small>{new Date(item.assignedAt).toLocaleString("en-IN")}{item.verificationNotes?` · ${item.verificationNotes}`:item.failureReason?` · ${item.failureReason}`:""}</small></div>)}</div>}</section>}

      {isBranch && !pledgeId && <section className="panel form-panel"><div className="form-section-heading"><span>02</span><div><h2>Purchase type</h2><p>Select how this purchase should move through the branch workflow.</p></div></div><div className="transaction-toggle"><button type="button" className={businessMode === "walkin" ? "active" : ""} onClick={() => setBusinessMode("walkin")}><strong>Walk-in purchase</strong><span>Complete purchase details and submit for admin approval</span></button><button type="button" className={businessMode === "pledged" ? "active" : ""} onClick={() => setBusinessMode("pledged")}><strong>Pledged purchase</strong><span>Add pledge details now and complete purchase billing only after release</span></button></div>{businessMode === "pledged" && <div className="form-grid pledge-fields"><label>Pledge amount (₹)<input name="pledgeAmount" value={pledgeAmount} onChange={event=>setPledgeAmount(event.target.value)} required type="number" min="1" step="0.01"/></label><label>Release place<input name="releasePlace" value={releasePlace} onChange={event=>setReleasePlace(event.target.value)} required maxLength={190} placeholder="Bank / finance company / lender"/></label><label>Release amount (₹)<input name="releaseAmount" value={releaseAmount} onChange={event=>setReleaseAmount(event.target.value)} required type="number" min="0.01" step="0.01"/></label><div className="full"><CameraField label="Pledge bill document" name="pledgeDocument" acceptPdf multiple/></div></div>}</section>}

      {!isPledgeIntake && <section className="panel form-panel"><div className="form-section-heading"><span>{isBranch ? "03" : "02"}</span><div><h2>{pledgeId ? "Released pledge billing" : isBranch ? "Purchase details" : "Transaction details"}</h2><p>{pledgeId ? `Complete the purchase using the saved release details for ${releasePlace || "this pledge"}.` : isBranch ? "Branches can create purchase bills only. The fixed purchase rate is applied automatically." : "Choose whether the company is selling or purchasing gold."}</p></div></div>{!isBranch && <div className="transaction-toggle"><button type="button" className={type === "sale" ? "active" : ""} onClick={() => selectType("sale")}><strong>Sale</strong><span>Company sells gold to customer</span></button><button type="button" className={type === "purchase" ? "active" : ""} onClick={() => selectType("purchase")}><strong>Purchase</strong><span>Company buys gold from customer</span></button></div>}
        <div className="items-head"><h3>Bill items</h3><button type="button" onClick={() => setItems([...items, newItem()])}><Plus/> Add item</button></div><div className="bill-items">{items.map((item, index) => <div className="bill-item" key={index}><div className="item-number">{String(index + 1).padStart(2, "0")}</div><label className="description">Item type<select required value={item.description} onChange={event => selectDescription(index, event.target.value)}>{ITEM_OPTIONS.map(option => <option key={option.description}>{option.description}</option>)}</select></label>{isBranch && <label className="item-description">Item description<input value={item.itemDescription} maxLength={190} placeholder="Item description" onChange={event => update(index, "itemDescription", event.target.value)}/></label>}<label>HSN code<input required readOnly value={item.hsnCode}/></label><label>Purity<input value={item.purity} onChange={event => update(index, "purity", event.target.value)}/></label><label>Gross W (g)<input required type="number" min="0.001" step="0.001" value={item.grossWeightGrams} onChange={event => update(index, "grossWeightGrams", event.target.value)}/></label><label>Stone W (g)<input required type="number" min="0" max={item.grossWeightGrams || undefined} step="0.001" value={item.stoneWeightGrams} onChange={event => update(index, "stoneWeightGrams", event.target.value)}/></label><label>Net W (g)<input required readOnly type="number" min="0.001" step="0.001" value={item.netWeightGrams}/></label><label>Rate / gram<input required type="number" min="0.01" step="0.01" value={item.ratePerGram} onChange={event => update(index, "ratePerGram", event.target.value)}/></label><label>Making / other<input type="number" step="0.01" value={item.making} onChange={event => update(index, "making", event.target.value)}/></label><div className="item-amount"><span>Amount</span><strong>{money((Number(item.netWeightGrams) || 0) * (Number(item.ratePerGram) || 0) + (Number(item.making) || 0))}</strong></div>{items.length > 1 && <button className="remove-item" type="button" aria-label={`Remove bill item ${index + 1}`} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2/></button>}</div>)}</div>
      </section>}

      <section className="panel form-panel"><div className="form-section-heading"><span>{isBranch ? isPledgeIntake?"03":"04" : "03"}</span><div><h2>Payment & notes</h2><p>{isPledgeIntake?"Record how the pledge amount is being paid and add any intake notes.":type==="purchase"?"Split the payable amount between cash, UPI, or bank transfer.":"Split the payable amount between cash, UPI, bank, card, or cheque."}</p></div></div>
        {isPledgeIntake?<div className="form-grid"><label>Payment method<select name="paymentMethod" required value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option></select></label>{paymentMethod === "bank_transfer" && <><label>Account number<input name="accountNumber" required maxLength={34} autoComplete="off"/></label><label>IFSC code<input name="ifscCode" required maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" style={{ textTransform: "uppercase" }}/></label></>}{paymentMethod === "upi" && <label>UPI ID<input name="upiId" required maxLength={100} placeholder="name@bank" autoComplete="off"/></label>}{paymentMethod === "cheque" && <label>Cheque number<input name="chequeNumber" required inputMode="numeric" maxLength={20}/></label>}{paymentMethod === "card" && <label>Card number<input name="cardNumber" required inputMode="numeric" minLength={12} maxLength={19} autoComplete="off" onInput={event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 19); }}/></label>}<label className="full">Notes<textarea name="notes" rows={3} maxLength={500} placeholder="Optional transaction notes…"/></label></div>:<><div className="split-payment-editor"><div className="split-payment-heading"><div><strong>Payment channels</strong><span>Total allocation must equal {money(paymentTarget)}</span></div><button type="button" onClick={addPaymentChannel}><Plus/> Add channel</button></div>{payments.map((payment,index)=><div className="split-payment-row" key={index}><label>Method<select value={payment.method} onChange={event=>updatePayment(index,"method",event.target.value as PaymentMethod)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option>{type==="sale"&&<><option value="card">Card</option><option value="cheque">Cheque</option></>}</select></label><label>Amount (₹)<input type="number" min="0.01" step="0.01" value={payment.amount} onChange={event=>updatePayment(index,"amount",event.target.value)} required/></label>{payment.method==="bank_transfer"&&<><label>Account number<input value={payment.accountNumber} onChange={event=>updatePayment(index,"accountNumber",event.target.value)} maxLength={34} autoComplete="off" required/></label><label>IFSC code<input value={payment.ifscCode} onChange={event=>updatePayment(index,"ifscCode",event.target.value.toUpperCase())} maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" required/></label></>}{payment.method==="upi"&&<label>UPI ID<input value={payment.upiId} onChange={event=>updatePayment(index,"upiId",event.target.value)} maxLength={100} placeholder="name@bank" required/></label>}{payment.method==="cheque"&&<label>Cheque number<input value={payment.chequeNumber} onChange={event=>updatePayment(index,"chequeNumber",event.target.value)} maxLength={20} required/></label>}{payment.method==="card"&&<label>Card number<input value={payment.cardNumber} onChange={event=>updatePayment(index,"cardNumber",event.target.value.replace(/\D/g,"").slice(0,19))} inputMode="numeric" minLength={12} maxLength={19} autoComplete="off" required/></label>}{payments.length>1&&<button className="remove-payment" type="button" onClick={()=>setPayments(current=>current.filter((_,paymentIndex)=>paymentIndex!==index))}><Trash2/> Remove</button>}</div>)}<div className={`payment-allocation ${paymentDifferencePaise===0?"balanced":"unbalanced"}`}><span>Allocated <strong>{money(allocatedPayments)}</strong></span><span>{paymentDifferencePaise>=0?"Remaining":"Over allocated"} <strong>{money(Math.abs(paymentDifference))}</strong></span></div>{isBranch&&<div className={`cash-fund-guidance ${cashShortfallPaise>0?"shortfall":""}`}><span>Available branch cash <strong>{money(effectiveAvailableFundPaise/100)}</strong></span>{cashShortfallPaise>0?<p>Cash exceeds the available balance by <strong>{money(cashShortfallPaise/100)}</strong>. Reduce cash and add UPI or bank transfer for the balance.</p>:<p>The cash part of this bill will be reserved immediately.</p>}</div>}</div><div className="form-grid payment-extras"><div className="full"><CameraField label="Item / ornament photo" name="ornamentImage" optional acceptPdf={false}/></div><div className="full"><CameraField label="Customer signature photo" name="signatureImage" optional acceptPdf={false}/></div><label className="full">Notes<textarea name="notes" rows={3} maxLength={500} placeholder="Optional transaction notes…"/></label></div></>}
      </section>
    </div>
    <aside className="panel bill-summary"><h2>{isPledgeIntake?"Pledge summary":"Bill summary"}</h2>{!isPledgeIntake&&type === "sale" && <><label>CGST rate (%)<input type="number" min="0" max="50" step="0.01" value={cgstRate} onChange={event => setCgstRate(event.target.value)}/></label><label>SGST / UTGST rate (%)<input type="number" min="0" max="50" step="0.01" value={sgstRate} onChange={event => setSgstRate(event.target.value)}/></label></>}{!isPledgeIntake&&<label>Round-off / adjustment<input type="number" step="0.01" value={adjustment} onChange={event => setAdjustment(event.target.value)}/></label>}<dl>{isPledgeIntake?<div className="grand-total"><dt>Cash funds to reserve</dt><dd>{money(paymentMethod === "cash" ? Number(pledgeAmount) || 0 : 0)}</dd></div>:<><div><dt>{type === "sale" ? "Taxable value" : "Purchase value"}</dt><dd>{money(totals.subtotal)}</dd></div>{type === "sale" && <><div><dt>CGST @ {cgstRate || 0}%</dt><dd>{money(totals.cgst)}</dd></div><div><dt>SGST / UTGST @ {sgstRate || 0}%</dt><dd>{money(totals.sgst)}</dd></div></>}<div><dt>Adjustment</dt><dd>{money(Number(adjustment))}</dd></div>{pledgeId&&<div><dt>Less: release amount</dt><dd>− {money(Number(releaseAmount)||0)}</dd></div>}<div className="grand-total"><dt>{pledgeId?"Payable to customer":"Total"}</dt><dd>{money(pledgeId?finalPayable:totals.total)}</dd></div></>}</dl>{!isPledgeIntake&&<label className="share-after-save"><input type="checkbox" checked={shareAfterSave} onChange={event => setShareAfterSave(event.target.checked)}/><span><strong>Share bill with customer</strong><small>Open sharing options after the bill is generated.</small></span></label>}{error && <p className="form-error">{error}</p>}<button className="admin-primary full-button" disabled={saving || !customer || (!isPledgeIntake && cashShortfallPaise > 0)}>{saving ? "Saving…" : isPledgeIntake?"Save pledge & reserve funds":pledgeId?"Generate released purchase bill":type === "sale" ? "Generate sale bill" : "Generate purchase bill"}<ArrowRight/></button><small className="summary-note">{isPledgeIntake?paymentMethod === "cash"?"Cash payments reduce branch available funds. Purchase details will be added after release.":"This payment method does not reduce branch available funds. Purchase details will be added after release.":"The bill number is generated automatically and cannot be reused across this company."}</small></aside>
    </form>
  </div>;
}
