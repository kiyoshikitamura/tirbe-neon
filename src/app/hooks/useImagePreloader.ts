import { useEffect, useMemo, useState } from "react";
import { preloadAssetManifest } from "../lib/screenAssets";
import type { AssetRequest, AssetResult, AssetTier } from "../lib/screenAssets";
import { beginAssetTierMetric, finishAssetTierMetric } from "../lib/screenAssets";

const PRELOAD_FRAME_PATHS = [
  "/frames/sq_n.png",
  "/frames/sq_r.png",
  "/frames/sq_sr.png",
  "/frames/sq_ssr.png",
  "/frames/card_n.png",
  "/frames/card_r.png",
  "/frames/card_sr.png",
  "/frames/card_ssr.png",
];

export function useImagePreloader(customPaths: string[] = []) {
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const pathsKey = [...PRELOAD_FRAME_PATHS, ...customPaths].filter(Boolean).sort().join("|");
  const allPaths = useMemo(
    () => Array.from(new Set(pathsKey ? pathsKey.split("|") : [])),
    [pathsKey]
  );

  useEffect(() => {
    if (allPaths.length === 0) return;
    let cancelled = false;
    void preloadAssetManifest(allPaths.map((src) => ({ src, required: false }))).then(() => {
      if (!cancelled) setLoadedKey(pathsKey);
    });
    return () => { cancelled = true; };
  }, [allPaths, pathsKey]);

  return allPaths.length === 0 || loadedKey === pathsKey;
}

export function useAssetTierPreloader(
  assets: AssetRequest[],
  tier: AssetTier,
  enabled = true,
) {
  const manifestKey = assets.map((asset) => `${asset.src}:${asset.required !== false}`).sort().join("|");
  const manifest = useMemo(() => assets, [manifestKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState<{ key: string; results: AssetResult[] } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    beginAssetTierMetric(tier);
    void preloadAssetManifest(manifest).then((results) => {
      finishAssetTierMetric(tier, results);
      if (!cancelled) setResult({ key: manifestKey, results });
    });
    return () => { cancelled = true; };
  }, [enabled, manifest, manifestKey, tier]);

  const results = result?.key === manifestKey ? result.results : [];
  const requiredFailed = results.some((assetResult) => {
    const request = manifest.find((asset) => asset.src === assetResult.requestedSrc);
    return request?.required !== false && assetResult.status === "failed";
  });
  return {
    ready: !enabled || (result?.key === manifestKey && !requiredFailed),
    settled: !enabled || result?.key === manifestKey,
    requiredFailed,
    results,
  };
}
