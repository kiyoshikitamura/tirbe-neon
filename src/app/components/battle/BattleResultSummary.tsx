"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "@/audio/AudioProvider";

import OutlawButton from "../ui/OutlawButton";
import "./BattleResultSummary.css";

type Props = {
  victory: boolean;
  tutorial?: boolean;
  rewards?: any | null;
  onContinue: () => void | Promise<void>;
};

export default function BattleResultSummary({ victory, tutorial = false, rewards, onContinue }: Props) {
  const { playSe } = useAudio();
  const announcedRef = useRef(false);
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    playSe(victory ? "VICTORY" : "DEFEAT");
  }, [playSe, victory]);
  return (
    <section className={`battle-result-summary ${victory ? "is-victory" : "is-defeat"}`} aria-label={victory ? "バトル勝利" : "バトル敗北"}>
      <small>{tutorial ? "QUEST COMPLETE" : "BATTLE COMPLETE"}</small>
      <strong>{tutorial ? "クエスト結果" : "バトル結果"}</strong>
      <span>{tutorial ? rewards?.courseName || "新宿・初級" : victory ? "勝利" : "敗北"}</span>
      {tutorial && victory ? (
        rewards ? (
          <div className="battle-result-rewards" aria-label="獲得報酬">
            <span><small>CASH</small><b>+{Number(rewards.totalCash || 0).toLocaleString()}</b></span>
            <span><small>XP</small><b>+{Number(rewards.totalXp || 0).toLocaleString()}</b></span>
            {rewards.dropItemName && <span><small>ITEM</small><b>{rewards.dropItemName} ×{Number(rewards.dropItemQty || 0)}</b></span>}
          </div>
        ) : <div className="battle-result-settling" role="status"><span>報酬データを準備中</span><i aria-hidden="true" /></div>
      ) : (
        <p>{victory ? "バトルに勝利しました。" : "バトルに敗北しました。編成と強化を見直しましょう。"}</p>
      )}
      <OutlawButton variant={victory ? "primary" : "secondary"} onClick={onContinue} className="battle-result-continue" disabled={tutorial && victory && !rewards}>
        {tutorial && victory ? (rewards ? "次へ" : "報酬確定中…") : "次へ"}
      </OutlawButton>
    </section>
  );
}
