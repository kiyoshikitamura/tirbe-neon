"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { VITALITY_OVERFLOW_MAX } from "@/utils/game_constants";

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
  const [lawsOfStrife, setLawsOfStrife] = useState<number>(0);
  const [skillLbBooks, setSkillLbBooks] = useState<number>(0);
  const [exclusiveContracts, setExclusiveContracts] = useState<number>(0);
  const [equipLbHammers, setEquipLbHammers] = useState<number>(0);

  // 互換エイリアス
  const healPotions = 0;
  const doctorSprays = 0;
  const pvpVipPasses = 0;
  const trainingManuals = charExpS + charExpM + charExpL;
  const polishingStones = equipExpS + equipExpM + equipExpL;

  // ミッション ＆ プレゼント
  const [missions, setMissions] = useState<any[]>([]);
  const [missionTab, setMissionTab] = useState<"DAILY" | "MAIN" | "GUILD">("DAILY");
  const [presents, setPresents] = useState<any[]>([]);
  const [presentsPrefetched, setPresentsPrefetched] = useState<boolean>(false);
  const [presentsSyncing, setPresentsSyncing] = useState<boolean>(false);
  const [presentClaimLoading, setPresentClaimLoading] = useState<boolean>(false);
  const [missionClaimLoading, setMissionClaimLoading] = useState<boolean>(false);

  const handleUseItem = async (itemId: string) => {
    if (!session) return;
    
    if (itemId === "ENERGY_DRINK") {
      if (vitality >= 100) {
        setConfirmDialogConfig({ isOpen: true, title: "使用不可", message: "スタミナが100以上の場合はエナジードリンクを使用できません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
        return;
      }
      
      const prevQuantity = energyDrinks;
      const prevVitality = vitality;
      const nextVitality = Math.min(prevVitality + 50, VITALITY_OVERFLOW_MAX);
      
      setEnergyDrinks(prev => Math.max(0, prev - 1));
      setVitality(nextVitality);
      
      try {
        const res = await supabase.rpc("use_energy_drink", { p_user_id: session.user.id });
        if (res.error) throw res.error;
        if (res.data?.error) throw new Error(res.data.error);

        await syncBootstrapData(session.user.id);
        setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: `エナジードリンクを使用しました。スタミナが 50 回復しました！ (${prevVitality} => ${nextVitality})`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } catch (err: any) {
        setEnergyDrinks(prevQuantity);
        setVitality(prevVitality);
        setConfirmDialogConfig({ isOpen: true, title: "使用失敗", message: "使用に失敗しました: " + err.message, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      }
    } else {
      setConfirmDialogConfig({ isOpen: true, title: "アイテム使用", message: "このアイテムは強化・限界突破画面で使用してください。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    }
  };

  const handleClaimPresent = async (id: string) => {
    if (!session) return;
    setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    playCyberSe("click");

    try {
      if (id === "p_swr") {
        setDiamonds(d => d + 50);
        const res = await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id });
        if (res.error || res.data?.error) console.warn(res.error || res.data?.error);
        setPresents(prev => prev.filter(p => p.id !== id));
        return;
      }

      const res = await supabase.rpc("claim_present", {
        p_user_id: session.user.id,
        p_present_id: id
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setPresents(prev => prev.filter(p => p.id !== id));
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
      setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
    }
  };

  const handleClaimAllPresents = async () => {
    if (!session) return;
    const unclaimed = presents.filter(p => p.status === "UNCLAIMED");
    if (unclaimed.length === 0) return;

    setPresentClaimLoading(true);
    setPresents(prev => prev.map(p => p.status === "UNCLAIMED" ? { ...p, loading: true } : p));
    playCyberSe("gacha");

    try {
      let hasSwr = false;
      unclaimed.forEach(p => {
        if (p.id === "p_swr") hasSwr = true;
      });

      if (hasSwr) {
        const resSwr = await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id });
        if (resSwr.error || resSwr.data?.error) console.warn(resSwr.error || resSwr.data?.error);
      }

      const res = await supabase.rpc("claim_all_presents", { p_user_id: session.user.id });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setPresents(prev => prev.filter(p => p.status !== "UNCLAIMED"));
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "受取完了", message: "プレゼント一括受取完了。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setPresentClaimLoading(false);
    }
  };

  const handleClaimMission = async (id: string) => {
    if (!session) return;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: true } : m));
    playCyberSe("click");

    try {
      const targetMission = missions.find(m => m.id === id);
      if (!targetMission) return;

      const res = await supabase.rpc("claim_mission_reward", {
        p_user_id: session.user.id,
        p_mission_id: id
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setMissions(prev => prev.filter(m => m.id !== id));
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "報酬獲得", message: "報酬がプレゼントへ転送されました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err) {
      console.warn(err);
      setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: false } : m));
    }
  };

  const handleClaimAllMissions = async () => {
    if (!session) return;
    const clearMissions = missions.filter(m => m.status === "CLEAR" && m.category === missionTab);
    if (clearMissions.length === 0) return;

    setMissionClaimLoading(true);
    setMissions(prev => prev.map(m => m.status === "CLEAR" && m.category === missionTab ? { ...m, loading: true } : m));
    playCyberSe("gacha");

    try {
      const missionIds = clearMissions.map(m => m.id);
      const res = await supabase.rpc("claim_all_mission_rewards", {
        p_user_id: session.user.id,
        p_mission_ids: missionIds
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      setMissions(prev => prev.filter(m => !(m.status === "CLEAR" && m.category === missionTab)));
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "クリア報酬", message: "全クリア報酬をプレゼントへ転送しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setMissionClaimLoading(false);
    }
  };

  const handleDailyMissionReset = async () => {
    if (!session) return;
    setMissionClaimLoading(true);
    playCyberSe("click");

    try {
      const unrecoveredDailies = missions.filter(m => m.status === "CLEAR" && m.category === "DAILY");
      if (unrecoveredDailies.length > 0) {
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const insertPresents = unrecoveredDailies.map(m => ({ user_id: session.user.id, item_id: m.rewardItemId, quantity: m.rewardQty, message: `ミッション自動救済: ${m.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" }));
        await supabase.from("presents").insert(insertPresents);
      }

      const dailyIds = ["m_exp_01", "m_exp_02", "m_pvp_01", "m_pvp_02", "m_gvg_01"];
      const res = await supabase.rpc("admin_reset_daily_missions", {
        p_user_id: session.user.id,
        p_mission_ids: dailyIds
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット", message: "AM 4:00 デイリーミッションリセット完了。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setMissionClaimLoading(false);
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
    lawsOfStrife, setLawsOfStrife,
    skillLbBooks, setSkillLbBooks,
    exclusiveContracts, setExclusiveContracts,
    equipLbHammers, setEquipLbHammers,
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
    handleClaimAllMissions,
    handleDailyMissionReset
  };
}
