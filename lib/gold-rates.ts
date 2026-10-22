export const GOLD_PURITY_OPTIONS = [
  { code: "999", karat: "24K", label: "24K / 999" },
  { code: "916", karat: "22K", label: "22K / 916" },
  { code: "750", karat: "18K", label: "18K / 750" },
] as const;

export type GoldPurityCode = (typeof GOLD_PURITY_OPTIONS)[number]["code"];
export type GoldTransactionType = "purchase" | "sale";

export type GoldRateSettings = {
  purchaseRate999: number;
  saleRate999: number;
  purchaseRate916: number;
  saleRate916: number;
  purchaseRate750: number;
  saleRate750: number;
  updatedAt?: string | null;
};

export function goldPurityCode(value: unknown): GoldPurityCode | null {
  const normalized = String(value || "").toUpperCase().replace(/\s+/g, "");
  if (normalized.includes("999") || normalized.includes("24K")) return "999";
  if (normalized.includes("916") || normalized.includes("22K")) return "916";
  if (normalized.includes("750") || normalized.includes("18K")) return "750";
  return null;
}

export function goldRateFor(settings: GoldRateSettings | null | undefined, type: GoldTransactionType, purity: unknown) {
  const code = goldPurityCode(purity);
  if (!settings || !code) return 0;
  if (code === "999") return Number(type === "purchase" ? settings.purchaseRate999 : settings.saleRate999);
  if (code === "916") return Number(type === "purchase" ? settings.purchaseRate916 : settings.saleRate916);
  return Number(type === "purchase" ? settings.purchaseRate750 : settings.saleRate750);
}
