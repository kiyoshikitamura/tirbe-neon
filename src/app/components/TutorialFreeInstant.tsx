"use client";

import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

export default function TutorialFreeInstant() {
  const { session, activePatrols, handleInstantComplete, playCyberSe } = useGame();
  const [step, setStep] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

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

  const patrol = activePatrols.find((entry: any) => entry.status === "ONGOING");
  if (step !== "FREE_INSTANT" || !patrol) return null;

  const completeForFree = async () => {
    setWorking(true);
    playCyberSe("click");
    const completed = await handleInstantComplete("FREE_TUTORIAL", patrol.id);
    if (completed) setStep("TUTORIAL_BATTLE");
    setWorking(false);
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div className="font-size-8 text-color-cyan font-weight-bold mb-2">NAVIGATOR // INSTANT ACTION</div>
        <TutorialNavigator message="Use this free instant action to keep the operation moving." />
        <div className="modal-desc text-left">
          This tutorial dispatch can be completed instantly at no cost. Use the free instant action to trigger the encounter.
        </div>
        <button
          className="claim-reward-btn mt-4 font-weight-bold py-2 width-100"
          onClick={() => void completeForFree()}
          disabled={working}
        >
          {working ? "COMPLETING..." : "FREE COMPLETE"}
        </button>
      </div>
    </div>
  );
}
