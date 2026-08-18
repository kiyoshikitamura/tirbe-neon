"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "@/audio/AudioProvider";

import OutlawButton from "../ui/OutlawButton";
import "./BattleResultSummary.css";

type Props = {
  victory: boolean;
  onContinue: () => void;
};

export default function BattleResultSummary({ victory, onContinue }: Props) {
  const { playSe } = useAudio();
  const announcedRef = useRef(false);
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    playSe(victory ? "VICTORY" : "DEFEAT");
  }, [playSe, victory]);
  return (
    <section className={`battle-result-summary ${victory ? "is-victory" : "is-defeat"}`} aria-label={victory ? "バトル勝利" : "バトル敗北"}>
      <small>BATTLE COMPLETE</small>
      <span>バトル結果</span>
      <strong>{victory ? "VICTORY" : "DEFEAT"}</strong>
      <p>{victory ? "バトルに勝利しました。クエスト結果を確認してください。" : "バトルに敗北しました。編成と強化を見直しましょう。"}</p>
      <OutlawButton variant={victory ? "primary" : "secondary"} onClick={onContinue} className="battle-result-continue">
        {victory ? "クエスト結果へ" : "結果を確認"}
      </OutlawButton>
    </section>
  );
}
