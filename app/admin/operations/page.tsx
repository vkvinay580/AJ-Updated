import AdminOperations from "@/components/admin/AdminOperations";
import AdminShell from "@/components/admin/AdminShell";
import { requireOperationsAccess } from "@/lib/operations-auth";

export default async function OperationsPage() {
  const access = await requireOperationsAccess();
  return <AdminShell session={access.session} accessMode={access.mode}><AdminOperations/></AdminShell>;
}
