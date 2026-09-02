import type { Metadata, Viewport } from "next";
import "./globals.css";

function releaseSiteOrigin(): URL | undefined {
  const configured = process.env.SITE_ORIGIN?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

const releaseOrigin = releaseSiteOrigin();
const indexingEnabled = process.env.RELEASE_INDEXING_ENABLED === "true" && Boolean(releaseOrigin);

export const metadata: Metadata = {
  metadataBase: releaseOrigin,
  title: "TRIBE NEON",
  description: "Street Outlaw Strategy RPG",
  manifest: "/manifest.webmanifest",
  robots: indexingEnabled
    ? { index: true, follow: true }
    : { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
