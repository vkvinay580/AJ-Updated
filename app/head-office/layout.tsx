import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Head Office",
  robots: { index: false, follow: false },
};

export default function HeadOfficeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
