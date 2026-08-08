export type AssetStatus = "loaded" | "fallback" | "failed";

export interface AssetRequest {
  src: string;
  fallbackSrc?: string;
  required?: boolean;
}

export interface AssetResult {
  requestedSrc: string;
  resolvedSrc: string | null;
  status: AssetStatus;
}

const imagePromiseCache = new Map<string, Promise<boolean>>();

function loadImage(src: string, timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  const cached = imagePromiseCache.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(loaded);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) finish(true);
  });

  imagePromiseCache.set(src, promise);
  return promise;
}

export async function preloadAsset(asset: AssetRequest, timeoutMs = 12000): Promise<AssetResult> {
  if (await loadImage(asset.src, timeoutMs)) {
    return { requestedSrc: asset.src, resolvedSrc: asset.src, status: "loaded" };
  }
  if (asset.fallbackSrc && await loadImage(asset.fallbackSrc, timeoutMs)) {
    return { requestedSrc: asset.src, resolvedSrc: asset.fallbackSrc, status: "fallback" };
  }
  return { requestedSrc: asset.src, resolvedSrc: null, status: "failed" };
}

export function preloadAssetManifest(assets: AssetRequest[], timeoutMs = 12000) {
  const uniqueAssets = Array.from(new Map(assets.map((asset) => [asset.src, asset])).values());
  return Promise.all(uniqueAssets.map((asset) => preloadAsset(asset, timeoutMs)));
}

export function evictImageFromCache(src: string) {
  imagePromiseCache.delete(src);
}
