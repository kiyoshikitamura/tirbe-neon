"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useInventory(
  session: any,
  cash: number,
  setCash: React.Dispatch<React.SetStateAction<number>>,
  diamonds: number,
  setDiamonds: React.Dispatch<React.SetStateAction<number>>,
  vitality: number,
  setVitality: React.Dispatch<React.SetStateAction<number>>,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>
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
        alert("スタミナが100以上の場合はエナジードリンクを使用できません。");
        return;
      }
      
      const prevQuantity = energyDrinks;
      const prevVitality = vitality;
      const nextVitality = prevVitality + 50;
      
      setEnergyDrinks(prev => Math.max(0, prev - 1));
      setVitality(nextVitality);
      
      try {
        await supabase.from("user_items").update({ quantity: prevQuantity - 1 }).eq("user_id", session.user.id).eq("item_id", "ENERGY_DRINK");
        await supabase.from("users").update({ vitality: nextVitality }).eq("id", session.user.id);
        await syncBootstrapData(session.user.id);
        alert(`エナジードリンクを使用しました。スタミナが 50 回復しました！ (${prevVitality} => ${nextVitality})`);
      } catch (err: any) {
        setEnergyDrinks(prevQuantity);
        setVitality(prevVitality);
        alert("使用に失敗しました: " + err.message);
      }
    } else {
      alert("このアイテムは強化・限界突破画面で使用してください。");
    }
  };

  const handleClaimPresent = async (id: string) => {
    if (!session) return;
    setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    playCyberSe("click");

    try {
      if (id === "p_swr") {
        setDiamonds(d => d + 50);
        await supabase.from("users").update({ neon_diamonds: diamonds + 50 }).eq("id", session.user.id);
        setPresents(prev => prev.filter(p => p.id !== id));
        return;
      }

      const targetGift = presents.find(p => p.id === id);
      if (!targetGift) return;

      const nextCash = targetGift.itemId === "CASH" ? cash + targetGift.qty : cash;
      const nextDiamonds = targetGift.itemId === "DIAMOND" ? diamonds + targetGift.qty : diamonds;

      await supabase.from("presents").update({ status: "CLAIMED", claimed_at: new Date().toISOString() }).eq("id", Number(id));

      if (targetGift.itemId === "CASH" || targetGift.itemId === "DIAMOND") {
        await supabase.from("users").update({ cash: nextCash, neon_diamonds: nextDiamonds }).eq("id", session.user.id);
      } else if (targetGift.itemId.startsWith("WEAPON_") || targetGift.itemId.startsWith("HEAD_") || targetGift.itemId.startsWith("BODY_") || targetGift.itemId.startsWith("LEGS_") || targetGift.itemId.startsWith("ACCESSORY_")) {
        for (let i = 0; i < targetGift.qty; i++) {
          await supabase.from("user_equipments").insert({
            user_id: session.user.id,
            equipment_id: targetGift.itemId,
            level: 1,
            plus_val: 0,
            random_options: [
              { name: "クリティカル率", val: "+5%", unlocked: true },
              { name: "命中率", val: "+8%", unlocked: false },
              { name: "回避率", val: "+6%", unlocked: false },
              { name: "防御貫通力", val: "+12%", unlocked: false }
            ]
          });
        }
      } else {
        const { data: itemData } = await supabase
          .from("user_items")
          .select("quantity")
          .eq("user_id", session.user.id)
          .eq("item_id", targetGift.itemId)
          .maybeSingle();

        await supabase.from("user_items").upsert({
          user_id: session.user.id,
          item_id: targetGift.itemId,
          quantity: (itemData?.quantity || 0) + targetGift.qty
        });
      }

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
      let addCash = 0;
      let addDiamonds = 0;
      const itemGains: { [itemId: string]: number } = {};
      const equipmentGains: string[] = [];
      const idsToClaim: number[] = [];

      unclaimed.forEach(p => {
        if (p.id === "p_swr") addDiamonds += 50;
        else {
          idsToClaim.push(Number(p.id));
          if (p.itemId === "CASH") addCash += p.qty;
          else if (p.itemId === "DIAMOND") addDiamonds += p.qty;
          else if (p.itemId.startsWith("WEAPON_") || p.itemId.startsWith("HEAD_") || p.itemId.startsWith("BODY_") || p.itemId.startsWith("LEGS_") || p.itemId.startsWith("ACCESSORY_")) {
            for (let i = 0; i < p.qty; i++) {
              equipmentGains.push(p.itemId);
            }
          } else {
            itemGains[p.itemId] = (itemGains[p.itemId] || 0) + p.qty;
          }
        }
      });

      if (idsToClaim.length > 0) {
        await supabase.from("presents").update({ status: "CLAIMED", claimed_at: new Date().toISOString() }).in("id", idsToClaim);
      }

      if (addCash > 0 || addDiamonds > 0) {
        await supabase.from("users").update({ cash: cash + addCash, neon_diamonds: diamonds + addDiamonds }).eq("id", session.user.id);
      }

      for (const eqId of equipmentGains) {
        await supabase.from("user_equipments").insert({
          user_id: session.user.id,
          equipment_id: eqId,
          level: 1,
          plus_val: 0,
          random_options: [
            { name: "クリティカル率", val: "+5%", unlocked: true },
            { name: "命中率", val: "+8%", unlocked: false },
            { name: "回避率", val: "+6%", unlocked: false },
            { name: "防御貫通力", val: "+12%", unlocked: false }
          ]
        });
      }

      for (const [itemId, qty] of Object.entries(itemGains)) {
        const { data: itemData } = await supabase
          .from("user_items")
          .select("quantity")
          .eq("user_id", session.user.id)
          .eq("item_id", itemId)
          .maybeSingle();

        await supabase.from("user_items").upsert({
          user_id: session.user.id,
          item_id: itemId,
          quantity: (itemData?.quantity || 0) + qty
        });
      }

      setPresents(prev => prev.filter(p => p.status !== "UNCLAIMED"));
      await syncBootstrapData(session.user.id);
      alert("プレゼント一括受取完了。");
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

      await supabase.from("user_missions").update({ status: "CLAIMED", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).eq("mission_id", id);

      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await supabase.from("presents").insert({ user_id: session.user.id, item_id: targetMission.rewardItemId, quantity: targetMission.rewardQty, message: `ミッション報酬: ${targetMission.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" });

      let nextStepId: string | null = null;
      if (id === "m_pvp_01") nextStepId = "m_pvp_02";
      else if (id === "m_exp_01") nextStepId = "m_exp_02";
      else if (id === "m_lvl_01") nextStepId = "m_lvl_02";

      if (nextStepId) {
        await supabase.from("user_missions").upsert({ user_id: session.user.id, mission_id: nextStepId, current_progress: 0, status: "PROGRESS" }, { onConflict: "user_id,mission_id" });
      }

      setMissions(prev => prev.filter(m => m.id !== id));
      await syncBootstrapData(session.user.id);
      alert("報酬がプレゼントへ転送されました。");
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
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const insertPresents: any[] = [];
      const missionIds: string[] = [];
      const nextStepInserts: any[] = [];

      clearMissions.forEach(m => {
        missionIds.push(m.id);
        insertPresents.push({ user_id: session.user.id, item_id: m.rewardItemId, quantity: m.rewardQty, message: `ミッション報酬: ${m.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" });

        let nextId: string | null = null;
        if (m.id === "m_pvp_01") nextId = "m_pvp_02";
        else if (m.id === "m_exp_01") nextId = "m_exp_02";
        else if (m.id === "m_lvl_01") nextId = "m_lvl_02";

        if (nextId) {
          nextStepInserts.push({ user_id: session.user.id, mission_id: nextId, current_progress: 0, status: "PROGRESS" });
        }
      });

      await supabase.from("user_missions").update({ status: "CLAIMED", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).in("mission_id", missionIds);
      await supabase.from("presents").insert(insertPresents);

      if (nextStepInserts.length > 0) {
        await supabase.from("user_missions").upsert(nextStepInserts, { onConflict: "user_id,mission_id" });
      }

      setMissions(prev => prev.filter(m => !(m.status === "CLEAR" && m.category === missionTab)));
      await syncBootstrapData(session.user.id);
      alert("全クリア報酬をプレゼントへ転送しました。");
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
      await supabase.from("user_missions").update({ current_progress: 0, status: "PROGRESS", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).in("mission_id", dailyIds);
      await syncBootstrapData(session.user.id);
      alert("AM 4:00 デイリーミッションリセット完了。");
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
