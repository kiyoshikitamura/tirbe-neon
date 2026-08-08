import { useEffect, useMemo, useState } from "react";
import { preloadAssetManifest } from "../lib/screenAssets";

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
