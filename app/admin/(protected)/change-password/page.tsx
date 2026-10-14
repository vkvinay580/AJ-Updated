"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
          confirmPassword: data.get("confirmPassword"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change password.");
      form.reset();
      setSuccess("Password changed successfully. Other signed-in devices have been logged out.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change password.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="admin-page narrow-page">
    <div className="page-title"><div><p>Account security</p><h1>Change password</h1><span>Update the password for your administrator account.</span></div></div>
    <section className="panel password-panel">
      <div className="form-section-heading"><span><KeyRound/></span><div><h2>Secure your account</h2><p>Use at least 8 characters. A longer, unique password is recommended.</p></div></div>
      <form onSubmit={submit} className="registration-form">
        <div className="form-grid">
          <label className="full">Current password<input type="password" name="currentPassword" autoComplete="current-password" required/></label>
          <label>New password<input type="password" name="newPassword" autoComplete="new-password" minLength={8} required/></label>
          <label>Confirm new password<input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required/></label>
        </div>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success"><ShieldCheck/>{success}</p>}
        <div className="form-actions"><button className="admin-primary" disabled={loading}>{loading ? "Changing…" : "Change password"}</button></div>
      </form>
    </section>
  </div>;
}
