import AdminShell from "@/components/admin/AdminShell";
import VerificationResultsPage from "@/components/verification/VerificationResultsPage";
import { requireOperationsAccess } from "@/lib/operations-auth";

export default async function AdminVerificationResultsPage() {
  const access = await requireOperationsAccess();
  return (
    <AdminShell session={access.session} accessMode={access.mode}>
      <VerificationResultsPage backHref="/admin/operations" />
    </AdminShell>
  );
}

