import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { openMiscValue, sealMiscValue, type MiscRole, type MiscUser } from "@/lib/misc-store";

export const MISC_SESSION_COOKIE = "aryan_misc_session";
const SESSION_HOURS = 12;

export type MiscSession = Pick<MiscUser, "id" | "username" | "displayName" | "role"> & {
  expiresAt: number;
};

export async function createMiscSession(user: MiscUser) {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const token = sealMiscValue({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, expiresAt }, "session");
  (await cookies()).set(MISC_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getMiscSession(): Promise<MiscSession | null> {
  const token = (await cookies()).get(MISC_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = openMiscValue<MiscSession>(token, "session");
  if (!session || session.expiresAt <= Date.now() || !["admin", "acc"].includes(session.role)) return null;
  return session;
}

export async function requireMiscSession(role?: MiscRole) {
  const session = await getMiscSession();
  if (!session) redirect("/misc/login");
  if (role && session.role !== role) redirect("/misc");
  return session;
}

export async function destroyMiscSession() {
  (await cookies()).delete(MISC_SESSION_COOKIE);
}
