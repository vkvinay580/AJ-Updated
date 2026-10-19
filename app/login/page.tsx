import {
  ArrowRight,
  Building2,
  Download,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff Login",
  description: "Choose the secure Aryan Gold workspace assigned to your role.",
  alternates: { canonical: "/login" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const portals = [
  {
    href: "/branch/login",
    title: "Branch Operations",
    audience: "Branch employees",
    description: "Billing, customers, gold purchases, expenses, fund requests, and daily closing.",
    action: "Open Branch login",
    icon: Building2,
    tone: "branch",
  },
  {
    href: "/head-office/login",
    title: "Head Office",
    audience: "Auditors, melters, and floor users",
    description: "Review branch packets, record melting work, or enter the restricted Branch Operations floor desk.",
    action: "Open Head Office login",
    icon: UsersRound,
    tone: "office",
  },
  {
    href: "/accounts/login",
    title: "Accounts",
    audience: "Accounts team",
    description: "Process approved payments and maintain a clear UTR audit trail.",
    action: "Open Accounts login",
    icon: Landmark,
    tone: "accounts",
  },
  {
    href: "/admin/login",
    title: "Administration",
    audience: "Authorized administrators",
    description: "Manage companies, customers, bills, reports, users, and system operations.",
    action: "Open Admin login",
    icon: LayoutDashboard,
    tone: "admin",
  },
] as const;

const androidApps = [
  {
    href: "/downloads/aryan-verification.apk",
    title: "Aryan Verification",
    description: "For TE users: receive customer visits, capture photos and references, and submit verification results. Sign in with your admin-issued TE user ID and password.",
    action: "Download TE app",
    icon: ShieldCheck,
    download: "Aryan-Verification.apk",
  },
  {
    href: "/downloads/aryan-gold.apk",
    title: "AJ App",
    description: "Install the Aryan Gold business app on your Android phone.",
    action: "Download APK",
    icon: Download,
    download: "aryan-gold.apk",
  },
  {
    href: "/downloads/aryan-attendance.apk",
    title: "Attendance App",
    description: "Install the Aryan Gold Attendance app on your Android phone.",
    action: "Download APK",
    icon: Download,
    download: "aryan-attendance.apk",
  },
] as const;

export default function LoginHubPage() {
  return (
    <div className="login-hub-page">
      <section className="login-hub-hero" aria-labelledby="login-hub-heading">
        <div>
          <p className="login-hub-eyebrow"><ShieldCheck /> Secure Aryan Gold access</p>
          <h1 id="login-hub-heading">Choose your<br/><em>workspace.</em></h1>
          <p>Select the portal assigned to your role. Each workspace has separate credentials and access controls.</p>
        </div>
      </section>

      <section className="login-hub-content" aria-labelledby="portal-list-heading">
        <div className="login-hub-intro">
          <div>
            <p>STAFF PORTALS</p>
            <h2 id="portal-list-heading">Where do you work?</h2>
          </div>
          <span>Use only the credentials issued for your assigned portal.</span>
        </div>

        <div className="login-portal-grid">
          {portals.map(({ href, title, audience, description, action, icon: Icon, tone }) => (
            <Link className={`login-portal-card ${tone}`} href={href} key={href}>
              <span className="login-portal-icon" aria-hidden="true"><Icon /></span>
              <span className="login-portal-copy">
                <small>{audience}</small>
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <span className="login-portal-action">{action}<ArrowRight /></span>
            </Link>
          ))}
        </div>

        <section className="login-app-downloads" aria-labelledby="app-downloads-heading">
          <div className="login-app-downloads-heading">
            <p>ANDROID APPS</p>
            <h2 id="app-downloads-heading">Get the apps</h2>
          </div>
          <div className="login-app-download-grid">
            {androidApps.map(({ href, title, description, action, icon: Icon, download }) => (
              <a
                className="login-app-download-card"
                href={href}
                key={title}
                download={download}
              >
                <span className="login-app-download-icon" aria-hidden="true"><Icon /></span>
                <span className="login-app-download-copy">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
                <span className="login-app-download-action">{action}<ArrowRight /></span>
              </a>
            ))}
          </div>
        </section>

        <p className="login-hub-help"><ShieldCheck /> Cannot sign in? Contact your administrator to confirm your assigned portal and credentials.</p>
      </section>
    </div>
  );
}
