import { ArrowRight, BadgeIndianRupee, Building2, CheckCircle2, Gem, MapPin, Navigation, Scale, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
    const activeBranches = directory.branches.filter((branch) =>
      branch.status && branch.branchId !== "AGBPL000" && branch.branchName.trim().toLowerCase() !== "head office"
    );
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
      <p className="eyebrow"><Sparkles size={15} /> Trusted precious metal specialists</p><h1>Precious metals,<br/><em>valued with confidence.</em></h1>
      <p className="hero-copy">Buy or sell gold and silver bars, coins, and jewellery through a transparent, secure process. Fair valuation. Clear documentation. Complete peace of mind.</p>
      <div className="hero-actions"><a className="gold-button" href={aryanGoldBuyersLinks.booking}>Get a free valuation <ArrowRight size={18}/></a><a className="text-button" href={aryanGoldBuyersLinks.howItWorks}>See how it works</a></div>
      <div className="trust-strip"><span><CheckCircle2/> Transparent valuation</span><span><CheckCircle2/> Secure transactions</span><span><CheckCircle2/> Professional service</span></div>
    </div><div className="hero-art" aria-hidden="true"><div className="gold-orbit orbit-one"/><div className="gold-orbit orbit-two"/><div className="purity-system">
      {[['750','HALLMARK'],['18K','KARAT'],['916','HALLMARK'],['22K','KARAT'],['999.9','FINE GOLD'],['24K','PURE GOLD']].map(([value,label],index)=><div className={`purity-badge purity-badge-${index+1}`} key={value}><span><b>{value}</b><small>{label}</small></span></div>)}
    </div><div className="service-electrons"><div className="service-electron service-electron-buy"><span><b>BUY</b><small>GOLD &amp; SILVER</small></span></div><div className="service-electron service-electron-sell"><span><b>SELL</b><small>GOLD &amp; SILVER</small></span></div></div><div className="hero-logo-disc"><Image src="/brands/aryan-gold.png" alt="" width={430} height={430} priority /></div></div></section>
    <section className="stat-band"><div><strong>Gold</strong><span>Bars, coins & jewellery</span></div><div><strong>Silver</strong><span>Bars, coins & jewellery</span></div><div><strong>Precise</strong><span>Purity & weight valuation</span></div><div><strong>Trusted</strong><span>Service you can rely on</span></div></section>
    <section id="collection" className="collection-section">
      <div className="collection-intro"><div><p className="eyebrow">Our precious metal range</p><h2>Enduring value.<br/><em>Exceptional craft.</em></h2></div><p>From investment-grade bars and coins to jewellery made to be treasured, explore precious metals selected for purity, beauty, and lasting value.</p></div>
      <div className="collection-grid">
        <article className="collection-card collection-card-wide"><Image src="/images/metals/gold-bars-coins.webp" alt="Gold bars and investment coins" fill sizes="(max-width: 820px) 100vw, 66vw"/><div className="collection-overlay"><span>Investment essentials</span><h3>Gold bars & coins</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>See what we buy <ArrowRight/></a></div></article>
        <article className="collection-card"><Image src="/images/metals/gold-jewellery.webp" alt="Traditional gold jewellery collection" fill sizes="(max-width: 820px) 100vw, 34vw"/><div className="collection-overlay"><span>Crafted to treasure</span><h3>Gold jewellery</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>See what we buy <ArrowRight/></a></div></article>
        <article className="collection-card collection-card-silver"><Image src="/images/metals/silver-collection.webp" alt="Silver bars, coins, and jewellery" fill sizes="100vw"/><div className="collection-overlay"><span>Brilliant by nature</span><h3>Silver bars, coins & jewellery</h3><a href={aryanGoldBuyersLinks.whatWeBuy}>See what we buy <ArrowRight/></a></div></article>
      </div>
    </section>
    <section id="services" className="content-section services-section"><div className="section-heading"><p className="eyebrow">What we do</p><h2>A refined way to trade precious metals.</h2><p>Whether you are buying for value or selling with confidence, every Aryan Gold transaction is careful, clear, and documented.</p></div><div className="service-grid">
      <article><span><BadgeIndianRupee/></span><h3>Sell precious metals</h3><p>Receive a transparent assessment of your gold or silver based on purity, weight, and the prevailing rate—explained before you decide.</p><a href={aryanGoldBuyersLinks.booking}>Request a valuation <ArrowRight/></a></article>
      <article className="featured"><span><Gem/></span><h3>Buy with confidence</h3><p>Choose quality bars, coins, and jewellery with professional documentation and the confidence of a specialist team.</p><Link href="/contact">Enquire now <ArrowRight/></Link></article>
      <article><span><Scale/></span><h3>Professional valuation</h3><p>Accurate weighing and purity assessment create a fair, auditable foundation for every transaction.</p><a href={aryanGoldBuyersLinks.howItWorks}>Our process <ArrowRight/></a></article>
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
