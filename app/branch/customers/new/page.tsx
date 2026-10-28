import { CustomerRegistration } from "@/app/admin/(protected)/customers/new/page";
import ChatDock from "@/components/chat/ChatDock";
import { requireBranchSession } from "@/lib/branch-auth";
import VerificationNotifications from "@/components/verification/VerificationNotifications";

export default async function BranchNewCustomerPage() {
  await requireBranchSession();
  return <div className="branch-form-page"><div className="branch-form-notifications"><VerificationNotifications historyHref="/branch/verifications" includeBranchVisits/></div><CustomerRegistration portal="branch"/><ChatDock scope="branch"/></div>;
}
