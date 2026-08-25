"use client";

import { useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import CharacterPresentation from "./character/CharacterPresentation";
import TypewriterText from "./tutorial/TypewriterText";
import "./TutorialWorldIntro.css";

export default function TutorialWorldIntro() {
  const { onboardingState, setOnboardingState, navigateTab, playCyberSe, username, setupUsername } = useGame();
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
    <div className="tutorial-world" role="dialog" aria-modal="true" aria-label="アゲハからの案内">
      <div className="tutorial-world-content">
        <div className="tutorial-world-shade" />
        <div className="tutorial-world-ageha" aria-hidden="true"><CharacterPresentation src="/characters/ageha_transparent_asset.png" alt="" variant="dialogue-bust" /></div>
        <div className="tutorial-world-dialogue"><strong>アゲハ</strong><TypewriterText text={`${username || setupUsername}ね。覚えた。よろしく。\n\nじゃあまず、一緒に動く仲間を探そっか。\nこの街、一人でどうにかするのは大変だから。`} speedMs={34} /></div>
        <button className="semantic-cta semantic-cta--primary" onClick={() => void continueTutorial()} disabled={advancing} aria-busy={advancing}>
          次へ
        </button>
      </div>
    </div>
  );
}
