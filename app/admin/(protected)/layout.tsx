import AdminShell from "@/components/admin/AdminShell";
import { requireSession } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
