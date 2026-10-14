"use client";

import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function BranchLoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { response, data } = await requestJson<{ error?: string }>("/api/branch/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      if (!response.ok) { setError(data.error || "Unable to sign in."); return; }
      router.replace("/branch"); router.refresh();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }
  return <div className="branch-login-page">
    <section className="branch-login-brand"><div><Image src="/brands/aryan-gold.png" alt="Aryan Gold" width={120} height={120}/><span><ShieldCheck/> Branch operations</span><h1>Every branch.<br/><em>One trusted ledger.</em></h1><p>Securely manage customers, gold purchases, fund requests, expenses, transit, and your end-of-day closing.</p></div></section>
    <section className="branch-login-form"><form onSubmit={submit}><div className="branch-login-mark"><Building2/></div><p>ARYAN GOLD BRANCHES</p><h2>Sign in to your branch</h2><span>Use the branch and employee credentials assigned by your administrator.</span>
      <label>Branch ID<input name="branchId" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="AGBPL001" onInput={event=>{event.currentTarget.value=event.currentTarget.value.toUpperCase()}} required/></label>
      <label>Employee ID<input name="employeeId" type="text" inputMode="numeric" pattern="[0-9]+" autoComplete="username" placeholder="Employee ID" onInput={event=>{event.currentTarget.value=event.currentTarget.value.replace(/\D/g,"")}} required/></label>
      <label>Password<div className="password-field"><input name="password" type={show ? "text" : "password"} placeholder="Admin-set password" required/><button type="button" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff/> : <Eye/>}</button></div></label>
      {error && <p className="form-error">{error}</p>}
      <button className="branch-login-submit" disabled={loading}>{loading ? "Signing in…" : "Enter branch workspace"}<ArrowRight/></button>
      <small><LockKeyhole/> Credentials are verified by Aryan Gold Attendance.</small>
    </form></section>
  </div>;
}
