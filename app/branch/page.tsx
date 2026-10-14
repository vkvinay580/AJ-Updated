import BranchWorkspace from "@/components/branch/BranchWorkspace";
import { requireBranchSession } from "@/lib/branch-auth";

export default async function BranchPage() {
  const session = await requireBranchSession();
  return <BranchWorkspace initialSession={session}/>;
}
