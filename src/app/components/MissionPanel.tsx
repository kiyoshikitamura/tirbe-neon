import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
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
    setShowMissionPanel(false);
  };

  const currentMissions = (missions || []).filter((m: any) => m.category === missionTab);
  const clearMissionsCount = currentMissions.filter((m: any) => m.status === "CLEAR").length;

  return (
    <FullScreenPanel title="ミッション" onClose={handleClose}>
      <div className="mission-panel-container-inner">
        <SubTabNav
          tabs={[
            { id: "DAILY", label: "デイリー" },
            { id: "NORMAL", label: "ノーマル" }
          ]}
          activeTabId={missionTab}
          onSelect={(id) => setMissionTab(id as any)}
          className="mb-3"
        />

        <div className="mission-actions">
          <span className="mission-clear-count">達成済み: {clearMissionsCount}件</span>
          <OutlawButton
            variant="primary"
            disabled={clearMissionsCount === 0 || missionClaimLoading}
            onClick={() => { handleClaimAllMissions(); }}
          >
            {missionClaimLoading ? <div className="spinner" /> : "一括受け取り"}
          </OutlawButton>
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
                      <OutlawButton
                        variant="primary"
                        disabled={missionClaimLoading || m.loading}
                        onClick={() => { handleClaimMission(m.id); }}
                      >
                        {m.loading ? <div className="spinner" /> : "受取"}
                      </OutlawButton>
                    ) : m.status === "CLAIMED" ? (
                      <OutlawButton variant="secondary" disabled>受取済</OutlawButton>
                    ) : (
                      <OutlawButton variant="secondary" disabled>進行中</OutlawButton>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </FullScreenPanel>
  );
}
