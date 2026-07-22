"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { BASE_MAP_MASTER } from "@/utils/game_constants";
import "./MapTab.css";

export default function MapTab() {
  const {
    currentBaseId,
    selectedMapAreaId,
    setSelectedMapAreaId,
    handleMoveBase,
    movingAreaLoading,
    playCyberSe
  } = useGame();

  const selectedBaseInfo = BASE_MAP_MASTER.find(b => b.id === selectedMapAreaId);

  return (
    <div className="view-container relative flex-col scroll-container">
      <h2 className="view-title">東京支配マップ</h2>
      
      <div className="flex-1 relative map-base-container">
        <img 
          src="/tokyo_map.png" 
          alt="東京マップ" 
          className="map-bg-img"
        />

        {/* 拠点のピン配置 */}
        {BASE_MAP_MASTER.map(base => {
          const isCurrent = currentBaseId === base.id;
          const isSelected = selectedMapAreaId === base.id;
          
          return (
            <button 
              key={base.id}
              onClick={() => { setSelectedMapAreaId(base.id); playCyberSe("click"); }}
              className={`map-pin-btn active-scale-effect pin-${base.id} ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""}`}
            >
              <span className="map-pin-label">{base.name}</span>
            </button>
          );
        })}

        {/* エリア詳細オーバーレイ */}
        {selectedBaseInfo && (
          <div className="map-detail-card">
            <div className="flex-row-space-between align-center">
              <h3 className="font-size-10 font-weight-bold text-color-cyan">{selectedBaseInfo.name}</h3>
              <button className="sub-btn font-size-7 py-0.5 active-scale-effect" onClick={() => setSelectedMapAreaId(null)}>閉じる</button>
            </div>
            <p className="font-size-8 text-secondary mt-1">{selectedBaseInfo.description}</p>
            <div className="flex gap-2 mt-3">
              <button 
                className="action-btn claim flex-1 font-size-8 py-1.5 active-scale-effect flex-row-center-spinner justify-center"
                disabled={movingAreaLoading || currentBaseId === selectedBaseInfo.id}
                onClick={() => handleMoveBase(selectedBaseInfo.id)}
              >
                {movingAreaLoading ? <div className="spinner" /> : currentBaseId === selectedBaseInfo.id ? "滞在中" : "この拠点へ移動"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
