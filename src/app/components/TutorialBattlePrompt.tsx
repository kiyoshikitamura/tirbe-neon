"use client";

import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

export default function TutorialBattlePrompt() {
  const { session, activePatrols, patrolCourses, patrolNpcs, startCardBattle, playCyberSe } = useGame();
  const [step, setStep] = useState<string | null>(null);

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

  const patrol = activePatrols.find((entry: any) => entry.has_battle_event && !entry.battle_resolved);
  if (step !== "TUTORIAL_BATTLE" || !patrol) return null;

  const beginBattle = () => {
    const course = patrolCourses.find((entry: any) => entry.id === patrol.courseId);
    const npc = patrolNpcs.find((entry: any) => entry.id === course?.battle_npc_id);
    playCyberSe("click");
    setStep(null);
    void startCardBattle("PATROL", npc?.npc_name || "Tutorial Encounter", course?.battle_npc_id);
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div className="font-size-8 text-color-cyan font-weight-bold mb-2">NAVIGATOR // ENCOUNTER</div>
        <TutorialNavigator message="Your crew will act automatically according to the selected tactic." />
        <div className="modal-desc text-left">
          An enemy has intercepted your dispatch. Start the battle and watch your configured tactic resolve the encounter automatically.
        </div>
        <button className="claim-reward-btn mt-4 font-weight-bold py-2 width-100" onClick={beginBattle}>
          START TUTORIAL BATTLE
        </button>
      </div>
    </div>
  );
}
