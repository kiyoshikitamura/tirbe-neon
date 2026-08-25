export const HOME_RESUME_SNAPSHOT_KEY = "tribe-neon.home-resume-visual.v1";

export type HomeResumeSnapshot = Readonly<{
  backgroundUrl: string;
  leaderImageUrl: string;
  leaderName: string;
}>;

export type HomeReloadStage =
  | "reload"
  | "authSessionReady"
  | "profileReady"
  | "homeShellReady"
  | "townImageDecoded"
  | "leaderImageDecoded"
  | "homeVisualReady";

declare global {
  interface Window {
    __TRIBE_HOME_RELOAD_METRICS__?: {
      navigationType: string;
      stages: Partial<Record<HomeReloadStage, number>>;
    };
  }
}

export function readHomeResumeSnapshot(): HomeResumeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(HOME_RESUME_SNAPSHOT_KEY) || "null");
    if (!parsed || typeof parsed.backgroundUrl !== "string" || typeof parsed.leaderImageUrl !== "string" || typeof parsed.leaderName !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeHomeResumeSnapshot(snapshot: HomeResumeSnapshot) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HOME_RESUME_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function clearHomeResumeSnapshot() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(HOME_RESUME_SNAPSHOT_KEY);
}

export function markHomeReloadStage(stage: HomeReloadStage, at = typeof performance !== "undefined" ? performance.now() : 0) {
  if (typeof window === "undefined") return;
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  window.__TRIBE_HOME_RELOAD_METRICS__ ||= {
    navigationType: navigation?.type || "navigate",
    stages: { reload: 0 },
  };
  if (window.__TRIBE_HOME_RELOAD_METRICS__.stages[stage] === undefined) {
    window.__TRIBE_HOME_RELOAD_METRICS__.stages[stage] = Math.round(at);
  }
}
