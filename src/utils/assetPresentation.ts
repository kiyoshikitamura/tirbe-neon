/** Presentation guard for DB-projected image values. Raw asset IDs are not URLs. */
export function resolvePresentableAssetUrl(value: unknown): string | null {
  const candidate = String(value || "").trim();
  if (candidate.startsWith("/")) {
    if (/^\/bg\/bg_street_[a-z0-9_-]+\.png$/i.test(candidate)) return candidate.replace(/\.png$/i, ".jpg");
    if (/^\/gacha\/bg_gacha_(normal|sr|ssr)\.png$/i.test(candidate)) return candidate.replace(/\.png$/i, ".jpg");
    if (/^\/skills\/(basic|skill)_[a-z0-9_-]+\.png$/i.test(candidate)) return candidate.replace(/\.png$/i, ".jpg");
    if (candidate === "/banner_beginner_pack.png") return "/banner_beginner_pack.jpg";
    return candidate;
  }
  if (/^https:\/\//i.test(candidate)) return candidate;
  return null;
}
