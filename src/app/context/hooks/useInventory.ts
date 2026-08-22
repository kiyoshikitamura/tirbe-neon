"use client";

import { useState } from "react";
import { supabase, usingMockSupabase } from "@/utils/supabase";
import { VITALITY_OVERFLOW_MAX } from "@/utils/game_constants";
import { canUseEnergyDrink } from "@/domain/gameplay/canonical/action_resources";
import { useImmediateActionLock } from "@/hooks/useImmediateActionLock";

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
    endAction: endMissionClaim
  } = useImmediateActionLock();
  const setPresentClaimLoading = (loading: boolean) => {
    if (loading) beginPresentClaim();
    else endPresentClaim();
  };
  const setMissionClaimLoading = (loading: boolean) => {
    if (loading) beginMissionClaim();
    else endMissionClaim();
  };

  const handleUseItem = async (itemId: string) => {
    if (!session) return;
    
    if (itemId === "ENERGY_DRINK") {
      if (!canUseEnergyDrink(vitality)) {
        setConfirmDialogConfig({ isOpen: true, title: "使用不可", message: "使用後のスタミナが上限500を超えるため使用できません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
        setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: `エナジードリンクを使用しました。スタミナが 50 回復しました！ (${prevVitality} => ${nextVitality})`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } catch (err: any) {
        setEnergyDrinks(prevQuantity);
        setVitality(prevVitality);
        setConfirmDialogConfig({ isOpen: true, title: "使用失敗", message: "使用に失敗しました: " + err.message, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      }
    } else if (itemId === "PVP_POINT_TICKET" || itemId === "RAID_POINT_TICKET") {
      try {
        const res = await supabase.rpc("use_action_resource_ticket", { p_item_id: itemId });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);
        await syncBootstrapData(session.user.id);
        const resourceName = itemId === "PVP_POINT_TICKET" ? "PvPポイント" : "レイドポイント";
        setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: `${resourceName}が1回復しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } catch (err: any) {
        setConfirmDialogConfig({ isOpen: true, title: "使用失敗", message: "使用に失敗しました: " + err.message, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      }
    } else {
      setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: "このアイテムは強化・限界突破画面で使用してください。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    }
  };

  const handleClaimPresent = async (id: string) => {
    if (!session) return;
    if (!beginPresentClaim()) return;
    setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    playCyberSe("click");

    try {
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
    } catch (err: any) {
      console.warn(err.message);
      setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
    } finally {
      endPresentClaim();
    }
  };

  const handleClaimAllPresents = async () => {
    if (!session) return;
    const unclaimed = presents.filter(p => p.status === "UNCLAIMED");
    if (unclaimed.length === 0) return;

    if (!beginPresentClaim()) return;
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
      setConfirmDialogConfig({ isOpen: true, title: "受取完了", message: "プレゼント一括受取完了。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      endPresentClaim();
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
      setConfirmDialogConfig({ isOpen: true, title: "報酬獲得", message: "報酬がプレゼントへ転送されました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err) {
      console.warn(err);
      setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: false } : m));
    } finally {
      endMissionClaim();
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
      setConfirmDialogConfig({ isOpen: true, title: "クリア報酬", message: "全クリア報酬をプレゼントへ転送しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      endMissionClaim();
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
    missionClaimLoading, setMissionClaimLoading,
    handleUseItem,
    handleClaimPresent,
    handleClaimAllPresents,
    handleClaimMission,
    handleClaimAllMissions
  };
}
