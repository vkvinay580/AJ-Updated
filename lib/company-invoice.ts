export type CompanyInvoiceProfile = {
  gstin: string;
  address: string;
  state: string;
  stateCode: string;
  phone: string;
};

const aryanProfile: CompanyInvoiceProfile = {
  gstin: "29BHOPS5661M1ZA",
  address: "1st Floor, Shop No. 5, No. 126, Laxmi Golden Mall, Sri Dharmaraya Swamy Temple Main Road, behind Shree Kalamma Temple, Nagartapete, Bengaluru, Bengaluru Urban, Karnataka - 560002",
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

export const COMPANY_SEALS: Record<string, string> = {
  "aryan-gold": "/images/ag-transparent.png",
  "aryan-jewels": "/images/aj-transparent.png",
  "lakshmi-bullion": "/images/lb-transparent.png",
};

export function getCompanySeal(slug: string) {
  return COMPANY_SEALS[slug] || COMPANY_SEALS["aryan-gold"];
}
