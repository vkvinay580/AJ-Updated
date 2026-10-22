"use client";

import { ArrowRight, Building2, Eye, EyeOff, Flame, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function HeadOfficeLoginPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { response, data } = await requestJson<{ error?: string; destination?: string }>("/api/head-office/login", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      if (!response.ok) { setError(data.error || "Unable to sign in."); return; }
      router.replace(data.destination || "/head-office"); router.refresh();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }
  return <div className="ho-login-page">
    <section className="ho-login-story"><div className="ho-story-glow"/><div className="ho-story-inner">
      <Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={84} height={84} priority/>
      <span className="security-pill"><ShieldCheck/> Secure Head Office</span>
      <h1>Every ornament.<br/><em>Precisely accounted.</em></h1>
      <p>A focused workspace for packet receipt, weight audit, melt grouping, and Gatti completion.</p>
      <div className="ho-role-cards"><article><Scale/><span><strong>Auditor</strong><small>Receive, verify, and group ornaments.</small></span></article><article><Flame/><span><strong>Melter</strong><small>Record Gatti output, Matti, and purity.</small></span></article><article><Building2/><span><strong>Floor User</strong><small>Access branch operations only.</small></span></article></div>
    </div></section>
    <section className="ho-login-form"><div className="ho-login-card"><p>HEAD OFFICE PORTAL</p><h2>Welcome back</h2><span>Use your assigned Auditor, Melter, or Floor account.</span>
      <form onSubmit={submit}><label>Username<input name="username" autoComplete="username" placeholder="Enter username" required/></label>
        <label>Password<div className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" required/><button type="button" onClick={() => setVisible(!visible)} aria-label="Toggle password visibility">{visible ? <EyeOff/> : <Eye/>}</button></div></label>
        {error && <p className="form-error">{error}</p>}<button className="ho-login-submit" disabled={loading}>{loading ? "Signing in…" : "Enter Head Office"}<ArrowRight/></button>
      </form><small className="ho-secure-note"><LockKeyhole/> Access is role restricted and activity is recorded.</small>
    </div></section>
  </div>;
}
