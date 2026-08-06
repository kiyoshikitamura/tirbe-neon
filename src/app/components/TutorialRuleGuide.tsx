"use client";

import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

const slides = [
  {
    image: "/bg/bg_street_shinjuku.png",
    title: "BUILD YOUR CREW",
    body: "Recruit characters, equip skills and equipment, then use Auto Formation to create a balanced team."
  },
  {
    image: "/gacha/bg_gacha_normal.png",
    title: "GROW STRONGER",
    body: "Rarity, levels and limit breaks increase your team power. Experiment with skills and equipment to shape each character."
  },
  {
    image: "/bg/bg_street_shibuya.png",
    title: "AUTO BATTLE",
    body: "Allies and enemies act automatically in SPD order. Choose a tactic before battle to change the party's priorities."
  },
  {
    image: "/bg/bg_street_yokohama.png",
    title: "KEEP MOVING",
    body: "Complete missions, take on quests, raids and guild battles, and strengthen your crew at your own pace."
  }
];

export default function TutorialRuleGuide() {
  const { session, playCyberSe } = useGame();
  const [step, setStep] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
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

  if (step !== "RULE_GUIDE") return null;
  const current = slides[slide];
  const isLast = slide === slides.length - 1;

  const next = async () => {
    playCyberSe("click");
    if (!isLast) {
      setSlide((value) => value + 1);
      return;
    }
    setWorking(true);
    const { error } = await supabase.rpc("advance_tutorial_progress", {
      p_expected_step: "RULE_GUIDE",
      p_next_step: "COMPLETE"
    });
    if (!error) setStep("COMPLETE");
    setWorking(false);
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 440, overflow: "hidden" }}>
        <img src={current.image} alt="Tutorial guide" style={{ width: "100%", height: 150, objectFit: "cover", opacity: 0.85 }} />
        <TutorialNavigator message="Remember these rules and build your crew your way." />
        <div className="font-size-8 text-color-cyan font-weight-bold mt-3 mb-2">{current.title}</div>
        <div className="modal-desc text-left">{current.body}</div>
        <div className="font-size-7 text-color-gray mt-3">{slide + 1} / {slides.length}</div>
        <button className="claim-reward-btn mt-3 font-weight-bold py-2 width-100" onClick={() => void next()} disabled={working}>
          {working ? "SAVING..." : isLast ? "COMPLETE TUTORIAL" : "NEXT"}
        </button>
      </div>
    </div>
  );
}
