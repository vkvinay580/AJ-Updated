import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Misc Register",
  robots: { index: false, follow: false, nocache: true },
};

export default function MiscLayout({ children }: { children: React.ReactNode }) {
  return children;
}
