interface CacheEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const requestCache = new Map<string, CacheEntry<unknown>>();

export function getOrCreateRequest<T>(key: string, loader: () => Promise<T>, ttlMs = 30000): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = loader().catch((error) => {
    requestCache.delete(key);
    throw error;
  });
  requestCache.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

export function invalidateRequest(key: string) {
  requestCache.delete(key);
}

export function invalidateRequestsByPrefix(prefix: string) {
  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) requestCache.delete(key);
  }
}
