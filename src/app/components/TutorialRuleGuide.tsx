"use client";

import { useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

const slides = [
  { key: "WORLD", title: "街を進め", body: "クエストとバトルで街を巡り、報酬と新しい挑戦を解放しよう。" },
  { key: "POWER", title: "仲間を強くしろ", body: "ミッションのPOWERから、キャラクター・スキル・装備を強化できる。" },
  { key: "TRIBE", title: "仲間とつながれ", body: "TRIBEやフレンドで仲間を見つけ、レイドへ挑もう。" },
];

export default function TutorialRuleGuide() {
  const { onboardingState, setOnboardingState, playCyberSe, navigateTab } = useGame();
  const [index, setIndex] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workingRef = useRef(false);
  if (onboardingState?.tutorial_step !== "RULE_GUIDE") return null;
  const slide = slides[index];

  const next = async () => {
    if (workingRef.current) return;
    playCyberSe("click");
    if (index < slides.length - 1) { setIndex(value => value + 1); return; }
    workingRef.current = true; setWorking(true); setError(null);
    try {
      const { error: progressError } = await supabase.rpc("advance_tutorial_progress", { p_expected_step: "RULE_GUIDE", p_next_step: "COMPLETE" });
      if (progressError) { setError("進行を保存できませんでした。通信状態を確認して、もう一度お試しください。"); return; }
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "COMPLETE" } : current);
      navigateTab("home");
    } finally { workingRef.current = false; setWorking(false); }
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card tutorial-rule-slides" style={{ maxWidth: 440, overflow: "hidden" }}>
        <div className="tutorial-rule-progress">{slides.map((entry,i)=><i key={entry.key} className={i<=index?"active":""}/>)}</div>
        <span className="text-color-cyan font-weight-bold">{slide.key}</span>
        <h2 className="modal-title text-left">{slide.title}</h2>
        <TutorialNavigator message={slide.body} />
        <p className="modal-desc text-left">最初の目的はミッションハブにまとまっています。迷ったら、次の行動をここで確認できます。</p>
        {error && <div className="text-color-red font-size-7" role="alert">{error}</div>}
        <button className="semantic-cta semantic-cta--primary width-100" onClick={() => void next()} disabled={working} aria-busy={working}>
          {working ? "保存中..." : index < slides.length - 1 ? "次へ" : "ミッションハブへ"}
        </button>
      </div>
    </div>
  );
}
