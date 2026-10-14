"use client";

import { ArrowRight, FileCheck2, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";

type Customer={id:number;name:string;phone:string;email?:string;city?:string;state?:string;createdAt:string;kycCount:number;billCount:number};
export default function CustomersPage(){const[q,setQ]=useState("");const[rows,setRows]=useState<Customer[]>([]);const[loading,setLoading]=useState(true);
  const load=useCallback(async(silent=false)=>{if(!silent)setLoading(true);const r=await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}`,{cache:"no-store"});const d=await r.json();setRows(d.customers||[]);if(!silent)setLoading(false)},[q]);
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t)},[load]);
  useRealtimeData(()=>load(true));
  return <div className="admin-page"><div className="page-title"><div><p>Customer records</p><h1>Customers & KYC</h1><span>Search only the records held by this company.</span></div><Link className="admin-primary" href="/admin/customers/new"><UserPlus/> Add customer</Link></div><section className="panel list-panel"><div className="list-toolbar"><div className="search-box"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, phone, KYC type, or last 4 digits…"/></div><span>{rows.length} record{rows.length===1?"":"s"}</span></div>
    {loading?<div className="loading-state">Loading customers…</div>:rows.length?<div className="responsive-table"><table><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>KYC</th><th>Bills</th><th/></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>Added {new Date(c.createdAt).toLocaleDateString("en-IN")}</small></td><td>{c.phone}<small>{c.email||"No email"}</small></td><td>{[c.city,c.state].filter(Boolean).join(", ")||"—"}</td><td><span className={`kyc-badge ${c.kycCount?"complete":"missing"}`}><FileCheck2/>{c.kycCount?`${c.kycCount} document${c.kycCount>1?"s":""}`:"Missing"}</span></td><td>{c.billCount}</td><td><Link className="row-action" href={`/admin/customers/${c.id}`}>View <ArrowRight/></Link></td></tr>)}</tbody></table></div>:<div className="empty-inline"><Users/><h3>No customers found</h3><p>Try another search or register a new customer.</p></div>}
  </section></div>}
