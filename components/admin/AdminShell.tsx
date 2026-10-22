"use client";

import { BellRing, BookOpen, Building2, ChartNoAxesCombined, Download, FileSpreadsheet, FileText, Flame, HandCoins, KeyRound, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, ShoppingBag, Upload, UserPlus, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminSession } from "@/lib/auth";
import ChatDock from "@/components/chat/ChatDock";
import VerificationNotifications from "@/components/verification/VerificationNotifications";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/operations", label: "Branch operations", icon: Building2 },
  { href: "/admin/customers/new", label: "Add customer", icon: UserPlus },
  { href: "/admin/customers", label: "Customers & KYC", icon: Users },
  { href: "/admin/verification", label: "Verification & TEs", icon: ShieldCheck },
  { href: "/admin/verification-results", label: "Verification results", icon: BellRing },
  { href: "/admin/bills/new", label: "Create bill", icon: ReceiptText },
  { href: "/admin/bills", label: "Bill register", icon: FileText },
  { href: "/admin/bill-import", label: "Import bills", icon: Upload },
  { href: "/admin/stock-ledger", label: "Stock ledger", icon: BookOpen },
  { href: "/admin/melting-report", label: "Melting report", icon: Flame },
  { href: "/admin/gatti-sales", label: "Gatti sales", icon: ShoppingBag },
  { href: "/admin/sale-reports", label: "Sale reports", icon: HandCoins },
  { href: "/admin/pnl-report", label: "P&L report", icon: ChartNoAxesCombined },
  { href: "/admin/reports", label: "Bill reports", icon: FileSpreadsheet },
  { href: "/admin/change-password", label: "Change password", icon: KeyRound },
];

export default function AdminShell({ session, children, accessMode = "admin" }: { session: AdminSession; children: React.ReactNode; accessMode?: "admin" | "floor" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const visibleLinks = accessMode === "floor" ? links.filter(link => ["/admin/operations", "/admin/verification-results"].includes(link.href)) : links;
  const logout = async () => {
    await fetch(accessMode === "floor" ? "/api/head-office/logout" : "/api/admin/logout", { method: "POST" });
    router.replace(accessMode === "floor" ? "/head-office/login" : "/admin/login");
    router.refresh();
  };
  return <div className="admin-app">
    <aside className={`admin-sidebar ${open ? "open" : ""}`}>
      <div className="admin-brand"><Image src={session.companyLogo} alt={session.companyName} width={62} height={62}/><div><strong>{session.companyName}</strong><span>Business Console</span></div><button className="close-sidebar" onClick={() => setOpen(false)} aria-label="Close navigation"><X/></button></div>
      <nav aria-label="Administration">{visibleLinks.map(({href,label,icon:Icon}) => { const active = href === "/admin" ? pathname === href : href === "/admin/bills" ? pathname === href || (pathname !== "/admin/bills/new" && /^\/admin\/bills\/[^/]+$/.test(pathname)) : pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon/>{label}</Link>; })}{accessMode === "admin" && <a href="/downloads/aryan-gold.apk" download="Aryan-Gold.apk" onClick={() => setOpen(false)}><Download/>Download Android app</a>}</nav>
      <div className="admin-user logo-only"><div className="user-avatar logo-avatar"><Image src={session.companyLogo} alt={session.companyName} width={38} height={38}/></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut/></button></div>
    </aside>
    {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation"/>}
    <div className="admin-main"><header className="admin-topbar"><button className="sidebar-toggle" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu/></button><div><span className="company-dot"/> Secure workspace</div><div className="admin-topbar-actions"><VerificationNotifications historyHref="/admin/verification-results"/><span>{session.companyShortName}</span></div></header><main className="admin-content">{children}</main></div>
    <ChatDock scope={accessMode === "floor" ? "floor" : "admin"}/>
  </div>;
}
