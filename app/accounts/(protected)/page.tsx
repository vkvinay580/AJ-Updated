import AccountsWorkspace from "@/components/accounts/AccountsWorkspace";
import { requireAccountsSession } from "@/lib/accounts-auth";

export default async function AccountsPage(){const session=await requireAccountsSession();return <AccountsWorkspace initialSession={session}/>;}
