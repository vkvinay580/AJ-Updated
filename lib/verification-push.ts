import "server-only";
import { createSign } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { execute, rows } from "@/lib/db";

const tokenCache = globalThis as typeof globalThis & { aryanFcmToken?: { value: string; expiresAt: number } };

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function accessToken() {
  if (tokenCache.aryanFcmToken && tokenCache.aryanFcmToken.expiresAt > Date.now() + 60000) return tokenCache.aryanFcmToken.value;
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(privateKey, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  tokenCache.aryanFcmToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return data.access_token;
}

export async function notifyTe(teUserId: number, requestId: number, customerName: string, branchName: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const bearer = await accessToken().catch(() => null);
  if (!projectId || !bearer) return { configured: false, delivered: 0 };
  const devices = await rows<RowDataPacket>("SELECT id,device_token AS token FROM te_device_tokens WHERE te_user_id=? ORDER BY last_seen_at DESC", [teUserId]);
  let delivered = 0;
  for (const device of devices) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ message: { token: String(device.token), notification: { title: "New customer verification", body: `${customerName} · ${branchName}` }, data: { requestId: String(requestId), type: "verification_assignment" }, android: { priority: "high", notification: { channel_id: "verification_assignments", sound: "default" } } } }),
    }).catch(() => null);
    if (response?.ok) delivered += 1;
    else if (response && !response.ok) {
      const failure = await response.json().catch(() => null) as { error?: { details?: Array<{ errorCode?: string }> } } | null;
      if (failure?.error?.details?.some(detail => detail.errorCode === "UNREGISTERED")) await execute("DELETE FROM te_device_tokens WHERE id=?", [Number(device.id)]);
    }
  }
  return { configured: true, delivered };
}
