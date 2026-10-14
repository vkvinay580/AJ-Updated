import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Our Gold & Silver Specialists in Bengaluru",
  description: "Contact Aryan Gold in Nagartapete, Bengaluru for transparent gold and silver buying, selling, and professional valuation. Call +91 90354 22321.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Aryan Gold in Bengaluru",
    description: "Visit or call Aryan Gold for professional gold and silver buying, selling, and valuation in Nagartapete, Bengaluru.",
    url: "/contact",
  },
  twitter: {
    title: "Contact Aryan Gold in Bengaluru",
    description: "Professional gold and silver buying, selling, and valuation in Nagartapete, Bengaluru.",
  },
};

// Pin the showroom area directly so Google cannot resolve the shared business
// name or street address to an unrelated listing in Nairobi.
const showroomCoordinates = "12.9654815,77.5832283";

export default function ContactPage() {
  return <div className="contact-page">
    <section className="contact-hero">
      <p className="eyebrow">Contact Aryan Gold</p>
      <h1>Let’s talk about<br/><em>your precious metals.</em></h1>
      <p>For buying, selling, or a professional valuation, speak directly with our team. We will explain the process clearly before you visit.</p>
    </section>

    <section className="contact-content">
      <div className="contact-cards">
        <article><Phone/><span><small>CALL US</small><strong><a href="tel:+919035422321">+91 90354 22321</a></strong><p>Speak with our precious metals desk</p></span></article>
        <article><Mail/><span><small>EMAIL US</small><strong>hello@aryangold.in</strong><p>We respond during business hours</p></span></article>
        <article><Clock/><span><small>BUSINESS HOURS</small><strong>Mon–Sat, 10 AM–7 PM</strong><p>Sunday by appointment</p></span></article>
        <article><MapPin/><span><small>VISIT US</small><strong>Aryan Gold</strong><p>1st Floor, Shop No. 5, No. 126, Laxmi Golden Mall, Sri Dharmaraya Swamy Temple Main Road, behind Shree Kalamma Temple, Nagartapete, Bengaluru</p></span></article>
      </div>
      <aside><ShieldCheck/><h2>Prepare for your visit</h2><p>Bring one valid government-issued KYC document. If you are selling precious metals, bring any available purchase documentation as well.</p><ul><li>Original Aadhaar or PAN</li><li>Your active mobile number</li><li>Bank details for approved transfers</li></ul><Link href="tel:+919035422321" className="gold-button dark">Call Aryan Gold</Link></aside>
    </section>

    <section className="location-section" aria-labelledby="location-heading">
      <div className="location-heading">
        <div><p className="eyebrow"><Navigation size={14}/> Find our showroom</p><h2 id="location-heading">Visit Aryan Gold</h2><p>Located inside Laxmi Golden Mall in Nagartapete, Bengaluru.</p></div>
        <a className="map-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${showroomCoordinates}`} target="_blank" rel="noopener noreferrer">Get directions <ExternalLink size={16}/></a>
      </div>
      <div className="map-frame">
        <iframe title="Aryan Gold location on Google Maps" src={`https://www.google.com/maps?q=${showroomCoordinates}&z=18&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    </section>
  </div>;
}
