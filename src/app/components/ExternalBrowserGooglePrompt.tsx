"use client";

import { getExternalBrowserLaunchUrl } from "@/utils/browserDetection";

type ExternalBrowserGooglePromptProps = {
  url: string;
  onClose: () => void;
};

export default function ExternalBrowserGooglePrompt({ url, onClose }: ExternalBrowserGooglePromptProps) {
  const launchUrl = getExternalBrowserLaunchUrl(url);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="external-browser-google-title">
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div id="external-browser-google-title" className="modal-title text-color-cyan">
          外部ブラウザで開いてください
        </div>
        <div className="modal-desc text-left mb-3">
          Googleログインを続けるには、SafariまたはChromeでTRIBE NEONを開いてください。
          <br /><br />
          外部ブラウザで開いた後、もう一度Googleログインしてください。
        </div>
        <a
          className="semantic-cta semantic-cta--primary width-100"
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
        <button className="modal-close-btn mt-3 active-scale-effect" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
