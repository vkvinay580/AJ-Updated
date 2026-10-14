import { requireHeadOfficeSession } from "@/lib/head-office-auth";

export default async function ProtectedHeadOfficeLayout({ children }: { children: React.ReactNode }) {
  await requireHeadOfficeSession();
  return children;
}
