import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import FullScreenPanel from "./ui/FullScreenPanel";
import OutlawButton from "./ui/OutlawButton";
import { CHARACTERS_MASTER, PROFILE_BACKGROUNDS, PROFILE_FRONT_EFFECTS, PROFILE_INTERIORS } from "@/utils/game_constants";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import "./SettingsPanel.css";

export default function SettingsPanel() {
  const {
    showSettingsPanel,
    setShowSettingsPanel,
    username,
    setUsername,
    bio,
    setBio,
    titleEquipped,
    setTitleEquipped,
    ownedTitles,
    equippedBackground,
    setEquippedBackground,
    selectedBgMode,
    setSelectedBgMode,
    equippedFrontEffect,
    setEquippedFrontEffect,
    interiorItem,
    setInteriorItem,
    bgmEnabled,
    seEnabled,
    handleUpdateProfile,
    handleToggleSound,
    profileLoading,
    errorMessage,
    setErrorMessage,
    playCyberSe
    ,session
    ,syncBootstrapData
  } = useGame();
  const [qaLoading, setQaLoading] = useState(false);
  const canProvisionQa = session?.user?.email === "izasama39@gmail.com";

  if (!showSettingsPanel) return null;

  const handleClose = () => {
    if (setErrorMessage) setErrorMessage("");
    setShowSettingsPanel(false);
  };

  const handleSave = async () => {
    await handleUpdateProfile();
  };

  const handleProvisionQa = async () => {
    if (!canProvisionQa || !session?.user?.id) return;
    setQaLoading(true);
    try {
      const userId = session.user.id;
      const roster = CHARACTERS_MASTER.slice(0, 5).map((character, index) => ({
        user_id: userId, character_id: character.id, level: 35 - index * 3, awakening_level: Math.max(0, 3 - index)
      }));
      const { data: characters, error: characterError } = await supabase
        .from("user_characters")
        .upsert(roster, { onConflict: "user_id,character_id" })
        .select("id, character_id");
      if (characterError || !characters?.length) throw new Error(`キャラ: ${characterError?.message || "投入結果が取得できません"}`);

      await Promise.all([
        supabase.from("user_equipments").delete().eq("user_id", userId),
        supabase.from("user_skills").delete().eq("user_id", userId)
      ]);
      const gear = EQUIPMENTS_MASTER_DATA.filter((item) => item.rarity === "SSR" || item.rarity === "SR").slice(0, 15).map((item, index) => ({
        user_id: userId, equipment_id: item.id, level: 20 + (index % 5) * 5, plus_val: index % 4,
        equipped_character_id: characters[index % characters.length].id, slot_index: index % 5, random_options: []
      }));
      const skills = SKILLS_MASTER_DATA.filter((item) => item.is_obtainable).slice(0, 20).map((item, index) => ({
        user_id: userId, skill_card_id: item.id, plus_val: index % 3,
        equipped_character_id: characters[index % characters.length].id, slot_index: index % 4
      }));
      const [{ error: gearError }, { error: skillError }, { error: itemError }] = await Promise.all([
        supabase.from("user_equipments").insert(gear),
        supabase.from("user_skills").insert(skills),
        supabase.from("user_items").upsert([
          { user_id: userId, item_id: "TRAINING_MANUAL", quantity: 50 },
          { user_id: userId, item_id: "EQUIP_EXP_M", quantity: 80 },
          { user_id: userId, item_id: "LAW_OF_STRIFE", quantity: 20 }
        ], { onConflict: "user_id,item_id" })
      ]);
      if (gearError) throw new Error(`装備: ${gearError.message}`);
      if (skillError) throw new Error(`スキル: ${skillError.message}`);
      if (itemError) throw new Error(`所持品: ${itemError.message}`);
      const { error: userError } = await supabase.from("users").update({ cash: 500000, neon_diamonds: 3000, favorite_character_id: characters[0].character_id }).eq("id", userId);
      if (userError) throw new Error(`通貨: ${userError.message}`);
      await syncBootstrapData(userId);
      playCyberSe("click");
    } catch (error) {
      console.warn("QA fixture provisioning failed", error);
      setErrorMessage(error instanceof Error ? `テストデータ投入エラー（${error.message}）` : "テストデータの投入に失敗しました。");
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <FullScreenPanel title="設定 / プロフィール" onClose={handleClose}>
      <div className="settings-panel-container-inner">
        {errorMessage && <div className="settings-error-message">{errorMessage}</div>}

        <div className="settings-section">
          <h4 className="settings-section-title">プレイヤー情報</h4>
          
          <div className="settings-field">
            <label>プレイヤー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="プレイヤー名を入力"
              maxLength={8}
              className="settings-input"
            />
          </div>

          <div className="settings-field">
            <label>自己紹介 (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="自己紹介を入力"
              maxLength={200}
              className="settings-textarea"
              rows={3}
            />
          </div>
          
          <div className="settings-field">
            <label>称号</label>
            <select
              value={titleEquipped}
              onChange={(e) => setTitleEquipped(e.target.value)}
              className="settings-select"
            >
              {ownedTitles.map((title: { id: string; name: string }) => (
                <option key={title.id} value={title.id}>{title.name}</option>
              ))}
              <optgroup label="未獲得称号" disabled>
              <option value="ルーキー">ルーキー</option>
              <option value="半グレの首領">半グレの首領</option>
              <option value="新宿の狂犬">新宿の狂犬</option>
              <option value="伝説の始まり">伝説の始まり</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h4 className="settings-section-title">ホーム演出</h4>
          <div className="settings-field">
            <label>背景</label>
            <select value={selectedBgMode} onChange={(e) => { setSelectedBgMode(e.target.value); setEquippedBackground(e.target.value); }} className="settings-select">
              <option value="auto">現在地に合わせる</option>
              {PROFILE_BACKGROUNDS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label>前景エフェクト</label>
            <select value={equippedFrontEffect} onChange={(e) => setEquippedFrontEffect(e.target.value)} className="settings-select">
              {PROFILE_FRONT_EFFECTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="settings-field">
            <label>内装オブジェクト</label>
            <select value={interiorItem} onChange={(e) => setInteriorItem(e.target.value)} className="settings-select">
              {PROFILE_INTERIORS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h4 className="settings-section-title">システム設定</h4>
          <div className="settings-field">
            <label>BGM</label>
            <div className="settings-toggle-group">
              <button
                type="button"
                className={`settings-toggle-btn ${bgmEnabled ? "active" : ""}`}
                onClick={() => { if (!bgmEnabled) void handleToggleSound("bgm"); }}
                aria-pressed={bgmEnabled}
              >
                ON
              </button>
              <button
                type="button"
                className={`settings-toggle-btn ${!bgmEnabled ? "active" : ""}`}
                onClick={() => { if (bgmEnabled) void handleToggleSound("bgm"); }}
                aria-pressed={!bgmEnabled}
              >
                OFF
              </button>
            </div>
          </div>
          <div className="settings-field">
            <label>SE</label>
            <div className="settings-toggle-group">
              <button
                type="button"
                className={`settings-toggle-btn ${seEnabled ? "active" : ""}`}
                onClick={() => { if (!seEnabled) void handleToggleSound("se"); }}
                aria-pressed={seEnabled}
              >
                ON
              </button>
              <button
                type="button"
                className={`settings-toggle-btn ${!seEnabled ? "active" : ""}`}
                onClick={() => { if (seEnabled) void handleToggleSound("se"); }}
                aria-pressed={!seEnabled}
              >
                OFF
              </button>
            </div>
          </div>
        </div>

        {canProvisionQa && (
          <div className="settings-section">
            <h4 className="settings-section-title">QAテストデータ</h4>
            <p className="settings-help-text">複数キャラ、装備、スキル、育成素材をこのアカウントへ再投入します。</p>
            <OutlawButton variant="secondary" onClick={() => void handleProvisionQa()} disabled={qaLoading} fullWidth>
              {qaLoading ? "投入中..." : "テストデータを投入"}
            </OutlawButton>
          </div>
        )}

        <div className="settings-panel-footer">
          <OutlawButton
            variant="primary"
            onClick={handleSave}
            disabled={profileLoading}
            fullWidth
          >
            {profileLoading ? <div className="spinner" /> : "保存する"}
          </OutlawButton>
        </div>
      </div>
    </FullScreenPanel>
  );
}
