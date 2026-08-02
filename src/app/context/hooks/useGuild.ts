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
  addGuildXpAndContributionByAction: (actionType: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
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
      const res = await supabase.rpc("create_guild_v2", {
        p_user_id: session.user.id,
        p_guild_name: newGuildName.trim(),
        p_creation_cost: 5000
      });

      if (res.error) {
        setErrorMessage(res.error.message || "ギルド作成に失敗しました。");
        setGvgResetLoading(false);
        return;
      }
      if (res.data?.error) {
        setErrorMessage(res.data.error);
        setGvgResetLoading(false);
        return;
      }

      setNewGuildName("");
      setConfirmDialogConfig({ isOpen: true, title: "ギルド作成", message: `ギルド『${newGuildName.trim()}』を創設しました！`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
      setConfirmDialogConfig({ isOpen: true, title: "属性変更", message: "ギルドマスターのみ属性を変更できます。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
      const { error } = await supabase.rpc("update_guild_alignment", {
        p_guild_id: userGuild.id,
        p_main: mainEn,
        p_sub: subEn
      });

      if (error) throw error;
      
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "属性変更", message: "組織属性を更新しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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

      await supabase.rpc("leave_guild", {
        p_user_id: session.user.id,
        p_guild_id: userGuild.id,
        p_is_master: isMaster,
        p_has_others: otherMembers.length > 0
      });

      if (isMaster && otherMembers.length === 0) {
        setConfirmDialogConfig({ isOpen: true, title: "ギルド解散", message: "ギルドは自動解散されました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } else {
        setConfirmDialogConfig({ isOpen: true, title: "ギルド脱退", message: "ギルドから正常に脱退しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
        setConfirmDialogConfig({ isOpen: true, title: "加入失敗", message: "対象ギルドは上限人数（10名）に達しています。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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

      setConfirmDialogConfig({ isOpen: true, title: "ギルド加入", message: `ギルド『${guildName}』にデモ所属しました！`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
        await supabase.rpc("transfer_guild_leader", {
          p_guild_id: userGuild.id,
          p_old_id: session.user.id,
          p_new_id: targetUserId
        });
        setConfirmDialogConfig({ isOpen: true, title: "マスター交代", message: `マスター権限を『${targetName}』へ譲渡しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      } else {
        await supabase.from("guild_members").update({ role: newRole }).eq("user_id", targetUserId);
        setConfirmDialogConfig({ isOpen: true, title: "役職変更", message: `『${targetName}』の階級を ${newRole} へ変更しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
      setConfirmDialogConfig({ isOpen: true, title: "追放不可", message: "自分と同等以上の階級の構成員を追放することはできません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }

    setConfirmDialogConfig({
      isOpen: true,
      title: "追放確認",
      message: `『${targetName}』を追放しますか？`,
      onConfirm: async () => {
        setConfirmDialogConfig(null);
        setGvgResetLoading(true);
        playCyberSe("click");
        try {
          await supabase.rpc("kick_guild_member", {
            p_guild_id: userGuild.id,
            p_user_id: targetUserId
          });
          setConfirmDialogConfig({ isOpen: true, title: "追放完了", message: `『${targetName}』を追放しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
          await syncBootstrapData(session.user.id);
        } catch (err: any) {
          console.warn(err.message);
        } finally {
          setGvgResetLoading(false);
        }
      },
      onCancel: () => setConfirmDialogConfig(null)
    });
  };

  const handleDonateToGuild = async (amount: number) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (cash < amount) {
      setConfirmDialogConfig({ isOpen: true, title: "キャッシュ不足", message: "所持キャッシュが不足しています。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const actionType = amount === 1000 ? "DONATE_SMALL" : amount === 5000 ? "DONATE_MEDIUM" : "DONATE_LARGE";
      const actionMaster = guildXpActionMaster.find(a => a.action_type === actionType) || { xp_gain: amount === 1000 ? 20 : amount === 5000 ? 120 : 300, contribution_gain: amount === 1000 ? 10 : amount === 5000 ? 60 : 150 };

      const { data: rpcRes, error: gErr } = await supabase.rpc("donate_to_guild", {
        p_user_id: session.user.id,
        p_guild_id: userGuild.id,
        p_amount: amount
      });

      if (gErr) throw gErr;

      const nextCash = rpcRes?.next_cash ?? (cash - amount);
      setCash(nextCash);

      await addGuildXpAndContributionByAction(actionType);

      setConfirmDialogConfig({ isOpen: true, title: "献金完了", message: `ギルドに ${amount.toLocaleString()} キャッシュを献金しました！\n(ギルド資金 +${amount.toLocaleString()} / ギルドXP +${actionMaster.xp_gain} / 貢献度 +${actionMaster.contribution_gain})`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      console.warn("Donation failed:", e.message);
      setConfirmDialogConfig({ isOpen: true, title: "献金失敗", message: "献金に失敗しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleBuyGuildDecoration = async (itemId: string, cost: number, type: "DECORATION" | "BANNER") => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      setConfirmDialogConfig({ isOpen: true, title: "権限エラー", message: "装飾アイテムの購入はマスターまたはサブマスターのみ可能です。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }
    if (Number(userGuild.funds || 0) < cost) {
      setConfirmDialogConfig({ isOpen: true, title: "資金不足", message: "ギルド資金が不足しています。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[field]) ? userGuild[field] : [];
      if (currentList.includes(itemId)) {
        setConfirmDialogConfig({ isOpen: true, title: "購入済み", message: "このアイテムは既に購入済みです。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
        setGvgResetLoading(false);
        return;
      }

      const res = await supabase.rpc("buy_guild_decoration_v2", {
        p_guild_id: userGuild.id,
        p_type: type,
        p_item_id: itemId,
        p_cost: cost
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "購入完了", message: "装飾アイテムを購入しました！", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      console.warn("Buy decoration failed:", e.message);
      setConfirmDialogConfig({ isOpen: true, title: "購入失敗", message: "購入に失敗しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleEquipGuildDecoration = async (type: "DECORATION" | "BANNER", itemId: string | null) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      setConfirmDialogConfig({ isOpen: true, title: "権限エラー", message: "装飾の変更はマスターまたはサブマスターのみ可能です。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "equipped_decoration" : "equipped_banner";
      const unlockField = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[unlockField]) ? userGuild[unlockField] : [];

      if (itemId !== null && !currentList.includes(itemId)) {
        setConfirmDialogConfig({ isOpen: true, title: "未解放", message: "このアイテムは未解放です。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
        setGvgResetLoading(false);
        return;
      }

      const { error } = await supabase.rpc("equip_guild_decoration", {
        p_guild_id: userGuild.id,
        p_type: type,
        p_item_id: itemId
      });

      if (error) throw error;

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "装飾適用", message: "ギルド装飾を適用しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      console.warn("Equip decoration failed:", e.message);
      setConfirmDialogConfig({ isOpen: true, title: "適用失敗", message: "装飾の適用に失敗しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
