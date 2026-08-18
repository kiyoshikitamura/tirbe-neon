"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getExternalBrowserLaunchUrl,
  getGameUrlFromEntry,
  getMobilePlatform,
  isXInAppBrowser,
} from "@/utils/browserDetection";

const EXTERNAL_OPEN_ATTEMPT_KEY = "tribe_external_open_attempted";

export default function ExternalBrowserEntryPage() {
  const [ready, setReady] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState("/");
  const [inXBrowser, setInXBrowser] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const launchUrl = useMemo(() => getExternalBrowserLaunchUrl(destinationUrl), [destinationUrl]);

  useEffect(() => {
    const destination = getGameUrlFromEntry();
    const detectedX = isXInAppBrowser();
    const detectedPlatform = getMobilePlatform();
    setDestinationUrl(destination);
    setInXBrowser(detectedX);
    setPlatform(detectedPlatform);

    if (!detectedX) {
      window.location.replace(destination);
      return;
    }

    const attemptKey = `${EXTERNAL_OPEN_ATTEMPT_KEY}:${destination}`;
    const alreadyAttempted = window.sessionStorage.getItem(attemptKey) === "true";
    if (!alreadyAttempted) {
      window.sessionStorage.setItem(attemptKey, "true");
      if (detectedPlatform === "android") {
        window.location.href = getExternalBrowserLaunchUrl(destination);
      } else {
        window.open(destination, "_blank", "noopener,noreferrer");
      }
    }
    setReady(true);
  }, []);

  if (!ready && !inXBrowser) {
    return <main className="app-loading-screen"><div className="spinner" /></main>;
  }

  return (
    <main className="app-container">
      <div className="app-loading-screen">
        <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
          <div className="modal-title text-color-cyan">外部ブラウザでゲームを開始</div>
          <div className="modal-desc text-left mb-3">
            {platform === "android"
              ? "ChromeでTRIBE NEONを開いてください。"
              : "SafariまたはChromeでTRIBE NEONを開いてください。"}
          </div>
          <a
            className="claim-reward-btn font-weight-bold py-2 width-100"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            ブラウザで開く
          </a>
          <div className="modal-desc text-left mt-3">
            開かない場合は、X右上の「…」から「ブラウザで開く」を選択してください。
          </div>
          <a className="modal-close-btn mt-3" href={destinationUrl}>
            X内ブラウザで続ける
          </a>
        </div>
      </div>
    </main>
  );
}
