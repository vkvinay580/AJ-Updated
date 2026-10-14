import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accounts Payments", robots: { index: false, follow: false } };
export default function AccountsLayout({ children }: { children: React.ReactNode }) { return children; }
