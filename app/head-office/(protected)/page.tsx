import HeadOfficeWorkspace from "@/components/head-office/HeadOfficeWorkspace";
import { requireHeadOfficeSession } from "@/lib/head-office-auth";
import { redirect } from "next/navigation";

export default async function HeadOfficePage() {
  const session = await requireHeadOfficeSession();
  if (session.role === "floor") redirect("/admin/operations");
  return <HeadOfficeWorkspace initialSession={session}/>;
}
