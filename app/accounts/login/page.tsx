"use client";

import { ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function AccountsLoginPage() {
  const router = useRouter();
  const [visible,setVisible]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError("");const form=new FormData(event.currentTarget);
    try{const{response,data}=await requestJson<{error?:string}>("/api/accounts/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})});if(!response.ok){setError(data.error||"Unable to sign in.");return;}router.replace("/accounts");router.refresh();}
    catch(caught){setError(messageFrom(caught,"Unable to sign in."));}finally{setLoading(false);}}
  return <div className="accounts-login-page"><section className="accounts-login-story"><div><Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={86} height={86} priority/><span><ShieldCheck/> Secure payment operations</span><h1>Every payout.<br/><em>Clearly reconciled.</em></h1><p>Process approved branch purchase payments with verified destination details and a complete UTR audit trail.</p><article><Landmark/><div><strong>Accounts payment desk</strong><small>Only admin-approved business appears in this workspace.</small></div></article></div></section>
    <section className="accounts-login-form"><form onSubmit={submit}><div className="accounts-login-icon"><Landmark/></div><p>ARYAN GOLD ACCOUNTS</p><h2>Accounts login</h2><span>Use the credentials assigned to the Accounts team.</span><label>Username<input name="username" autoComplete="username" required/></label><label>Password<div className="password-field"><input name="password" type={visible?"text":"password"} autoComplete="current-password" required/><button type="button" onClick={()=>setVisible(!visible)} aria-label="Toggle password visibility">{visible?<EyeOff/>:<Eye/>}</button></div></label>{error&&<p className="form-error">{error}</p>}<button className="accounts-login-submit" disabled={loading}>{loading?"Signing in…":"Enter Accounts"}<ArrowRight/></button><small><LockKeyhole/> Payment activity is restricted and recorded.</small></form></section></div>;
}
