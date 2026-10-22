"use client";

import { ArrowLeft, Eye, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";
import { messageFrom, requestJson } from "@/lib/client-api";
import VerificationDetailsModal from "@/components/verification/VerificationDetailsModal";

type ResultRow = Record<string, string | number | boolean | null>;
type Feed = { results: ResultRow[]; error?: string };
const dateTime = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString("en-IN") : "Not recorded";

export default function VerificationResultsPage({
  backHref,
  branch = false,
}: {
  backHref: string;
  branch?: boolean;
}) {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { response, data } = await requestJson<Feed>(
        "/api/verification-results?scope=all&limit=500",
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(data.error || "Unable to load verification results.");
      setResults(data.results);
      setError("");
    } catch (caught) {
      setError(messageFrom(caught, "Unable to load verification results."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtimeData(load);

  return (
    <div className={`verification-results-page ${branch ? "branch-results-page" : "admin-page"}`}>
      <div className="verification-results-heading">
        <div>
          <Link href={backHref}><ArrowLeft /> Back to workspace</Link>
          <p>FIELD KYC</p>
          <h1>Customer verification results</h1>
          <span>All completed verification results, with the latest shown first.</span>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw /> Refresh
        </button>
      </div>
      {error && <div className="ops-notice" role="alert">{error}</div>}
      <section className="verification-results-register">
        <header>
          <div><ShieldCheck /><span><strong>Verification register</strong><small>{results.length} completed results</small></span></div>
        </header>
        {loading && !results.length ? (
          <div className="verification-results-empty">Loading verification results…</div>
        ) : results.length ? (
          <div className="responsive-table">
            <table>
              <thead><tr><th>Completed</th><th>Customer</th><th>Branch</th><th>TE</th><th>Result</th><th>Details</th></tr></thead>
              <tbody>
                {results.map((result) => (
                  <tr key={Number(result.id)}>
                    <td>{dateTime(result.completedAt)}</td>
                    <td><strong>{result.customerName}</strong><small>{result.customerPhone}</small></td>
                    <td><strong>{result.branchName}</strong><small>{result.bmName}</small></td>
                    <td>{result.teName}<small>{result.teUserId}</small></td>
                    <td><span className={`verification-status ${result.status}`}>{String(result.status).replaceAll("_", " ")}</span><small>{result.verificationNotes || result.failureReason || "No notes recorded"}</small></td>
                    <td><button className="table-action" type="button" onClick={() => setRequestId(Number(result.id))}><Eye /> View details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="verification-results-empty">No completed verification results yet.</div>
        )}
      </section>
      {requestId && <VerificationDetailsModal requestId={requestId} onClose={() => setRequestId(null)} onViewed={() => void load()} />}
    </div>
  );
}

