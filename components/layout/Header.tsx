"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin") || pathname.startsWith("/branch") || pathname.startsWith("/head-office") || pathname.startsWith("/accounts")) return null;
  const links = [["/#services", "Services"], ["/#branches", "Branches"], ["/#process", "How it works"], ["/#trust", "Why Aryan Gold"], ["/contact", "Contact"], ["/login", "Staff login"]];
  return <header className="site-header">
    <div className="site-nav">
      <Link href="/" className="brand-lockup" aria-label="Aryan Gold home"><Image src="/brands/aryan-gold.png" width={62} height={62} alt="Aryan Gold" priority /><span><b>ARYAN</b><small>GOLD</small></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/contact" className="gold-button small">Talk to us</Link></nav>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}</nav>}
  </header>;
}
