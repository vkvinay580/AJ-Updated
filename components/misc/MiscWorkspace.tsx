"use client";

import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { messageFrom, requestJson } from "@/lib/client-api";
import type { MiscSession } from "@/lib/misc-auth";
import type { MiscEntry } from "@/lib/misc-store";

type MiscSummary = {
  totalEntries: number;
  totalValuePaise: number;
  todayValuePaise: number;
  monthValuePaise: number;
  uniqueNames: number;
  daily: { date: string; count: number; valuePaise: number }[];
};

type WorkspaceData = { entries: MiscEntry[]; summary: MiscSummary | null; error?: string };

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const displayDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function timeInIndia() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function formatMoney(valuePaise: number) {
  return money.format(valuePaise / 100);
}

function formatDate(value: string) {
  return displayDate.format(new Date(`${value}T00:00:00Z`));
}

export default function MiscWorkspace({ initialSession }: { initialSession: MiscSession }) {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData>({ entries: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    // Yield before state updates so an initial Effect starts an external fetch
    // instead of synchronously cascading another render.
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const { response, data: result } = await requestJson<WorkspaceData>("/api/misc/entries", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/misc/login");
        return;
      }
      if (!response.ok) throw new Error(result.error || "Unable to load entries.");
      setData(result);
    } catch (caught) {
      setError(messageFrom(caught, "Unable to load entries."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    requestJson<WorkspaceData>("/api/misc/entries", { cache: "no-store" }).then(({ response, data: result }) => {
      if (cancelled) return;
      if (response.status === 401) {
        router.replace("/misc/login");
        return;
      }
      if (!response.ok) throw new Error(result.error || "Unable to load entries.");
      setData(result);
    }).catch((caught) => {
      if (!cancelled) setError(messageFrom(caught, "Unable to load entries."));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch("/api/misc/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/misc/login");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const { response, data: result } = await requestJson<{ error?: string }>("/api/misc/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: values.get("date"), time: values.get("time"), name: values.get("name"), value: values.get("value"), description: values.get("description") }),
      });
      if (!response.ok) throw new Error(result.error || "Unable to save entry.");
      form.reset();
      const dateField = form.elements.namedItem("date") as HTMLInputElement | null;
      if (dateField) dateField.value = todayInIndia();
      const timeField = form.elements.namedItem("time") as HTMLInputElement | null;
      if (timeField) timeField.value = timeInIndia();
      setSuccess("Entry encrypted and saved successfully.");
      await load();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to save entry."));
    } finally {
      setSaving(false);
    }
  }

  return <div className="misc-app">
    <header className="misc-topbar">
      <div className="misc-brand"><Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={46} height={46} priority /><span><strong>Misc Register</strong><small>Encrypted file ledger</small></span></div>
      <div className="misc-user"><span><strong>{initialSession.displayName}</strong><small>{initialSession.role === "admin" ? "Administrator" : "Accounts entry"}</small></span><button type="button" onClick={logout} aria-label="Log out"><LogOut /></button></div>
    </header>

    <main className="misc-content">
      <section className="misc-heading">
        <div><p>{initialSession.role === "admin" ? "ADMIN OVERVIEW" : "ACCOUNTS ENTRY"}</p><h1>{initialSession.role === "admin" ? "Register summary" : "Add a daily entry"}</h1><span>{initialSession.role === "admin" ? "Review all encrypted miscellaneous records in one place." : "Record the date, time, name, value, and description for each item."}</span></div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spinning" : ""} /> Refresh</button>
      </section>

      {error && <p className="misc-alert error" role="alert">{error}</p>}
      {success && <p className="misc-alert success"><CheckCircle2 />{success}</p>}

      {initialSession.role === "acc" ? <>
        <section className="misc-entry-panel">
          <header><span><Plus /></span><div><p>NEW RECORD</p><h2>Entry details</h2><small>Every field is required.</small></div></header>
          <form onSubmit={submit}>
            <label>Date<input name="date" type="date" defaultValue={todayInIndia()} required /></label>
            <label>Time<input name="time" type="time" defaultValue={timeInIndia()} required /></label>
            <label>Name<input name="name" maxLength={100} placeholder="Person or item name" required /></label>
            <label>Value (₹)<input name="value" type="number" min="0.01" max="999999999.99" step="0.01" inputMode="decimal" placeholder="0.00" required /></label>
            <label className="wide">Description<textarea name="description" rows={4} maxLength={500} placeholder="Describe this entry" required /></label>
            <button type="submit" disabled={saving}>{saving ? "Encrypting & saving…" : "Save entry securely"}<ShieldCheck /></button>
          </form>
        </section>
        <EntryRegister entries={data.entries} loading={loading} title="Your recent entries" subtitle="Latest 10 records entered with this login" />
      </> : <AdminView data={data} loading={loading} />}
    </main>
  </div>;
}

function AdminView({ data, loading }: { data: WorkspaceData; loading: boolean }) {
  const summary = data.summary;
  return <>
    <section className="misc-metrics">
      <Metric icon={<ClipboardList />} label="Total entries" value={String(summary?.totalEntries || 0)} />
      <Metric icon={<WalletCards />} label="Total value" value={formatMoney(summary?.totalValuePaise || 0)} />
      <Metric icon={<CalendarDays />} label="Today" value={formatMoney(summary?.todayValuePaise || 0)} />
      <Metric icon={<IndianRupee />} label="This month" value={formatMoney(summary?.monthValuePaise || 0)} />
      <Metric icon={<UsersRound />} label="Unique names" value={String(summary?.uniqueNames || 0)} />
    </section>
    <section className="misc-admin-grid">
      <EntryRegister entries={data.entries} loading={loading} title="All entries" subtitle="Newest dates appear first" />
      <aside className="misc-daily-panel">
        <header><p>RECENT ACTIVITY</p><h2>Daily summary</h2></header>
        <div>{summary?.daily.length ? summary.daily.map((day) => <article key={day.date}><span><strong>{formatDate(day.date)}</strong><small>{day.count} {day.count === 1 ? "entry" : "entries"}</small></span><b>{formatMoney(day.valuePaise)}</b></article>) : <p className="misc-empty-small">No activity yet.</p>}</div>
      </aside>
    </section>
  </>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function EntryRegister({ entries, loading, title, subtitle }: { entries: MiscEntry[]; loading: boolean; title: string; subtitle: string }) {
  return <section className="misc-register">
    <header><div><ClipboardList /><span><strong>{title}</strong><small>{subtitle}</small></span></div><b>{entries.length}</b></header>
    {loading ? <div className="misc-empty">Loading secure records…</div> : entries.length ? <div className="misc-table-wrap"><table><thead><tr><th>Date &amp; time</th><th>Name</th><th>Description</th><th>Entered by</th><th className="right">Value</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><span className="misc-date"><CalendarDays />{formatDate(entry.date)} · {entry.time}</span></td><td className="strong"><UserRound />{entry.name}</td><td>{entry.description}</td><td><span className="misc-role">{entry.createdBy}</span></td><td className="right value">{formatMoney(entry.valuePaise)}</td></tr>)}</tbody></table></div> : <div className="misc-empty"><ClipboardList /><strong>No entries yet</strong><span>Saved records will appear here.</span></div>}
  </section>;
}
