import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { CartProvider } from "@/context/CartContext";
import { RealtimeSync } from "@/components/realtime/RealtimeSync";
import SiteMotion from "@/components/motion/SiteMotion";
import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./process.css";
import "./hero-orbit.css";
import "./public-theme.css";
import "./motion.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});
const cormorant = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Aryan Gold | Gold & Silver Buyers in Bengaluru", template: "%s | Aryan Gold" },
  description: "Buy and sell gold and silver bars, coins, and jewellery with transparent valuation, secure transactions, and professional service in Bengaluru.",
  applicationName: "Aryan Gold",
  authors: [{ name: "Aryan Gold" }],
  creator: "Aryan Gold",
  publisher: "Aryan Gold",
  keywords: [
    "gold buyers Bengaluru",
    "sell gold Bengaluru",
    "buy gold Bengaluru",
    "gold valuation Bengaluru",
    "silver buyers Bengaluru",
    "gold bars and coins",
    "Aryan Gold",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Aryan Gold",
    title: "Aryan Gold | Gold & Silver Buyers in Bengaluru",
    description: "Buy and sell gold and silver with transparent valuation, secure transactions, and professional service in Bengaluru.",
    images: [{ url: "/brands/aryan-gold.webp", alt: "Aryan Gold" }],
  },
  twitter: {
    card: "summary",
    title: "Aryan Gold | Gold & Silver Buyers in Bengaluru",
    description: "Transparent gold and silver buying, selling, and valuation in Bengaluru.",
    images: ["/brands/aryan-gold.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body
        className={`${manrope.variable} ${cormorant.variable} antialiased flex flex-col min-h-screen`}
      >
        <SiteMotion />
        <RealtimeSync />
        <CartProvider>
          <Header />
          <ViewTransition name="route-content" update="route-swap" default="none">
            <main className="flex-grow">{children}</main>
          </ViewTransition>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
