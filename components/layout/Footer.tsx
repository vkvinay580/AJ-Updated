"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/branch") || pathname.startsWith("/head-office")) return null;
  return <footer className="site-footer">
    <div className="footer-grid"><div><Link href="/" className="brand-lockup footer-brand"><Image src="/brands/aryan-gold.png" alt="Aryan Gold" width={68} height={68} /><span><b>ARYAN</b><small>GOLD</small></span></Link><p>Trusted gold buying and selling, backed by transparent valuation and professional service.</p></div>
      <div><h3>Quick links</h3><Link href="/#services">Services</Link><Link href="/#branches">Our branches</Link><Link href="/#process">Our process</Link><Link href="/contact">Contact</Link></div>
      <div><h3>Reach us</h3><p><Phone size={17} /> <a href="tel:+919035422321">+91 90354 22321</a></p><p><Mail size={17} /> hello@aryangold.in</p><p className="footer-address"><MapPin size={17} /> <span>1st Floor, Shop No. 5, No. 126, Laxmi Golden Mall, Sri Dharmaraya Swamy Temple Main Road, behind Shree Kalamma Temple, Nagartapete, Bengaluru</span></p></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Aryan Gold. All rights reserved.</span><span>Gold, honestly valued.</span></div>
  </footer>;
}
