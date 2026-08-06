"use client";

import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

export default function TutorialWorldIntro() {
  const { session, navigateTab, playCyberSe } = useGame();
  const [step, setStep] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("tutorial_progress")
        .select("step_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setStep(data?.step_id ?? null);
    };
    void load();
  }, [session?.user?.id]);

  if (step !== "WORLD_INTRO") return null;

  const continueTutorial = async () => {
    setAdvancing(true);
    playCyberSe("click");
    const { error } = await supabase.rpc("advance_tutorial_progress", {
      p_expected_step: "WORLD_INTRO",
      p_next_step: "FREE_GACHA",
    });
    if (!error) {
      setStep("FREE_GACHA");
      navigateTab("gacha");
    }
    setAdvancing(false);
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div className="font-size-8 text-color-cyan font-weight-bold mb-2">NAVIGATOR // WORLD BRIEFING</div>
        <TutorialNavigator message="I will guide you through your first operation." />
        <div className="modal-desc text-left">
          Neon City is divided by rival factions. Build your crew, master skills and equipment, and take control of the streets.
          <br /><br />
          First, claim the daily free gacha and assemble your team.
        </div>
        <button
          className="claim-reward-btn mt-4 font-weight-bold py-2 width-100"
          onClick={() => void continueTutorial()}
          disabled={advancing}
        >
          {advancing ? "LOADING..." : "CONTINUE"}
        </button>
      </div>
    </div>
  );
}
