import "server-only";
import type { RowDataPacket } from "mysql2";
import { getAccountsSession } from "@/lib/accounts-auth";
import { getSession } from "@/lib/auth";
import { getBranchSession } from "@/lib/branch-auth";
import { execute, one } from "@/lib/db";
import { getHeadOfficeSession } from "@/lib/head-office-auth";

export type ChatScope = "admin" | "branch" | "head-office" | "floor" | "accounts";
export type ChatActor = {
  id: number;
  actorType: "admin" | "branch" | "head_office" | "accounts";
  actorKey: string;
  username: string;
  displayName: string;
  roleLabel: string;
};

type ActorIdentity = Omit<ChatActor, "id">;
type ActorRow = RowDataPacket & ChatActor;

export function parseChatScope(value: string | null): ChatScope | null {
  return value === "admin" || value === "branch" || value === "head-office" || value === "floor" || value === "accounts" ? value : null;
}

async function identityForScope(scope: ChatScope): Promise<ActorIdentity | null> {
  if (scope === "admin") {
    const session = await getSession();
    return session ? { actorType: "admin", actorKey: `admin:${session.adminId}`, username: session.email,
      displayName: session.adminName, roleLabel: "Administrator" } : null;
  }
  if (scope === "branch") {
    const session = await getBranchSession();
    return session ? { actorType: "branch", actorKey: `branch:${session.branchId}:${session.employeeId}`,
      username: session.employeeId, displayName: session.employeeName, roleLabel: `${session.branchName} Branch` } : null;
  }
  if (scope === "accounts") {
    const session = await getAccountsSession();
    return session ? { actorType: "accounts", actorKey: `accounts:${session.userId}`, username: session.username,
      displayName: session.name, roleLabel: "Accounts" } : null;
  }
  const session = await getHeadOfficeSession();
  if (!session || (scope === "floor" && session.role !== "floor") || (scope === "head-office" && session.role === "floor")) return null;
  const roleLabel = session.role === "auditor" ? "Head Office Auditor" : session.role === "melter" ? "Head Office Melter" : "Floor Operations";
  return { actorType: "head_office", actorKey: `head-office:${session.userId}`, username: session.username,
    displayName: session.name, roleLabel };
}

export async function getChatActor(scope: ChatScope): Promise<ChatActor | null> {
  const identity = await identityForScope(scope);
  if (!identity) return null;
  await execute(`INSERT INTO chat_users (actor_type,actor_key,username,display_name,role_label,active,last_seen_at)
    VALUES (?,?,?,?,?,1,UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE username=VALUES(username),display_name=VALUES(display_name),role_label=VALUES(role_label),active=1,last_seen_at=UTC_TIMESTAMP()`,
  [identity.actorType, identity.actorKey, identity.username, identity.displayName, identity.roleLabel]);
  const actor = await one<ActorRow>(`SELECT id,actor_type AS actorType,actor_key AS actorKey,username,
    display_name AS displayName,role_label AS roleLabel FROM chat_users WHERE actor_type=? AND actor_key=?`,
  [identity.actorType, identity.actorKey]);
  return actor ? { id: Number(actor.id), actorType: actor.actorType, actorKey: actor.actorKey, username: actor.username,
    displayName: actor.displayName, roleLabel: actor.roleLabel } : null;
}
