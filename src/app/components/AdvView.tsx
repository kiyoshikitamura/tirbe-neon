"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { STORY_EPISODES_MASTER } from "@/utils/game_constants";
import "./AdvView.css";

export default function AdvView() {
  const {
    activeStorySession,
    handleStoryNext,
    storySending,
    handleFirstUserInteraction
  } = useGame();

  if (!activeStorySession || activeStorySession.status === "BATTLE") return null;

  const episode = STORY_EPISODES_MASTER[activeStorySession.stageId];
  if (!episode) return null;

  const currentList = activeStorySession.status === "INTRO_TALK" ? episode.intro : episode.outro;
  const currentNode = currentList[activeStorySession.currentNodeId];
  if (!currentNode) return null;

  return (
    <div className="adv-container" onClick={handleFirstUserInteraction}>
      <div className="adv-dialog-box border-magenta-glow background-black-90 shadow-magenta-20 relative">
        <div className="flex justify-between items-center pb-2 border-bottom-subtle mb-3 adv-header-layout">
          <span className="font-size-9 font-weight-bold text-color-magenta text-uppercase tracking-wider">
            暗号通信: {activeStorySession.status === "INTRO_TALK" ? "前哨交渉" : "制圧後処理"}
          </span>
          <span className="font-size-7 text-secondary">
            {activeStorySession.currentNodeId + 1} / {currentList.length}
          </span>
        </div>

        <div className="flex gap-4 items-start min-height-90 adv-body-layout">
          {currentNode.img && (
            <img 
              src={currentNode.img} 
              alt={currentNode.speaker}
              className="rounded-md border-subtle adv-speaker-img"
              onError={(e: any) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
            />
          )}
          
          <div className="flex-1 adv-content-layout">
            <h4 className="font-bold font-size-10 text-color-cyan mb-1">{currentNode.speaker}</h4>
            <p className="font-size-9 text-white line-height-15 whitespace-pre-wrap">{currentNode.text}</p>
          </div>
        </div>

        <button 
          onClick={handleStoryNext}
          disabled={storySending}
          className="claim-reward-btn mt-4 font-weight-bold py-2 width-100 active-scale-effect flex-row-center-spinner justify-center"
        >
          {storySending ? <div className="spinner" /> : "次へ"}
        </button>
      </div>
    </div>
  );
}
