/** Native hooks exist only in the Android app's origin-restricted main frame. */
declare global {
  interface Window {
    AryanAndroid?: {
      postMessage(message: string): void;
      onmessage?: ((event: { data: string }) => void) | null;
    };
  }
}

export type SavedAndroidLogin = { email: string; password: string; company: string };
type CredentialReply = { ok?: boolean; error?: string; credentials?: SavedAndroidLogin | null };
const pending = new Map<string, (reply: CredentialReply) => void>();
let activeBridge: Window["AryanAndroid"];
let nextRequest = 0;

async function credentialRequest(action: string, details: Partial<SavedAndroidLogin> = {}): Promise<CredentialReply> {
  const bridge = window.AryanAndroid;
  if (!bridge) return {};
  if (activeBridge !== bridge) {
    activeBridge = bridge;
    bridge.onmessage = event => {
      try {
        const reply = JSON.parse(event.data);
        pending.get(reply.requestId)?.(reply);
      } catch { /* Ignore unrelated native messages. */ }
    };
  }
  return new Promise((resolve, reject) => {
    const requestId = "credentials-" + (++nextRequest);
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Install the latest Android app to save passwords on this device."));
    }, 5000);
    pending.set(requestId, reply => {
      clearTimeout(timer); pending.delete(requestId);
      if (reply.error) reject(new Error(reply.error)); else resolve(reply);
    });
    try { bridge.postMessage(JSON.stringify({ action, requestId, ...details })); }
    catch { clearTimeout(timer); pending.delete(requestId); reject(new Error("The saved login is unavailable.")); }
  });
}

export async function readAndroidLogin(): Promise<SavedAndroidLogin | null> {
  const result = await credentialRequest("credentialsRead");
  const saved = result.credentials;
  return saved && typeof saved.email === "string" && typeof saved.password === "string" && typeof saved.company === "string" ? saved : null;
}

export async function clearAndroidLogin() {
  await credentialRequest("credentialsClear");
}

/** Called only after the website has authenticated successfully. */
export async function finishAndroidLogin(savePassword: boolean, credentials: SavedAndroidLogin) {
  if (!window.AryanAndroid) return;
  if (savePassword) await credentialRequest("credentialsSave", credentials);
  else await clearAndroidLogin();
}

export function androidFile(action: "save" | "share", path: string, filename: string, text = ""): boolean {
  if (typeof window === "undefined" || !window.AryanAndroid) return false;
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Files must come from this website.");
  window.AryanAndroid.postMessage(JSON.stringify({ action, url: url.href, filename, text }));
  return true;
}

export function printInvoice() {
  if (window.AryanAndroid) window.AryanAndroid.postMessage(JSON.stringify({ action: "print" }));
  else window.print();
}

export function saveInvoice(id: string, billNumber: string) {
  if (!androidFile("save", `/api/admin/bills/${encodeURIComponent(id)}/pdf`, `${billNumber}.pdf`)) window.print();
}
