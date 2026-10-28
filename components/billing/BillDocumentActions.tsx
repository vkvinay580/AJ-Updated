"use client";

import { Download, Eye, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function BillDocumentActions({ billId, portal, label = "Billed" }: { billId: number; portal: "admin" | "branch"; label?: string }) {
  const [open, setOpen] = useState(false);
  const pdfUrl = `/api/${portal}/bills/${billId}/pdf`;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const dialog = open ? <div className="document-action-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
    <section className="document-action-dialog" role="dialog" aria-modal="true" aria-labelledby={`bill-actions-${billId}`} onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="document-action-close" onClick={() => setOpen(false)} aria-label="Close bill actions"><X/></button>
      <span className="document-action-icon"><FileText/></span>
      <p>COMPLETED PURCHASE</p>
      <h2 id={`bill-actions-${billId}`}>Customer bill</h2>
      <small>View the issued bill in a new tab or download the PDF to this device.</small>
      <div>
        <a className="admin-secondary" href={`${pdfUrl}?print=1`} target="_blank" rel="noreferrer"><Eye/> View bill</a>
        <a className="admin-primary" href={pdfUrl} download><Download/> Download bill</a>
      </div>
    </section>
  </div> : null;

  return <>
    <button type="button" className="ops-status billed bill-status-button" onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</button>
    {dialog && createPortal(dialog, document.body)}
  </>;
}
