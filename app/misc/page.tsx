import { redirect } from "next/navigation";
import MiscWorkspace from "@/components/misc/MiscWorkspace";
import { getMiscSession } from "@/lib/misc-auth";

export default async function MiscPage() {
  const session = await getMiscSession();
  if (!session) redirect("/misc/login");
  return <MiscWorkspace initialSession={session} />;
}
