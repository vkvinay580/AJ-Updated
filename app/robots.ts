import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/admin", "/api/admin/"],
    },
    sitemap: "https://aryangold.in/sitemap.xml",
    host: "https://aryangold.in",
  };
}
