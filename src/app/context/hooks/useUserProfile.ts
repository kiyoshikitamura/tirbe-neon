"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { USER_BIO_MAX_LENGTH } from "@/domain/presentation/userBio";

export function useUserProfile(
  session: any,
  userLevel: number,
  diamonds: number,
  cash: number,
  userGuild: any,
  playCyberSe: (type: string) => void,
  bgmEnabled: boolean,
  setBgmEnabled: (enabled: boolean) => void,
  seEnabled: boolean,
  setSeEnabled: (enabled: boolean) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setShowSettingsPanel: (show: boolean) => void,
  setErrorMessage: (msg: string | null) => void,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [ownedTitles, setOwnedTitles] = useState<Array<{ id: string; name: string }>>([]);
  const [username, setUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("/reiji_transparent_asset.png");
  const [currentBaseId, setCurrentBaseId] = useState<string>("shinjuku");
  const [lastGuildLeftAt, setLastGuildLeftAt] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [equippedBackground, setEquippedBackground] = useState<string>("bg_default");
  const [selectedBgMode, setSelectedBgMode] = useState<string>("auto");
  const [equippedFrontEffect, setEquippedFrontEffect] = useState<string>("effect_none");
  const [titleEquipped, setTitleEquipped] = useState<string>("title_none");
  const [interiorItem, setInteriorItem] = useState<string>("none");
  // null means the shared cosmetics migration is not available yet. This keeps
  // existing production profiles usable during the staged database rollout.
  const [ownedHomeCosmeticIds, setOwnedHomeCosmeticIds] = useState<string[] | null>(null);

  const syncSharedHomeCosmetics = async (
    selection?: { background: string; foreground: string; interior: string }
  ) => {
    const { error: unlockError } = await supabase.rpc("unlock_eligible_user_cosmetics");
    if (unlockError) {
      // The deployed client can safely run before the matching migration is
      // installed on a production project. All other database errors remain
      // visible instead of silently losing a cosmetic selection.
      if (unlockError.code === "PGRST202" || unlockError.code === "42P01") {
        setOwnedHomeCosmeticIds(null);
        return false;
      }
      throw unlockError;
    }

    const { error: syncError } = await supabase.rpc("sync_legacy_user_cosmetics");
    if (syncError) throw syncError;

    if (selection) {
      const cosmeticSelections = [
        ["HOME_BACKGROUND", selection.background === "auto" ? "bg_default" : selection.background],
        ["HOME_FOREGROUND", selection.foreground],
        ["HOME_INTERIOR", selection.interior === "none" ? "interior_none" : selection.interior]
      ] as const;

      for (const [slot, cosmeticId] of cosmeticSelections) {
        const { error } = await supabase.rpc("equip_user_cosmetic", {
          p_slot: slot,
          p_cosmetic_id: cosmeticId
        });
        if (error) throw error;
      }
    }

    const { data, error: ownedError } = await supabase
      .from("user_cosmetics")
      .select("cosmetic_id")
      .eq("user_id", session?.user?.id);
    if (ownedError) throw ownedError;
    setOwnedHomeCosmeticIds((data || []).map((row: { cosmetic_id: string }) => row.cosmetic_id));
    return true;
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setOwnedTitles([]);
      return;
    }
    const loadOwnedTitles = async () => {
      const { data, error } = await supabase
        .from("user_titles")
        .select("title_id, title_master(id, name)")
        .eq("user_id", session.user.id);
      if (error) {
        console.warn("Failed to load owned titles:", error.message);
        return;
      }
      setOwnedTitles((data || []).map((row: any) => ({ id: row.title_id, name: row.title_master?.name || row.title_id })));
    };
    void loadOwnedTitles();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setOwnedHomeCosmeticIds(null);
      return;
    }
    void syncSharedHomeCosmetics().catch((error) => {
      console.warn("Shared cosmetics are unavailable:", error.message);
    });
  }, [session?.user?.id]);

  const [selectedLeader, setSelectedLeader] = useState<string>("");
  const [upgradeSelectedCharId, setUpgradeSelectedCharId] = useState<string>("");

  const handleUpdateProfile = async (overrides: Partial<{
    username: string;
    bio: string;
    title: string;
    background: string;
    foreground: string;
    interior: string;
  }> = {}) => {
    if (!session || profileLoading) return false;
    const nextUsername = (overrides.username ?? username).trim();
    const nextBio = (overrides.bio ?? bio).trim();
    if (!nextUsername) {
      setErrorMessage("ユーザー名は空欄にできません。");
      return false;
    }
    if (Array.from(nextUsername).length > 8) {
      setErrorMessage("ユーザー名は8文字以内で入力してください。");
      return false;
    }
    if (Array.from(nextBio).length > USER_BIO_MAX_LENGTH) {
      setErrorMessage(`自己紹介は${USER_BIO_MAX_LENGTH}文字以内で入力してください。`);
      return false;
    }
    setProfileLoading(true);
    playCyberSe("click");

    // 🛡️ チート対策: 未解放の背景・称号・装飾の不正設定をバリデーション遮断
    let safeBg = overrides.background ?? selectedBgMode;
    const safeTitle = overrides.title ?? titleEquipped;
    const safeForeground = overrides.foreground ?? equippedFrontEffect;
    const safeInterior = overrides.interior ?? interiorItem;
    const updatesProfile = ["username", "bio", "title"].some((key) => Object.prototype.hasOwnProperty.call(overrides, key));
    const updatesHome = ["background", "foreground", "interior"].some((key) => Object.prototype.hasOwnProperty.call(overrides, key));

    if (safeBg === "bg_kabukicho" && userLevel < 5) safeBg = "auto";
    if (safeBg === "bg_wharf" && !userGuild) safeBg = "auto";
    if (safeBg === "bg_bazar" && cash < 20000) safeBg = "auto";

    try {
      if (updatesProfile && safeTitle !== titleEquipped) {
        const { error: titleError } = await supabase.rpc("equip_owned_title", { p_title_id: safeTitle });
        if (titleError) throw titleError;
      }

      if (updatesProfile) {
        const { error } = await supabase
          .from("users")
          .update({ username: nextUsername, bio: nextBio })
          .eq("id", session.user.id);

        if (error) {
          if (error.code === "23505") {
            setErrorMessage("このユーザー名は既に他のプレイヤーが登録しています。");
            return false;
          }
          throw error;
        }
      }

      if (updatesHome) {
        const { error } = await supabase
          .from("users")
          .update({
            equipped_background: safeBg === "auto" ? equippedBackground : safeBg,
            equipped_front_effect: safeForeground,
            selected_bg_mode: safeBg,
            interior_item: safeInterior
          })
          .eq("id", session.user.id);
        if (error) throw error;

        await syncSharedHomeCosmetics({
          background: safeBg,
          foreground: safeForeground,
          interior: safeInterior
        });
      }

      if (updatesProfile) {
        setUsername(nextUsername);
        setBio(nextBio);
        setTitleEquipped(safeTitle);
      }
      if (updatesHome) {
        setSelectedBgMode(safeBg);
        if (safeBg !== "auto") setEquippedBackground(safeBg);
        setEquippedFrontEffect(safeForeground);
        setInteriorItem(safeInterior);
      }
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "保存完了", message: "設定を保存しました。", confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return true;
    } catch (err: any) {
      console.warn("Profile update failed:", err.message);
      if (err.message?.includes("Username can only be changed once per day")) {
        setErrorMessage("ユーザー名は1日1回まで変更できます。");
      } else if (err.message?.includes("Bio can only be changed once per day")) {
        setErrorMessage("自己紹介は1日1回まで変更できます。");
      } else {
        setErrorMessage("プロフィールの更新に失敗しました。");
      }
      return false;
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleSound = async (type: "bgm" | "se") => {
    const nextBgm = type === "bgm" ? !bgmEnabled : bgmEnabled;
    const nextSe = type === "se" ? !seEnabled : seEnabled;
    if (type === "bgm") setBgmEnabled(nextBgm);
    else setSeEnabled(nextSe);
    if (nextSe) playCyberSe("click");
  };

  const handleUpdateBio = async (value: string) => {
    if (!session?.user?.id || profileLoading) return false;
    const nextBio = value.trim();
    if (Array.from(nextBio).length > USER_BIO_MAX_LENGTH) {
      setErrorMessage(`自己紹介は${USER_BIO_MAX_LENGTH}文字以内で入力してください。`);
      return false;
    }
    setProfileLoading(true);
    playCyberSe("click");
    try {
      const { error } = await supabase.from("users").update({ bio: nextBio }).eq("id", session.user.id);
      if (error) throw error;
      setBio(nextBio);
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "保存完了", message: "自己紹介を保存しました。", confirmText: "OK", cancelText: "", presentation: "canonical", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return true;
    } catch (error: any) {
      if (error.message?.includes("Bio can only be changed once per day")) setErrorMessage("自己紹介は1日1回まで変更できます。");
      else setErrorMessage("自己紹介の保存に失敗しました。");
      return false;
    } finally {
      setProfileLoading(false);
    }
  };

  return {
    username, setUsername,
    bio, setBio,
    avatarUrl, setAvatarUrl,
    currentBaseId, setCurrentBaseId,
    lastGuildLeftAt, setLastGuildLeftAt,
    bgmEnabled, setBgmEnabled,
    seEnabled, setSeEnabled,
    profileLoading, setProfileLoading,
    equippedBackground, setEquippedBackground,
    selectedBgMode, setSelectedBgMode,
    equippedFrontEffect, setEquippedFrontEffect,
    titleEquipped, setTitleEquipped,
    ownedTitles,
    ownedHomeCosmeticIds,
    interiorItem, setInteriorItem,
    selectedLeader, setSelectedLeader,
    upgradeSelectedCharId, setUpgradeSelectedCharId,
    handleUpdateProfile, handleUpdateBio,
    handleToggleSound
  };
}
