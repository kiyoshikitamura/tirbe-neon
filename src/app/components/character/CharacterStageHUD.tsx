"use client";

import React from "react";
import OutlawButton from "../ui/OutlawButton";

interface CharacterStageHUDProps {
  charName: string;
  charTitle: string;
  charLevel: number;
  awakeningLevel: number;
  alignLabel: string;
  alignColorClass: string;
  isLeader: boolean;
  onToggleLeader: () => void;
  onPrevChar: () => void;
  onNextChar: () => void;
  hasMultipleChars: boolean;
}

export function CharacterStageHUD({
  charName,
  charTitle,
  charLevel,
  awakeningLevel,
  alignLabel,
  alignColorClass,
  isLeader,
  onToggleLeader,
  onPrevChar,
  onNextChar,
  hasMultipleChars
}: CharacterStageHUDProps) {
  return (
    <div className="char-stage-hud-row">
      <div className="hud-char-info">
        <span className={`align-badge ${alignColorClass}`}>{alignLabel}</span>
        <div className="char-titles-wrap">
          <span className="char-title-text">{charTitle}</span>
          <span className="char-name-text">{charName}</span>
        </div>
        <span className="char-level-badge">Lv.{charLevel} {awakeningLevel > 0 && <span className="awaken-star">★{awakeningLevel}</span>}</span>
      </div>

      <div className="hud-actions-right">
        {hasMultipleChars && (
          <div className="carousel-nav-btns">
            <button className="carousel-arrow-btn" onClick={onPrevChar}>‹</button>
            <button className="carousel-arrow-btn" onClick={onNextChar}>›</button>
          </div>
        )}
        <OutlawButton
          variant={isLeader ? "neon" : "secondary"}
          onClick={onToggleLeader}
          className="leader-set-btn"
        >
          {isLeader ? "リーダー" : "リーダー設定"}
        </OutlawButton>
      </div>
    </div>
  );
}
