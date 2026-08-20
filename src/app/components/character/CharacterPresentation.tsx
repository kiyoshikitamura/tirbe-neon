"use client";

import React from "react";
import "./CharacterPresentation.css";
import { getCharacterPresentationMetadata } from "./characterPresentationMetadata";
import { getRarityBadgeAsset, getRarityFrameAsset, type RarityFrameKind } from "@/utils/rarityAssets";
import { getAttributeBadgeAsset, getAttributeLabel } from "@/utils/attributeAssets";

export type CharacterPresentationVariant = "portrait" | "dialogue" | "dialogue-bust" | "reveal" | "quest" | "battle-leader" | "card" | "gacha-result-compact" | "thumbnail" | "full-body" | "battle" | "icon";

type Props = {
  src?: string;
  alt: string;
  variant: CharacterPresentationVariant;
  rarity?: string;
  name?: string;
  level?: number;
  selected?: boolean;
  badge?: string;
  frameKind?: RarityFrameKind | false;
  rarityBadge?: boolean;
  attribute?: string;
  attributeBadge?: boolean;
  backgroundSrc?: string;
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
  frameKind,
  rarityBadge = false,
  attribute,
  attributeBadge = false,
  backgroundSrc,
  className = "",
}: Props) {
  const rarityClass = rarity ? `character-presentation-rarity-${rarity.toLowerCase()}` : "";
  const framing = getCharacterPresentationMetadata(src || "");
  const presentationStyle = {
    "--character-focal-x": `${framing.focalX}%`,
    "--character-thumbnail-focal-y": `${framing.thumbnailFocalY}%`,
    "--character-portrait-focal-y": `${framing.portraitFocalY}%`,
    "--character-card-focal-y": `${framing.cardFocalY}%`,
    "--character-thumbnail-scale": framing.thumbnailScale,
    "--character-thumbnail-x": `${framing.thumbnailX}%`,
    "--character-thumbnail-y": `${framing.thumbnailY}%`,
    "--character-card-scale": framing.cardScale,
    "--character-card-x": `${framing.cardX}%`,
    "--character-card-y": `${framing.cardY}%`,
    "--character-compact-scale": framing.compactScale,
    "--character-compact-x": `${framing.compactX}%`,
    "--character-compact-y": `${framing.compactY}%`,
    "--character-reveal-scale": framing.revealScale,
    "--character-reveal-x": `${framing.revealX}%`,
    "--character-reveal-y": `${framing.revealY}%`,
    "--character-battle-scale": framing.battleScale,
    "--character-battle-x": `${framing.battleX}%`,
    "--character-battle-y": `${framing.battleY}%`,
  } as React.CSSProperties;
  const frameClass = frameKind ? `has-rarity-frame is-frame-${frameKind}` : "";
  return (
    <figure style={presentationStyle} className={`character-presentation character-presentation-${variant} ${rarityClass} ${frameClass} ${selected ? "is-selected" : ""} ${className}`.trim()}>
      <div className="character-presentation-art">
        {backgroundSrc && <img className="character-presentation-background" src={backgroundSrc} alt="" aria-hidden="true" />}
        {src ? <img className="character-presentation-character" src={src} alt={alt} /> : <span className="character-presentation-missing" role="img" aria-label={`${alt}の画像は準備中`} />}
        <span className="character-presentation-light" aria-hidden="true" />
      </div>
      {rarity && frameKind !== false && frameKind && <img className={`character-presentation-frame is-${frameKind}`} src={getRarityFrameAsset(frameKind, rarity)} alt="" aria-hidden="true" />}
      {rarity && rarityBadge && <img className="character-presentation-rarity-badge" src={getRarityBadgeAsset(rarity)} alt={rarity} />}
      {attributeBadge && getAttributeBadgeAsset(attribute) && <img className="character-presentation-attribute-badge" src={getAttributeBadgeAsset(attribute) || ""} alt={getAttributeLabel(attribute)} />}
      {badge && <span className="character-presentation-badge">{badge}</span>}
      {(name || rarity || typeof level === "number") && (
        <figcaption className="character-presentation-meta">
          {rarity && !rarityBadge && <span className="character-presentation-rarity">{rarity}</span>}
          {name && <strong>{name}</strong>}
          {typeof level === "number" && <span>Lv.{level}</span>}
        </figcaption>
      )}
    </figure>
  );
}
