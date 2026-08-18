"use client";

import { useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import TutorialNavigator from "./TutorialNavigator";

export default function TutorialBattlePrompt() {
  const {
    onboardingState,
    activePatrols,
    patrolCourses,
    patrolNpcs,
    startCardBattle,
    playCyberSe,
    battleState,
    battleLoading,
    setErrorMessage
  } = useGame();
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const startingRef = useRef(false);

  const patrol = activePatrols.find((entry: any) => entry.has_battle_event && !entry.battle_resolved);
  if (battleState || onboardingState?.tutorial_step !== "TUTORIAL_BATTLE" || !patrol) return null;

  const beginBattle = async () => {
    if (startingRef.current || battleLoading) return;
    startingRef.current = true;
    setStarting(true);
    playCyberSe("click");
    const course = patrolCourses.find((entry: any) => entry.id === patrol.courseId);
    try {
      let npc = patrolNpcs.find((entry: any) => entry.quest_id === patrol.courseId);
      if (!npc) {
        const { data, error } = await supabase.rpc("get_patrol_battle_enemy", { p_patrol_id: patrol.id });
        if (!error && data) npc = data;
      }
      if (!npc) {
        const message = "派遣先の敵情報を取得できません。通信状態を確認して、もう一度お試しください。";
        setLocalError(message);
        setErrorMessage(message);
        return;
      }
      setLocalError(null);
      await startCardBattle(
        "PATROL",
        npc.npc_name || "チュートリアルの敵",
        npc.id || course?.battle_npc_id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        npc,
        patrol.id
      );
    } catch (error) {
      console.warn("Tutorial battle initialization failed:", error);
      setErrorMessage("チュートリアルバトルを開始できませんでした。もう一度お試しください。");
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-title text-left">初回バトル</div>
        <TutorialNavigator message="派遣先で敵と遭遇しました。編成した仲間でチュートリアルバトルを開始してください。" />
        <div className="modal-desc text-left">
          バトルは選択した作戦に従って自動進行します。勝利するまで、消費なしで再挑戦できます。
        </div>
        {localError && (
          <div className="font-size-7 text-color-red mt-3" role="alert">{localError}</div>
        )}
        <button
          className="semantic-cta semantic-cta--primary mt-4 width-100"
          aria-busy={starting || battleLoading}
          onClick={() => void beginBattle()}
          disabled={starting || battleLoading}
        >
          {starting || battleLoading ? "バトル準備中..." : "チュートリアルバトル開始"}
        </button>
      </div>
    </div>
  );
}
