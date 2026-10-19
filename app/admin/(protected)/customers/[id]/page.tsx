"use client";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Download,
  FileCheck2,
  ImageIcon,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRealtimeData } from "@/components/realtime/RealtimeSync";
const money = (p: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    p / 100,
  );
type Verification = {
  id: number;
  status: string;
  branchId: string;
  branchName: string;
  bmName: string;
  bmPhone: string;
  requestNotes?: string;
  authenticationPersonName?: string;
  authenticationPersonRelationship?: string;
  authenticationPersonPhone?: string;
  verificationNotes?: string;
  failureReason?: string;
  latitude?: number;
  longitude?: number;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  teName: string;
  teUserId: string;
};
type VerificationPhoto = {
  id: number;
  requestId: number;
  originalName: string;
  mimeType: string;
  createdAt: string;
};
type VerificationVideo = {
  id: number;
  requestId: number;
  durationMs: number;
  byteSize: number;
};
type VerificationReference = {
  id: number;
  requestId: number;
  name: string;
  relationship?: string;
  phone: string;
  notes?: string;
};
type Data = {
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    employerName?: string;
    employerAddress?: string;
    employmentDesignation?: string;
    hasCompanyIdCard?: number;
    hasOldGoldWearingImage?: number;
    createdAt: string;
  };
  kyc: Array<{
    id: number;
    documentType: string;
    last4: string;
    hasDocument: number;
    verified: number;
  }>;
  bills: Array<{
    id: number;
    billNumber: string;
    transactionType: string;
    billDate: string;
    totalPaise: number;
  }>;
  verifications: Verification[];
  verificationPhotos: VerificationPhoto[];
  verificationVideos: VerificationVideo[];
  verificationReferences: VerificationReference[];
  signatureBillId: number | null;
};
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/customers/${id}`, {
      cache: "no-store",
    });
    if (response.ok) setData(await response.json());
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useRealtimeData(load);
  if (!data)
    return <div className="loading-state page-loading">Loading customer…</div>;
  const c = data.customer;
  async function deleteCustomer() {
    if (
      !window.confirm(
        `Permanently delete ${c.name} and their KYC records? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    setError("");
    const response = await fetch(`/api/admin/customers/${id}`, {
      method: "DELETE",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to delete customer.");
      setDeleting(false);
      return;
    }
    router.replace("/admin/customers");
    router.refresh();
  }
  return (
    <div className="admin-page">
      <div className="page-title">
        <div>
          <Link href="/admin/customers" className="back-link">
            <ArrowLeft /> Customers
          </Link>
          <p>Customer profile</p>
          <h1>{c.name}</h1>
          <span>
            +91 {c.phone} · Customer since{" "}
            {new Date(c.createdAt).toLocaleDateString("en-IN")}
          </span>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="detail-actions">
          <button
            className="admin-danger"
            disabled={deleting}
            onClick={deleteCustomer}
          >
            <Trash2 /> {deleting ? "Deleting…" : "Delete customer"}
          </button>
          <Link
            className="admin-primary"
            href={`/admin/bills/new?customerId=${c.id}`}
          >
            <ReceiptText /> Create bill
          </Link>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel detail-card">
          <h2>Contact information</h2>
          <dl>
            <div>
              <dt>Phone</dt>
              <dd>+91 {c.phone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{c.email || "Not provided"}</dd>
            </div>
            <div className="full">
              <dt>Address</dt>
              <dd>
                {[c.address, c.city, c.state, c.postalCode]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel detail-card">
          <h2>KYC documents</h2>
          <div className="document-list">
            {data.kyc.map((k) => (
              <div key={k.id}>
                <span>
                  <FileCheck2 />
                  <i>
                    <strong>
                      {k.documentType === "aadhaar"
                        ? "Aadhaar Card"
                        : "PAN Card"}
                    </strong>
                    <small>•••• {k.last4}</small>
                  </i>
                </span>
                {k.hasDocument ? (
                  <a href={`/api/admin/documents/${k.id}`} target="_blank">
                    <Download /> View
                  </a>
                ) : (
                  <em>Number only</em>
                )}
              </div>
            ))}
          </div>
          {data.signatureBillId && (
            <div className="customer-kyc-signature">
              <strong>Customer Signature</strong>
              <Image
                unoptimized
                src={`/api/admin/bills/${data.signatureBillId}/media/signature`}
                alt={`${c.name} signature`}
                width={220}
                height={90}
              />
              <span>{c.name}</span>
            </div>
          )}
        </section>
        <section className="panel detail-card">
          <h2>Working proof</h2>
          <dl>
            <div>
              <dt>Company</dt>
              <dd>{c.employerName || "Not provided"}</dd>
            </div>
            <div>
              <dt>Designation</dt>
              <dd>{c.employmentDesignation || "Not provided"}</dd>
            </div>
            <div className="full">
              <dt>Company address</dt>
              <dd>{c.employerAddress || "Not provided"}</dd>
            </div>
          </dl>
          <div className="document-list">
            <div>
              <span>
                <BriefcaseBusiness />
                <i>
                  <strong>Company ID card</strong>
                  <small>Employment proof</small>
                </i>
              </span>
              {c.hasCompanyIdCard ? (
                <a
                  href={`/api/admin/customers/${c.id}/working-proof`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download /> View
                </a>
              ) : (
                <em>Not uploaded</em>
              )}
            </div>
            <div>
              <span>
                <ImageIcon />
                <i>
                  <strong>Old gold wearing image</strong>
                  <small>Customer wearing the old gold item</small>
                </i>
              </span>
              {c.hasOldGoldWearingImage ? (
                <a
                  href={`/api/admin/customers/${c.id}/old-gold-wearing-image`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download /> View
                </a>
              ) : (
                <em>Not uploaded</em>
              )}
            </div>
          </div>
        </section>
      </div>
      <section className="panel verification-history">
        <div className="panel-heading">
          <div>
            <h2>Field verification under KYC</h2>
            <p>
              TE visit evidence, references, authentication person, and outcome
            </p>
          </div>
          <ShieldCheck />
        </div>
        {data.verifications.length ? (
          <div className="verification-cards">
            {data.verifications.map((v) => {
              const photos = data.verificationPhotos.filter(
                (photo) => photo.requestId === v.id,
              );
              const videos = data.verificationVideos.filter(
                (video) => video.requestId === v.id,
              );
              const references = data.verificationReferences.filter(
                (reference) => reference.requestId === v.id,
              );
              return (
                <article key={v.id}>
                  <header>
                    <div>
                      <span className={`verification-status ${v.status}`}>
                        {v.status.replaceAll("_", " ")}
                      </span>
                      <h3>
                        Request #{v.id} · {v.teName}
                      </h3>
                      <p>
                        {v.branchName} · BM {v.bmName} · +91 {v.bmPhone}
                      </p>
                    </div>
                    <UserCheck />
                  </header>
                  <div className="verification-result-grid">
                    <dl>
                      <div>
                        <dt>Assigned</dt>
                        <dd>
                          {new Date(v.assignedAt).toLocaleString("en-IN")}
                        </dd>
                      </div>
                      <div>
                        <dt>Completed</dt>
                        <dd>
                          {v.completedAt
                            ? new Date(v.completedAt).toLocaleString("en-IN")
                            : "Awaiting TE"}
                        </dd>
                      </div>
                      <div>
                        <dt>Authentication person</dt>
                        <dd>
                          {v.authenticationPersonName
                            ? `${v.authenticationPersonName}${v.authenticationPersonRelationship ? ` · ${v.authenticationPersonRelationship}` : ""}`
                            : "Not recorded"}
                        </dd>
                      </div>
                      <div>
                        <dt>Mobile</dt>
                        <dd>
                          {v.authenticationPersonPhone
                            ? `+91 ${v.authenticationPersonPhone}`
                            : "Not recorded"}
                        </dd>
                      </div>
                      <div className="full">
                        <dt>Result notes</dt>
                        <dd>
                          {v.verificationNotes ||
                            v.failureReason ||
                            v.requestNotes ||
                            "No notes"}
                        </dd>
                      </div>
                      {v.latitude && v.longitude && (
                        <div className="full">
                          <dt>Visit location</dt>
                          <dd>
                            <a
                              href={`https://maps.google.com/?q=${v.latitude},${v.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin /> Open captured location
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                    <section>
                      <h4>References ({references.length})</h4>
                      {references.length ? (
                        references.map((reference) => (
                          <p key={reference.id}>
                            <strong>{reference.name}</strong>
                            <span>
                              {reference.relationship || "Reference"} · +91{" "}
                              {reference.phone}
                            </span>
                            {reference.notes && (
                              <small>{reference.notes}</small>
                            )}
                          </p>
                        ))
                      ) : (
                        <em>No references recorded.</em>
                      )}
                    </section>
                    <section>
                      <h4>Visit photos ({photos.length})</h4>
                      <div className="verification-photo-links">
                        {photos.map((photo, index) => (
                          <a
                            key={photo.id}
                            href={`/api/admin/verifications/${v.id}/photos/${photo.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ImageIcon /> Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h4>Visit video ({videos.length})</h4>
                      {videos.length ? (
                        videos.map((video) => (
                          <video
                            className="verification-video"
                            key={video.id}
                            controls
                            preload="metadata"
                            src={`/api/admin/verifications/${v.id}/videos/${video.id}`}
                          >
                            Your browser cannot play this verification video.
                          </video>
                        ))
                      ) : (
                        <em>No video recorded.</em>
                      )}
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-inline">
            <ShieldCheck />
            <h3>No field verification requested</h3>
            <p>Requests sent by branch managers will appear here under KYC.</p>
          </div>
        )}
      </section>
      <section className="panel list-panel">
        <div className="panel-heading">
          <div>
            <h2>Billing history</h2>
            <p>Transactions in this company only</p>
          </div>
        </div>
        {data.bills.length ? (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Bill number</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/admin/bills/${b.id}`}
                      >
                        {b.billNumber}
                      </Link>
                    </td>
                    <td>
                      <span className={`status ${b.transactionType}`}>
                        {b.transactionType}
                      </span>
                    </td>
                    <td>{b.billDate}</td>
                    <td className="right strong">{money(b.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <ReceiptText />
            <h3>No bills for this customer</h3>
          </div>
        )}
      </section>
    </div>
  );
}
