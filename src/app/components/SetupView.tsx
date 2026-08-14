"use client";

import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import "./SetupView.css";

export default function SetupView() {
  const [showNameConfirmation, setShowNameConfirmation] = useState(false);
  const {
    setupUsername,
    setSetupUsername,
    setupGiftCode,
    setSetupGiftCode,
    setupLoading,
    handleInitializeUser,
    handleFirstUserInteraction,
    errorMessage,
    setErrorMessage,
  } = useGame();

  useEffect(() => {
    const invitationCode = new URLSearchParams(window.location.search).get("invite");
    if (invitationCode) setSetupGiftCode(invitationCode.toUpperCase().slice(0, 8));
  }, [setSetupGiftCode]);

  return (
    <div
      className="setup-container flex-col-center bg-black justify-center scroll-container"
      onClick={handleFirstUserInteraction}
    >
      <div className="setup-box auth-box border-cyan-glow background-black-80 shadow-cyan-20">
        <h2 className="setup-title font-size-18 text-color-cyan font-weight-bold mb-1">
          プレイヤー登録
        </h2>
        <p className="font-size-8 text-secondary mb-4">
          ゲームで使用する名前を入力してください。
        </p>

        <div className="flex-col-gap-3 text-left">
          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">
              プレイヤー名（8文字まで）
            </label>
            <input
              type="text"
              placeholder="プレイヤー名を入力"
              value={setupUsername}
              onChange={(event) => setSetupUsername(event.target.value)}
              maxLength={8}
              className="bg-black border-subtle text-white font-size-10 p-2 rounded outline-none width-100"
            />
          </div>

          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">
              招待コード（任意）
            </label>
            <input
              type="text"
              placeholder="8文字の招待コード"
              value={setupGiftCode}
              onChange={(event) => setSetupGiftCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
              maxLength={8}
              className="bg-black border-subtle text-white font-size-10 p-2 rounded outline-none width-100"
            />
            {setupGiftCode && <span className="font-size-7 text-color-cyan mt-1 block">招待URLからコードを受け取りました。</span>}
          </div>

          <button
            onClick={() => setShowNameConfirmation(true)}
            disabled={setupLoading || !setupUsername.trim()}
            className="claim-reward-btn mt-4 font-weight-bold py-2 flex-row-center-spinner active-scale-effect justify-center"
          >
            {setupLoading ? <div className="spinner" /> : "入力内容を確認する"}
          </button>
        </div>
      </div>

      {showNameConfirmation && (
        <div className="modal-overlay">
          <div className="modal-card border-cyan-glow">
            <div className="modal-title">プレイヤー名の確認</div>
            <div className="modal-desc">「{setupUsername.trim()}」でゲームを開始しますか？</div>
            <div className="setup-confirm-actions">
              <button className="sub-btn" onClick={() => setShowNameConfirmation(false)} disabled={setupLoading}>戻る</button>
              <button
                className="claim-reward-btn"
                disabled={setupLoading}
                onClick={() => void (async () => {
                  await handleInitializeUser();
                  setShowNameConfirmation(false);
                })()}
              >
                {setupLoading ? <div className="spinner" /> : "この名前で始める"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">エラー</div>
            <div className="modal-desc">{errorMessage}</div>
            <button className="modal-close-btn background-danger active-scale-effect" onClick={() => setErrorMessage(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
