"use client";

import { useCallback, useRef, useState } from "react";

export function useSecureMutation<TArgs extends unknown[], TResult>(mutation: (...args: TArgs) => Promise<TResult>) {
  const inFlightRef = useRef<Promise<TResult> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const execute = useCallback((...args: TArgs) => {
    if (inFlightRef.current) return inFlightRef.current;
    setIsProcessing(true);
    setError(null);
    const request = mutation(...args)
      .catch((reason) => {
        setError(reason);
        throw reason;
      })
      .finally(() => {
        inFlightRef.current = null;
        setIsProcessing(false);
      });
    inFlightRef.current = request;
    return request;
  }, [mutation]);

  return { execute, isProcessing, error };
}
