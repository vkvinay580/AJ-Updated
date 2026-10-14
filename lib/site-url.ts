const DEFAULT_SITE_URL = "https://aryangold.in";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return DEFAULT_SITE_URL;
    }

    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
