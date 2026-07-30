import React from "react";
import { useGame } from "../context/GameContext";
import "./MissionPanel.css";

export default function MissionPanel() {
  const {
    showMissionPanel,
    setShowMissionPanel,
    missionTab,
    setMissionTab,
    missions,
    handleClaimMission,
    handleClaimAllMissions,
    missionClaimLoading,
    playCyberSe
  } = useGame();

  if (!showMissionPanel) return null;

  const handleClose = () => {
    playCyberSe("click");
    setShowMissionPanel(false);
  };

  const currentMissions = (missions || []).filter((m: any) => m.category === missionTab);
  const clearMissionsCount = currentMissions.filter((m: any) => m.status === "CLEAR").length;

  return (
    <div className="mission-panel-overlay">
      <div className="mission-panel-container">
        {/* ヘッダー */}
        <div className="mission-panel-header">
          <button className="mission-back-btn active-scale-effect" onClick={handleClose}>
            ‹ 戻る
          </button>
          <div className="mission-tabs">
            <button
              className={`mission-tab-btn ${missionTab === "DAILY" ? "active" : ""}`}
              onClick={() => { setMissionTab("DAILY"); playCyberSe("click"); }}
            >
              デイリー
            </button>
            <button
              className={`mission-tab-btn ${missionTab === "NORMAL" ? "active" : ""}`}
              onClick={() => { setMissionTab("NORMAL"); playCyberSe("click"); }}
            >
              ノーマル
            </button>
          </div>
          <div className="mission-header-spacer"></div>
        </div>

        {/* コンテンツエリア */}
        <div className="mission-panel-body scroll-container">
          <div className="mission-actions">
            <span className="mission-clear-count">達成済み: {clearMissionsCount}件</span>
            <button
              className="mission-claim-all-btn active-scale-effect"
              disabled={clearMissionsCount === 0 || missionClaimLoading}
              onClick={() => { handleClaimAllMissions(); playCyberSe("click"); }}
            >
              {missionClaimLoading ? <div className="spinner" /> : "一括受け取り"}
            </button>
          </div>

          <div className="mission-list">
            {currentMissions.length === 0 ? (
              <div className="mission-empty">ミッションはありません</div>
            ) : (
              currentMissions.map((m: any) => {
                const targetValue = m.target_value || 1;
                const currentProgress = m.current_progress || 0;
                const progressPercent = Math.min(100, Math.floor((currentProgress / targetValue) * 100));

                return (
                  <div key={m.id} className={`mission-item ${m.status}`}>
                    <div className="mission-info">
                      <div className="mission-title">{m.title}</div>
                      <div className="mission-desc">{m.description}</div>
                      <div className="mission-reward">
                        報酬: {m.reward_item} x{m.reward_amount}
                      </div>
                      
                      <div className="mission-progress-bar-container">
                        <div className="mission-progress-bar" style={{ width: `${progressPercent}%` }}></div>
                        <span className="mission-progress-text">{currentProgress} / {targetValue}</span>
                      </div>
                    </div>
                    <div className="mission-action">
                      {m.status === "CLEAR" ? (
                        <button
                          className="mission-claim-btn active-scale-effect"
                          disabled={missionClaimLoading || m.loading}
                          onClick={() => { handleClaimMission(m.id); playCyberSe("click"); }}
                        >
                          {m.loading ? <div className="spinner" /> : "受取"}
                        </button>
                      ) : m.status === "CLAIMED" ? (
                        <button className="mission-claimed-btn" disabled>受取済</button>
                      ) : (
                        <button className="mission-progress-btn" disabled>進行中</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
