import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import OutlawButton from "./ui/OutlawButton";
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
    bgmEnabled,
    seEnabled,
    handleUpdateProfile,
    handleToggleSound,
    profileLoading,
    errorMessage,
    setErrorMessage,
    playCyberSe
  } = useGame();

  if (!showSettingsPanel) return null;

  const handleClose = () => {
    if (setErrorMessage) setErrorMessage("");
    setShowSettingsPanel(false);
  };

  const handleSave = async () => {
    await handleUpdateProfile();
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
