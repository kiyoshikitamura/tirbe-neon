"use client";

import { useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

export default function TutorialWorldIntro() {
  const { onboardingState, setOnboardingState, navigateTab, playCyberSe } = useGame();
  const [advancing, setAdvancing] = useState(false);

  if (onboardingState?.tutorial_step !== "WORLD_INTRO") return null;

  const continueTutorial = async () => {
    setAdvancing(true);
    playCyberSe("click");
    const { error } = await supabase.rpc("advance_tutorial_progress", {
      p_expected_step: "WORLD_INTRO",
      p_next_step: "FREE_GACHA",
    });
    if (!error) {
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "FREE_GACHA" } : current);
      navigateTab("gacha");
    }
    setAdvancing(false);
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div className="font-size-8 text-color-cyan font-weight-bold mb-2">最初の案内</div>
        <TutorialNavigator message="準備はできたね。まずは新しい仲間をスカウトしよう。" />
        <div className="modal-desc text-left">
          ノーマルガチャの無料10連で、最初の仲間を迎えよう。
        </div>
        <button
          className="claim-reward-btn mt-4 font-weight-bold py-2 width-100"
          onClick={() => void continueTutorial()}
          disabled={advancing}
        >
          {advancing ? "準備中..." : "無料10連へ"}
        </button>
      </div>
    </div>
  );
}
