"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useGuild(
  session: any,
  userLevel: number,
  cash: number,
  setCash: React.Dispatch<React.SetStateAction<number>>,
  setGvgResetLoading: (loading: boolean) => void,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  addGuildXpAndContributionByAction: (actionType: string) => Promise<void>
) {
  const [userGuild, setUserGuild] = useState<any | null>(null);
  const [userGuildMember, setUserGuildMember] = useState<any | null>(null);
  const [guildMembersList, setGuildMembersList] = useState<any[]>([]);
  const [newGuildName, setNewGuildName] = useState<string>("");
  const [allGuildsDbList, setAllGuildsDbList] = useState<any[]>([]);
  const [guildSubTab, setGuildSubTab] = useState<"members" | "settings" | "join">("members");
  const [guildLevelMaster, setGuildLevelMaster] = useState<any[]>([]);
  const [guildXpActionMaster, setGuildXpActionMaster] = useState<any[]>([]);
  const [updatingAlignment, setUpdatingAlignment] = useState<boolean>(false);

  const getGuildPenaltyState = () => {
    if (!session || !userGuildMember) return { isPenalty: false, secondsLeft: 0 };
    const leftAt = session.user?.user_metadata?.last_guild_left_at;
    if (!leftAt) return { isPenalty: false, secondsLeft: 0 };
    const leftTime = new Date(leftAt).getTime();
    const now = new Date().getTime();
    const penaltyMs = 24 * 60 * 60 * 1000;
    const diffMs = now - leftTime;
    if (diffMs < penaltyMs) {
      return { isPenalty: true, secondsLeft: Math.ceil((penaltyMs - diffMs) / 1000) };
    }
    return { isPenalty: false, secondsLeft: 0 };
  };

  const handleCreateGuild = async () => {
    if (!session) return;
    if (userLevel < 8) {
      setErrorMessage("ギルド創設にはプレイヤーレベル8以上が必要です。");
      return;
    }
    if (!newGuildName.trim()) {
      setErrorMessage("ギルド名は空欄にできません。");
      return;
    }
    if (cash < 5000) {
      setErrorMessage("創設にはキャッシュ5,000が必要です。");
      return;
    }

    const penalty = getGuildPenaltyState();
    if (penalty.isPenalty) {
      setErrorMessage("ギルド脱退後のペナルティ制限期間中です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      const { data: newGuild, error: guildErr } = await supabase
        .from("guilds")
        .insert({ name: newGuildName.trim(), leader_id: session.user.id, level: 1, xp: 0 })
        .select()
        .single();

      if (guildErr) {
        if (guildErr.code === "23505") {
          setErrorMessage("このギルド名は既に他のプレイヤーが登録しています。");
          setGvgResetLoading(false);
          return;
        }
        throw guildErr;
      }

      await supabase.from("guild_members").insert({
        guild_id: newGuild.id,
        user_id: session.user.id,
        role: "MASTER",
        weekly_contribution: 0,
        total_contribution: 0
      });

      const nextCash = cash - 5000;
      await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);

      setCash(nextCash);
      setNewGuildName("");
      alert(`ギルド『${newGuild.name}』を創設しました！`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleUpdateGuildAlignment = async (mainAlign: string, subAlign: string) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER") {
      alert("ギルドマスターのみ属性を変更できます。");
      return;
    }
    setUpdatingAlignment(true);
    playCyberSe("click");

    const alignmentJpToEn: { [key: string]: string } = {
      "正義": "JUSTICE",
      "悪": "EVIL",
      "秩序": "ORDER",
      "混沌": "CHAOS",
      "JUSTICE": "JUSTICE",
      "EVIL": "EVIL",
      "ORDER": "ORDER",
      "CHAOS": "CHAOS"
    };

    const mainEn = alignmentJpToEn[mainAlign] || mainAlign;
    const subEn = alignmentJpToEn[subAlign] || subAlign;

    try {
      const { error } = await supabase
        .from("guilds")
        .update({
          main_alignment: mainEn,
          sub_alignment: subEn
        })
        .eq("id", userGuild.id);

      if (error) throw error;
      
      await syncBootstrapData(session.user.id);
      alert("組織属性を更新しました。");
    } catch (e: any) {
      console.warn("Update alignment failed:", e.message);
      setErrorMessage("属性の更新に失敗しました。");
    } finally {
      setUpdatingAlignment(false);
    }
  };

  const handleLeaveGuild = async () => {
    if (!session || !userGuildMember || !userGuild) return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const isMaster = userGuildMember.role === "MASTER";
      const otherMembers = guildMembersList.filter(m => m.user_id !== session.user.id);

      if (isMaster && otherMembers.length > 0) {
        setErrorMessage("脱退する前に、マスター権限を譲渡してください。");
        setGvgResetLoading(false);
        return;
      }

      const leftTimeIso = new Date().toISOString();

      if (isMaster && otherMembers.length === 0) {
        await supabase.from("guilds").delete().eq("id", userGuild.id);
        await supabase.from("users").update({ last_guild_left_at: leftTimeIso }).eq("id", session.user.id);
        alert("ギルドは自動解散されました。");
      } else {
        await supabase.from("guild_members").delete().eq("user_id", session.user.id);
        await supabase.from("users").update({ last_guild_left_at: leftTimeIso }).eq("id", session.user.id);
        alert("ギルドから正常に脱退しました。");
      }

      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleDemoJoinGuild = async (targetGuildId: string, guildName: string) => {
    if (!session) return;
    if (userLevel < 3) {
      setErrorMessage("ギルド加入にはプレイヤーレベル3以上が必要です。");
      return;
    }
    const penalty = getGuildPenaltyState();
    if (penalty.isPenalty) {
      setErrorMessage("ギルド脱退後のペナルティ制限期間中です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      const { data: mCount, error: mCountErr } = await supabase
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", targetGuildId);

      if (mCount && mCount.length >= 10) {
        alert("対象ギルドは上限人数（10名）に達しています。");
        setGvgResetLoading(false);
        return;
      }

      await supabase.from("guild_members").insert({
        guild_id: targetGuildId,
        user_id: session.user.id,
        role: "MEMBER",
        weekly_contribution: 0,
        total_contribution: 0
      });

      alert(`ギルド『${guildName}』にデモ所属しました！`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, targetName: string, newRole: string) => {
    if (!session || !userGuildMember || userGuildMember.role !== "MASTER") return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      if (newRole === "MASTER") {
        await supabase.from("guild_members").update({ role: "MASTER" }).eq("user_id", targetUserId);
        await supabase.from("guild_members").update({ role: "SUBMASTER" }).eq("user_id", session.user.id);
        await supabase.from("guilds").update({ leader_id: targetUserId }).eq("id", userGuild.id);
        alert(`マスター権限を『${targetName}』へ譲渡しました。`);
      } else {
        await supabase.from("guild_members").update({ role: newRole }).eq("user_id", targetUserId);
        alert(`『${targetName}』の階級を ${newRole} へ変更しました。`);
      }
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleKickMember = async (targetUserId: string, targetName: string) => {
    if (!session || !userGuildMember || (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER")) return;

    const targetMember = guildMembersList.find(m => m.user_id === targetUserId);
    if (!targetMember) return;

    const rolePower = (role: string) => role === "MASTER" ? 3 : role === "SUBMASTER" ? 2 : 1;
    if (rolePower(userGuildMember.role) <= rolePower(targetMember.role)) {
      alert("自分と同等以上の階級の構成員を追放することはできません。");
      return;
    }

    if (!confirm(`『${targetName}』を追放しますか？`)) return;

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("guild_members").delete().eq("user_id", targetUserId);
      await supabase.from("users").update({ last_guild_left_at: new Date().toISOString() }).eq("id", targetUserId);
      alert(`『${targetName}』を追放しました。`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleDonateToGuild = async (amount: number) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (cash < amount) {
      alert("所持キャッシュが不足しています。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const actionType = amount === 1000 ? "DONATE_SMALL" : amount === 5000 ? "DONATE_MEDIUM" : "DONATE_LARGE";
      const actionMaster = guildXpActionMaster.find(a => a.action_type === actionType) || { xp_gain: amount === 1000 ? 20 : amount === 5000 ? 120 : 300, contribution_gain: amount === 1000 ? 10 : amount === 5000 ? 60 : 150 };

      const { error: gErr } = await supabase
        .from("guilds")
        .update({
          funds: Number(userGuild.funds || 0) + amount
        })
        .eq("id", userGuild.id);

      if (gErr) throw gErr;

      const nextCash = cash - amount;
      await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);
      setCash(nextCash);

      await addGuildXpAndContributionByAction(actionType);

      alert(`ギルドに ${amount.toLocaleString()} キャッシュを献金しました！\n(ギルド資金 +${amount.toLocaleString()} / ギルドXP +${actionMaster.xp_gain} / 貢献度 +${actionMaster.contribution_gain})`);
    } catch (e: any) {
      console.warn("Donation failed:", e.message);
      alert("献金に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleBuyGuildDecoration = async (itemId: string, cost: number, type: "DECORATION" | "BANNER") => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      alert("装飾アイテムの購入はマスターまたはサブマスターのみ可能です。");
      return;
    }
    if (Number(userGuild.funds || 0) < cost) {
      alert("ギルド資金が不足しています。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[field]) ? userGuild[field] : [];
      if (currentList.includes(itemId)) {
        alert("このアイテムは既に購入済みです。");
        setGvgResetLoading(false);
        return;
      }

      const nextList = [...currentList, itemId];
      const { error } = await supabase
        .from("guilds")
        .update({
          funds: Number(userGuild.funds || 0) - cost,
          [field]: nextList
        })
        .eq("id", userGuild.id);

      if (error) throw error;

      await syncBootstrapData(session.user.id);
      alert("装飾アイテムを購入しました！");
    } catch (e: any) {
      console.warn("Buy decoration failed:", e.message);
      alert("購入に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleEquipGuildDecoration = async (type: "DECORATION" | "BANNER", itemId: string | null) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      alert("装飾の変更はマスターまたはサブマスターのみ可能です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "equipped_decoration" : "equipped_banner";
      const unlockField = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[unlockField]) ? userGuild[unlockField] : [];

      if (itemId !== null && !currentList.includes(itemId)) {
        alert("このアイテムは未解放です。");
        setGvgResetLoading(false);
        return;
      }

      const { error } = await supabase
        .from("guilds")
        .update({
          [field]: itemId
        })
        .eq("id", userGuild.id);

      if (error) throw error;

      await syncBootstrapData(session.user.id);
      alert("ギルド装飾を適用しました。");
    } catch (e: any) {
      console.warn("Equip decoration failed:", e.message);
      alert("装飾の適用に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  return {
    userGuild, setUserGuild,
    userGuildMember, setUserGuildMember,
    guildMembersList, setGuildMembersList,
    newGuildName, setNewGuildName,
    allGuildsDbList, setAllGuildsDbList,
    guildSubTab, setGuildSubTab,
    guildLevelMaster, setGuildLevelMaster,
    guildXpActionMaster, setGuildXpActionMaster,
    updatingAlignment, setUpdatingAlignment,
    getGuildPenaltyState,
    handleCreateGuild,
    handleUpdateGuildAlignment,
    handleLeaveGuild,
    handleDemoJoinGuild,
    handleUpdateMemberRole,
    handleKickMember,
    handleDonateToGuild,
    handleBuyGuildDecoration,
    handleEquipGuildDecoration
  };
}
