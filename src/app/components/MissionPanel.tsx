import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import { canonicalMissionRewardName } from "@/domain/gameplay/canonical/missions";
import CanonicalItemIcon from "./ui/CanonicalItemIcon";
import "./MissionPanel.css";

const MISSION_STATUS_LABELS: Record<string, string> = {
  CLEAR: "受取可能",
  CLAIMED: "受取済",
  IN_PROGRESS: "進行中",
  LOCKED: "未達成",
};

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
    playCyberSe,
    navigateTab,
    setShowTribeChatPanel
  } = useGame();

  if (!showMissionPanel) return null;

  const handleClose = () => {
    setShowMissionPanel(false);
  };

  const currentMissions = (missions || []).filter((m: any) => m.category === missionTab);
  const clearMissionsCount = currentMissions.filter((m: any) => m.status === "CLEAR").length;
  const clearCounts = {
    DAILY: (missions || []).filter((m: any) => m.category === "DAILY" && m.status === "CLEAR").length,
    NORMAL: (missions || []).filter((m: any) => m.category === "NORMAL" && m.status === "CLEAR").length,
  };

  const handleMissionCta = (mission: any) => {
    playCyberSe("click");
    void import("../../utils/supabase").then(({ supabase }) => supabase.rpc("record_client_funnel_event", {
      p_event_name: "mission_cta_click",
      p_source_screen: "mission",
      p_source_cta: mission.id,
      p_object_id: null,
      p_metadata: { cta_tab: mission.ctaTab, cta_action: mission.ctaAction }
    }));
    setShowMissionPanel(false);
    if (mission.ctaAction === "guild_chat") setShowTribeChatPanel(true);
    else if (mission.ctaTab) navigateTab(mission.ctaTab);
  };

  return (
    <FullScreenPanel title="ミッション" onClose={handleClose}>
      <div className="mission-panel-container-inner">
        <SubTabNav
          tabs={[
            { id: "DAILY", label: "デイリー", badge: clearCounts.DAILY },
            { id: "NORMAL", label: "シーズン", badge: clearCounts.NORMAL }
          ]}
          activeTabId={missionTab}
          onSelect={(id) => setMissionTab(id as any)}
          className="mb-3"
        />

        <div className="mission-actions">
          <span className="mission-clear-count">受取可能 <strong>{clearMissionsCount}</strong>件</span>
          <OutlawButton
            variant="primary"
            disabled={clearMissionsCount === 0 || missionClaimLoading}
            isLoading={missionClaimLoading}
            loadingLabel="一括受取中…"
            onClick={handleClaimAllMissions}
          >
            一括受け取り
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
              const statusLabel = MISSION_STATUS_LABELS[m.status] || "進行中";

              return (
                <div key={m.id} className={`mission-item ${m.status}`}>
                  <div className="mission-info">
                    <div className="mission-heading">
                      <div className="mission-title">{m.title}</div>
                      <span className="mission-status">{statusLabel}</span>
                    </div>
                    <div className="mission-desc">{m.description}</div>
                    <div className="mission-reward">
                      <span>REWARD</span><CanonicalItemIcon itemId={m.reward_item} alt="" className="mission-reward-art" /><strong>{canonicalMissionRewardName(String(m.reward_item || ""))} × {Number(m.reward_amount || 0).toLocaleString()}</strong>
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
                        isLoading={Boolean(m.loading)}
                        loadingLabel="受取中…"
                        onClick={() => handleClaimMission(m.id)}
                      >
                        受け取る
                      </OutlawButton>
                    ) : m.status === "CLAIMED" ? (
                      <OutlawButton variant="secondary" disabled>受取済</OutlawButton>
                    ) : m.status === "LOCKED" ? (
                      <OutlawButton variant="secondary" disabled>未達成</OutlawButton>
                    ) : m.ctaTab || m.ctaAction ? (
                      <OutlawButton variant="primary" onClick={() => handleMissionCta(m)}>
                        {m.ctaLabel || "挑戦する"}
                      </OutlawButton>
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
