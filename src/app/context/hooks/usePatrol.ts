"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { DISPATCH_COURSES } from "@/utils/game_constants";

export function usePatrol(
  session: any,
  vitality: number,
  setVitality: React.Dispatch<React.SetStateAction<number>>,
  getUserCharactersDbList: () => any[],
  currentBaseId: string,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  addGuildXpAndContributionByAction: (actionType: string) => Promise<void>,
  postNpcYajiMessage: (channel: string, baseId: string, trigger: string) => void
) {
  const [selectedCourse, setSelectedCourse] = useState<string>("e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPatrolMember, setSelectedPatrolMember] = useState<string | null>(null);
  const [dailyCashSkips, setDailyCashSkips] = useState<number>(0);
  const [activePatrols, setActivePatrols] = useState<Array<{
    id: string;
    courseId: string;
    characterId: string;
    secondsTotal: number;
    secondsLeft: number;
    status: "ONGOING" | "CLAIMABLE" | "COMPLETED";
    has_battle_event?: boolean;
    battle_resolved?: boolean;
    battle_result?: "VICTORY" | "DEFEAT" | null;
    rewards_accrued?: any;
    started_at?: string;
    expires_at?: string;
  }>>([]);
  const [patrolLogs, setPatrolLogs] = useState<Array<{ time: string; text: string }>>([]);
  const mappedCourses = DISPATCH_COURSES.map(c => ({
    ...c,
    town_id: c.townId,
    duration_seconds: c.duration * 60,
    cost_vitality: c.stamina,
    battle_trigger_chance: c.chance,
    reward_cash: c.rewardCash,
    reward_xp: c.xpReward,
    reward_item_chance: c.chance,
    reward_item_id: c.rewardItem,
    battle_npc_id: "npc_thug_01"
  }));
  const [patrolCourses, setPatrolCourses] = useState<any[]>(mappedCourses);
  const [patrolNpcs, setPatrolNpcs] = useState<any[]>([]);
  const [hasActivePatrolBattle, setHasActivePatrolBattle] = useState<boolean>(false);
  const [lastPatrolRewards, setLastPatrolRewards] = useState<any | null>(null);
  const [showPatrolRewardModal, setShowPatrolRewardModal] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  const handleStartPatrol = async () => {
    if (!session || !selectedCourse) return;
    const course = patrolCourses.find(c => c.id === selectedCourse);
    if (!course) return;

    if (vitality < course.cost_vitality) {
      setErrorMessage("スタミナが不足しています。");
      return;
    }
    if (!selectedPatrolMember) {
      setErrorMessage("見回りさせるメンバーを選択してください。");
      return;
    }

    if (activePatrols.length >= 5) {
      setErrorMessage("出撃枠が上限（5枠）に達しています。");
      return;
    }

    if (activePatrols.some(p => p.characterId === selectedPatrolMember && p.status !== "COMPLETED")) {
      setErrorMessage("このキャラクターはすでに出撃中です。");
      return;
    }

    setDispatchLoading(true);
    playCyberSe("click");
    try {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + course.duration_seconds * 1000);

      const hasBattle = Math.random() <= (Number(course.battle_trigger_chance) || 0.2);

      const res = await supabase.rpc("start_patrol", {
        p_course_id: course.id,
        p_character_id: selectedPatrolMember,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setVitality(prev => prev - course.cost_vitality);

      const newPatrol = {
        id: res.data.patrol_id,
        courseId: course.id,
        characterId: selectedPatrolMember,
        secondsTotal: Number(res.data.duration_seconds ?? course.duration_seconds),
        secondsLeft: Number(res.data.duration_seconds ?? course.duration_seconds),
        status: "ONGOING" as const,
        has_battle_event: res.data.has_battle,
        battle_resolved: false,
        battle_result: null,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      };

      setActivePatrols(prev => [...prev, newPatrol]);
      setSelectedPatrolMember(null);
      await supabase.rpc("advance_tutorial_progress", {
        p_expected_step: "DISPATCH",
        p_next_step: "FREE_INSTANT"
      });
    } catch (err: any) {
      console.warn(err.message);
      setErrorMessage(`クエストを開始できませんでした。${err.message ? `（${err.message}）` : ""}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleInstantComplete = async (currency: "CASH" | "DIAMOND" | "FREE_TUTORIAL", patrolId: string) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return false;
    setDispatchLoading(true);
    playCyberSe("click");

    try {
      const { data, error } = await supabase.rpc("complete_patrol_instantly", {
        p_user_id: session.user.id,
        p_patrol_id: patrolId,
        p_use_currency: currency
      });

      if (error) {
        setErrorMessage(error.message);
        return false;
      }

      if (data && data.status === "success") {
        if (currency === "FREE_TUTORIAL") {
          await supabase.rpc("advance_tutorial_progress", {
            p_expected_step: "FREE_INSTANT",
            p_next_step: "TUTORIAL_BATTLE"
          });
        }
        await syncBootstrapData(session.user.id);
        return true;
      }
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setDispatchLoading(false);
    }
    return false;
  };

  const handleClaimRewards = async (patrolId: string) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return;

    setDispatchLoading(true);
    playCyberSe("gacha");
    try {
      const res = await supabase.rpc("claim_patrol_rewards", { p_patrol_id: patrolId });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      const awardedItems = Array.isArray(res.data?.items) ? res.data.items : [];
      const rewardSummary = {
        courseName: res.data?.course_name || "クエスト",
        baseCash: Number(res.data?.cash || 0),
        baseXp: Number(res.data?.xp || 0),
        levelBonusPercent: 0,
        levelBonusCash: 0,
        matchBonusApplied: false,
        matchBonusCash: 0,
        dropItemName: awardedItems[0]?.item_id || "",
        dropItemQty: Number(awardedItems[0]?.quantity || 0),
        gearDropped: false,
        hasBattle: false,
        battleVictory: false,
        battleCashBonus: 0,
        battleXpBonus: 0,
        battleRewardItemName: "",
        battleRewardItemQty: 0,
        totalCash: Number(res.data?.cash || 0),
        totalXp: Number(res.data?.xp || 0),
        levelUpMessage: res.data?.leveled_up ? `\n★プレイヤーレベルが Lv.${res.data.level} にアップしました！` : ""
      };

      setLastPatrolRewards(rewardSummary);
      setShowPatrolRewardModal(true);
      await syncBootstrapData(session.user.id);
      try {
        await addGuildXpAndContributionByAction("QUEST");
        postNpcYajiMessage("GLOBAL", currentBaseId, "PATROL_CLEAR");
      } catch (sideEffectError) {
        console.warn("Patrol side effect failed after reward claim:", sideEffectError);
      }
    } catch (err: any) {
      console.warn(err.message);
      setErrorMessage(`報酬を獲得できませんでした。${err.message ? `（${err.message}）` : ""}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  return {
    selectedCourse, setSelectedCourse,
    selectedMembers, setSelectedMembers,
    selectedPatrolMember, setSelectedPatrolMember,
    dailyCashSkips, setDailyCashSkips,
    activePatrols, setActivePatrols,
    patrolLogs, setPatrolLogs,
    patrolCourses, setPatrolCourses,
    patrolNpcs, setPatrolNpcs,
    hasActivePatrolBattle, setHasActivePatrolBattle,
    lastPatrolRewards, setLastPatrolRewards,
    showPatrolRewardModal, setShowPatrolRewardModal,
    dispatchLoading, setDispatchLoading,
    handleStartPatrol,
    handleInstantComplete,
    handleClaimRewards
  };
}
