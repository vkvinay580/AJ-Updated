export const COMPANIES = [
  {
    slug: "aryan-gold",
    name: "Aryan Gold",
    shortName: "AG",
    logo: "/brands/aryan-gold.webp",
    accent: "#c89424",
  },
  {
    slug: "aryan-jewels",
    name: "Aryan Jewels",
    shortName: "AJ",
    logo: "/brands/aryan-jewels.png",
    accent: "#1f66ad",
  },
  {
    slug: "lakshmi-bullion",
    name: "Lakshmi Bullion",
    shortName: "LB",
    logo: "/brands/lakshmi-bullion-gold.png",
    accent: "#c89424",
  },
] as const;

export type CompanySlug = (typeof COMPANIES)[number]["slug"];

export function getCompany(slug: string) {
  return COMPANIES.find((company) => company.slug === slug);
}
