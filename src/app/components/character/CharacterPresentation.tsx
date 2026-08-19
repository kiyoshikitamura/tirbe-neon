"use client";

import React from "react";
import "./CharacterPresentation.css";
import { getCharacterPresentationMetadata } from "./characterPresentationMetadata";

export type CharacterPresentationVariant = "portrait" | "dialogue" | "dialogue-bust" | "reveal" | "quest" | "battle-leader" | "card" | "thumbnail" | "full-body" | "battle" | "icon";

type Props = {
  src?: string;
  alt: string;
  variant: CharacterPresentationVariant;
  rarity?: string;
  name?: string;
  level?: number;
  selected?: boolean;
  badge?: string;
  className?: string;
};

export default function CharacterPresentation({
  src,
  alt,
  variant,
  rarity,
  name,
  level,
  selected = false,
  badge,
  className = "",
}: Props) {
  const rarityClass = rarity ? `character-presentation-rarity-${rarity.toLowerCase()}` : "";
  const framing = getCharacterPresentationMetadata(src || "");
  const presentationStyle = {
    "--character-focal-x": `${framing.focalX}%`,
    "--character-thumbnail-focal-y": `${framing.thumbnailFocalY}%`,
    "--character-portrait-focal-y": `${framing.portraitFocalY}%`,
    "--character-card-focal-y": `${framing.cardFocalY}%`,
  } as React.CSSProperties;
  return (
    <figure style={presentationStyle} className={`character-presentation character-presentation-${variant} ${rarityClass} ${selected ? "is-selected" : ""} ${className}`.trim()}>
      <div className="character-presentation-art">
        {src ? <img src={src} alt={alt} /> : <span className="character-presentation-missing" role="img" aria-label={`${alt}の画像は準備中`} />}
        <span className="character-presentation-light" aria-hidden="true" />
      </div>
      {badge && <span className="character-presentation-badge">{badge}</span>}
      {(name || rarity || typeof level === "number") && (
        <figcaption className="character-presentation-meta">
          {rarity && <span className="character-presentation-rarity">{rarity}</span>}
          {name && <strong>{name}</strong>}
          {typeof level === "number" && <span>Lv.{level}</span>}
        </figcaption>
      )}
    </figure>
  );
}
