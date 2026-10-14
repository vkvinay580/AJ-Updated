import { CustomerRegistration } from "@/app/admin/(protected)/customers/new/page";
import ChatDock from "@/components/chat/ChatDock";
import { requireBranchSession } from "@/lib/branch-auth";

export default async function BranchNewCustomerPage() {
  await requireBranchSession();
  return <div className="branch-form-page"><CustomerRegistration portal="branch"/><ChatDock scope="branch"/></div>;
}
