"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { CHARACTER_AWAKENING_MASTER } from "@/utils/game_constants";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";

export function useCharacterProgression(
  session: any,
  cash: number,
  setCash: React.Dispatch<React.SetStateAction<number>>,
  charExpS: number,
  charExpM: number,
  charExpL: number,
  equipExpS: number,
  equipExpM: number,
  equipExpL: number,
  lawsOfStrife: number,
  equipLbHammers: number,
  skillLbBooks: number,
  exclusiveContracts: number,
  upgradeSelectedCharId: string,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [characterAwaken, setCharacterAwaken] = useState<number>(0);
  const [userCharactersDbList, setUserCharactersDbList] = useState<any[]>([]);

  const [userEquipmentsList, setUserEquipmentsList] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [equipmentLevel, setEquipmentLevel] = useState<number>(1);
  const [equipmentLimitBreak, setEquipmentLimitBreak] = useState<number>(0);
  const [subOptions, setSubOptions] = useState<any[]>([
    { name: "クリティカル率", val: "+5%", unlocked: true },
    { name: "命中率", val: "+8%", unlocked: false },
    { name: "回避率", val: "+6%", unlocked: false },
    { name: "防御貫通力", val: "+12%", unlocked: false }
  ]);

  const [userSkillsList, setUserSkillsList] = useState<any[]>([]);
  const [activeGearSlot, setActiveGearSlot] = useState<number | null>(null);
  const [showGearModal, setShowGearModal] = useState<boolean>(false);
  const [activeSkillSlot, setActiveSkillSlot] = useState<number | null>(null);
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);

  const [skillLevel, setSkillLevel] = useState<number>(1);
  const [skillLimitBreakMaster, setSkillLimitBreakMaster] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);
  const [equipmentLevelUpMaster, setEquipmentLevelUpMaster] = useState<any[]>([]);
  const [equipmentLimitBreakMaster, setEquipmentLimitBreakMaster] = useState<any[]>([]);

  const [upgradeSubTab, setUpgradeSubTab] = useState<string>("character");
  const [upgradeLoading, setUpgradeLoading] = useState<boolean>(false);

  const handleCharacterLevelUp = async (expItemId: string = "CHAR_EXP_S", count: number = 1) => {
    if (!session || characterLevel >= 100) return;
    if (characterLevel >= 50 && characterAwaken === 0) {
      setErrorMessage("「覚醒の書」で覚醒させてレベル上限を解放してください。");
      return;
    }

    const expValues: { [key: string]: number } = {
      CHAR_EXP_S: 500,
      CHAR_EXP_M: 2000,
      CHAR_EXP_L: 10000
    };

    let userItemQty = 0;
    if (expItemId === "CHAR_EXP_S") userItemQty = charExpS;
    else if (expItemId === "CHAR_EXP_M") userItemQty = charExpM;
    else if (expItemId === "CHAR_EXP_L") userItemQty = charExpL;

    if (userItemQty < count) {
      setErrorMessage("該当する経験の書が不足しています。");
      return;
    }

    const cost = count * 100;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const res = await supabase.rpc("character_level_up", {
        p_user_id: session.user.id,
        p_character_id: upgradeSelectedCharId,
        p_exp_item_id: expItemId,
        p_count: count,
        p_cash_cost: cost
      });

      if (res.error) {
        setErrorMessage(res.error.message || "レベルアップに失敗しました。");
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        return;
      }

      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCharacterAwaken = async () => {
    if (!session || characterAwaken >= 5) return;
    if (lawsOfStrife < 1) {
      setErrorMessage("覚醒の書が不足しています。");
      return;
    }
    const awakenMaster = CHARACTER_AWAKENING_MASTER.find(a => a.awakening_level === characterAwaken + 1);
    const cost = awakenMaster ? awakenMaster.required_cash : (characterAwaken + 1) * 3000;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const res = await supabase.rpc("character_awaken", {
        p_user_id: session.user.id,
        p_character_id: upgradeSelectedCharId,
        p_cash_cost: cost
      });

      if (res.error) {
        setErrorMessage(res.error.message || "覚醒に失敗しました。");
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        return;
      }

      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipGear = async (gearId: string) => {
    if (!session || activeGearSlot === null) return;
    setUpgradeLoading(true);
    playCyberSe("click");

    const activeChar = userCharactersDbList.find(c => c.character_id === upgradeSelectedCharId);
    if (!activeChar) return;

    try {
      await supabase.from("user_equipments").update({ equipped_character_id: null, slot_index: null }).eq("equipped_character_id", activeChar.id).eq("slot_index", activeGearSlot);
      await supabase.from("user_equipments").update({ equipped_character_id: activeChar.id, slot_index: activeGearSlot }).eq("id", gearId);

      setShowGearModal(false);
      setActiveGearSlot(null);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipGear = async (gearId: string) => {
    if (!session) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("user_equipments").update({ equipped_character_id: null, slot_index: null }).eq("id", gearId);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipSkill = async (skillCardUuid: string) => {
    if (!session || activeSkillSlot === null) return;
    setUpgradeLoading(true);
    playCyberSe("click");

    const activeChar = userCharactersDbList.find(c => c.character_id === upgradeSelectedCharId);
    if (!activeChar) return;

    try {
      await supabase.from("user_skills").update({ equipped_character_id: null, slot_index: null }).eq("equipped_character_id", activeChar.id).eq("slot_index", activeSkillSlot);
      await supabase.from("user_skills").update({ equipped_character_id: activeChar.id, slot_index: activeSkillSlot }).eq("id", skillCardUuid);

      setShowSkillModal(false);
      setActiveSkillSlot(null);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipSkill = async (skillCardUuid: string) => {
    if (!session) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("user_skills").update({ equipped_character_id: null, slot_index: null }).eq("id", skillCardUuid);
      setSelectedSkill((prev: any) => {
        if (prev && prev.id === skillCardUuid) {
          return { ...prev, equipped_character_id: null, slot_index: null };
        }
        return prev;
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipGearBulk = async (characterDbId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.rpc("unequip_gear_bulk", {
        p_user_id: session.user.id,
        p_character_id: characterDbId
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn("Failed unequip_gear_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipGearBulkRecommended = async (characterDbId: string, masterCharId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const availableGears = userEquipmentsList.filter((e: any) => {
        if (e.equipped_character_id && e.equipped_character_id !== characterDbId) return false;
        const master = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === e.equipment_id);
        if (!master) return false;
        if (master.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== masterCharId) return false;
        return true;
      });

      const slotTypes: ("WEAPON" | "HEAD" | "BODY" | "LEGS" | "ACCESSORY")[] = ["WEAPON", "HEAD", "BODY", "LEGS", "ACCESSORY"];
      const slotIndexesMap: { [key: string]: number[] } = {
        WEAPON: [0],
        HEAD: [1],
        BODY: [2],
        LEGS: [3],
        ACCESSORY: [4, 5, 6]
      };

      const selectedGearUuids: string[] = [];
      const selectedSlotIndexes: number[] = [];

      for (const st of slotTypes) {
        const slots = slotIndexesMap[st];
        const candidates = availableGears.filter((e: any) => {
          const m = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === e.equipment_id);
          return m?.slot_type === st;
        }).sort((a: any, b: any) => {
          const mA = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === a.equipment_id);
          const mB = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === b.equipment_id);
          const rarityScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
          const rDiff = (rarityScore[mB?.rarity || "N"] || 0) - (rarityScore[mA?.rarity || "N"] || 0);
          if (rDiff !== 0) return rDiff;
          const statA = (mA?.atk || 0) + (mA?.def || 0) + (mA?.hp || 0) + (a.plus_val || 0) * 10;
          const statB = (mB?.atk || 0) + (mB?.def || 0) + (mB?.hp || 0) + (b.plus_val || 0) * 10;
          return statB - statA;
        });

        for (let i = 0; i < slots.length; i++) {
          const item = candidates[i];
          if (item) {
            selectedGearUuids.push(item.id);
            selectedSlotIndexes.push(slots[i]);
          }
        }
      }

      if (selectedGearUuids.length > 0) {
        await supabase.rpc("equip_gear_bulk", {
          p_user_id: session.user.id,
          p_character_id: characterDbId,
          p_equipment_uuids: selectedGearUuids,
          p_slot_indexes: selectedSlotIndexes
        });
        await syncBootstrapData(session.user.id);
      }
    } catch (err) {
      console.warn("Failed equip_gear_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipSkillBulk = async (characterDbId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.rpc("unequip_skill_bulk", {
        p_user_id: session.user.id,
        p_character_id: characterDbId
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn("Failed unequip_skill_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipSkillBulkRecommended = async (characterDbId: string, masterCharId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const availableSkills = userSkillsList.filter((s: any) => {
        if (s.equipped_character_id && s.equipped_character_id !== characterDbId) return false;
        const master = SKILLS_MASTER_DATA.find((m: any) => m.id === s.skill_card_id);
        if (!master) return false;
        if (master.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== masterCharId) return false;
        return true;
      }).sort((a: any, b: any) => {
        const mA = SKILLS_MASTER_DATA.find((m: any) => m.id === a.skill_card_id);
        const mB = SKILLS_MASTER_DATA.find((m: any) => m.id === b.skill_card_id);
        const isSynergyA = mA?.exclusive_character_id === masterCharId ? 1 : 0;
        const isSynergyB = mB?.exclusive_character_id === masterCharId ? 1 : 0;
        if (isSynergyB !== isSynergyA) return isSynergyB - isSynergyA;
        const lbDiff = (b.plus_val || 0) - (a.plus_val || 0);
        if (lbDiff !== 0) return lbDiff;
        const rarityScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
        return (rarityScore[mB?.rarity || "N"] || 0) - (rarityScore[mA?.rarity || "N"] || 0);
      });

      const selectedSkillUuids: string[] = [];
      const selectedSlotIndexes: number[] = [];

      const maxSlots = 6;
      for (let i = 0; i < Math.min(availableSkills.length, maxSlots); i++) {
        selectedSkillUuids.push(availableSkills[i].id);
        selectedSlotIndexes.push(i);
      }

      if (selectedSkillUuids.length > 0) {
        await supabase.rpc("equip_skill_bulk", {
          p_user_id: session.user.id,
          p_character_id: characterDbId,
          p_skill_uuids: selectedSkillUuids,
          p_slot_indexes: selectedSlotIndexes
        });
        await syncBootstrapData(session.user.id);
      }
    } catch (err) {
      console.warn("Failed equip_skill_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSellGearBulk = async (equipmentUuids: string[]) => {
    if (!session || !equipmentUuids || equipmentUuids.length === 0) return;
    setUpgradeLoading(true);
    playCyberSe("gacha");
    try {
      const { error } = await supabase.rpc("sell_gear_bulk", {
        p_user_id: session.user.id,
        p_equipment_ids: equipmentUuids
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        await syncBootstrapData(session.user.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "売却処理に失敗しました。");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipmentLevelUp = async (expItemId: string = "EQUIP_EXP_S", count: number = 1) => {
    if (!session || !selectedEquipment) return;
    if (equipmentLevel >= 50) return;

    let userItemQty = 0;
    if (expItemId === "EQUIP_EXP_S") userItemQty = equipExpS;
    else if (expItemId === "EQUIP_EXP_M") userItemQty = equipExpM;
    else if (expItemId === "EQUIP_EXP_L") userItemQty = equipExpL;

    if (userItemQty < count) {
      setErrorMessage("該当するカスタムオイルが不足しています。");
      return;
    }

    const cost = count * 50;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const res = await supabase.rpc("upgrade_gear", {
        p_user_id: session.user.id,
        p_equipment_id: selectedEquipment.id,
        p_exp_item_id: expItemId,
        p_count: count,
        p_cash_cost: cost
      });

      if (res.error) {
        setErrorMessage(res.error.message || "装備強化に失敗しました。");
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        return;
      }

      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipmentLimitBreak = async (useWildcard: boolean = false) => {
    if (!session || !selectedEquipment) return;
    if (equipmentLimitBreak >= 10) return;

    const cost = (equipmentLimitBreak + 1) * 1000;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    if (useWildcard) {
      if (equipLbHammers < 1) {
        setErrorMessage("代用素材「万能カスタムツール [装備]」が不足しています。");
        return;
      }
    } else {
      const dupes = userEquipmentsList.filter(e => e.id !== selectedEquipment.id && e.equipment_id === selectedEquipment.equipment_id && e.equipped_character_id === null);
      if (dupes.length < 1) {
        setErrorMessage("同名の予備装備品が見つかりません。「万能カスタムツール [装備]」を代用してください。");
        return;
      }
    }

    setUpgradeLoading(true);
    playCyberSe("gacha");
    const nextLb = equipmentLimitBreak + 1;
    const updatedOptions = subOptions.map((opt, idx) => {
      if (nextLb >= 3 && idx === 1) return { ...opt, unlocked: true };
      if (nextLb >= 5 && idx === 2) return { ...opt, unlocked: true };
      if (nextLb >= 10 && idx === 3) return { ...opt, unlocked: true };
      return opt;
    });

    try {
      let targetDupeId = null;
      if (!useWildcard) {
        const dupes = userEquipmentsList.filter(e => e.id !== selectedEquipment.id && e.equipment_id === selectedEquipment.equipment_id && e.equipped_character_id === null);
        targetDupeId = dupes[0]?.id;
      }

      const res = await supabase.rpc("limit_break_gear_v2", {
        p_user_id: session.user.id,
        p_equipment_id: selectedEquipment.id,
        p_cash_cost: cost,
        p_use_wildcard: useWildcard,
        p_dupe_id: targetDupeId,
        p_new_options: updatedOptions
      });

      if (res.error) {
        setErrorMessage(res.error.message || "限界突破処理に失敗しました。");
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        return;
      }

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "限界突破", message: `限界突破完了！ (+${nextLb})`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSkillUpgrade = async (useWildcard: boolean = false) => {
    if (!session || !selectedSkill) return;
    if (selectedSkill.plus_val >= 10) {
      setErrorMessage("これ以上限界突破できません。");
      return;
    }

    const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === selectedSkill.skill_card_id);
    if (!skillMaster) return;

    const isExclusive = !!skillMaster.is_exclusive;
    const required_item_id = isExclusive ? "EXCLUSIVE_CONTRACT" : "SKILL_LB_BOOK";
    const required_cash = (selectedSkill.plus_val + 1) * 1000;

    if (cash < required_cash) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    if (useWildcard) {
      const wildcardQty = isExclusive ? exclusiveContracts : skillLbBooks;
      if (wildcardQty < 1) {
        setErrorMessage(`代用素材「${isExclusive ? "限界突破の書 [専用スキル]" : "限界突破の書 [スキル]"}」が不足しています。`);
        return;
      }
    } else {
      const dupes = userSkillsList.filter(s => s.id !== selectedSkill.id && s.skill_card_id === selectedSkill.skill_card_id && s.equipped_character_id === null);
      if (dupes.length < 1) {
        setErrorMessage(`同名の予備スキルカードが見つかりません。「${isExclusive ? "限界突破の書 [専用スキル]" : "限界突破の書 [スキル]"}」を代用してください。`);
        return;
      }
    }

    setUpgradeLoading(true);
    playCyberSe("click");

    try {
      let targetDupeId = null;
      if (!useWildcard) {
        const dupes = userSkillsList.filter(s => s.id !== selectedSkill.id && s.skill_card_id === selectedSkill.skill_card_id && s.equipped_character_id === null);
        targetDupeId = dupes[0]?.id;
      }

      const res = await supabase.rpc("limit_break_skill_v2", {
        p_user_id: session.user.id,
        p_skill_id: selectedSkill.id,
        p_cash_cost: required_cash,
        p_use_wildcard: useWildcard,
        p_dupe_id: targetDupeId,
        p_wildcard_item_id: required_item_id
      });

      if (res.error) {
        setErrorMessage(res.error.message || "限界突破処理に失敗しました。");
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        return;
      }

      const nextLb = selectedSkill.plus_val + 1;
      await syncBootstrapData(session.user.id);
      setSelectedSkill((prev: any) => prev ? { ...prev, plus_val: nextLb } : null);
      setConfirmDialogConfig({ isOpen: true, title: "限界突破", message: `スキルカードの限界突破完了！ (+${nextLb})`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  return {
    characterLevel, setCharacterLevel,
    characterAwaken, setCharacterAwaken,
    userCharactersDbList, setUserCharactersDbList,
    userEquipmentsList, setUserEquipmentsList,
    selectedEquipment, setSelectedEquipment,
    equipmentLevel, setEquipmentLevel,
    equipmentLimitBreak, setEquipmentLimitBreak,
    subOptions, setSubOptions,
    userSkillsList, setUserSkillsList,
    activeGearSlot, setActiveGearSlot,
    showGearModal, setShowGearModal,
    activeSkillSlot, setActiveSkillSlot,
    showSkillModal, setShowSkillModal,
    skillLevel, setSkillLevel,
    skillLimitBreakMaster, setSkillLimitBreakMaster,
    selectedSkill, setSelectedSkill,
    equipmentLevelUpMaster, setEquipmentLevelUpMaster,
    equipmentLimitBreakMaster, setEquipmentLimitBreakMaster,
    upgradeSubTab, setUpgradeSubTab,
    upgradeLoading, setUpgradeLoading,
    handleCharacterLevelUp,
    handleCharacterAwaken,
    handleEquipGear,
    handleUnequipGear,
    handleEquipSkill,
    handleUnequipSkill,
    handleUnequipGearBulk,
    handleEquipGearBulkRecommended,
    handleUnequipSkillBulk,
    handleEquipSkillBulkRecommended,
    handleSellGearBulk,
    handleEquipmentLevelUp,
    handleEquipmentLimitBreak,
    handleSkillUpgrade
  };
}
