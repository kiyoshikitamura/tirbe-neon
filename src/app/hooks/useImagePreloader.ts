import { useEffect, useState } from "react";

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
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    const allPaths = Array.from(new Set([...PRELOAD_FRAME_PATHS, ...customPaths]));
    let loadedCount = 0;

    if (allPaths.length === 0) {
      setIsPreloaded(true);
      return;
    }

    allPaths.forEach((path) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= allPaths.length) {
          setIsPreloaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= allPaths.length) {
          setIsPreloaded(true);
        }
      };
    });
  }, [customPaths]);

  return isPreloaded;
}
