import React, { useState } from "react";
import { supabase } from "@/utils/supabase";
import { PROFILE_BACKGROUNDS, PROFILE_FRONT_EFFECTS, PROFILE_INTERIORS } from "@/utils/game_constants";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import OutlawButton from "./ui/OutlawButton";
import "./SettingsPanel.css";
import { USER_BIO_MAX_LENGTH } from "@/domain/presentation/userBio";

const QA_EMAIL = "izasama39@gmail.com";
const QA_TOOLS_ENABLED = process.env.NEXT_PUBLIC_APP_ENV === "development"
  && process.env.NEXT_PUBLIC_ENABLE_QA_TOOLS === "true";

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; details?: unknown; code?: unknown };
    const message = typeof candidate.message === "string" ? candidate.message : "";
    const details = typeof candidate.details === "string" ? candidate.details : "";
    const code = typeof candidate.code === "string" ? candidate.code : "";
    return [message, details, code].filter(Boolean).join(" / ") || "詳細不明のデータベースエラー";
  }
  return "詳細不明のデータベースエラー";
}

export default function SettingsPanel() {
  const game = useGame();
  const [qaLoading, setQaLoading] = useState(false);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const displayedBio = bioDraft ?? game.bio;
  const isOpen = game.showSettingsPanel;
  const canProvisionQa = QA_TOOLS_ENABLED && game.session?.user?.email === QA_EMAIL;
  const hasSharedCosmetic = (id: string) => game.ownedHomeCosmeticIds === null || game.ownedHomeCosmeticIds.includes(id);
  const availableBackgrounds = PROFILE_BACKGROUNDS.filter((item) => hasSharedCosmetic(item.id));
  const availableFrontEffects = PROFILE_FRONT_EFFECTS.filter((item) => hasSharedCosmetic(item.id));
  const availableInteriors = PROFILE_INTERIORS.filter((item) => hasSharedCosmetic(item.id === "none" ? "interior_none" : item.id));

  if (!isOpen) return null;

  const close = () => {
    game.setErrorMessage("");
    setBioDraft(null);
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
      const { error: characterCosmeticError } = await supabase.rpc("provision_qa_character_cosmetic_fixture");
      if (characterCosmeticError && characterCosmeticError.code !== "PGRST202") throw characterCosmeticError;
      const { error: uiReviewError } = await supabase.rpc("provision_qa_ui1_fixture");
      if (uiReviewError && uiReviewError.code !== "PGRST202") throw uiReviewError;
      await game.syncBootstrapData(game.session.user.id);
      game.playCyberSe("click");
    } catch (error) {
      const message = getSupabaseErrorMessage(error);
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
          <h4 className="settings-section-title">プロフィール設定</h4>
          <div className="settings-field"><label>プレイヤー名</label><input className="settings-input" value={game.username} maxLength={8} onChange={(event) => game.setUsername(event.target.value)} /></div>
          <div className="settings-field settings-bio-field"><label htmlFor="profile-bio">自己紹介</label><textarea id="profile-bio" className="settings-textarea" value={displayedBio} maxLength={USER_BIO_MAX_LENGTH} rows={4} placeholder="自己紹介を入力" onChange={(event) => setBioDraft(event.target.value)} /><div className="settings-bio-meta"><span>{Array.from(displayedBio).length} / {USER_BIO_MAX_LENGTH}</span><OutlawButton variant="primary" disabled={game.profileLoading || displayedBio.trim() === game.bio} onClick={() => void game.handleUpdateBio(displayedBio)}>保存</OutlawButton></div></div>
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
        <section className="settings-section">
          <h4 className="settings-section-title">サウンド設定</h4>
          <div className="settings-audio-row">
            <div className="settings-audio-heading"><label htmlFor="bgm-volume">BGM</label><output>{Math.round(game.bgmVolume * 100)}%</output></div>
            <div className="settings-toggle-group">
              <button className={`settings-toggle-btn ${game.bgmEnabled ? "active" : ""}`} onClick={() => game.setBgmEnabled(true)}>ON</button>
              <button className={`settings-toggle-btn ${!game.bgmEnabled ? "active" : ""}`} onClick={() => game.setBgmEnabled(false)}>OFF</button>
            </div>
            <input id="bgm-volume" className="settings-volume" type="range" min="0" max="1" step="0.05" value={game.bgmVolume} disabled={!game.bgmEnabled} onChange={(event) => game.setBgmVolume(Number(event.target.value))} />
          </div>
          <div className="settings-audio-row">
            <div className="settings-audio-heading"><label htmlFor="se-volume">SE</label><output>{Math.round(game.seVolume * 100)}%</output></div>
            <div className="settings-toggle-group">
              <button className={`settings-toggle-btn ${game.seEnabled ? "active" : ""}`} onClick={() => game.setSeEnabled(true)}>ON</button>
              <button className={`settings-toggle-btn ${!game.seEnabled ? "active" : ""}`} onClick={() => game.setSeEnabled(false)}>OFF</button>
            </div>
            <input id="se-volume" className="settings-volume" type="range" min="0" max="1" step="0.05" value={game.seVolume} disabled={!game.seEnabled} onChange={(event) => game.setSeVolume(Number(event.target.value))} />
          </div>
          <p className="settings-help-text">この端末のブラウザに保存されます。</p>
        </section>
        <div className="settings-panel-footer">
          <OutlawButton variant="primary" fullWidth disabled={game.profileLoading} onClick={() => void game.handleUpdateProfile()}>{game.profileLoading ? "保存中..." : "保存する"}</OutlawButton>
          <OutlawButton
            variant="danger"
            fullWidth
            className="mt-3"
            onClick={() => {
              game.setShowSettingsPanel(false);
              void game.handleLogout();
            }}
          >
            ログアウト
          </OutlawButton>
        </div>
      </div>
    </FullScreenPanel>
  );
}
