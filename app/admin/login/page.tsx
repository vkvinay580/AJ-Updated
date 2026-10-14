"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COMPANIES } from "@/lib/companies";
import { clearAndroidLogin, finishAndroidLogin, readAndroidLogin } from "@/lib/android";
import { messageFrom, requestJson } from "@/lib/client-api";

const subscribe = () => () => {};
const androidSnapshot = () => Boolean(window.AryanAndroid);
const serverSnapshot = () => false;

export default function AdminLoginPage() {
  const router = useRouter();
  const [company, setCompany] = useState<string>(COMPANIES[0].slug);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savePassword, setSavePassword] = useState(true);
  const isAndroid = useSyncExternalStore(subscribe, androidSnapshot, serverSnapshot);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const edited = useRef(false);
  useEffect(() => {
    if (!isAndroid) return;
    let cancelled = false;
    readAndroidLogin().then(saved => {
      if (!saved || cancelled || edited.current) return;
      setEmail(saved.email); setPassword(saved.password);
      if (COMPANIES.some(item => item.slug === saved.company)) setCompany(saved.company);
    }).catch(() => { /* Manual sign-in remains available on older app versions. */ });
    return () => { cancelled = true; };
  }, [isAndroid]);
  async function changeRemember(checked: boolean) {
    edited.current = true; setSavePassword(checked);
    if (!checked) {
      try { await clearAndroidLogin(); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to remove saved password."); }
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { response, data } = await requestJson<{ error?: string }>("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), company }) });
      if (!response.ok) { setError(data.error || "Unable to sign in."); return; }
      try { await finishAndroidLogin(savePassword, { email: String(form.get("email") || ""), password: String(form.get("password") || ""), company }); }
      catch (caught) { alert("Signed in, but your saved password could not be updated. " + messageFrom(caught, "Please try again.")); }
      router.replace("/admin"); router.refresh();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }
  return <div className="login-page"><section className="login-story"><div className="login-story-inner"><span className="security-pill"><ShieldCheck/> Secure business console</span><h1>One workspace.<br/><em>Three trusted businesses.</em></h1><p>Manage verified customers, KYC records, and company-specific billing from a private, secure portal.</p><div className="login-promise"><LockKeyhole/><span><strong>Company-isolated records</strong><small>Your selected company controls every customer, bill, and search result.</small></span></div></div></section>
    <section className="login-form-side"><div className="login-card"><div className="login-heading"><p>ADMINISTRATION</p><h2>Welcome back</h2><span>Select your company and enter your credentials.</span></div>
      <div className="company-picker">{COMPANIES.map((item)=><button type="button" key={item.slug} onClick={()=>{edited.current=true;setCompany(item.slug)}} className={company===item.slug?"selected":""}><Image src={item.logo} alt={item.name} width={66} height={66}/><span>{item.name}</span><i/></button>)}</div>
      <form onSubmit={submit} autoComplete={isAndroid?"off":"on"}><label>Email address<input name="email" type="email" value={email} onChange={event=>{edited.current=true;setEmail(event.target.value)}} autoComplete={isAndroid?"off":"username"} placeholder="admin@aryangold.in" required/></label><label>Password<div className="password-field"><input name="password" type={showPassword?"text":"password"} value={password} onChange={event=>{edited.current=true;setPassword(event.target.value)}} autoComplete={isAndroid?"off":"current-password"} placeholder="Enter your password" required/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword?<EyeOff/>:<Eye/>}</button></div></label>{isAndroid&&<div className="login-autofill"><label><input type="checkbox" checked={savePassword} onChange={event=>void changeRemember(event.target.checked)}/>Save password in this app</label></div>}{error&&<p className="form-error">{error}</p>}<button className="login-submit" disabled={loading}>{loading?"Signing in…":"Sign in securely"}<ArrowRight/></button></form>
      <p className="login-help"><LockKeyhole/> Protected access. Contact your administrator if you cannot sign in.</p></div></section>
  </div>;
}
