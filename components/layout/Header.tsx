"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { aryanGoldBuyersLinks } from "@/lib/public-links";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin") || pathname.startsWith("/branch") || pathname.startsWith("/head-office") || pathname.startsWith("/accounts")) return null;
  const links = [[aryanGoldBuyersLinks.services, "Services"], [aryanGoldBuyersLinks.branches, "Branches"], [aryanGoldBuyersLinks.howItWorks, "How it works"], [aryanGoldBuyersLinks.whyAryan, "Why Aryan Gold"], [aryanGoldBuyersLinks.contact, "Contact"]];
  return <header className="site-header">
    <div className="site-nav">
      <Link href="/" className="brand-lockup" aria-label="Aryan Gold home"><Image src="/brands/aryan-gold.webp" width={62} height={62} alt="Aryan Gold" priority /><span><b>ARYAN</b><small>GOLD</small></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}<Link href="/login">Staff login</Link><a href={aryanGoldBuyersLinks.booking} className="gold-button small">Get a valuation</a></nav>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link href="/login" onClick={() => setOpen(false)}>Staff login</Link><a href={aryanGoldBuyersLinks.booking} onClick={() => setOpen(false)}>Get a valuation</a></nav>}
  </header>;
}
