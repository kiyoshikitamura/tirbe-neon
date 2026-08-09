"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { DISPATCH_COURSES, CHARACTERS_MASTER, CHARACTER_GROWTH_PATTERNS } from "@/utils/game_constants";

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
    const course = patrolCourses.find(c => c.id === targetPatrol.courseId);
    if (!course) return;

    setDispatchLoading(true);
    playCyberSe("gacha");
    try {
      const memberId = targetPatrol.characterId;
      const uChar = getUserCharactersDbList().find((uc: any) => uc.id === memberId);
      let charLevel = 1;
      let isHomeMatch = false;
      let baseLuk = 10;

      if (uChar) {
        charLevel = uChar.level || 1;
        const charMaster = CHARACTERS_MASTER.find((c: any) => c.id === uChar.character_id);
        if (charMaster) {
          if (charMaster.homeTown === course.town_id) {
            isHomeMatch = true;
            const pattern = CHARACTER_GROWTH_PATTERNS.find((p: any) => p.pattern_id === charMaster.growthPatternId) || CHARACTER_GROWTH_PATTERNS[0];
            baseLuk = pattern.base_luk;
          }
        }
      }

      const chanceBonus = isHomeMatch ? baseLuk * 0.001 : 0;
      const cashBonus = isHomeMatch ? baseLuk * 10 : 0;

      const lvlBonusMultiplier = 1.0 + (charLevel - 1) * 0.01;

      const finalCash = Math.floor((course.reward_cash + cashBonus) * lvlBonusMultiplier);
      const finalXp = Math.floor(course.reward_xp * lvlBonusMultiplier);

      let rewardItemId = "";
      let rewardQuantity = 0;

      const rand = Math.random();
      const finalChance = Number(course.reward_item_chance) + chanceBonus;
      if (course.reward_item_id && rand <= finalChance) {
        rewardItemId = course.reward_item_id;
        rewardQuantity = 1;
      }

      let gearDropped = false;
      const isHardPatrol = course.id.endsWith("_hard") || course.reward_cash >= 6000;
      if (isHardPatrol && Math.random() <= 0.3) {
        gearDropped = true;
      }

      let battleCashBonus = 0;
      let battleXpBonus = 0;
      let battleRewardItemId = "";
      let battleRewardItemQty = 0;
      const isBattleVictory = targetPatrol.battle_result === "VICTORY";

      if (targetPatrol.has_battle_event && isBattleVictory && course.battle_npc_id) {
        const npcMaster = patrolNpcs.find(n => n.id === course.battle_npc_id);
        if (npcMaster) {
          battleCashBonus = npcMaster.win_reward_cash_bonus || 0;
          battleXpBonus = npcMaster.win_reward_xp_bonus || 0;
          if (npcMaster.win_reward_item_id && npcMaster.win_reward_item_qty > 0) {
            battleRewardItemId = npcMaster.win_reward_item_id;
            battleRewardItemQty = npcMaster.win_reward_item_qty;
          }
        }
      }

      const totalCash = finalCash + battleCashBonus;
      const totalXp = finalXp + battleXpBonus;

      const res = await supabase.rpc("complete_patrol_v2", {
        p_user_id: session.user.id,
        p_patrol_id: patrolId,
        p_cash: totalCash,
        p_xp: totalXp,
        p_course_name: course.name,
        p_reward_item_id: rewardItemId || null,
        p_reward_qty: rewardQuantity || 0,
        p_gear_dropped: gearDropped,
        p_is_victory: isBattleVictory,
        p_battle_reward_item_id: battleRewardItemId || null,
        p_battle_reward_qty: battleRewardItemQty || 0
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      await supabase.rpc("evaluate_mission_progress", {
        p_user_id: session.user.id,
        p_trigger_type: "PATROL_CLEAR",
        p_progress_increment: 1
      });

      const { data: xpRes } = await supabase.rpc("add_user_xp", {
        p_user_id: session.user.id,
        p_xp_amount: totalXp
      });

      let levelUpMessage = "";
      if (xpRes && xpRes.leveled_up) {
        levelUpMessage = `\n★プレイヤーレベルが Lv.${xpRes.level} にアップしました！`;
      }

      await addGuildXpAndContributionByAction("QUEST");
      postNpcYajiMessage("GLOBAL", currentBaseId, "PATROL_CLEAR");
      await syncBootstrapData(session.user.id);

      const rewardSummary = {
        courseName: course.name,
        baseCash: finalCash,
        baseXp: finalXp,
        levelBonusPercent: Math.round((lvlBonusMultiplier - 1) * 100),
        levelBonusCash: Math.floor(finalCash - (course.reward_cash + cashBonus)),
        matchBonusApplied: isHomeMatch,
        matchBonusCash: cashBonus,
        dropItemName: rewardItemId ? (rewardItemId === 'TRAINING_MANUAL' ? '育成読本' : rewardItemId === 'POLISHING_STONE' ? '研磨石' : rewardItemId === 'LAW_OF_STRIFE' ? '闘争の掟' : rewardItemId) : '',
        dropItemQty: rewardQuantity,
        gearDropped,
        hasBattle: targetPatrol.has_battle_event,
        battleVictory: isBattleVictory,
        battleCashBonus,
        battleXpBonus,
        battleRewardItemName: battleRewardItemId ? (battleRewardItemId === 'TRAINING_MANUAL' ? '育成読本' : battleRewardItemId === 'POLISHING_STONE' ? '研磨石' : battleRewardItemId === 'LAW_OF_STRIFE' ? '闘争の掟' : battleRewardItemId) : '',
        battleRewardItemQty,
        totalCash,
        totalXp,
        levelUpMessage
      };

      setLastPatrolRewards(rewardSummary);
      setShowPatrolRewardModal(true);
    } catch (err: any) {
      console.warn(err.message);
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
