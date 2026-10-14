"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";

export default function ChangePasswordForm({ endpoint, compact = false }: { endpoint: string; compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { response, data: result } = await requestJson<{ error?: string; message?: string }>(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
          confirmPassword: data.get("confirmPassword"),
        }),
      });
      if (!response.ok) throw new Error(result.error || "Unable to change password.");
      form.reset();
      setSuccess(result.message || "Password changed successfully. Other signed-in devices have been logged out.");
    } catch (caught) {
      setError(messageFrom(caught, "Unable to change password."));
    } finally {
      setLoading(false);
    }
  }

  return <form className={`password-change-form${compact ? " compact" : ""}`} onSubmit={submit}>
    <div className="password-form-intro"><span><KeyRound/></span><div><h2>Change password</h2><p>Use at least 8 characters. Your other sessions will be signed out.</p></div></div>
    <label>Current password<div className="password-input"><input name="currentPassword" type={show ? "text" : "password"} autoComplete="current-password" required/><button type="button" onClick={() => setShow(value => !value)} aria-label={show ? "Hide passwords" : "Show passwords"}>{show ? <EyeOff/> : <Eye/>}</button></div></label>
    <div className="password-form-grid">
      <label>New password<input name="newPassword" type={show ? "text" : "password"} minLength={8} autoComplete="new-password" required/></label>
      <label>Confirm new password<input name="confirmPassword" type={show ? "text" : "password"} minLength={8} autoComplete="new-password" required/></label>
    </div>
    {error && <p className="password-form-error" role="alert" aria-live="assertive">{error}</p>}
    {success && <p className="password-form-success" role="status" aria-live="polite"><ShieldCheck/>{success}</p>}
    <button className="password-form-submit" disabled={loading}>{loading ? "Changing…" : "Update password"}</button>
  </form>;
}
