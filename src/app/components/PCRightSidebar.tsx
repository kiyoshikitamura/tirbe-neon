"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER, getCharacterStaticImg } from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import "./PCRightSidebar.css";

export default function PCRightSidebar() {
  const {
    userCharactersDbList,
    userEquipmentsList,
    playCyberSe
  } = useGame();

  // お気に入りトグル状態
  const [favorites, setFavorites] = React.useState<Record<string, boolean>>({});

  // アンロック済みキャラクターをマスターデータから紐付け
  let unlockedMembers: any[] = [];
  try {
    if (Array.isArray(userCharactersDbList)) {
      unlockedMembers = CHARACTERS_MASTER.map(master => {
        const dbRecord = userCharactersDbList.find((uc: any) => uc?.character_id === master.id);
        if (!dbRecord) return null;

        let stats = { atk: 100, def: 100, hp: 1000 };
        try {
          if (typeof getCharacterTotalStats === "function") {
            stats = getCharacterTotalStats(dbRecord, userEquipmentsList);
          }
        } catch (err) {
          console.error("Stats calc error:", err);
        }

        return {
          ...master,
          level: dbRecord.level || 1,
          plusVal: dbRecord.plus_val || 0,
          stats
        };
      }).filter(Boolean);
    }
  } catch (err) {
    console.error("Error parsing userCharactersDbList:", err);
  }

  // DB データがない場合のモックフォールバック
  const MOCK_MEMBERS = [
    { id: "c_reiji", jpName: "レイジ", level: 45, plusVal: 2, stats: { atk: 1350, def: 990, hp: 1300 }, name: "reiji", img: "/reiji_final_asset.png" },
    { id: "c_rui", jpName: "ルイ", level: 45, plusVal: 2, stats: { atk: 2200, def: 850, hp: 2200 }, name: "rui", img: "/rui_final_asset.png" },
    { id: "c_chang", jpName: "チャン", level: 45, plusVal: 2, stats: { atk: 990, def: 970, hp: 1000 }, name: "chang", img: "/chang_final_asset.png" },
    { id: "c_kengo", jpName: "ケンゴ", level: 45, plusVal: 2, stats: { atk: 1190, def: 435, hp: 1900 }, name: "kengo", img: "/kengo_final_asset.png" },
    { id: "c_shin", jpName: "シン", level: 45, plusVal: 2, stats: { atk: 800, def: 970, hp: 1000 }, name: "shin", img: "/shin_final_asset.png" }
  ];

  const displayMembers = unlockedMembers.length > 0 ? unlockedMembers : MOCK_MEMBERS;

  const toggleFavorite = (charId: string) => {
    setFavorites(prev => ({ ...prev, [charId]: !prev[charId] }));
    if (typeof playCyberSe === "function") playCyberSe("click");
  };

  return (
    <div className="pc-right-container">
      <div className="pc-right-header">
        <span className="pc-right-title">キャラクター</span>
        <span className="pc-right-count">{displayMembers.length} / 45</span>
      </div>

      <div className="pc-right-list scroll-container">
        {displayMembers.map((member: any) => {
          const isFav = !!favorites[member.id];
          return (
            <div key={member.id} className="pc-char-card">
              <div className="pc-char-avatar-col">
                <div className="pc-char-avatar-frame">
                  <img
                    src={getCharacterStaticImg(member.name || "")}
                    alt={member.jpName}
                    className="pc-char-avatar-img"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_final_asset.png"; }}
                  />
                </div>
              </div>

              <div className="pc-char-info-col">
                <div className="pc-char-name-row">
                  <span className="pc-char-level">Lv.{member.level}(+{member.plusVal})</span>
                </div>
                <div className="pc-char-stats">
                  <div className="pc-char-stat-row">
                    <span className="pc-char-stat-label">ATK</span>
                    <span className="pc-char-stat-value">{member.stats?.atk || 0}</span>
                  </div>
                  <div className="pc-char-stat-row">
                    <span className="pc-char-stat-label">DEF</span>
                    <span className="pc-char-stat-value">{member.stats?.def || 0}</span>
                  </div>
                  <div className="pc-char-stat-row">
                    <span className="pc-char-stat-label">HP</span>
                    <span className="pc-char-stat-value">{member.stats?.hp || 0}</span>
                  </div>
                </div>
              </div>

              <div className="pc-char-fav-col">
                <button
                  onClick={() => toggleFavorite(member.id)}
                  className={`pc-char-fav-btn ${isFav ? "active" : ""}`}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
