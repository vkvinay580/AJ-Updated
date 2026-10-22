"use client";

import { BellRing, ChevronRight, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";
import { messageFrom, requestJson } from "@/lib/client-api";
import VerificationDetailsModal from "@/components/verification/VerificationDetailsModal";

type ResultRow = Record<string, string | number | boolean | null>;
type Feed = { results: ResultRow[]; unreadCount: number; error?: string };

const time = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export default function VerificationNotifications({
  historyHref,
}: {
  historyHref: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<Feed>({ results: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { response, data } = await requestJson<Feed>(
        "/api/verification-results?scope=today&limit=8",
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(data.error || "Unable to load verification updates.");
      setFeed(data);
      setError("");
    } catch (caught) {
      setError(messageFrom(caught, "Unable to load verification updates."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtimeData(load);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="verification-notification-root" ref={root}>
      <button
        className="verification-notification-button"
        type="button"
        aria-label={`Customer verification updates${feed.unreadCount ? `, ${feed.unreadCount} new` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellRing />
        {feed.unreadCount > 0 && (
          <b>{feed.unreadCount > 99 ? "99+" : feed.unreadCount}</b>
        )}
      </button>
      {open && (
        <section className="verification-notification-popover" aria-label="Customer verification updates">
          <header>
            <div>
              <strong>Verification updates</strong>
              <span>Today’s completed customer checks</span>
            </div>
            {feed.unreadCount > 0 && <em>{feed.unreadCount} new</em>}
          </header>
          <div className="verification-notification-list">
            {loading ? (
              <p className="verification-notification-empty">Loading updates…</p>
            ) : error ? (
              <p className="verification-notification-error">{error}</p>
            ) : feed.results.length ? (
              feed.results.map((result) => (
                <article className={result.viewedAt ? "viewed" : ""} key={Number(result.id)}>
                  <span className="verification-notification-icon"><ShieldCheck /></span>
                  <div>
                    <strong>{result.customerName}</strong>
                    <span>{result.branchName} · {result.teName}</span>
                    <small>
                      {String(result.status).replaceAll("_", " ")} · {time(result.completedAt)}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequestId(Number(result.id))}
                  >
                    <Eye /> View details
                  </button>
                </article>
              ))
            ) : (
              <p className="verification-notification-empty">No verification results today.</p>
            )}
          </div>
          <Link href={historyHref} onClick={() => setOpen(false)}>
            View all verification results <ChevronRight />
          </Link>
        </section>
      )}
      {requestId && (
        <VerificationDetailsModal
          requestId={requestId}
          onClose={() => setRequestId(null)}
          onViewed={() => void load()}
        />
      )}
    </div>
  );
}

