"use client";

import { useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";
import "./TutorialWorldIntro.css";

export default function TutorialWorldIntro() {
  const { onboardingState, setOnboardingState, navigateTab, playCyberSe } = useGame();
  const [advancing, setAdvancing] = useState(false);
  const advancingRef = useRef(false);
  if (onboardingState?.tutorial_step !== "WORLD_INTRO") return null;

  const continueTutorial = async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setAdvancing(true);
    playCyberSe("click");
    const { error } = await supabase.rpc("advance_tutorial_progress", {
      p_expected_step: "WORLD_INTRO", p_next_step: "FREE_GACHA",
    });
    if (!error) {
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "FREE_GACHA" } : current);
      navigateTab("gacha");
    }
    advancingRef.current = false;
    setAdvancing(false);
  };

  return (
    <div className="tutorial-world" role="dialog" aria-modal="true" aria-label="TRIBE NEONへようこそ">
      <div className="tutorial-world-shade" />
      <div className="tutorial-world-content">
        <span className="tutorial-world-kicker">WELCOME TO NEON TOKYO</span>
        <h1>この街で、<br />あなたの物語が始まる。</h1>
        <TutorialNavigator message="ようこそ。アタシはアゲハ。この街で生き抜くために、まずは新しい仲間を迎えよう。" />
        <button className="semantic-cta semantic-cta--primary" onClick={() => void continueTutorial()} disabled={advancing} aria-busy={advancing}>
          {advancing ? "ガチャへ移動中..." : "無料10連ガチャへ"}
        </button>
      </div>
    </div>
  );
}
