import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import { canonicalMissionRewardName } from "@/domain/gameplay/canonical/missions";
import CanonicalItemIcon from "./ui/CanonicalItemIcon";
import { battleDisplayText } from "@/domain/presentation/battleTerminology";
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

  const statusOrder: Record<string, number> = { CLEAR: 0, IN_PROGRESS: 1, LOCKED: 2, CLAIMED: 3 };
  const currentMissions = (missions || []).filter((m: any) => m.category === missionTab)
    .sort((left: any, right: any) => (statusOrder[left.status] ?? 9) - (statusOrder[right.status] ?? 9) || Number(left.display_order || 0) - Number(right.display_order || 0));
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
    <FullScreenPanel title="ミッション" onClose={handleClose} closeDisabled={missionClaimLoading}>
      <fieldset className="mission-panel-container-inner mission-operation-surface" disabled={missionClaimLoading} aria-busy={missionClaimLoading}>
        <SubTabNav
          tabs={[
            { id: "DAILY", label: "デイリー", badge: clearCounts.DAILY },
            { id: "NORMAL", label: "ノーマル", badge: clearCounts.NORMAL }
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
            (missionTab === "NORMAL"
              ? [
                  ...currentMissions.filter((m: any) => m.status === "CLEAR"),
                  ...currentMissions.filter((m: any) => m.status === "IN_PROGRESS" && m.displayGroup === "PROGRESS").slice(0, 5),
                ]
              : currentMissions.filter((m: any) => m.status !== "CLAIMED")
            ).map((m: any) => {
              const targetValue = m.target_value || 1;
              const currentProgress = m.current_progress || 0;
              const progressPercent = Math.min(100, Math.floor((currentProgress / targetValue) * 100));
              const statusLabel = MISSION_STATUS_LABELS[m.status] || "進行中";

              return (
                <div key={m.id} className={`mission-item ${m.status}`}>
                  <div className="mission-info">
                    <div className="mission-heading">
                      <div className="mission-title">{battleDisplayText(m.title)}</div>
                      <span className="mission-status">{statusLabel}</span>
                    </div>
                    <div className="mission-desc">{battleDisplayText(m.description)}</div>
                    <div className="mission-reward">
                      <span>REWARD</span><CanonicalItemIcon itemId={m.reward_item} alt="" className="mission-reward-art" /><strong>{canonicalMissionRewardName(String(m.reward_item || ""))} × {Number(m.reward_amount || 0).toLocaleString()}</strong>
                      {Number(m.cashReward || 0) > 0 && <><CanonicalItemIcon itemId="CASH" alt="" className="mission-reward-art" /><strong>キャッシュ × {Number(m.cashReward).toLocaleString()}</strong></>}
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
        {missionTab === "NORMAL" && (["GROWTH", "BATTLE", "GUILD"] as const).map((group) => {
          const labels = { GROWTH: "育成", BATTLE: "バトル", GUILD: "ギルド" };
          const groupMissions = currentMissions.filter((mission: any) => mission.displayGroup === group && mission.status === "IN_PROGRESS");
          if (!groupMissions.length) return null;
          return <details key={group} className="mission-group">
            <summary>{labels[group]} <span>{groupMissions.length}件</span></summary>
            <div className="mission-group-list">
              {groupMissions.map((mission: any) => {
                const targetValue = Number(mission.target_value || 1);
                const currentProgress = Number(mission.current_progress || 0);
                const progressPercent = Math.min(100, Math.floor((currentProgress / targetValue) * 100));
                return <div key={mission.id} className="mission-group-current">
                  <div className="mission-group-heading">
                    <strong>{battleDisplayText(mission.title)}</strong>
                    <span>{currentProgress} / {targetValue}</span>
                  </div>
                  <p>{battleDisplayText(mission.description)}</p>
                  <div className="mission-group-reward">
                    <CanonicalItemIcon itemId={mission.reward_item} alt="" className="mission-reward-art" />
                    <span>{canonicalMissionRewardName(String(mission.reward_item || ""))} × {Number(mission.reward_amount || 0).toLocaleString()}</span>
                    {Number(mission.cashReward || 0) > 0 && <>
                      <CanonicalItemIcon itemId="CASH" alt="" className="mission-reward-art" />
                      <span>キャッシュ × {Number(mission.cashReward).toLocaleString()}</span>
                    </>}
                  </div>
                  <div className="mission-progress-bar-container">
                    <div className="mission-progress-bar" style={{ width: `${progressPercent}%` }}></div>
                    <span className="mission-progress-text">{currentProgress} / {targetValue}</span>
                  </div>
                </div>;
              })}
            </div>
          </details>;
        })}
      </fieldset>
    </FullScreenPanel>
  );
}
