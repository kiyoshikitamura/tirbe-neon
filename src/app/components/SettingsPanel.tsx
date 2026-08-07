import React, { useState } from "react";
import { supabase } from "@/utils/supabase";
import { PROFILE_BACKGROUNDS, PROFILE_FRONT_EFFECTS, PROFILE_INTERIORS } from "@/utils/game_constants";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import OutlawButton from "./ui/OutlawButton";
import "./SettingsPanel.css";

const QA_EMAIL = "izasama39@gmail.com";

export default function SettingsPanel() {
  const game = useGame();
  const [qaLoading, setQaLoading] = useState(false);
  const isOpen = game.showSettingsPanel;
  const canProvisionQa = game.session?.user?.email === QA_EMAIL;
  const hasSharedCosmetic = (id: string) => game.ownedHomeCosmeticIds === null || game.ownedHomeCosmeticIds.includes(id);
  const availableBackgrounds = PROFILE_BACKGROUNDS.filter((item) => hasSharedCosmetic(item.id));
  const availableFrontEffects = PROFILE_FRONT_EFFECTS.filter((item) => hasSharedCosmetic(item.id));
  const availableInteriors = PROFILE_INTERIORS.filter((item) => hasSharedCosmetic(item.id === "none" ? "interior_none" : item.id));

  if (!isOpen) return null;

  const close = () => {
    game.setErrorMessage("");
    game.setShowSettingsPanel(false);
  };

  const provisionQa = async () => {
    if (!canProvisionQa || !game.session?.user?.id) return;
    setQaLoading(true);
    try {
      const { error } = await supabase.rpc("provision_qa_fixture");
      if (error) throw error;
      const { error: cosmeticError } = await supabase.rpc("provision_qa_cosmetic_fixture");
      if (cosmeticError && cosmeticError.code !== "PGRST202") throw cosmeticError;
      await game.syncBootstrapData(game.session.user.id);
      game.playCyberSe("click");
    } catch (error) {
      const message = error instanceof Error ? error.message : "テストデータの投入に失敗しました。";
      game.setErrorMessage(`テストデータ投入エラー（${message}）`);
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <FullScreenPanel title="設定 / プロフィール" onClose={close}>
      <div className="settings-panel-container-inner">
        {game.errorMessage && <div className="settings-error-message">{game.errorMessage}</div>}

        <section className="settings-section">
          <h4 className="settings-section-title">プレイヤー情報</h4>
          <div className="settings-field"><label>プレイヤー名</label><input className="settings-input" value={game.username} maxLength={8} onChange={(event) => game.setUsername(event.target.value)} /></div>
          <div className="settings-field"><label>自己紹介（Bio）</label><textarea className="settings-textarea" value={game.bio} maxLength={200} rows={3} onChange={(event) => game.setBio(event.target.value)} /></div>
          <div className="settings-field"><label>称号</label><select className="settings-select" value={game.titleEquipped} onChange={(event) => game.setTitleEquipped(event.target.value)}><option value="title_none">称号なし</option>{game.ownedTitles.map((title: { id: string; name: string }) => <option key={title.id} value={title.id}>{title.name}</option>)}</select></div>
        </section>

        <section className="settings-section">
          <h4 className="settings-section-title">ホーム演出</h4>
          <p className="settings-help-text">所持中の装飾のみ選択できます。未所持品はイベント・ランキング・ギルド報酬などで追加されます。</p>
          <div className="settings-field"><label>背景</label><select className="settings-select" value={game.selectedBgMode} onChange={(event) => { game.setSelectedBgMode(event.target.value); game.setEquippedBackground(event.target.value); }}><option value="auto">現在地に合わせる</option>{availableBackgrounds.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.desc}</option>)}</select></div>
          <div className="settings-field"><label>前景エフェクト</label><select className="settings-select" value={game.equippedFrontEffect} onChange={(event) => game.setEquippedFrontEffect(event.target.value)}>{availableFrontEffects.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.desc}</option>)}</select></div>
          <div className="settings-field"><label>内装オブジェクト</label><select className="settings-select" value={game.interiorItem} onChange={(event) => game.setInteriorItem(event.target.value)}>{availableInteriors.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.desc}</option>)}</select></div>
        </section>

        {canProvisionQa && <section className="settings-section"><h4 className="settings-section-title">QAテストデータ</h4><p className="settings-help-text">このアカウントのテスト用所持データを再投入します。</p><OutlawButton variant="secondary" fullWidth disabled={qaLoading} onClick={() => void provisionQa()}>{qaLoading ? "投入中..." : "テストデータを投入"}</OutlawButton></section>}
        <section className="settings-section"><h4 className="settings-section-title">システム設定</h4><div className="settings-field"><label>BGM</label><div className="settings-toggle-group"><button className={`settings-toggle-btn ${game.bgmEnabled ? "active" : ""}`} onClick={() => !game.bgmEnabled && void game.handleToggleSound("bgm")}>ON</button><button className={`settings-toggle-btn ${!game.bgmEnabled ? "active" : ""}`} onClick={() => game.bgmEnabled && void game.handleToggleSound("bgm")}>OFF</button></div></div><div className="settings-field"><label>SE</label><div className="settings-toggle-group"><button className={`settings-toggle-btn ${game.seEnabled ? "active" : ""}`} onClick={() => !game.seEnabled && void game.handleToggleSound("se")}>ON</button><button className={`settings-toggle-btn ${!game.seEnabled ? "active" : ""}`} onClick={() => game.seEnabled && void game.handleToggleSound("se")}>OFF</button></div></div></section>
        <div className="settings-panel-footer"><OutlawButton variant="primary" fullWidth disabled={game.profileLoading} onClick={() => void game.handleUpdateProfile()}>{game.profileLoading ? "保存中..." : "保存する"}</OutlawButton></div>
      </div>
    </FullScreenPanel>
  );
}
