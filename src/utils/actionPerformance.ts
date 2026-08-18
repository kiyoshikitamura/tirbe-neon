export type ActionPerformanceStage = "lock" | "request_start" | "response" | "state_update" | "visual_ready";

export type ActionPerformanceEntry = {
  action: string;
  stage: ActionPerformanceStage;
  elapsedMs: number;
  deltaMs: number;
  at: number;
};

const clock = () => typeof performance !== "undefined" ? performance.now() : Date.now();

export function beginActionPerformance(action: string) {
  const startedAt = clock();
  let previousAt = startedAt;

  const mark = (stage: ActionPerformanceStage) => {
    const at = clock();
    const entry: ActionPerformanceEntry = {
      action,
      stage,
      elapsedMs: Math.round(at - startedAt),
      deltaMs: Math.round(at - previousAt),
      at: Date.now(),
    };
    previousAt = at;

    if (typeof window !== "undefined") {
      const target = window as typeof window & { __TRIBE_ACTION_METRICS__?: ActionPerformanceEntry[] };
      target.__TRIBE_ACTION_METRICS__ = [...(target.__TRIBE_ACTION_METRICS__ || []).slice(-199), entry];
      window.dispatchEvent(new CustomEvent("tribe:action-performance", { detail: entry }));
    }
    if (process.env.NEXT_PUBLIC_APP_ENV !== "production") console.info("[M9 action performance]", entry);
    return entry;
  };

  const markVisualReady = () => {
    if (typeof requestAnimationFrame === "undefined") return mark("visual_ready");
    requestAnimationFrame(() => requestAnimationFrame(() => mark("visual_ready")));
    return undefined;
  };

  mark("lock");
  return { mark, markVisualReady };
}
