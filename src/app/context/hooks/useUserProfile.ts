"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useUserProfile(
  session: any,
  userLevel: number,
  diamonds: number,
  cash: number,
  userGuild: any,
  playCyberSe: (type: string) => void,
  startCyberBgm: () => void,
  stopCyberBgm: () => void,
  initAudio: () => void,
  getAudioCtx: () => AudioContext | null,
  syncBootstrapData: (userId: string) => Promise<void>,
  setShowSettingsPanel: (show: boolean) => void,
  setErrorMessage: (msg: string | null) => void
) {
  const [username, setUsername] = useState<string>("半グレの首領");
  const [bio, setBio] = useState<string>("歌舞伎町の覇権を握るため立ち上がる。");
  const [avatarUrl, setAvatarUrl] = useState<string>("/reiji_transparent_asset.png");
  const [currentBaseId, setCurrentBaseId] = useState<string>("neon_tower");
  const [lastGuildLeftAt, setLastGuildLeftAt] = useState<string | null>(null);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);
  const [seEnabled, setSeEnabled] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [equippedBackground, setEquippedBackground] = useState<string>("bg_default");
  const [selectedBgMode, setSelectedBgMode] = useState<string>("auto");
  const [equippedFrontEffect, setEquippedFrontEffect] = useState<string>("effect_none");
  const [titleEquipped, setTitleEquipped] = useState<string>("title_none");
  const [interiorItem, setInteriorItem] = useState<string>("none");

  const [selectedLeader, setSelectedLeader] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [upgradeSelectedCharId, setUpgradeSelectedCharId] = useState<string>("11111111-1111-1111-1111-111111111111");

  const handleUpdateProfile = async () => {
    if (!session) return;
    if (!username.trim()) {
      setErrorMessage("ユーザー名は空欄にできません。");
      return;
    }
    setProfileLoading(true);
    playCyberSe("click");

    // 🛡️ チート対策: 未解放の背景・称号・装飾の不正設定をバリデーション遮断
    let safeBg = selectedBgMode;
    let safeTitle = titleEquipped;
    let safeInterior = interiorItem;

    if (safeBg === "bg_kabukicho" && userLevel < 5) safeBg = "auto";
    if (safeBg === "bg_wharf" && !userGuild) safeBg = "auto";
    if (safeBg === "bg_bazar" && cash < 20000) safeBg = "auto";

    if (safeTitle === "title_kabukicho_emperor" && userLevel < 15) safeTitle = "title_none";
    if (safeTitle === "title_neon_overlord" && diamonds < 300) safeTitle = "title_none";
    if (safeTitle === "title_gvg_champion" && !userGuild) safeTitle = "title_none";

    setSelectedBgMode(safeBg);
    setTitleEquipped(safeTitle);
    setInteriorItem(safeInterior);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          current_base_id: currentBaseId,
          favorite_character_id: selectedLeader,
          title_equipped: safeTitle,
          equipped_background: equippedBackground,
          equipped_front_effect: equippedFrontEffect,
          selected_bg_mode: safeBg,
          interior_item: safeInterior
        })
        .eq("id", session.user.id);
      
      if (error) {
        if (error.code === "23505") {
          setErrorMessage("このユーザー名は既に他のプレイヤーが登録しています。");
          setProfileLoading(false);
          return;
        }
        throw error;
      }

      await syncBootstrapData(session.user.id);
      setShowSettingsPanel(false);
      alert("プロフィールを同期保存しました。");
    } catch (err: any) {
      console.warn("Profile update failed:", err.message);
      setErrorMessage("プロフィールの更新に失敗しました。");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleSound = async (type: "bgm" | "se") => {
    if (!session) return;
    initAudio();

    const prevBgm = bgmEnabled;
    const prevSe = seEnabled;

    const nextBgm = type === "bgm" ? !bgmEnabled : bgmEnabled;
    const nextSe = type === "se" ? !seEnabled : seEnabled;

    if (type === "bgm") {
      setBgmEnabled(nextBgm);
      if (nextBgm) {
        setTimeout(() => startCyberBgm(), 50);
      } else {
        stopCyberBgm();
      }
    } else {
      setSeEnabled(nextSe);
    }

    if (type === "se" && nextSe) {
      setTimeout(() => {
        const audioCtx = getAudioCtx();
        if (audioCtx) {
          const now = audioCtx.currentTime;
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g); g.connect(audioCtx.destination);
          o.frequency.setValueAtTime(1000, now);
          g.gain.setValueAtTime(0.04, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.09);
        }
      }, 50);
    } else if (type === "bgm" && nextSe) {
      playCyberSe("click");
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          sound_settings: { bgm: nextBgm, se: nextSe }
        })
        .eq("id", session.user.id);

      if (error) throw error;
    } catch (err) {
      console.warn("Sound setting sync failed, rolling back:", err);
      if (type === "bgm") {
        setBgmEnabled(prevBgm);
        if (prevBgm) startCyberBgm();
        else stopCyberBgm();
      } else {
        setSeEnabled(prevSe);
      }
      setErrorMessage("音響設定の同期に失敗したため、元の設定に戻しました。");
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
    interiorItem, setInteriorItem,
    selectedLeader, setSelectedLeader,
    upgradeSelectedCharId, setUpgradeSelectedCharId,
    handleUpdateProfile,
    handleToggleSound
  };
}
