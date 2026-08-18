import React from "react";
import "./GlobalInteractionBlocker.css";

interface GlobalInteractionBlockerProps {
  isBlocking: boolean;
}

export default function GlobalInteractionBlocker({ isBlocking }: GlobalInteractionBlockerProps) {
  if (!isBlocking) return null;

  return <div className="outlaw-interaction-blocker" aria-hidden="true" />;
}
