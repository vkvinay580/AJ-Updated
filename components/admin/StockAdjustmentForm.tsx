"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function StockAdjustmentForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/stock-adjustments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to record stock movement."); setSaving(false); return; }
    event.currentTarget.reset(); setSaving(false); router.refresh();
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>Metal<select name="metal"><option value="gold">Gold</option><option value="silver">Silver</option></select></label>
    <label>Action<select name="movement"><option value="add">Add stock</option><option value="remove">Remove stock</option></select></label>
    <label>Weight (g)<input name="weightGrams" type="number" min="0.001" step="0.001" required/></label>
    <label className="full">Notes<input name="notes" maxLength={500} placeholder="Reason or reference (optional)"/></label>
    {error && <p className="form-error full">{error}</p>}<button className="admin-primary" disabled={saving}>{saving ? "Recording…" : "Record movement"}</button>
  </form>;
}
