import React from "react";
import { useGame } from "../context/GameContext";
import { CANONICAL_QUEST_TOWNS } from "@/domain/gameplay/canonical/quests";
import CanonicalDialog from "./ui/CanonicalDialog";
import "./MoveBaseModal.css";

export default function MoveBaseModal() {
  const { showMoveBaseModal, setShowMoveBaseModal, currentBaseId, handleMoveBase, movingAreaLoading, playCyberSe, isRaidActive, raidBossBaseId } = useGame();

  if (!showMoveBaseModal) return null;

  const handleClose = () => {
    playCyberSe("click");
    setShowMoveBaseModal(false);
  };

  const bases = [...CANONICAL_QUEST_TOWNS].sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <CanonicalDialog title="拠点移動" size="large" onClose={movingAreaLoading ? undefined : handleClose}>
        <div className="move-base-body">
          <p className="move-base-desc">移動先を選択してください。</p>
          <div className="move-base-list">
            {bases.map(base => (
              <button
                key={base.townId}
                className={`move-base-btn active-scale-effect ${currentBaseId === base.townId ? "current" : ""}`}
                disabled={movingAreaLoading || currentBaseId === base.townId}
                onClick={async () => {
                  playCyberSe("click");
                  const moved = await handleMoveBase(base.townId);
                  if (moved) setShowMoveBaseModal(false);
                }}
              >
                <span className="move-base-visual">
                  <img src={`/bg/bg_street_${base.townId}.png`} alt="" aria-hidden="true" />
                  {isRaidActive && raidBossBaseId === base.townId && <b className="move-base-raid-badge">強敵襲来</b>}
                </span>
                <div className="move-base-btn-content">
                  <span className="move-base-name">{base.name}</span>
                  <span className="move-base-sub">{movingAreaLoading ? "移動中…" : "この拠点へ移動"}</span>
                </div>
                {currentBaseId === base.townId && <span className="move-base-current-badge">現在地</span>}
              </button>
            ))}
          </div>
        </div>
    </CanonicalDialog>
  );
}
