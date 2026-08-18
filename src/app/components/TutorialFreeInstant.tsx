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
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-title text-left">初回クエスト時短</div>
        <TutorialNavigator message="今回は無料で時短できるよ。すぐに派遣先へ向かおう。" />
        <div className="modal-desc text-left">
          チュートリアル中の今回だけ、CASHを消費せずにクエストを完了できます。
        </div>
        <button
          className="semantic-cta semantic-cta--primary mt-4 width-100"
          aria-busy={working}
          onClick={() => void completeForFree()}
          disabled={working}
        >
          {working ? "完了処理中..." : "無料で時短する"}
        </button>
      </div>
    </div>
  );
}
