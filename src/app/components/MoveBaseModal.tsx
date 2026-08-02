import React from "react";
import { useGame } from "../context/GameContext";
import "./MoveBaseModal.css";

export default function MoveBaseModal() {
  const { showMoveBaseModal, setShowMoveBaseModal, currentBaseId, handleMoveBase, playCyberSe } = useGame();

  if (!showMoveBaseModal) return null;

  const handleClose = () => {
    playCyberSe("click");
    setShowMoveBaseModal(false);
  };

  const bases = [
    { id: "shinjuku", name: "新宿", desc: "情報の集まる中心街" },
    { id: "shibuya", name: "渋谷", desc: "若者とギャングの街" },
    { id: "junk_bazaar", name: "ジャンクバザール", desc: "混沌の闇市" },
    { id: "ikebukuro", name: "池袋", desc: "ショバ代の巣窟" }, { id: "roppongi", name: "六本木", desc: "夜の街" }, { id: "akihabara", name: "秋葉原", desc: "闇市" }
  ];

  return (
    <div className="move-base-overlay" onClick={handleClose}>
      <div className="move-base-container active-scale-effect-none" onClick={e => e.stopPropagation()}>
        <div className="move-base-header">
          <h3>拠点移動</h3>
          <button className="move-base-close" onClick={handleClose}>✕</button>
        </div>
        <div className="move-base-body">
          <p className="move-base-desc">移動先の拠点を選択してください。</p>
          <div className="move-base-list">
            {bases.map(base => (
              <button
                key={base.id}
                className={`move-base-btn active-scale-effect ${currentBaseId === base.id ? "current" : ""}`}
                disabled={currentBaseId === base.id}
                onClick={() => {
                  playCyberSe("click");
                  handleMoveBase(base.id);
                  setShowMoveBaseModal(false);
                }}
              >
                <div className="move-base-btn-content">
                  <span className="move-base-name">{base.name}</span>
                  <span className="move-base-sub">{base.desc}</span>
                </div>
                {currentBaseId === base.id && <span className="move-base-current-badge">現在地</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
