"use client";

import { useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import { beginActionPerformance } from "@/utils/actionPerformance";
import { traceTutorialJourney } from "@/utils/tutorialJourneyTrace";

export function usePatrol(
  session: any,
  vitality: number,
  setVitality: React.Dispatch<React.SetStateAction<number>>,
  getUserCharactersDbList: () => any[],
  currentBaseId: string,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setUserLevel: React.Dispatch<React.SetStateAction<number>>,
  setUserXp: React.Dispatch<React.SetStateAction<number>>,
  addGuildXpAndContributionByAction: (actionType: string, sourceId?: string) => Promise<void>,
  setTutorialStep: (step: string) => void,
  invalidatePatrolBootstrap: () => void
) {
  const [selectedCourse, setSelectedCourse] = useState<string>("e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPatrolMember, setSelectedPatrolMember] = useState<string | null>(null);
  const [dailyCashSkips, setDailyCashSkips] = useState<number>(0);
  const [dailyPaidSkips, setDailyPaidSkips] = useState<number>(0);
  const [dailyCashSkipsResetDate, setDailyCashSkipsResetDate] = useState<string | null>(null);
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
  // Production Quest rows are server masters; do not render the retired local
  // stamina/reward fallback while bootstrap is still loading.
  const [patrolCourses, setPatrolCourses] = useState<any[]>([]);
  const [patrolNpcs, setPatrolNpcs] = useState<any[]>([]);
  const [hasActivePatrolBattle, setHasActivePatrolBattle] = useState<boolean>(false);
  const [lastPatrolRewards, setLastPatrolRewards] = useState<any | null>(null);
  const [showPatrolRewardModal, setShowPatrolRewardModal] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);
  const mutationInFlightRef = useRef(false);

  const beginMutation = () => {
    if (mutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setDispatchLoading(true);
    return true;
  };

  const endMutation = () => {
    mutationInFlightRef.current = false;
    setDispatchLoading(false);
  };

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

    if (!beginMutation()) return false;
    const selectedOwnedCharacterId = getUserCharactersDbList().find(
      (ownedCharacter) => ownedCharacter.character_id === selectedPatrolMember
    )?.id ?? null;
    const actionPerformance = beginActionPerformance("quest_start");
    playCyberSe("QUEST_START");
    try {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + course.duration_seconds * 1000);

      actionPerformance.mark("request_start");
      traceTutorialJourney("dispatch_request", {
        userId: session.user.id,
        tutorialStepBefore: "DISPATCH",
        questId: course.id,
        dispatchedCharacterId: selectedPatrolMember,
        dispatchedUserCharacterId: selectedOwnedCharacterId,
      });
      const res = await supabase.rpc("start_patrol", {
        p_course_id: course.id,
        p_character_id: selectedPatrolMember,
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      actionPerformance.mark("response");

      const remainingVitality = Number(res.data?.remaining_vitality);
      if (Number.isFinite(remainingVitality)) setVitality(remainingVitality);
      else setVitality(prev => prev - course.cost_vitality);

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

      invalidatePatrolBootstrap();
      setActivePatrols(prev => [...prev, newPatrol]);
      setSelectedPatrolMember(null);
      let nextTutorialStep = res.data?.tutorial_step;
      if (!nextTutorialStep) {
        const { data: advancedStep, error: advanceError } = await supabase.rpc("advance_tutorial_progress", {
          p_expected_step: "DISPATCH",
          p_next_step: "FREE_INSTANT"
        });
        if (!advanceError) nextTutorialStep = advancedStep;
      }
      if (nextTutorialStep === "FREE_INSTANT") setTutorialStep(nextTutorialStep);
      traceTutorialJourney("dispatch_committed", {
        userId: session.user.id,
        tutorialStepBefore: "DISPATCH",
        tutorialStepAfter: nextTutorialStep || null,
        nextExpectedTutorialStep: "FREE_INSTANT",
        questId: course.id,
        patrolId: res.data.patrol_id,
        patrolStatus: "ONGOING",
        dispatchedCharacterId: selectedPatrolMember,
        dispatchedUserCharacterId: selectedOwnedCharacterId,
        battleEligibility: Boolean(res.data.has_battle),
      });
      actionPerformance.mark("state_update");
      actionPerformance.markVisualReady();
    } catch (err: any) {
      traceTutorialJourney("dispatch_rejected", { reason: err?.message || String(err) });
      console.warn(err.message);
      setErrorMessage(`クエストを開始できませんでした。${err.message ? `（${err.message}）` : ""}`);
    } finally {
      endMutation();
    }
  };

  const handleInstantComplete = async (currency: "CASH" | "DIAMOND" | "FREE_TUTORIAL" | "FREE_PREOPEN", patrolId: string) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return false;
    if (!beginMutation()) return false;
    const dispatchedUserCharacterId = getUserCharactersDbList().find(
      (ownedCharacter) => ownedCharacter.character_id === targetPatrol.characterId
    )?.id ?? null;
    playCyberSe("QUEST_INSTANT");

    try {
      traceTutorialJourney("speed_up_request", {
        userId: session.user.id,
        tutorialStepBefore: currency === "FREE_TUTORIAL" ? "FREE_INSTANT" : null,
        questId: targetPatrol.courseId,
        patrolId,
        patrolStatus: targetPatrol.status,
        dispatchedCharacterId: targetPatrol.characterId,
        dispatchedUserCharacterId,
      });
      const { data, error } = await supabase.rpc("complete_patrol_instantly", {
            p_user_id: session.user.id,
            p_patrol_id: patrolId,
            p_use_currency: currency
          });

      if (error) {
        traceTutorialJourney("speed_up_rejected", {
          patrolId,
          reason: error.message || "unknown error",
        });
        const detail = String(error.message || "");
        const normalizedDetail = detail.toLowerCase();
        setErrorMessage(
          detail.includes("schema cache") || detail.includes("Could not find the function")
            ? "時短機能のサーバー設定が未反映です。運営へお問い合わせください。"
            : normalizedDetail.includes("daily cash instant completion limit reached")
              ? "本日のCASH時短は3回使用済みです。ダイヤ時短は引き続き利用できます。"
              : normalizedDetail.includes("cash insufficient")
                ? "CASHが不足しています。"
                : normalizedDetail.includes("diamond insufficient")
                  ? "ダイヤが不足しています。"
                  : detail
        );
        return false;
      }

      if (data && data.status === "success") {
        if (Number.isFinite(Number(data.free_skips_remaining))) setDailyCashSkips(5 - Number(data.free_skips_remaining));
        if (Number.isFinite(Number(data.paid_skips_remaining))) setDailyPaidSkips(10 - Number(data.paid_skips_remaining));
        let nextTutorialStep = data.tutorial_step;
        if (currency === "FREE_TUTORIAL") {
          if (!nextTutorialStep) {
            const { data: advancedStep, error: advanceError } = await supabase.rpc("advance_tutorial_progress", {
              p_expected_step: "FREE_INSTANT",
              p_next_step: "TUTORIAL_BATTLE"
            });
            if (!advanceError) nextTutorialStep = advancedStep;
          }
          if (nextTutorialStep === "TUTORIAL_BATTLE") setTutorialStep(nextTutorialStep);
        }
        invalidatePatrolBootstrap();
        setActivePatrols((current) => current.map((entry) => entry.id === patrolId
          ? { ...entry, status: "CLAIMABLE", secondsLeft: 0, expires_at: new Date().toISOString() }
          : entry));
        traceTutorialJourney("speed_up_committed", {
          userId: session.user.id,
          tutorialStepBefore: currency === "FREE_TUTORIAL" ? "FREE_INSTANT" : null,
          tutorialStepAfter: nextTutorialStep || null,
          nextExpectedTutorialStep: currency === "FREE_TUTORIAL" ? "TUTORIAL_BATTLE" : null,
          questId: targetPatrol.courseId,
          patrolId,
          patrolStatus: "CLAIMABLE",
          dispatchedCharacterId: targetPatrol.characterId,
          dispatchedUserCharacterId,
          speedUpRpcResult: data,
        });
        void syncBootstrapData(session.user.id).catch((bootstrapError) => {
          console.warn("Patrol bootstrap refresh failed:", bootstrapError);
        });
        return true;
      }
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      endMutation();
    }
    return false;
  };

  const handleClaimRewards = async (patrolId: string, options?: { isTutorialReward?: boolean }) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return false;

    if (!beginMutation()) return false;
    playCyberSe("gacha");
    try {
      const res = await supabase.rpc("claim_patrol_rewards", { p_patrol_id: patrolId });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      const awardedItems = Array.isArray(res.data?.items) ? res.data.items : [];
      const nextLevel = Number(res.data?.level);
      const nextXp = Number(res.data?.current_xp);
      const leveledUp = res.data?.leveled_up === true;

      // The reward RPC has already committed these values. Reflect them in the
      // HUD before opening the result modal instead of waiting for the much
      // broader bootstrap refresh to finish.
      if (Number.isFinite(nextLevel) && nextLevel >= 1) setUserLevel(nextLevel);
      if (Number.isFinite(nextXp) && nextXp >= 0) setUserXp(nextXp);

      const rewardSummary = {
        patrolId,
        isTutorialReward: options?.isTutorialReward === true,
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
        hasBattle: Boolean(targetPatrol.has_battle_event),
        battleVictory: targetPatrol.battle_result === "VICTORY",
        battleCashBonus: 0,
        battleXpBonus: 0,
        battleRewardItemName: "",
        battleRewardItemQty: 0,
        totalCash: Number(res.data?.cash || 0),
        totalXp: Number(res.data?.xp || 0),
        levelUpMessage: leveledUp ? `\n★プレイヤーレベルが Lv.${nextLevel} にアップしました！` : ""
      };

      setLastPatrolRewards(rewardSummary);
      setShowPatrolRewardModal(true);
      void Promise.allSettled([
        syncBootstrapData(session.user.id),
        addGuildXpAndContributionByAction("QUEST", patrolId),
      ]).then((results) => {
        results.forEach((result) => {
          if (result.status === "rejected") console.warn("Patrol post-claim refresh failed:", result.reason);
        });
      });
      return true;
    } catch (err: any) {
      traceTutorialJourney("speed_up_exception", { patrolId, reason: err?.message || String(err) });
      console.warn(err.message);
      const detail = String(err?.message || "");
      setErrorMessage(
        detail.includes("schema cache") || detail.includes("Could not find the function")
          ? "報酬受取機能のサーバー設定が未反映です。運営へお問い合わせください。"
          : `報酬を獲得できませんでした。${detail ? `（${detail}）` : ""}`
      );
      return false;
    } finally {
      endMutation();
    }
  };

  return {
    selectedCourse, setSelectedCourse,
    selectedMembers, setSelectedMembers,
    selectedPatrolMember, setSelectedPatrolMember,
    dailyCashSkips, setDailyCashSkips, dailyPaidSkips, setDailyPaidSkips,
    dailyCashSkipsResetDate, setDailyCashSkipsResetDate,
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
