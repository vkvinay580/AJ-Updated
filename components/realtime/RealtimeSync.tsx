"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";

export const REALTIME_SYNC_EVENT = "aryan:realtime-sync";
const CHANNEL_NAME = "aryan-gold-live-data";
const STORAGE_KEY = "aryan-gold-live-data-at";
const POLL_INTERVAL_MS = 4000;
const MIN_REFRESH_GAP_MS = 750;

function isLiveWorkspace(pathname: string) {
  return ["/admin", "/branch", "/head-office", "/accounts"].some(
    (root) => (pathname === root || pathname.startsWith(`${root}/`)) && pathname !== `${root}/login`,
  );
}

function usesClientDataRefresh(pathname: string) {
  return pathname === "/branch" || pathname === "/head-office" || pathname === "/accounts" ||
    pathname === "/admin/operations" || pathname === "/admin/customers" ||
    /^\/admin\/customers\/\d+$/.test(pathname) || pathname === "/admin/bills" || /^\/admin\/bills\/\d+$/.test(pathname);
}

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const rawUrl = input instanceof Request ? input.url : input.toString();
  const url = new URL(rawUrl, window.location.href);
  return { method, url };
}

export function RealtimeSync() {
  const pathname = usePathname();
  const router = useRouter();
  const lastRefresh = useRef(0);

  const refresh = useCallback((reason: string, notifyClients = true) => {
    if (!isLiveWorkspace(pathname) || document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastRefresh.current < MIN_REFRESH_GAP_MS) return;
    lastRefresh.current = now;
    if (notifyClients) window.dispatchEvent(new CustomEvent(REALTIME_SYNC_EVENT, { detail: { reason, at: now } }));
    if (!notifyClients || !usesClientDataRefresh(pathname)) startTransition(() => router.refresh());
  }, [pathname, router]);

  useEffect(() => {
    if (!isLiveWorkspace(pathname)) return;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
    const publish = () => {
      const at = Date.now();
      channel?.postMessage({ at });
      try { window.localStorage.setItem(STORAGE_KEY, String(at)); } catch { /* Storage can be disabled. */ }
      refresh("mutation", false);
    };
    const onChannel = () => refresh("broadcast");
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) refresh("storage"); };
    const onVisible = () => { if (document.visibilityState === "visible") refresh("visible"); };
    const onFocus = () => refresh("focus");
    channel?.addEventListener("message", onChannel);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    const originalFetch = window.fetch.bind(window);
    const liveFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const { method, url } = requestDetails(input, init);
      if (response.ok && !["GET", "HEAD", "OPTIONS"].includes(method) && url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
        queueMicrotask(publish);
      }
      return response;
    };
    window.fetch = liveFetch;

    const poll = window.setInterval(() => refresh("poll"), POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(poll);
      if (window.fetch === liveFetch) window.fetch = originalFetch;
      channel?.removeEventListener("message", onChannel);
      channel?.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, refresh]);

  return null;
}

export function useRealtimeData(refreshData: () => void | Promise<void>) {
  const refreshRef = useRef(refreshData);
  useEffect(() => { refreshRef.current = refreshData; }, [refreshData]);
  useEffect(() => {
    let running = false;
    const onRefresh = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try { await refreshRef.current(); } finally { running = false; }
    };
    window.addEventListener(REALTIME_SYNC_EVENT, onRefresh);
    return () => window.removeEventListener(REALTIME_SYNC_EVENT, onRefresh);
  }, []);
}
