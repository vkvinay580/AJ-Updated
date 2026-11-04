"use client";

import { CalendarDays, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { androidFile } from "@/lib/android";

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function ReportsPage() {
  const today = iso(new Date());
  const monthStart = `${today.slice(0, 8)}01`;
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(today);
  const [state, setState] = useState<"ALL" | "KA" | "TN">("ALL");
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const preset = (kind: "daily" | "monthly") => {
    setStart(kind === "daily" ? today : monthStart);
    setEnd(today);
    setError("");
  };

  const download = async (format: "xlsx" | "pdf") => {
    const query = new URLSearchParams({ start, end, state, format });
    const reportUrl = `/api/admin/reports?${query}`;
    const stateName = state === "ALL" ? "all-states" : state.toLowerCase();
    if (
      androidFile(
        "save",
        reportUrl,
        `bill-register-${stateName}.${format}`,
      )
    )
      return;
    setDownloading(format);
    setError("");
    try {
      const response = await fetch(reportUrl);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Unable to create report.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ||
        `bill-register-${stateName}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create report.",
      );
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="admin-page">
      <div className="page-title">
        <div>
          <p>Bill registers</p>
          <h1>Reports</h1>
          <span>
            Download all-state, Karnataka, or Tamil Nadu transaction reports.
          </span>
        </div>
      </div>
      <section className="panel report-panel">
        <div className="panel-heading">
          <div>
            <h2>Select report period and state</h2>
            <p>Choose a preset or enter a custom date range.</p>
          </div>
          <CalendarDays />
        </div>
        <div className="report-body">
          <div className="report-presets">
            <button onClick={() => preset("daily")}>
              <strong>Daily report</strong>
              <span>Transactions dated today</span>
            </button>
            <button onClick={() => preset("monthly")}>
              <strong>Monthly report</strong>
              <span>Month-to-date transactions</span>
            </button>
          </div>
          <div className="form-grid">
            <label>
              From date
              <input
                type="date"
                value={start}
                max={end}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              To date
              <input
                type="date"
                value={end}
                min={start}
                max={today}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            <label>
              State
              <select
                value={state}
                onChange={(event) =>
                  setState(event.target.value as "ALL" | "KA" | "TN")
                }
              >
                <option value="ALL">All states</option>
                <option value="KA">Karnataka</option>
                <option value="TN">Tamil Nadu</option>
              </select>
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="report-actions">
            <button
              className="admin-primary"
              disabled={!start || !end || !!downloading}
              onClick={() => download("xlsx")}
            >
              <FileSpreadsheet />
              {downloading === "xlsx" ? "Preparing…" : "Download Excel"}
              <Download />
            </button>
            <button
              className="admin-secondary"
              disabled={!start || !end || !!downloading}
              onClick={() => download("pdf")}
            >
              <FileText />
              {downloading === "pdf" ? "Preparing…" : "Download PDF"}
              <Download />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
