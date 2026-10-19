"use client";

import { ArrowLeft, ArrowRight, Check, Pencil, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import CameraField from "@/components/admin/CameraField";

type FoundCustomer = { id:number; name:string; phone:string };
type VerificationOption = { id:number; userId:string; name:string; openCount:number };

export function CustomerRegistration({ portal = "admin" }: { portal?: "admin" | "branch" }) {
  const router = useRouter();
  const apiBase = `/api/${portal}`;
  const pageBase = `/${portal}`;
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"phone"|"register">("phone");
  const [existing, setExisting] = useState<FoundCustomer|null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestHouseVerification, setRequestHouseVerification] = useState(false);
  const [verificationOptions, setVerificationOptions] = useState<VerificationOption[]>([]);
  const [verificationTe, setVerificationTe] = useState("");
  const [verificationBmPhone, setVerificationBmPhone] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationLoadError, setVerificationLoadError] = useState("");
  useEffect(() => {
    if (portal !== "branch") return;
    let cancelled = false;
    void fetch("/api/branch/verifications", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load TE accounts.");
        if (!cancelled) setVerificationOptions(data.tes || []);
      })
      .catch(caught => { if (!cancelled) setVerificationLoadError(caught instanceof Error ? caught.message : "Unable to load TE accounts."); });
    return () => { cancelled = true; };
  }, [portal]);
  async function checkPhone(event: FormEvent) {
    event.preventDefault(); const digits=phone.replace(/\D/g,"").slice(-10); if(digits.length!==10){setError("Enter a valid 10-digit phone number.");return;} setChecking(true);setError("");
    const response=await fetch(`${apiBase}/customers?q=${digits}`); const data=await response.json(); const found=(data.customers||[]).find((c:FoundCustomer)=>c.phone===digits);
    if(found){setExisting(found);setPhone(digits);setChecking(false);return;} setPhone(digits);setStage("register");setChecking(false);
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setSaving(true);setError("");const form=new FormData(event.currentTarget);form.set("phone",phone);
    const aadhaar=String(form.get("aadhaar")||"").replace(/\D/g,""); const pan=String(form.get("pan")||"").toUpperCase();
    if(!/^\d{12}$/.test(aadhaar)&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)){setError("Enter a valid Aadhaar or PAN number.");setSaving(false);return;}
    if(requestHouseVerification&&(!verificationTe||verificationBmPhone.length!==10)){setError("Select a TE and enter the branch manager's 10-digit mobile number.");setSaving(false);return;}
    form.set("requestHouseVerification",requestHouseVerification?"1":"0");
    const response=await fetch(`${apiBase}/customers`,{method:"POST",body:form});const data=await response.json();
    if(!response.ok){if(response.status===409&&data.customerId){setStage("phone");setExisting({id:data.customerId,name:"Existing customer",phone});setSaving(false);return;}setError(data.error||"Unable to register customer.");setSaving(false);return;}
    router.push(`${pageBase}/bills/new?customerId=${data.customerId}${data.verificationRequestId?"&verificationRequested=1":""}`);
  }
  return <div className="admin-page narrow-page"><div className="page-title"><div><Link href={pageBase} className="back-link"><ArrowLeft/> Back to overview</Link><p>New transaction</p><h1>{stage==="phone"?"Find or add customer":"Register customer"}</h1><span>{stage==="phone"?"Start with the customer's mobile number.":"Complete customer, KYC, and optional working-proof details before billing."}</span></div></div>
    <div className="stepper"><div className="active"><i>{stage==="register"?<Check/>:"1"}</i><span>Phone check</span></div><b/><div className={stage==="register"?"active":""}><i>2</i><span>Customer, KYC & work</span></div><b/><div><i>3</i><span>Billing</span></div></div>
    {stage==="phone"?<section className="panel form-panel phone-check"><div className="form-icon"><Search/></div><h2>Enter customer phone number</h2><p>We’ll check whether this number is already registered before continuing.</p>{existing?<div className="existing-customer"><span>Phone number already exists</span><h3>{existing.name}</h3><p>+91 {existing.phone}</p><Link className="admin-primary existing-customer-continue" href={`${pageBase}/bills/new?customerId=${existing.id}`}>Continue with this customer <ArrowRight/></Link><div className="existing-customer-options">{portal==="admin"&&<Link href={`/admin/customers/${existing.id}/edit?returnTo=${encodeURIComponent(`/admin/bills/new?customerId=${existing.id}`)}`}><Pencil/> Edit customer</Link>}<button type="button" onClick={()=>{setExisting(null);setPhone("");setError("")}}>Use a different number</button></div></div>:<form onSubmit={checkPhone}><label>Mobile number<div className="phone-input"><span>+91</span><input inputMode="numeric" autoFocus value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="98765 43210"/></div></label>{error&&<p className="form-error">{error}</p>}<button className="admin-primary" disabled={checking}>{checking?"Checking…":"Continue"}<ArrowRight/></button></form>}<div className="privacy-note"><ShieldCheck/><span><strong>Privacy protected</strong> Customer records are visible only inside Aryan Gold.</span></div></section>
    :<form onSubmit={register} className="registration-form"><section className="panel form-panel"><div className="form-section-heading"><span>01</span><div><h2>Customer details</h2><p>Phone number verified as new: +91 {phone}</p></div></div><div className="form-grid"><label className="full">Full name *<input name="name" required maxLength={120}/></label><label>Email address<input name="email" type="email" maxLength={150}/></label><label>Postal code<input name="postalCode" inputMode="numeric" maxLength={10}/></label><label className="full">Address<textarea name="address" rows={3} maxLength={400}/></label><label>City<input name="city" maxLength={80}/></label><label>State<input name="state" maxLength={80} defaultValue="Karnataka"/></label><label>GSTIN/UIN<input name="gstin" maxLength={15} className="uppercase" placeholder="29ABCDE1234F1Z5"/></label><label>State code<input name="stateCode" inputMode="numeric" maxLength={2} defaultValue="29"/></label><label className="full">Place of supply<input name="placeOfSupply" maxLength={80} defaultValue="Karnataka"/></label></div><CameraField label="Customer photograph" name="customerImage" optional acceptPdf={false}/></section>
      <section className="panel form-panel"><div className="form-section-heading"><span>02</span><div><h2>KYC verification</h2><p>Add Aadhaar, PAN, or both. At least one valid KYC number is required; document files are optional.</p></div></div><div className="kyc-block"><label>Aadhaar number<input name="aadhaar" inputMode="numeric" placeholder="12-digit Aadhaar number" maxLength={14}/></label><CameraField label="Aadhaar document" name="aadhaarFile" optional/></div><div className="or-divider"><span>OR / AND</span></div><div className="kyc-block"><label>PAN number<input name="pan" placeholder="ABCDE1234F" maxLength={10} className="uppercase"/></label><CameraField label="PAN document" name="panFile" optional/></div></section>
      <section className="panel form-panel"><div className="form-section-heading"><span>03</span><div><h2>Working proof</h2><p>Optionally record the customer&apos;s employer details and capture or upload their company ID card.</p></div></div><div className="form-grid"><label>Company name<input name="employerName" maxLength={190}/></label><label>Designation<input name="employmentDesignation" maxLength={120}/></label><label className="full">Company address<textarea name="employerAddress" rows={3} maxLength={500}/></label></div><CameraField label="Company ID card" name="companyIdCard" optional acceptPdf={false}/></section>
      <section className="panel form-panel"><div className="form-section-heading"><span>04</span><div><h2>Old gold wearing image</h2><p>Optionally capture or upload a photograph showing the customer wearing the old gold item.</p></div></div><CameraField label="Old gold wearing image" name="oldGoldWearingImage" optional acceptPdf={false}/></section>
      {portal==="branch"&&<section className="panel form-panel verification-request-panel"><div className="form-section-heading"><span><ShieldCheck/></span><div><h2>House verification</h2><p>Optionally assign a TE as part of customer registration. The request and customer are saved together.</p></div></div><label className="share-after-save house-verification-toggle"><input type="checkbox" checked={requestHouseVerification} onChange={event=>setRequestHouseVerification(event.target.checked)}/><span><strong>Request house verification now</strong><small>The TE receives the customer details immediately after registration.</small></span></label>{requestHouseVerification&&<div className="verification-request-grid house-verification-fields"><label>Assign TE *<select name="verificationTeUserId" required value={verificationTe} onChange={event=>setVerificationTe(event.target.value)}><option value="">Select TE</option>{verificationOptions.map(te=><option key={te.id} value={te.id}>{te.name} · {te.userId} · {te.openCount||0} open</option>)}</select></label><label>Branch manager mobile *<input name="verificationBmPhone" required value={verificationBmPhone} onChange={event=>setVerificationBmPhone(event.target.value.replace(/\D/g,"").slice(0,10))} inputMode="numeric" maxLength={10} placeholder="10-digit mobile number"/></label><label className="full">Instructions for TE<textarea name="verificationNotes" value={verificationNotes} onChange={event=>setVerificationNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Landmark, visit timing, or special verification instructions"/></label></div>}{verificationLoadError&&<p className="form-error">{verificationLoadError}</p>}{!verificationLoadError&&requestHouseVerification&&!verificationOptions.length&&<p className="form-error">No active TE accounts are available.</p>}</section>}
      {error&&<p className="form-error sticky-error">{error}</p>}<div className="form-actions"><button type="button" className="admin-secondary" onClick={()=>setStage("phone")}><ArrowLeft/> Change number</button><button className="admin-primary" disabled={saving||(requestHouseVerification&&!verificationOptions.length)}>{saving?"Saving securely…":requestHouseVerification?"Save, request verification & proceed":"Save & proceed to billing"}<ArrowRight/></button></div></form>}
  </div>;
}

export default function NewCustomerPage() { return <CustomerRegistration/>; }
