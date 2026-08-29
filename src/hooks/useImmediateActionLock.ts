"use client";

import { useCallback, useRef, useState } from "react";

/** Locks before React renders loading, then releases after result UI can commit. */
export function useImmediateActionLock() {
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginAction = useCallback(() => {
    if (lockRef.current) return false;
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    lockRef.current = true;
    setIsLocked(true);
    return true;
  }, []);

  const endAction = useCallback(() => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => {
      lockRef.current = false;
      setIsLocked(false);
      releaseTimerRef.current = null;
    }, 0);
  }, []);

  const endActionAfterPaint = useCallback(() => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      endAction();
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(endAction);
    });
  }, [endAction]);

  return { isLocked, beginAction, endAction, endActionAfterPaint };
}
