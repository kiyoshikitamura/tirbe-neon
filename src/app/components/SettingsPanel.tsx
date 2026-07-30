import React from "react";
import { useGame } from "../context/GameContext";
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
    selectedLeader,
    setSelectedLeader,
    handleUpdateProfile,
    profileLoading,
    errorMessage,
    setErrorMessage,
    playCyberSe
  } = useGame();

  if (!showSettingsPanel) return null;

  const handleClose = () => {
    playCyberSe("click");
    if (setErrorMessage) setErrorMessage("");
    setShowSettingsPanel(false);
  };

  const handleSave = async () => {
    playCyberSe("click");
    await handleUpdateProfile();
  };

  return (
    <div className="settings-panel-overlay">
      <div className="settings-panel-container">
        {/* ヘッダー */}
        <div className="settings-panel-header">
          <button className="settings-back-btn active-scale-effect" onClick={handleClose}>
            ‹ 戻る
          </button>
          <div className="settings-title">
            <span>設定 / プロフィール</span>
          </div>
          <div className="settings-header-spacer"></div>
        </div>

        {/* コンテンツエリア */}
        <div className="settings-panel-body scroll-container">
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
                maxLength={20}
                className="settings-input"
              />
            </div>

            <div className="settings-field">
              <label>自己紹介 (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="自己紹介を入力"
                maxLength={100}
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
                <option value="ルーキー">ルーキー</option>
                <option value="半グレの首領">半グレの首領</option>
                <option value="新宿の狂犬">新宿の狂犬</option>
                <option value="伝説の始まり">伝説の始まり</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">システム設定</h4>
            <div className="settings-field">
              <label>サウンド (開発中)</label>
              <div className="settings-toggle-group">
                <button className="settings-toggle-btn active">ON</button>
                <button className="settings-toggle-btn">OFF</button>
              </div>
            </div>
            <div className="settings-field">
              <label>プッシュ通知 (開発中)</label>
              <div className="settings-toggle-group">
                <button className="settings-toggle-btn active">ON</button>
                <button className="settings-toggle-btn">OFF</button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-panel-footer">
          <button
            className="settings-save-btn active-scale-effect"
            onClick={handleSave}
            disabled={profileLoading}
          >
            {profileLoading ? <div className="spinner" /> : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
