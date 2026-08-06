"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { STORY_EPISODES_MASTER } from "@/utils/game_constants";

export function useStory(
  session: any,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  startCardBattle: (mode: string, enemyName: string) => void,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [activeStorySession, setActiveStorySession] = useState<{
    stageId: string;
    currentNodeId: number;
    status: "INTRO_TALK" | "BATTLE" | "OUTRO_TALK" | "COMPLETED";
  } | null>(null);
  const [storySending, setStorySending] = useState<boolean>(false);

  const completeStorySession = async () => {
    if (!session || !activeStorySession) return;

    try {
      await supabase.from("story_sessions").update({ status: "COMPLETED" }).eq("user_id", session.user.id);

      const rewardText = "模擬戦クリア報酬";
      const bonusDiamonds = 150;
      const bonusCash = 5000;

      if (bonusDiamonds > 0 || bonusCash > 0) {
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await supabase.from("presents").insert([
          { user_id: session.user.id, item_id: "DIAMOND", quantity: bonusDiamonds, message: `${rewardText}: ダイヤ獲得`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" },
          { user_id: session.user.id, item_id: "CASH", quantity: bonusCash, message: `${rewardText}: キャッシュ獲得`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" }
        ]);
      }

      setActiveStorySession(null);
      await syncBootstrapData(session.user.id);

      setConfirmDialogConfig({ isOpen: true, title: "報酬獲得", message: "ストーリークリア報酬がプレゼントへ転送されました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err) {
      console.warn("Complete story session failed:", err);
    }
  };

  const handleStoryNext = async () => {
    if (!session || !activeStorySession) return;
    setStorySending(true);
    playCyberSe("click");

    const episode = STORY_EPISODES_MASTER[activeStorySession.stageId];
    if (!episode) {
      setStorySending(false);
      return;
    }

    const currentList = activeStorySession.status === "INTRO_TALK" ? episode.intro : episode.outro;
    const nextNodeId = activeStorySession.currentNodeId + 1;

    try {
      if (nextNodeId >= currentList.length) {
        if (activeStorySession.status === "INTRO_TALK") {
          if (activeStorySession.stageId === "stage_tutorial_01") {
            await supabase.from("story_sessions").update({ status: "BATTLE" }).eq("user_id", session.user.id);
            setActiveStorySession({ stageId: "stage_tutorial_01", currentNodeId: nextNodeId, status: "BATTLE" });
            setStorySending(false);
            startCardBattle("PVP", "新宿南部連合 (模擬戦)");
          } else {
            await completeStorySession();
          }
        } else {
          await completeStorySession();
        }
      } else {
        await supabase.from("story_sessions").upsert({
          user_id: session.user.id,
          stage_id: activeStorySession.stageId,
          current_node_id: nextNodeId,
          status: activeStorySession.status
        }, { onConflict: "user_id" });

        setActiveStorySession({
          stageId: activeStorySession.stageId,
          currentNodeId: nextNodeId,
          status: activeStorySession.status
        });
      }
    } catch (err) {
      console.warn("ADV save failed:", err);
    } finally {
      setStorySending(false);
    }
  };

  const triggerTutorialStory = async () => {
    if (!session) return;
    setStorySending(true);
    playCyberSe("click");
    try {
      await supabase.from("story_sessions").upsert({
        user_id: session.user.id,
        stage_id: "stage_tutorial_01",
        current_node_id: 0,
        status: "INTRO_TALK"
      }, { onConflict: "user_id" });

      setActiveStorySession({
        stageId: "stage_tutorial_01",
        currentNodeId: 0,
        status: "INTRO_TALK"
      });
    } catch (err: any) {
      console.warn("Trigger tutorial story failed:", err.message);
    } finally {
      setStorySending(false);
    }
  };

  return {
    activeStorySession, setActiveStorySession,
    storySending, setStorySending,
    handleStoryNext,
    completeStorySession,
    triggerTutorialStory
  };
}
