import ChatDock from "@/components/chat/ChatDock";
import VerificationResultsPage from "@/components/verification/VerificationResultsPage";
import { requireBranchSession } from "@/lib/branch-auth";
import VerificationNotifications from "@/components/verification/VerificationNotifications";

export default async function BranchVerificationResultsPage() {
  await requireBranchSession();
  return (
    <div className="branch-verification-results-shell">
      <div className="branch-form-notifications"><VerificationNotifications historyHref="/branch/verifications" includeBranchVisits/></div>
      <VerificationResultsPage backHref="/branch" branch />
      <ChatDock scope="branch" />
    </div>
  );
}
