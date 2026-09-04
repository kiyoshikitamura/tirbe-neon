import type { MetadataRoute } from "next";

function releaseOrigin(): string | null {
  const configured = process.env.SITE_ORIGIN?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = releaseOrigin();
  if (process.env.RELEASE_INDEXING_ENABLED !== "true" || !origin) return [];
  return [{ url: origin }];
}
