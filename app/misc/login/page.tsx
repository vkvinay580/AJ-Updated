"use client";

import { ArrowRight, Eye, EyeOff, FileKey2, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function MiscLoginPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const { response, data } = await requestJson<{ error?: string }>("/api/misc/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }
      router.replace("/misc");
      router.refresh();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }

  return <div className="misc-login-page">
    <section className="misc-login-story">
      <div>
        <Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={82} height={82} priority />
        <span><ShieldCheck /> Private register</span>
        <h1>Simple entries.<br /><em>Securely kept.</em></h1>
        <p>A focused daily register for miscellaneous entries, protected with encrypted file storage and role-based access.</p>
        <article><FileKey2 /><div><strong>Encrypted outside the database</strong><small>Record and login files are unreadable without the server encryption secret.</small></div></article>
      </div>
    </section>
    <section className="misc-login-form">
      <form onSubmit={submit}>
        <div className="misc-login-icon"><LockKeyhole /></div>
        <p>MISC REGISTER</p>
        <h2>Secure login</h2>
        <span>Use your Admin or Accounts entry credentials.</span>
        <label>Username<input name="username" autoComplete="username" required autoFocus /></label>
        <label>Password<div className="misc-password-field"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setVisible(!visible)} aria-label="Toggle password visibility">{visible ? <EyeOff /> : <Eye />}</button></div></label>
        {error && <p className="misc-form-error" role="alert">{error}</p>}
        <button className="misc-login-submit" disabled={loading}>{loading ? "Signing in…" : "Enter register"}<ArrowRight /></button>
        <small><LockKeyhole /> This portal is separate from other Aryan Gold logins.</small>
      </form>
    </section>
  </div>;
}
