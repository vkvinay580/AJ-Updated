import { requireAccountsSession } from "@/lib/accounts-auth";

export default async function ProtectedAccountsLayout({ children }: { children: React.ReactNode }) { await requireAccountsSession(); return children; }
