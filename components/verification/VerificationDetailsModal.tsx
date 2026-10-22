"use client";

import { CheckCircle2, ImageIcon, MapPin, ShieldAlert, ShieldCheck, UserCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Row = Record<string, string | number | null>;
type Details = { verification: Row; photos: Row[]; videos: Row[]; references: Row[]; viewerRole: string };

const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString("en-IN") : "Not recorded";
const mapLink = (latitude: unknown, longitude: unknown) => latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : "";

export default function VerificationDetailsModal({ requestId, onClose, onViewed }: { requestId: number; onClose: () => void; onViewed?: () => void }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const onViewedRef = useRef(onViewed);
  useEffect(() => { onViewedRef.current = onViewed; }, [onViewed]);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/verification-details/${requestId}`, { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load verification details.");
      if (!cancelled) { setDetails(data); onViewedRef.current?.(); }
    }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load verification details."); });
    return () => { cancelled = true; };
  }, [requestId]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  const v = details?.verification;
  return <div className="verification-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
      <header><div><span><ShieldCheck/> FIELD VERIFICATION</span><h2 id="verification-modal-title">{v ? `${v.customerName} · Request #${v.id}` : `Verification #${requestId}`}</h2></div><button type="button" onClick={onClose} aria-label="Close verification details"><X/></button></header>
      {error?<div className="verification-modal-error"><ShieldAlert/><p>{error}</p></div>:!v?<div className="verification-modal-loading">Loading verification details…</div>:<div className="verification-modal-body">
        <div className="verification-modal-summary"><span className={`verification-status ${v.status}`}>{String(v.status).replaceAll("_"," ")}</span><p>{v.verificationNotes || v.failureReason || v.requestNotes || "No verification notes recorded."}</p></div>
        <div className="verification-modal-grid">
          <section><h3><UserCheck/> Customer and visit</h3><dl><div><dt>Customer</dt><dd>{v.customerName} · +91 {v.customerPhone}</dd></div><div><dt>Address</dt><dd>{[v.customerAddress,v.customerCity,v.customerState,v.customerPostalCode].filter(Boolean).join(", ")||"Not provided"}</dd></div><div><dt>TE</dt><dd>{v.teName} · {v.teUserId}</dd></div><div><dt>Branch manager</dt><dd>{v.branchName} · {v.bmName} · +91 {v.bmPhone}</dd></div><div><dt>Assigned</dt><dd>{dateTime(v.assignedAt)}</dd></div><div><dt>Completed</dt><dd>{dateTime(v.completedAt)}</dd></div></dl></section>
          <section><h3><CheckCircle2/> Authentication</h3><dl><div><dt>Person</dt><dd>{v.authenticationPersonName || "Not recorded"}</dd></div><div><dt>Relationship</dt><dd>{v.authenticationPersonRelationship || "Not recorded"}</dd></div><div><dt>Phone</dt><dd>{v.authenticationPersonPhone ? `+91 ${v.authenticationPersonPhone}` : "Not recorded"}</dd></div>{mapLink(v.latitude,v.longitude)&&<div><dt>Final visit location</dt><dd><a href={mapLink(v.latitude,v.longitude)} target="_blank" rel="noreferrer"><MapPin/> Open in Google Maps</a></dd></div>}</dl></section>
          <section><h3>Recommendation / relative</h3><dl><div><dt>Name</dt><dd>{v.recommendationName || "Not provided"}</dd></div><div><dt>Relationship</dt><dd>{v.recommendationRelationship || "Not provided"}</dd></div><div><dt>Phone</dt><dd>{v.recommendationPhone ? `+91 ${v.recommendationPhone}` : "Not provided"}</dd></div><div><dt>Address</dt><dd>{v.recommendationAddress || "Not provided"}</dd></div></dl></section>
          <section><h3>Verification references ({details.references.length})</h3>{details.references.length?details.references.map(reference=><article className="verification-reference" key={reference.id}><strong>{reference.name}</strong><span>{reference.relationship || "Reference"} · +91 {reference.phone}</span>{reference.notes&&<small>{reference.notes}</small>}</article>):<em>No references recorded.</em>}</section>
        </div>
        <section className="verification-media-section"><h3>Visit photos ({details.photos.length})</h3><div className="verification-media-grid">{details.photos.map((photo,index)=><article key={photo.id}><a href={`/api/verification-details/${requestId}/media/photo/${photo.id}`} target="_blank" rel="noreferrer"><ImageIcon/> Photo {index+1}</a><small>{dateTime(photo.capturedAt || photo.createdAt)}</small>{mapLink(photo.latitude,photo.longitude)?<a className="verification-map-link" href={mapLink(photo.latitude,photo.longitude)} target="_blank" rel="noreferrer"><MapPin/> Captured location</a>:<span className="verification-location-missing">Location unavailable</span>}</article>)}</div></section>
        <section className="verification-media-section"><h3>Visit video ({details.videos.length})</h3>{details.videos.length?details.videos.map(video=><article className="verification-video-record" key={video.id}><video controls preload="metadata" src={`/api/verification-details/${requestId}/media/video/${video.id}`}/><div><span>{Math.ceil(Number(video.durationMs||0)/1000)} seconds · {(Number(video.byteSize||0)/1048576).toFixed(1)} MB</span><small>{dateTime(video.capturedAt || video.createdAt)}</small>{mapLink(video.latitude,video.longitude)?<a href={mapLink(video.latitude,video.longitude)} target="_blank" rel="noreferrer"><MapPin/> Captured location</a>:<span className="verification-location-missing">Location unavailable</span>}</div></article>):<em>No video recorded.</em>}</section>
      </div>}
    </section>
  </div>;
}
