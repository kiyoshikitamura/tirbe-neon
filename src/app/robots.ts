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

export default function robots(): MetadataRoute.Robots {
  const origin = releaseOrigin();
  const indexingEnabled = process.env.RELEASE_INDEXING_ENABLED === "true" && Boolean(origin);

  if (!indexingEnabled || !origin) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
