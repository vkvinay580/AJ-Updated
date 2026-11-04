import "server-only";
import { getAttendanceBranches } from "@/lib/attendance";

export type CompanyInvoiceProfile = {
  gstin: string;
  pan?: string;
  address: string;
  state: string;
  stateCode: string;
  phone: string;
};

const aryanProfile: CompanyInvoiceProfile = {
  gstin: "29ABGCA9333E1ZK",
  pan: "ABGCA9333E",
  address: "No 15, 1st Floor, Siddhi, Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore- 560013, Karnataka",
  state: "Karnataka",
  stateCode: "29",
  phone: "+91 90354 22321",
};

export const COMPANY_INVOICE_PROFILES: Record<string, CompanyInvoiceProfile> = {
  "aryan-gold": aryanProfile,
  "aryan-jewels": aryanProfile,
  "lakshmi-bullion": {
    gstin: "29AALFL0617R1ZO",
    address: "1st Floor, No. 15, Siddhi Nilaya, 4th Cross, R Chandrappa Layout, Ramachandrapura Main Road, Near CANS Multi Specialty Hospital, Jalahalli, Bengaluru, Bengaluru Urban, Karnataka - 560013",
    state: "Karnataka",
    stateCode: "29",
    phone: "+91 90354 22321",
  },
};

export function getCompanyInvoiceProfile(slug: string) {
  return COMPANY_INVOICE_PROFILES[slug] || aryanProfile;
}

export async function getBillInvoiceIssuer(slug: string, fallbackName: string, originBranchId: string | null) {
  const profile = getCompanyInvoiceProfile(slug);
  const name = slug === "aryan-gold" ? "ARYAN GOLD PRIVATE LIMITED" : fallbackName;
  if (!originBranchId) return { ...profile, name };

  const normalizedBranchId = originBranchId.trim().toUpperCase();
  const branch = (await getAttendanceBranches()).find(item => item.branchId.trim().toUpperCase() === normalizedBranchId);
  if (!branch) throw new Error(`Branch ${originBranchId} is unavailable in the branch directory.`);

  const addressParts = [branch.address.trim()];
  const appendIfMissing = (value: string) => {
    const normalized = value.trim();
    if (normalized && !addressParts.join(", ").toLowerCase().includes(normalized.toLowerCase())) addressParts.push(normalized);
  };
  appendIfMissing(branch.city);
  appendIfMissing(branch.pincode);
  appendIfMissing(branch.state);
  return { ...profile, name, address: addressParts.filter(Boolean).join(", ") };
}

export const COMPANY_SEALS: Record<string, string> = {
  "aryan-gold": "/images/ag-transparent.png",
  "aryan-jewels": "/images/aj-transparent.png",
  "lakshmi-bullion": "/images/lb-transparent.png",
};

export function getCompanySeal(slug: string) {
  return COMPANY_SEALS[slug] || COMPANY_SEALS["aryan-gold"];
}
