export type TutorialJourneyTraceEntry = {
  phase: string;
  occurredAt: string;
  [key: string]: unknown;
};

const TRACE_KEY = "tribe_tutorial_journey_trace";

export function traceTutorialJourney(phase: string, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const entry: TutorialJourneyTraceEntry = {
    ...detail,
    phase,
    occurredAt: new Date().toISOString(),
  };
  let previous: TutorialJourneyTraceEntry[] = [];
  try {
    previous = JSON.parse(window.sessionStorage.getItem(TRACE_KEY) || "[]");
  } catch {
    previous = [];
  }
  const next = [...previous, entry].slice(-80);
  window.sessionStorage.setItem(TRACE_KEY, JSON.stringify(next));
  (window as typeof window & { __TRIBE_TUTORIAL_JOURNEY_TRACE__?: TutorialJourneyTraceEntry[] })
    .__TRIBE_TUTORIAL_JOURNEY_TRACE__ = next;
  console.info("[Tutorial Journey Trace]", entry);
}

export function readTutorialJourneyTrace() {
  if (typeof window === "undefined") return [] as TutorialJourneyTraceEntry[];
  try {
    return JSON.parse(window.sessionStorage.getItem(TRACE_KEY) || "[]") as TutorialJourneyTraceEntry[];
  } catch {
    return [] as TutorialJourneyTraceEntry[];
  }
}
