import React from "react";
import "./HeroPanel.css";

interface HeroPanelProps extends React.HTMLAttributes<HTMLElement> {
  backgroundImage?: string;
  overlay?: React.ReactNode;
}

export default function HeroPanel({ backgroundImage, overlay, className = "", children, style, ...props }: HeroPanelProps) {
  return (
    <section
      className={`ui-hero-panel ${className}`}
      style={{ ...style, ...(backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}) }}
      {...props}
    >
      <div className="ui-hero-panel-shade" aria-hidden="true" />
      <div className="ui-hero-panel-content">{children}</div>
      {overlay && <div className="ui-hero-panel-overlay">{overlay}</div>}
    </section>
  );
}
