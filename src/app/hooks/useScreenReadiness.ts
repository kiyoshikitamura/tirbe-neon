"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetRequest, AssetResult, preloadAssetManifest } from "../lib/screenAssets";

export type ScreenReadinessStatus = "loading" | "ready" | "error";

interface ScreenReadinessOptions {
  assets?: AssetRequest[];
  dataReady?: boolean;
  dataError?: unknown;
  timeoutMs?: number;
}

export function useScreenReadiness({ assets = [], dataReady = true, dataError, timeoutMs = 12000 }: ScreenReadinessOptions) {
  const manifestJson = JSON.stringify(assets);
  const manifest = useMemo<AssetRequest[]>(() => JSON.parse(manifestJson), [manifestJson]);
  const [attempt, setAttempt] = useState(0);
  const [assetResults, setAssetResults] = useState<AssetResult[]>([]);
  const [assetsSettled, setAssetsSettled] = useState(manifest.length === 0);

  useEffect(() => {
    let cancelled = false;
    if (manifest.length === 0) return;
    void preloadAssetManifest(manifest, timeoutMs).then((results) => {
      if (cancelled) return;
      setAssetResults(results);
      setAssetsSettled(true);
    });
    return () => { cancelled = true; };
  }, [manifest, attempt, timeoutMs]);

  const retry = useCallback(() => {
    setAssetsSettled(manifest.length === 0);
    setAttempt((value) => value + 1);
  }, [manifest.length]);

  const requiredAssetFailed = assetResults.some((result) => {
    const request = manifest.find((asset) => asset.src === result.requestedSrc);
    return request?.required !== false && result.status === "failed";
  });
  const status: ScreenReadinessStatus = dataError || requiredAssetFailed
    ? "error"
    : dataReady && assetsSettled
      ? "ready"
      : "loading";

  return { status, assetResults, retry };
}
