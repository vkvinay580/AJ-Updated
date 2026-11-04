export type InternalStockTransferDefaultsInput = {
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchCity: string;
  branchState: string;
  branchPincode: string;
};

export const ARYAN_GOLD_LEGAL_NAME = "ARYAN GOLD PRIVATE LIMITED";
export const ARYAN_GOLD_GSTIN = "29ABGCA9333E1ZK";
export const ARYAN_GOLD_HEAD_OFFICE_ADDRESS = "No 15, 1st Floor, Siddhi Nilaya, 4th Cross, Jalahalli, Bangalore North, Bangalore - 560013, Karnataka";

const stateProfiles: Record<string, { name: string; code: string; gstin?: string }> = {
  andhrapradesh: { name: "Andhra Pradesh", code: "37" },
  assam: { name: "Assam", code: "18" },
  bihar: { name: "Bihar", code: "10" },
  chhattisgarh: { name: "Chhattisgarh", code: "22" },
  delhi: { name: "Delhi", code: "07" },
  goa: { name: "Goa", code: "30" },
  gujarat: { name: "Gujarat", code: "24" },
  haryana: { name: "Haryana", code: "06" },
  jharkhand: { name: "Jharkhand", code: "20" },
  karnataka: { name: "Karnataka", code: "29", gstin: ARYAN_GOLD_GSTIN },
  kerala: { name: "Kerala", code: "32" },
  madhyapradesh: { name: "Madhya Pradesh", code: "23" },
  maharashtra: { name: "Maharashtra", code: "27" },
  odisha: { name: "Odisha", code: "21" },
  puducherry: { name: "Puducherry", code: "34" },
  punjab: { name: "Punjab", code: "03" },
  rajasthan: { name: "Rajasthan", code: "08" },
  tamilnadu: { name: "Tamil Nadu", code: "33" },
  telangana: { name: "Telangana", code: "36" },
  uttarpradesh: { name: "Uttar Pradesh", code: "09" },
  uttarakhand: { name: "Uttarakhand", code: "05" },
  westbengal: { name: "West Bengal", code: "19" },
};

const normalizeState = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

export function internalStockTransferState(value: string) {
  const supplied = value.trim();
  return stateProfiles[normalizeState(supplied)] || { name: supplied || "Karnataka", code: supplied ? "" : "29" };
}

export function internalStockTransferDefaults(input: InternalStockTransferDefaultsInput) {
  const state = internalStockTransferState(input.branchState);
  const cityLine = [input.branchCity, input.branchPincode].filter(Boolean).join(" - ");
  const shipper = [
    `Firm Name: ${ARYAN_GOLD_LEGAL_NAME}, ${input.branchName || input.branchId}`,
    `Branch ID: ${input.branchId}`,
    input.branchAddress,
    cityLine,
    `State: ${state.name}`,
    `GSTIN: ${state.gstin || ""}`,
  ].filter(Boolean).join("\n");
  const headOffice = [
    `Firm Name: ${ARYAN_GOLD_LEGAL_NAME}, HEAD OFFICE`,
    ARYAN_GOLD_HEAD_OFFICE_ADDRESS,
    "Bengaluru - 560013",
    "State: Karnataka",
    `GSTIN: ${ARYAN_GOLD_GSTIN}`,
    "Contact: +91 90354 22321",
  ].join("\n");

  return {
    state: state.name,
    stateCode: state.code,
    placeOfSupply: state.name,
    transporterName: "Sequel Logistics Pvt Ltd",
    transporterGstin: "",
    transportationMode: "BY ROAD",
    shipper,
    consignee: headOffice,
    purposeOfMovement: "STOCK TRANSFER",
    shippingAddress: headOffice,
  };
}
