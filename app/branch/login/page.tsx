"use client";

import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function BranchLoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [branches, setBranches] = useState<Array<{ branchId: string; branchName: string }>>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void requestJson<{ branches?: Array<{ branchId: string; branchName: string }> }>("/api/branch/directory", { cache: "no-store" })
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok || !data.branches?.length) throw new Error("The live branch directory is unavailable.");
        setBranches(data.branches);
      })
      .catch(caught => { if (active) setError(messageFrom(caught, "Unable to load branches.")); })
      .finally(() => { if (active) setDirectoryLoading(false); });
    return () => { active = false; };
  }, []);
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
    <section className="branch-login-brand"><div><Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={120} height={120}/><span><ShieldCheck/> Branch operations</span><h1>Every branch.<br/><em>One trusted ledger.</em></h1><p>Securely manage customers, gold purchases, fund requests, expenses, transit, and your end-of-day closing.</p></div></section>
    <section className="branch-login-form"><form onSubmit={submit}><div className="branch-login-mark"><Building2/></div><p>ARYAN GOLD BRANCHES</p><h2>Sign in to your branch</h2><span>Use the branch and employee credentials assigned by your administrator.</span>
      <label>Branch<select name="branchId" required disabled={directoryLoading||!branches.length}><option value="">{directoryLoading?"Loading live branches…":"Select branch"}</option>{branches.map(branch=><option key={branch.branchId} value={branch.branchId}>{branch.branchId} · {branch.branchName}</option>)}</select></label>
      <label>Employee ID<input name="employeeId" type="text" inputMode="numeric" pattern="[0-9]+" autoComplete="username" placeholder="Employee ID" onInput={event=>{event.currentTarget.value=event.currentTarget.value.replace(/\D/g,"")}} required/></label>
      <label>Password<div className="password-field"><input name="password" type={show ? "text" : "password"} placeholder="Admin-set password" required/><button type="button" onClick={() => setShow(!show)} aria-label="Show password">{show ? <EyeOff/> : <Eye/>}</button></div></label>
      {error && <p className="form-error">{error}</p>}
      <button className="branch-login-submit" disabled={loading||directoryLoading||!branches.length}>{loading ? "Signing in…" : "Enter branch workspace"}<ArrowRight/></button>
      <small><LockKeyhole/> Credentials are verified by Aryan Gold Attendance.</small>
    </form></section>
  </div>;
}
