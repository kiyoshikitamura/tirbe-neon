"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { BASE_MAP_MASTER } from "@/utils/game_constants";
import "./SetupView.css";

export default function SetupView() {
  const {
    setupUsername,
    setSetupUsername,
    setupAreaId,
    setSetupAreaId,
    setupGiftCode,
    setSetupGiftCode,
    setupLoading,
    handleInitializeUser,
    handleFirstUserInteraction,
    errorMessage,
    setErrorMessage,
    setupGender,
    setSetupGender,
    setupHairId,
    setSetupHairId,
    setupFaceId,
    setSetupFaceId
  } = useGame();

  return (
    <div 
      className="setup-container app-container flex-col-center h-screen bg-black justify-center scroll-container" 
      onClick={handleFirstUserInteraction}
    >
      <div className="setup-box auth-box border-cyan-glow background-black-80 shadow-cyan-20">
        <h2 className="setup-title font-size-18 text-color-cyan font-weight-bold mb-1">
          ユーザー登録
        </h2>
        <p className="font-size-8 text-secondary mb-4">首領のユーザー名、初期滞在拠点を決定します。</p>

        <div className="flex-col-gap-3 text-left">
          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">ユーザー名 (一意・重複不可)</label>
            <input 
              type="text" 
              placeholder="ユーザー名を入力してください" 
              value={setupUsername}
              onChange={(e) => setSetupUsername(e.target.value)}
              maxLength={12}
              className="bg-black border-subtle text-white font-size-10 p-2 rounded outline-none width-100"
            />
          </div>

          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">初期滞在拠点</label>
            <select 
              value={setupAreaId}
              onChange={(e) => setSetupAreaId(e.target.value)}
              className="bg-black border-subtle text-color-cyan font-size-10 p-2 rounded outline-none width-100"
            >
              {BASE_MAP_MASTER.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">ギフトコード (任意)</label>
            <input 
              type="text" 
              placeholder="招待された方はギフトコードを入力してください" 
              value={setupGiftCode}
              onChange={(e) => setSetupGiftCode(e.target.value.toUpperCase())}
              className="bg-black border-subtle text-white font-size-10 p-2 rounded outline-none width-100"
            />
          </div>

          <button 
            onClick={handleInitializeUser}
            disabled={setupLoading || !setupUsername.trim()}
            className="claim-reward-btn mt-4 font-weight-bold py-2 flex-row-center-spinner active-scale-effect justify-center"
          >
            {setupLoading ? <div className="spinner" /> : "ユーザー登録 ＆ 抗争参入"}
          </button>
        </div>
      </div>

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
