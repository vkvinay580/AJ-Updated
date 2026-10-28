"use client";

import { BellRing, CalendarClock, Check, ChevronRight, Eye, MapPin, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";
import { messageFrom, requestJson } from "@/lib/client-api";
import VerificationDetailsModal from "@/components/verification/VerificationDetailsModal";

type ResultRow = Record<string, string | number | boolean | null>;
type Feed = { results: ResultRow[]; unreadCount: number; error?: string };
type VisitNotification = {
  id: number;
  kind: "arrival" | "30_minutes" | "15_minutes";
  title: string;
  body: string;
  contactName: string;
  contactMobile: string;
  branchName: string;
  branchAddress: string | null;
  visitDate: string;
  visitTime: string;
  visitTimezone: string;
  deliveredAt: string;
  readAt: string | null;
};
type VisitFeed = { notifications: VisitNotification[]; unreadCount: number; error?: string };

const time = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export default function VerificationNotifications({
  historyHref,
  includeBranchVisits = false,
}: {
  historyHref: string;
  includeBranchVisits?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const announcedVisits = useRef(new Set<number>());
  const [feed, setFeed] = useState<Feed>({ results: [], unreadCount: 0 });
  const [visitFeed, setVisitFeed] = useState<VisitFeed>({ notifications: [], unreadCount: 0 });
  const [activeVisit, setActiveVisit] = useState<VisitNotification | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [verificationResult, visitResult] = await Promise.all([
        requestJson<Feed>("/api/verification-results?scope=today&limit=8", { cache: "no-store" }),
        includeBranchVisits
          ? requestJson<VisitFeed>("/api/branch/visit-notifications", { cache: "no-store" })
          : Promise.resolve(null),
      ]);
      const { response, data } = verificationResult;
      if (!response.ok)
        throw new Error(data.error || "Unable to load verification updates.");
      if (visitResult && !visitResult.response.ok)
        throw new Error(visitResult.data.error || "Unable to load customer visit alerts.");
      setFeed(data);
      if (visitResult) {
        setVisitFeed(visitResult.data);
        setActiveVisit((current) => {
          if (current) return current;
          if (document.visibilityState !== "visible") return null;
          const next = visitResult.data.notifications.find((notification) => {
            return !notification.readAt && !announcedVisits.current.has(notification.id);
          });
          if (next) announcedVisits.current.add(next.id);
          return next || null;
        });
      }
      setError("");
    } catch (caught) {
      setError(messageFrom(caught, "Unable to load verification updates."));
    } finally {
      setLoading(false);
    }
  }, [includeBranchVisits]);

  const markVisitRead = useCallback(async (notificationId: number) => {
    try {
      const { response, data } = await requestJson<{ ok?: boolean; error?: string }>("/api/branch/visit-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) throw new Error(data.error || "Unable to mark the alert as read.");
      setActiveVisit((current) => current?.id === notificationId ? null : current);
      await load();
    } catch (caught) {
      setError(messageFrom(caught, "Unable to mark the alert as read."));
    }
  }, [load]);

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

  const unreadCount = feed.unreadCount + visitFeed.unreadCount;

  return (
    <div className="verification-notification-root" ref={root}>
      <button
        className="verification-notification-button"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} new` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellRing />
        {unreadCount > 0 && (
          <b>{unreadCount > 99 ? "99+" : unreadCount}</b>
        )}
      </button>
      {open && (
        <section className="verification-notification-popover" aria-label="Notifications">
          <header>
            <div>
              <strong>Notifications</strong>
              <span>{includeBranchVisits ? "Customer visits and verification updates" : "Today’s completed customer checks"}</span>
            </div>
            {unreadCount > 0 && <em>{unreadCount} new</em>}
          </header>
          <div className="verification-notification-list">
            {loading ? (
              <p className="verification-notification-empty">Loading updates…</p>
            ) : error ? (
              <p className="verification-notification-error">{error}</p>
            ) : visitFeed.notifications.length || feed.results.length ? (
              <>
              {visitFeed.notifications.map((notification) => (
                <article className={`${notification.readAt ? "viewed" : ""} branch-visit-notification`} key={`visit-${notification.id}`}>
                  <span className="verification-notification-icon"><CalendarClock /></span>
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{notification.contactName} · {notification.contactMobile}</span>
                    <small>{notification.visitDate} at {notification.visitTime} · {notification.branchName}</small>
                  </div>
                  {!notification.readAt && <button type="button" onClick={() => void markVisitRead(notification.id)}><Check /> Mark read</button>}
                </article>
              ))}
              {feed.results.map((result) => (
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
              ))}
              </>
            ) : (
              <p className="verification-notification-empty">No notifications yet.</p>
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
      {activeVisit && (
        <section className="branch-visit-popup" role="alert" aria-live="assertive" aria-label="Customer arrival alert">
          <button className="branch-visit-popup-close" type="button" onClick={() => setActiveVisit(null)} aria-label="Dismiss alert"><X /></button>
          <span className="branch-visit-popup-icon"><CalendarClock /></span>
          <div>
            <small>{activeVisit.kind === "arrival" ? "NEW CUSTOMER VISIT" : "ARRIVAL REMINDER"}</small>
            <h2>{activeVisit.title}</h2>
            <p>{activeVisit.body}</p>
            <dl>
              <div><dt>Customer</dt><dd>{activeVisit.contactName} · {activeVisit.contactMobile}</dd></div>
              <div><dt>Arrival</dt><dd>{activeVisit.visitDate} at {activeVisit.visitTime} ({activeVisit.visitTimezone})</dd></div>
              {activeVisit.branchAddress && <div><dt>Branch</dt><dd><MapPin /> {activeVisit.branchAddress}</dd></div>}
            </dl>
            <button type="button" onClick={() => void markVisitRead(activeVisit.id)}><Check /> Acknowledge</button>
          </div>
        </section>
      )}
    </div>
  );
}
