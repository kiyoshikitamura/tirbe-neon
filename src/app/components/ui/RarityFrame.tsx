import React from "react";
import "./RarityFrame.css";

export type Rarity = "N" | "R" | "SR" | "SSR";

interface RarityFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  rarity: Rarity;
  label?: boolean;
}

export default function RarityFrame({ rarity, label = false, className = "", children, ...props }: RarityFrameProps) {
  return (
    <div className={`rarity-frame rarity-frame-${rarity.toLowerCase()} ${className}`} {...props}>
      {label && <span className="rarity-frame-label">{rarity}</span>}
      {children}
    </div>
  );
}
