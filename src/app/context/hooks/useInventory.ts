"use client";

import { useState } from "react";
import { supabase, usingMockSupabase } from "@/utils/supabase";
import { VITALITY_OVERFLOW_MAX } from "@/utils/game_constants";
import { canUseEnergyDrink } from "@/domain/gameplay/canonical/action_resources";
import { useImmediateActionLock } from "@/hooks/useImmediateActionLock";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import { canonicalMissionRewardName } from "@/domain/gameplay/canonical/missions";

export function useInventory(
  session: any,
  cash: number,
  setCash: React.Dispatch<React.SetStateAction<number>>,
  diamonds: number,
  setDiamonds: React.Dispatch<React.SetStateAction<number>>,
  vitality: number,
  setVitality: React.Dispatch<React.SetStateAction<number>>,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [userItems, setUserItems] = useState<any[]>([]);

  // 消耗品ステート
  const [energyDrinks, setEnergyDrinks] = useState<number>(0);
  const [charExpS, setCharExpS] = useState<number>(0);
  const [charExpM, setCharExpM] = useState<number>(0);
  const [charExpL, setCharExpL] = useState<number>(0);
  const [equipExpS, setEquipExpS] = useState<number>(0);
  const [equipExpM, setEquipExpM] = useState<number>(0);
  const [equipExpL, setEquipExpL] = useState<number>(0);
  const [awakeningBooks, setAwakeningBooks] = useState<number>(0);
  const [skillManuals, setSkillManuals] = useState<number>(0);
  const [equipLbParts, setEquipLbParts] = useState<number>(0);

  // 互換エイリアス
  const healPotions = 0;
  const doctorSprays = 0;
  const pvpVipPasses = 0;
  const trainingManuals = charExpS + charExpM + charExpL;
  const polishingStones = equipExpS + equipExpM + equipExpL;

  // ミッション ＆ プレゼント
  const [missions, setMissions] = useState<any[]>([]);
  const [missionTab, setMissionTab] = useState<"DAILY" | "NORMAL">("DAILY");
  const [presents, setPresents] = useState<any[]>([]);
  const [presentsPrefetched, setPresentsPrefetched] = useState<boolean>(false);
  const [presentsSyncing, setPresentsSyncing] = useState<boolean>(false);
  const {
    isLocked: presentClaimLoading,
    beginAction: beginPresentClaim,
    endAction: endPresentClaim
  } = useImmediateActionLock();
  const {
    isLocked: missionClaimLoading,
    beginAction: beginMissionClaim,
    endAction: endMissionClaim,
    endActionAfterPaint: endMissionClaimAfterPaint
  } = useImmediateActionLock();
  const {
    isLocked: itemUseLoading,
    beginAction: beginItemUse,
    endAction: endItemUse
  } = useImmediateActionLock();
  const setPresentClaimLoading = (loading: boolean) => {
    if (loading) beginPresentClaim();
    else endPresentClaim();
  };
  const setMissionClaimLoading = (loading: boolean) => {
    if (loading) beginMissionClaim();
    else endMissionClaim();
  };

  const showActionError = (title: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error || "");
    const message = /network|fetch|timeout/i.test(detail)
      ? "通信を確認して、もう一度お試しください。"
      : /already|claimed/i.test(detail)
        ? "すでに処理済みです。最新の状態へ更新します。"
        : "処理を完了できませんでした。時間をおいて再度お試しください。";
    setConfirmDialogConfig({ isOpen: true, title, message, confirmText: "閉じる", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
  };

  const handleUseItem = async (itemId: string) => {
    if (!session || !beginItemUse()) return;
    try {
    
    if (itemId === "ENERGY_DRINK") {
      if (!canUseEnergyDrink(vitality)) {
        setConfirmDialogConfig({ isOpen: true, title: "使用不可", message: "使用後のスタミナが上限500を超えるため使用できません。", confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
        return;
      }
      
      const prevQuantity = energyDrinks;
      const prevVitality = vitality;
      const nextVitality = Math.min(prevVitality + 50, VITALITY_OVERFLOW_MAX);
      
      setEnergyDrinks(prev => Math.max(0, prev - 1));
      setVitality(nextVitality);
      
      try {
        const res = await supabase.rpc("use_energy_drink");
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);

        await syncBootstrapData(session.user.id);
        setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: `エナジードリンクを使用しました。スタミナが50回復しました。（${prevVitality} → ${nextVitality}）`, confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } catch (err: any) {
        setEnergyDrinks(prevQuantity);
        setVitality(prevVitality);
        showActionError("アイテムを使用できませんでした", err);
      }
    } else if (itemId === "PVP_POINT_TICKET" || itemId === "RAID_POINT_TICKET") {
      try {
        const res = await supabase.rpc("use_action_resource_ticket", { p_item_id: itemId });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        await syncBootstrapData(session.user.id);
        const resourceName = itemId === "PVP_POINT_TICKET" ? "PvPポイント" : "レイドポイント";
        setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: `${resourceName}が1回復しました。`, confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } catch (err: any) {
        showActionError("アイテムを使用できませんでした", err);
      }
    } else {
      setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: "このアイテムは強化・限界突破画面で使用してください。", confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    }
    } finally {
      endItemUse();
    }
  };

  const handleClaimPresent = async (id: string) => {
    if (!session) return;
    if (!beginPresentClaim()) return;
    setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    playCyberSe("click");

    try {
      const targetPresent = presents.find(p => p.id === id);
      if (usingMockSupabase && id === "p_swr") {
        setDiamonds(d => d + 50);
        const res = await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id });
        if (res.error || res.data?.error) console.warn(res.error || res.data?.error);
        setPresents(prev => prev.filter(p => p.id !== id));
        return;
      }

      const res = await supabase.rpc("claim_present", {
        p_present_id: id
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setPresents(prev => prev.filter(p => p.id !== id));
      await syncBootstrapData(session.user.id);
      if (targetPresent) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "報酬獲得",
          message: "プレゼントを受け取りました。",
          kind: "reward",
          rewards: [{ id: targetPresent.itemId || targetPresent.item_id, name: canonicalItemName(String(targetPresent.itemId || targetPresent.item_id || "")), quantity: Number(targetPresent.qty || targetPresent.quantity || 0) }],
          confirmText: "閉じる",
          cancelText: "",
          presentation: "canonical",
          onConfirm: () => setConfirmDialogConfig(null),
          onCancel: () => setConfirmDialogConfig(null),
        });
      }
    } catch (err: any) {
      console.warn(err.message);
      setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
      showActionError("受け取りに失敗しました", err);
    } finally {
      endPresentClaim();
    }
  };

  const handleClaimAllPresents = async () => {
    if (!session) return;
    const unclaimed = presents.filter(p => p.status === "UNCLAIMED");
    if (unclaimed.length === 0) return;

    if (!beginPresentClaim()) return;
    let receiptOwnsLock = false;
    setPresents(prev => prev.map(p => p.status === "UNCLAIMED" ? { ...p, loading: true } : p));
    playCyberSe("gacha");

    try {
      let hasSwr = false;
      unclaimed.forEach(p => {
        if (p.id === "p_swr") hasSwr = true;
      });

      if (usingMockSupabase && hasSwr) {
        const resSwr = await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id });
        if (resSwr.error || resSwr.data?.error) console.warn(resSwr.error || resSwr.data?.error);
      }

      const res = await supabase.rpc("claim_all_presents");
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setPresents(prev => prev.filter(p => p.status !== "UNCLAIMED"));
      await syncBootstrapData(session.user.id);
      const rewardByItem = new Map<string, number>();
      unclaimed.forEach((present) => {
        const itemId = String(present.itemId || present.item_id || "");
        rewardByItem.set(itemId, (rewardByItem.get(itemId) || 0) + Number(present.qty || present.quantity || 0));
      });
      const closeReceipt = () => {
        setConfirmDialogConfig(null);
        endPresentClaim();
      };
      receiptOwnsLock = true;
      setConfirmDialogConfig({ isOpen: true, title: "報酬獲得", message: "プレゼントを一括で受け取りました。", kind: "reward", rewards: Array.from(rewardByItem, ([id, quantity]) => ({ id, name: canonicalItemName(id), quantity })), confirmText: "閉じる", cancelText: "", presentation: "canonical", onConfirm: closeReceipt, onCancel: closeReceipt });
    } catch (err: any) {
      console.warn(err.message);
      setPresents(prev => prev.map(p => ({ ...p, loading: false })));
      showActionError("一括受け取りに失敗しました", err);
    } finally {
      if (!receiptOwnsLock) endPresentClaim();
    }
  };

  const handleClaimMission = async (id: string) => {
    if (!session) return;
    if (!beginMissionClaim()) return;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: true } : m));
    playCyberSe("click");

    try {
      const targetMission = missions.find(m => m.id === id);
      if (!targetMission) return;

      const res = await supabase.rpc("claim_mission_reward", {
        p_mission_id: id
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setMissions(prev => prev.filter(m => m.id !== id));
      playCyberSe("MISSION_REWARD");
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "報酬獲得", message: "報酬はプレゼントへ送られました。", kind: "reward", delivery: "PRESENT", rewards: [{ id: targetMission.reward_item || targetMission.rewardItemId, name: canonicalMissionRewardName(String(targetMission.reward_item || targetMission.rewardItemId || "")), quantity: Number(targetMission.reward_amount || targetMission.rewardQty || 0) }], confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err) {
      console.warn(err);
      setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: false } : m));
      showActionError("報酬を受け取れませんでした", err);
    } finally {
      endMissionClaimAfterPaint();
    }
  };

  const handleClaimAllMissions = async () => {
    if (!session) return;
    const clearMissions = missions.filter(m => m.status === "CLEAR" && m.category === missionTab);
    if (clearMissions.length === 0) return;

    if (!beginMissionClaim()) return;
    setMissions(prev => prev.map(m => m.status === "CLEAR" && m.category === missionTab ? { ...m, loading: true } : m));
    playCyberSe("gacha");

    try {
      const missionIds = clearMissions.map(m => m.id);
      const res = await supabase.rpc("claim_all_mission_rewards", {
        p_mission_ids: missionIds
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setMissions(prev => prev.filter(m => !(m.status === "CLEAR" && m.category === missionTab)));
      playCyberSe("MISSION_REWARD");
      await syncBootstrapData(session.user.id);
      const rewardByItem = new Map<string, number>();
      clearMissions.forEach((mission) => {
        const itemId = String(mission.reward_item || mission.rewardItemId || "");
        rewardByItem.set(itemId, (rewardByItem.get(itemId) || 0) + Number(mission.reward_amount || mission.rewardQty || 0));
      });
      setConfirmDialogConfig({ isOpen: true, title: "クリア報酬", message: "すべての報酬はプレゼントへ送られました。", kind: "reward", delivery: "PRESENT", rewards: Array.from(rewardByItem, ([id, quantity]) => ({ id, name: canonicalMissionRewardName(id), quantity })), confirmText: "閉じる", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
      setMissions(prev => prev.map(m => ({ ...m, loading: false })));
      showActionError("一括受け取りに失敗しました", err);
    } finally {
      endMissionClaimAfterPaint();
    }
  };

  return {
    userItems, setUserItems,
    energyDrinks, setEnergyDrinks,
    charExpS, setCharExpS,
    charExpM, setCharExpM,
    charExpL, setCharExpL,
    equipExpS, setEquipExpS,
    equipExpM, setEquipExpM,
    equipExpL, setEquipExpL,
    awakeningBooks, setAwakeningBooks,
    skillManuals, setSkillManuals,
    equipLbParts, setEquipLbParts,
    healPotions,
    doctorSprays,
    pvpVipPasses,
    trainingManuals,
    polishingStones,
    missions, setMissions,
    missionTab, setMissionTab,
    presents, setPresents,
    presentsPrefetched, setPresentsPrefetched,
    presentsSyncing, setPresentsSyncing,
    presentClaimLoading, setPresentClaimLoading,
    itemUseLoading,
    missionClaimLoading, setMissionClaimLoading,
    handleUseItem,
    handleClaimPresent,
    handleClaimAllPresents,
    handleClaimMission,
    handleClaimAllMissions
  };
}
