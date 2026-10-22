import ChatDock from "@/components/chat/ChatDock";
import VerificationResultsPage from "@/components/verification/VerificationResultsPage";
import { requireBranchSession } from "@/lib/branch-auth";

export default async function BranchVerificationResultsPage() {
  await requireBranchSession();
  return (
    <div className="branch-verification-results-shell">
      <VerificationResultsPage backHref="/branch" branch />
      <ChatDock scope="branch" />
    </div>
  );
}
