import React from "react";
import "./GlobalInteractionBlocker.css";

interface GlobalInteractionBlockerProps {
  isBlocking: boolean;
  showSpinner?: boolean;
}

export default function GlobalInteractionBlocker({ isBlocking, showSpinner = false }: GlobalInteractionBlockerProps) {
  if (!isBlocking) return null;

  return (
    <div className="outlaw-interaction-blocker">
      {showSpinner && (
        <div className="blocker-spinner">
          <div className="spinner-ring" />
        </div>
      )}
    </div>
  );
}
