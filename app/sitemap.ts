import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aryangold.in",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://aryangold.in/contact",
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
