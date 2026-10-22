import { ArrowRight, BadgeIndianRupee, Building2, CheckCircle2, Gem, MapPin, Navigation, Scale, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { getAttendanceDirectory } from "@/lib/attendance";
import { aryanGoldBuyersLinks } from "@/lib/public-links";
import ContactPopup from "@/components/home/ContactPopup";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const fallbackBranches = [
  { branchId: "AGBPL001", branchName: "Tambaram", city: "Chennai" },
  { branchId: "AGBPL002", branchName: "Adyar", city: "Chennai" },
  { branchId: "AGBPL003", branchName: "Malleshwaram", city: "Bengaluru" },
  { branchId: "AGBPL004", branchName: "T Nagar", city: "Chennai" },
];

async function loadBranches() {
  try {
    const directory = await getAttendanceDirectory();
    const activeBranches = directory.branches.filter((branch) => {
      const branchId = branch.branchId.trim().toUpperCase();
      const publicIdentity = `${branch.branchId} ${branch.branchName} ${branch.city}`.toLowerCase().replace(/[^a-z0-9]/g, "");
      return branch.status && branchId !== "AGBPL000" && !publicIdentity.includes("headoffice");
    });
    return activeBranches.length ? activeBranches : fallbackBranches;
  } catch {
    return fallbackBranches;
  }
}

export default async function Home() {
  const branches = await loadBranches();

  return <>
    <ContactPopup />
    <section className="hero-section"><div className="hero-glow" /><div className="hero-content">
      <p className="eyebrow"><Sparkles size={15} /> Trust · Transparency · Value</p><h1>Turn your gold<br/><em>into cash.</em></h1>
      <p className="hero-copy">Fair value for your gold. Sell at the highest price and get 100% maximum market value from experienced wholesale gold buyers.</p>
      <div className="hero-actions"><a className="gold-button" href={aryanGoldBuyersLinks.booking}>Know your gold&apos;s original value <ArrowRight size={18}/></a><a className="text-button" href={aryanGoldBuyersLinks.howItWorks}>Since 2008 in the market</a></div>
      <div className="trust-strip"><span><CheckCircle2/> 1-minute valuation</span><span><CheckCircle2/> Immediate cash transfer</span><span><CheckCircle2/> Highest payment</span></div>
    </div><div className="hero-art" aria-hidden="true"><div className="gold-orbit orbit-one"/><div className="gold-orbit orbit-two"/><div className="purity-system">
      {[['750','HALLMARK'],['18K','KARAT'],['916','HALLMARK'],['22K','KARAT'],['999.9','FINE GOLD'],['24K','PURE GOLD']].map(([value,label],index)=><div className={`purity-badge purity-badge-${index+1}`} key={value}><span><b>{value}</b><small>{label}</small></span></div>)}
    </div><div className="service-electrons"><div className="service-electron service-electron-buy"><span><b>BUY</b><small>GOLD &amp; SILVER</small></span></div><div className="service-electron service-electron-sell"><span><b>SELL</b><small>GOLD &amp; SILVER</small></span></div></div><div className="hero-logo-disc"><Image src="/brands/aryan-gold.webp" alt="" width={430} height={430} priority /></div></div></section>
    <section className="stat-band"><div><strong>Since 2008</strong><span>In the market</span></div><div><strong>100%</strong><span>Maximum market value</span></div><div><strong>Fair</strong><span>Value for your gold</span></div><div><strong>Easy</strong><span>Gold selling made simple</span></div></section>
    <section id="collection" className="collection-section">
      <div className="collection-intro"><div><p className="eyebrow">Old gold. New price.</p><h2>Let your gold<br/><em>do all the talking.</em></h2></div><p>Know your gold&apos;s original value with a transparent purity and weight assessment—and receive a rate you will never get anywhere else.</p></div>
      <div className="collection-grid">
        <article className="collection-card collection-card-wide"><Image src="/images/metals/gold-bars-coins.webp" alt="Gold bars and investment coins" fill sizes="(max-width: 820px) 100vw, 66vw"/><div className="collection-overlay"><span>Highest payment</span><h3>Gold bars & coins</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>Get your valuation <ArrowRight/></a></div></article>
        <article className="collection-card"><Image src="/images/metals/gold-jewellery.webp" alt="Traditional gold jewellery collection" fill sizes="(max-width: 820px) 100vw, 34vw"/><div className="collection-overlay"><span>Fair value</span><h3>Gold jewellery</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>Get your valuation <ArrowRight/></a></div></article>
        <article className="collection-card collection-card-silver"><Image src="/images/metals/silver-collection.webp" alt="Silver bars, coins, and jewellery" fill sizes="100vw"/><div className="collection-overlay"><span>Wholesale precious metal buyers</span><h3>Silver bars, coins & jewellery</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>Get your valuation <ArrowRight/></a></div></article>
      </div>
    </section>
    <section id="services" className="content-section services-section"><div className="section-heading"><p className="eyebrow">Your first option to sell gold</p><h2>Gold selling was never so easy!</h2><p>A 1-minute valuation, clear pricing, and immediate cash transfer make selling your gold simple and rewarding.</p></div><div className="service-grid">
      <article><span><BadgeIndianRupee/></span><h3>Know your gold&apos;s original value</h3><p>Receive a transparent assessment based on purity, weight, and the prevailing market rate before you decide.</p><a href={aryanGoldBuyersLinks.booking}>Request a valuation <ArrowRight/></a></article>
      <article className="featured"><span><Gem/></span><h3>Sell at the highest price</h3><p>Get 100% maximum market value with a rate you will never get anywhere else.</p><a href={aryanGoldBuyersLinks.booking}>Turn your gold into cash <ArrowRight/></a></article>
      <article><span><Scale/></span><h3>Wholesale gold buyers</h3><p>Your trusted first choice in the market for fair value, highest payment, and professional service since 2008.</p><a href={aryanGoldBuyersLinks.howItWorks}>Our process <ArrowRight/></a></article>
    </div></section>
    <section id="branches" className="branches-section">
      <div className="branches-heading"><div><p className="eyebrow"><MapPin size={14}/> Our locations</p><h2>Find an Aryan Gold branch near you.</h2></div><p>Visit our specialists in Bengaluru or Chennai for transparent valuation, secure transactions, and personal assistance.</p></div>
      <div className="branches-grid">{branches.map((branch, index) => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Aryan Gold ${branch.branchName} ${branch.city}`)}`;
        return <article className={index === 0 ? "branch-card branch-card-featured" : "branch-card"} key={branch.branchId}>
          <div className="branch-card-icon"><Building2/></div><div className="branch-card-copy"><span>Aryan Gold branch</span><h3>{branch.branchName}</h3><p><MapPin/> {branch.city}</p></div>
          <a href={mapUrl} target="_blank" rel="noreferrer" aria-label={`View ${branch.branchName} branch on Google Maps`}>View on map <Navigation/></a>
        </article>;
      })}</div>
      <div className="branches-contact"><span>Need help choosing a location?</span><a href={aryanGoldBuyersLinks.branches}>Explore all branches <ArrowRight/></a></div>
    </section>
    <section id="process" className="process-section">
      <div className="section-heading light"><p className="eyebrow">Simple by design</p><h2>Clear steps.<br/>Complete confidence.</h2><p>Whether you are selling precious metals or choosing your next purchase, every stage is straightforward, secure, and fully documented.</p></div>
      <div className="process-journey">
        <div className="process-image"><Image src="/images/process/selling-gold-weighing.webp" alt="Aryan Gold specialist weighing a customer's gold on a precision scale" fill sizes="(max-width: 820px) 100vw, 42vw" /></div>
        <div className="process-details"><div className="process-label"><span>01</span><div><p>Selling with Aryan Gold</p><h3>From assessment to payment</h3></div></div>
        <div className="process-grid">{[['01','Visit & verify','Bring your gold or silver with valid identity documents for a secure, compliant transaction.'],['02','Test & value','We assess purity and weight, then clearly explain the valuation and prevailing rate.'],['03','Review & approve','Review the final offer and transaction details before providing your approval.'],['04','Receive payment','Once approved, the transaction is documented and payment is completed through an accepted method.']].map(([n,t,d])=><article key={`sell-${n}`}><strong>{n}</strong><h3>{t}</h3><p>{d}</p></article>)}</div></div>
      </div>
      <div className="process-journey">
        <div className="process-details"><div className="process-label"><span>02</span><div><p>Buying with Aryan Gold</p><h3>From selection to secure handover</h3></div></div>
        <div className="process-grid">{[['01','Visit & consult','Visit our showroom and share your requirements. Our specialists will guide you through the available options.'],['02','Choose with confidence','Compare suitable bars, coins, or jewellery with purity, weight, pricing, and product details clearly explained.'],['03','Confirm & pay','Confirm your selection and complete payment through an accepted method, with a professional invoice for your records.'],['04','Inspect & collect','Your purchase is carefully checked, securely packed, and handed over after a final verification with you.']].map(([n,t,d])=><article key={`buy-${n}`}><strong>{n}</strong><h3>{t}</h3><p>{d}</p></article>)}</div></div>
        <div className="process-image"><Image src="/images/process/buying-gold-selection.webp" alt="Customer choosing gold with guidance from an Aryan Gold specialist" fill sizes="(max-width: 820px) 100vw, 42vw" /></div>
      </div>
    </section>
    <section id="trust" className="content-section trust-section"><div className="trust-visual"><div className="seal"><ShieldCheck/><span>TRUSTED<br/><b>GOLD</b><br/>TRADING</span></div></div><div><p className="eyebrow">The Aryan standard</p><h2>Trust is our most valuable asset.</h2><p className="lead">Gold carries meaning. That is why our work is grounded in discretion, accuracy, and total transparency—from the first conversation to the final invoice.</p><ul className="check-list"><li><CheckCircle2/> Clear valuation before every transaction</li><li><CheckCircle2/> KYC-led, fully documented process</li><li><CheckCircle2/> Privacy-conscious customer handling</li><li><CheckCircle2/> Responsive, knowledgeable service</li></ul><a className="gold-button dark" href={aryanGoldBuyersLinks.contact}>Speak with our team <ArrowRight/></a></div></section>
  </>;
}
