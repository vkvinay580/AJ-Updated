"use client";

import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Flame, KeyRound, Layers3, LogOut, PackageCheck, RefreshCw, Scale, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { HeadOfficeSession } from "@/lib/head-office-auth";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import { messageFrom, requestJson } from "@/lib/client-api";
import ChatDock from "@/components/chat/ChatDock";

type Row = Record<string, string | number | null>;
type WorkspaceData = { items: Row[]; groups: Row[]; groupItems: Row[] };
const initial: WorkspaceData = { items: [], groups: [], groupItems: [] };
const grams = (mg: unknown) => `${(Number(mg || 0) / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;
const money = (paise: unknown) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise || 0) / 100);

export default function HeadOfficeWorkspace({ initialSession }: { initialSession: HeadOfficeSession }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const { response, data: result } = await requestJson<WorkspaceData & { error?: string }>("/api/head-office/workspace", { cache: "no-store" });
      if (response.status === 401) { router.replace("/head-office/login"); return; }
      if (response.ok) setData(result); else setNotice(result.error || "Unable to load Head Office data.");
    } catch (caught) {
      setNotice(messageFrom(caught, "Unable to load Head Office data."));
    } finally {
      setLoading(false);
    }
  }, [router]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeData(load);
  async function post(payload: Record<string, unknown>) {
    if (saving) return false;
    setSaving(true); setNotice("");
    try {
      const { response, data: result } = await requestJson<{ message?: string; error?: string }>("/api/head-office/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setNotice(result.message || result.error || "Saved.");
      if (response.ok) { setSelected([]); await load(); }
      return response.ok;
    } catch (caught) {
      setNotice(messageFrom(caught, "Unable to save this Head Office update."));
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function logout() { await fetch("/api/head-office/logout", { method: "POST" }); router.replace("/head-office/login"); router.refresh(); }

  const pending = data.items.filter(item => !item.auditStatus);
  const ready = data.items.filter(item => item.auditStatus === "audited" && !item.meltGroupId);
  const packetCount = new Set(pending.map(item => item.transactionId)).size;
  const openGroups = data.groups.filter(group => group.status === "created");
  return <div className="ho-app">
    <header className="ho-topbar"><div className="ho-brand"><Image src="/brands/aryan-gold.webp" alt="Aryan Gold" width={48} height={48}/><span><strong>Aryan Gold</strong><small>Head Office</small></span></div>
      <div className="ho-user"><span className={`ho-role ${initialSession.role}`}>{initialSession.role === "auditor" ? <Scale/> : <Flame/>}{initialSession.role}</span><div><strong>{initialSession.name}</strong><small>@{initialSession.username}</small></div><button onClick={()=>setPasswordOpen(true)} aria-label="Change password"><KeyRound/></button><button onClick={logout} aria-label="Sign out"><LogOut/></button></div></header>
    <main className="ho-content">
      <section className="ho-heading"><div><p>{initialSession.role === "auditor" ? "RECEIPT & WEIGHT CONTROL" : "MELTING FLOOR"}</p><h1>{initialSession.role === "auditor" ? "Ornament audit desk" : "Gatti production desk"}</h1><span>{initialSession.role === "auditor" ? "Verify every branch packet before grouping ornaments for melting." : "Complete each prepared melt group with its final weights and purity."}</span></div><button className="ho-refresh" onClick={() => void load()}><RefreshCw/> Refresh</button></section>
      {notice && <button className="ho-notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}
      {loading ? <div className="ho-loading"><span/><p>Loading secure records…</p></div> : initialSession.role === "auditor"
        ? <AuditorView data={data} pending={pending} ready={ready} packetCount={packetCount} selected={selected} setSelected={setSelected} saving={saving} post={post} expanded={expanded} setExpanded={setExpanded}/>
        : <MelterView data={data} openGroups={openGroups} saving={saving} post={post} expanded={expanded} setExpanded={setExpanded}/>}</main>
    {passwordOpen&&<div className="password-modal" role="dialog" aria-modal="true" aria-label="Change password"><button className="password-modal-scrim" onClick={()=>setPasswordOpen(false)} aria-label="Close password dialog"/><div className="password-modal-card"><button className="password-modal-close" onClick={()=>setPasswordOpen(false)} aria-label="Close"><X/></button><ChangePasswordForm endpoint="/api/head-office/change-password" compact/></div></div>}
    <ChatDock scope="head-office"/>
  </div>;
}

function AuditorView({ data, pending, ready, packetCount, selected, setSelected, saving, post, expanded, setExpanded }: {
  data: WorkspaceData; pending: Row[]; ready: Row[]; packetCount: number; selected: number[]; setSelected: (value: number[]) => void;
  saving: boolean; post: (payload: Record<string, unknown>) => Promise<boolean>; expanded: number | null; setExpanded: (value: number | null) => void;
}) {
  const packets = useMemo(() => Array.from(new Set(data.items.map(item => Number(item.transferId)))).map(id => ({ id, items: data.items.filter(item => Number(item.transferId) === id) })), [data.items]);
  async function audit(event: FormEvent<HTMLFormElement>, transferItemId: number) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (await post({ action: "audit-item", transferItemId, auditedWeightGrams: form.get("auditedWeightGrams"), notes: form.get("notes") })) event.currentTarget.reset();
  }
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await post({ action: "create-melt-group", itemIds: selected, notes: form.get("notes") });
  }
  const toggle = (id: number) => setSelected(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  return <>
    <div className="ho-metrics"><article><PackageCheck/><span><small>Packets awaiting audit</small><strong>{packetCount}</strong></span></article><article><ClipboardCheck/><span><small>Ornaments awaiting audit</small><strong>{pending.length}</strong></span></article><article><Layers3/><span><small>Ready to group</small><strong>{ready.length}</strong></span></article><article><Flame/><span><small>Gatti groups created</small><strong>{data.groups.length}</strong></span></article></div>
    <section className="ho-panel"><div className="ho-panel-title"><div><p>INCOMING FROM BRANCHES</p><h2>Dispatch receipt and ornament audit</h2></div><span>{packets.length} dispatches</span></div>
      <div className="ho-packets">{packets.length ? packets.map(packet => {
        const first = packet.items[0]; const isOpen = expanded === packet.id; const done = packet.items.filter(item => item.auditStatus).length;
        const sourcePackets = new Set(packet.items.map(item => Number(item.transactionId))).size;
        return <article className="ho-packet" key={packet.id}><button className="ho-packet-head" onClick={() => setExpanded(isOpen ? null : packet.id)}><PackageCheck/><span><small>Dispatch #{packet.id} · {sourcePackets} packet{sourcePackets === 1 ? "" : "s"}</small><strong>{first.branchId}</strong><em>Net {grams(first.dispatchNetWeightMg)} · Tare {grams(first.tareWeightMg)} · Gross {grams(Number(first.dispatchNetWeightMg)+Number(first.tareWeightMg))}</em><em>{first.bmName ? `BM ${first.bmName} · ${first.bmPhone} · ` : ""}Sent by {first.sentBy} · {new Date(String(first.sentAt)).toLocaleString("en-IN")}</em></span><b>{done}/{packet.items.length} audited</b>{isOpen ? <ChevronUp/> : <ChevronDown/>}</button>
          {isOpen && <div className="ho-packet-body">{packet.items.map(item => <div className={`ho-audit-item ${item.auditStatus ? "complete" : ""}`} key={Number(item.transferItemId)}>
            <div className="ho-item-summary"><span><small>Bill</small><strong>{item.billNumber}</strong><em>{item.billDate}</em></span><span><small>Customer</small><strong>{item.customerName}</strong><em>{item.customerPhone}</em></span><span><small>Ornament</small><strong>{item.itemDescription || item.description}</strong><em>{item.purity || "Purity not entered"}</em></span><span><small>Sent weight</small><strong>{grams(item.sentWeightMg)}</strong><em>Net {grams(item.netWeightMg)}</em></span><span><small>Bill value</small><strong>{money(item.totalPaise)}</strong><em>{String(item.paymentMethod).replaceAll("_", " ")}</em></span></div>
            {item.auditStatus ? <div className="ho-audited"><CheckCircle2/><span><strong>Received & audited at {grams(item.auditedWeightMg)}</strong><small>{item.auditorName} · {new Date(String(item.auditedAt)).toLocaleString("en-IN")}</small></span></div>
              : <form className="ho-audit-form" onSubmit={event => void audit(event, Number(item.transferItemId))}><label>Audited weight (g)<input name="auditedWeightGrams" type="number" min="0.001" step="0.001" defaultValue={(Number(item.sentWeightMg) / 1000).toFixed(3)} required/></label><label>Audit note<input name="notes" placeholder="Optional discrepancy note"/></label><button disabled={saving}><Scale/> Receive & audit</button></form>}
          </div>)}</div>}</article>;
      }) : <Empty icon={<PackageCheck/>} title="No packets have been sent" text="Branch packets will appear here with their bill and ornament details."/>}</div>
    </section>
    <section className="ho-panel"><div className="ho-panel-title"><div><p>READY FOR MELTING</p><h2>Build a new melt group</h2></div><span>{selected.length} selected</span></div>
      {ready.length ? <form onSubmit={event => void createGroup(event)}><div className="ho-selection-grid">{ready.map(item => <label className={selected.includes(Number(item.transferItemId)) ? "selected" : ""} key={Number(item.transferItemId)}><input type="checkbox" checked={selected.includes(Number(item.transferItemId))} onChange={() => toggle(Number(item.transferItemId))}/><span><strong>{item.itemDescription || item.description}</strong><small>{item.branchId} · {item.billNumber}</small><em>{grams(item.auditedWeightMg)} audited</em></span><CheckCircle2/></label>)}</div>
        <div className="ho-group-actions"><label>Group note<input name="notes" placeholder="Optional instructions for the melter"/></label><div><small>Selected audited weight</small><strong>{grams(ready.filter(item => selected.includes(Number(item.transferItemId))).reduce((sum, item) => sum + Number(item.auditedWeightMg), 0))}</strong></div><button disabled={!selected.length || saving}><Layers3/> Create Gatti group</button></div></form>
        : <Empty icon={<Layers3/>} title="No audited ornaments are waiting" text="Receive and audit ornaments above before creating a Gatti group."/>}
    </section>
    <GroupRegister groups={data.groups} groupItems={data.groupItems} expanded={expanded} setExpanded={setExpanded}/>
  </>;
}

function MelterView({ data, openGroups, saving, post, expanded, setExpanded }: { data: WorkspaceData; openGroups: Row[]; saving: boolean; post: (payload: Record<string, unknown>) => Promise<boolean>; expanded: number | null; setExpanded: (value: number | null) => void }) {
  async function complete(event: FormEvent<HTMLFormElement>, groupId: number) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await post({ action: "complete-melt-group", groupId, inputWeightGrams: form.get("inputWeightGrams"), outputWeightGrams: form.get("outputWeightGrams"), mattiWeightGrams: form.get("mattiWeightGrams"), purity: form.get("purity"), notes: form.get("notes") });
  }
  const completed = data.groups.filter(group => group.status === "completed");
  return <><div className="ho-metrics melter"><article><Flame/><span><small>Waiting to melt</small><strong>{openGroups.length}</strong></span></article><article><Scale/><span><small>Queued audited weight</small><strong>{grams(openGroups.reduce((sum, group) => sum + Number(group.auditedTotalWeightMg), 0))}</strong></span></article><article><Sparkles/><span><small>Completed Gattis</small><strong>{completed.length}</strong></span></article></div>
    <section className="ho-panel"><div className="ho-panel-title"><div><p>MELTING QUEUE</p><h2>Enter Gatti production results</h2></div><span>{openGroups.length} waiting</span></div><div className="ho-melt-list">
      {openGroups.length ? openGroups.map(group => { const id = Number(group.id); const items = data.groupItems.filter(item => Number(item.meltGroupId) === id); return <article className="ho-melt-card" key={id}><div className="ho-melt-head"><Flame/><span><small>GATTI ID</small><strong>{group.gattiId}</strong><em>{group.itemCount} ornaments · {group.packetCount} packets · {group.branchCount} branches</em></span><b>{grams(group.auditedTotalWeightMg)}</b></div><div className="ho-melt-items">{items.map(item => <span key={Number(item.transferItemId)}><strong>{item.itemDescription || item.description}</strong><small>{item.branchId} · {item.billNumber}</small><em>{grams(item.auditedWeightMg)}</em></span>)}</div>
        <form className="ho-melt-form" onSubmit={event => void complete(event, id)}><label>Weight given for melting (g)<input name="inputWeightGrams" type="number" step="0.001" min="0.001" defaultValue={(Number(group.auditedTotalWeightMg) / 1000).toFixed(3)} required/></label><label>Output Gatti weight (g)<input name="outputWeightGrams" type="number" step="0.001" min="0.001" required/></label><label>Matti received (g)<input name="mattiWeightGrams" type="number" step="0.001" min="0" defaultValue="0.000" required/></label><label>Purity (%)<input name="purity" type="number" step="0.001" min="0.001" max="100" required/></label><p className="ho-weight-rule">Gatti output + Matti must be equal to or greater than the weight given for melting.</p><label className="wide">Melter notes<input name="notes" placeholder="Optional production note"/></label><button disabled={saving}><Flame/> Complete Gatti</button></form></article>; }) : <Empty icon={<Flame/>} title="Melting queue is clear" text="New Gatti groups created by the auditor will appear here."/>}
    </div></section><GroupRegister groups={completed} groupItems={data.groupItems} expanded={expanded} setExpanded={setExpanded}/></>;
}

function GroupRegister({ groups, groupItems, expanded, setExpanded }: { groups: Row[]; groupItems: Row[]; expanded: number | null; setExpanded: (value: number | null) => void }) {
  return <section className="ho-panel"><div className="ho-panel-title"><div><p>GATTI REGISTER</p><h2>Melt group history</h2></div><span>{groups.length} groups</span></div><div className="ho-group-register">{groups.length ? groups.map(group => { const id = Number(group.id); const open = expanded === -id; const items = groupItems.filter(item => Number(item.meltGroupId) === id); return <article key={id}><button onClick={() => setExpanded(open ? null : -id)}><span className={`ho-status ${group.status}`}>{group.status}</span><strong>{group.gattiId}</strong><small>{group.itemCount} ornaments</small><b>{grams(group.auditedTotalWeightMg)}</b>{open ? <ChevronUp/> : <ChevronDown/>}</button>{open && <div><p>{group.notes || "No group notes."}</p>{items.map(item => <span key={Number(item.transferItemId)}><strong>{item.itemDescription || item.description}</strong><small>{item.branchId} · {item.billNumber}</small><em>{grams(item.auditedWeightMg)}</em></span>)}{group.status === "completed" && <footer><span>Input <b>{grams(group.inputWeightMg)}</b></span><span>Gatti <b>{grams(group.outputWeightMg)}</b></span><span>Matti <b>{grams(group.mattiWeightMg)}</b></span><span>Purity <b>{Number(group.purity).toFixed(3)}%</b></span></footer>}</div>}</article>; }) : <Empty icon={<Layers3/>} title="No Gatti groups yet" text="Created melt groups will be listed here."/>}</div></section>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="ho-empty">{icon}<strong>{title}</strong><span>{text}</span></div>; }
