"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import CameraField from "@/components/admin/CameraField";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  stateCode?: string;
  placeOfSupply?: string;
  postalCode?: string;
  employerName?: string;
  employerAddress?: string;
  employmentDesignation?: string;
  recommendationName?: string;
  recommendationRelationship?: string;
  recommendationPhone?: string;
  recommendationAddress?: string;
  hasCompanyIdCard?: number;
  hasOldGoldWearingImage?: number;
};

type KycRecord = {
  id: number;
  documentType: "aadhaar" | "pan";
  number?: string;
  last4: string;
  hasDocument: number;
};

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kyc, setKyc] = useState<KycRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}?edit=1`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load customer.");
        setCustomer(data.customer);
        setKyc(data.kyc || []);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load customer.",
        ),
      );
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      body: new FormData(event.currentTarget),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to update customer.");
      setSaving(false);
      return;
    }
    const requested = searchParams.get("returnTo");
    const returnTo = requested?.startsWith("/admin/")
      ? requested
      : `/admin/customers/${id}`;
    router.push(returnTo);
    router.refresh();
  }

  if (!customer)
    return (
      <div className="loading-state page-loading">
        {error || "Loading customer…"}
      </div>
    );

  const aadhaar = kyc.find((record) => record.documentType === "aadhaar");
  const pan = kyc.find((record) => record.documentType === "pan");

  return (
    <div className="admin-page narrow-page">
      <div className="page-title">
        <div>
          <Link href={`/admin/customers/${id}`} className="back-link">
            <ArrowLeft /> Customer profile
          </Link>
          <p>Customer record</p>
          <h1>Edit customer</h1>
          <span>
            Update customer and KYC details for {customer.name}. Existing data
            is filled in below.
          </span>
        </div>
      </div>
      <form onSubmit={save} className="registration-form">
        <section className="panel form-panel">
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>Customer details</h2>
              <p>Update contact and invoice information.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="full">
              Full name *
              <input name="name" required maxLength={120} defaultValue={customer.name} />
            </label>
            <label>
              Mobile number *
              <input
                name="phone"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                defaultValue={customer.phone}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                }}
              />
            </label>
            <label>
              Email address
              <input name="email" type="email" maxLength={150} defaultValue={customer.email || ""} />
            </label>
            <label>
              Postal code *
              <input
                name="postalCode"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                defaultValue={customer.postalCode || ""}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
                }}
              />
            </label>
            <label className="full">
              Address
              <textarea name="address" rows={3} maxLength={400} defaultValue={customer.address || ""} />
            </label>
            <label>
              City
              <input name="city" maxLength={80} defaultValue={customer.city || ""} />
            </label>
            <label>
              State
              <input name="state" maxLength={80} defaultValue={customer.state || ""} />
            </label>
            <label>
              GSTIN/UIN
              <input name="gstin" maxLength={15} className="uppercase" defaultValue={customer.gstin || ""} />
            </label>
            <label>
              State code
              <input name="stateCode" inputMode="numeric" maxLength={2} defaultValue={customer.stateCode || ""} />
            </label>
            <label className="full">
              Place of supply
              <input name="placeOfSupply" maxLength={80} defaultValue={customer.placeOfSupply || ""} />
            </label>
          </div>
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>KYC details</h2>
              <p>Existing numbers are prefilled. Upload a file only when the KYC document needs to be replaced.</p>
            </div>
          </div>
          <div className="kyc-block">
            <label>
              Aadhaar number
              <input
                name="aadhaar"
                inputMode="numeric"
                placeholder={aadhaar ? `Existing Aadhaar ending ${aadhaar.last4}` : "12-digit Aadhaar number"}
                maxLength={12}
                pattern="[0-9]{12}"
                defaultValue={aadhaar?.number || ""}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 12);
                }}
              />
            </label>
            {aadhaar?.hasDocument ? (
              <p>
                <a className="table-link" href={`/api/admin/documents/${aadhaar.id}`} target="_blank" rel="noreferrer">
                  View current Aadhaar document
                </a>
              </p>
            ) : null}
            <CameraField
              label={aadhaar?.hasDocument ? "Replace Aadhaar document" : "Aadhaar document"}
              name="aadhaarFile"
              optional
            />
          </div>
          <div className="or-divider"><span>OR / AND</span></div>
          <div className="kyc-block">
            <label>
              PAN number
              <input
                name="pan"
                placeholder={pan ? `Existing PAN ending ${pan.last4}` : "ABCDE1234F"}
                maxLength={10}
                pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]"
                className="uppercase"
                defaultValue={pan?.number || ""}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
                }}
              />
            </label>
            {pan?.hasDocument ? (
              <p>
                <a className="table-link" href={`/api/admin/documents/${pan.id}`} target="_blank" rel="noreferrer">
                  View current PAN document
                </a>
              </p>
            ) : null}
            <CameraField
              label={pan?.hasDocument ? "Replace PAN document" : "PAN document"}
              name="panFile"
              optional
            />
          </div>
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading">
            <span>03</span>
            <div>
              <h2>Working proof</h2>
              <p>Update employment details or replace the company ID card.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Company name
              <input name="employerName" maxLength={190} defaultValue={customer.employerName || ""} />
            </label>
            <label>
              Designation
              <input name="employmentDesignation" maxLength={120} defaultValue={customer.employmentDesignation || ""} />
            </label>
            <label className="full">
              Company address
              <textarea name="employerAddress" rows={3} maxLength={500} defaultValue={customer.employerAddress || ""} />
            </label>
          </div>
          {customer.hasCompanyIdCard ? (
            <p>
              <a className="table-link" href={`/api/admin/customers/${id}/working-proof`} target="_blank" rel="noreferrer">
                View current company ID card
              </a>
            </p>
          ) : null}
          <CameraField
            label={customer.hasCompanyIdCard ? "Replace company ID card" : "Company ID card"}
            name="companyIdCard"
            optional
            acceptPdf={false}
          />
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading">
            <span>04</span>
            <div>
              <h2>Old gold wearing image</h2>
              <p>Replace or add the photograph showing the customer wearing the old gold item.</p>
            </div>
          </div>
          {customer.hasOldGoldWearingImage ? (
            <p>
              <a className="table-link" href={`/api/admin/customers/${id}/old-gold-wearing-image`} target="_blank" rel="noreferrer">
                View current old gold wearing image
              </a>
            </p>
          ) : null}
          <CameraField
            label={customer.hasOldGoldWearingImage ? "Replace old gold wearing image" : "Old gold wearing image"}
            name="oldGoldWearingImage"
            optional
            acceptPdf={false}
          />
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading">
            <span>05</span>
            <div>
              <h2>Recommendation / relative</h2>
              <p>Keep the customer&apos;s confirming contact up to date.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Relative / recommender name *
              <input name="recommendationName" required maxLength={190} defaultValue={customer.recommendationName || ""} />
            </label>
            <label>
              Relationship *
              <input name="recommendationRelationship" required maxLength={120} defaultValue={customer.recommendationRelationship || ""} />
            </label>
            <label>
              Mobile number *
              <input
                name="recommendationPhone"
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                defaultValue={customer.recommendationPhone || ""}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                }}
              />
            </label>
            <label className="full">
              Address *
              <textarea name="recommendationAddress" required rows={3} maxLength={500} defaultValue={customer.recommendationAddress || ""} />
            </label>
          </div>
        </section>
        {error && <p className="form-error sticky-error">{error}</p>}
        <div className="form-actions">
          <Link className="admin-secondary" href={`/admin/customers/${id}`}>Cancel</Link>
          <button className="admin-primary" disabled={saving}>
            {saving ? "Saving…" : "Save customer & KYC"}<Check />
          </button>
        </div>
      </form>
    </div>
  );
}
