"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import TutorialNavigator from "./TutorialNavigator";
import "./SetupView.css";

export default function SetupView() {
  const [showRegistration, setShowRegistration] = useState(false);
  const [showNameConfirmation, setShowNameConfirmation] = useState(false);
  const submitRef = useRef(false);
  const { setupUsername,setSetupUsername,setupGiftCode,setSetupGiftCode,setupLoading,handleInitializeUser,handleFirstUserInteraction,errorMessage,setErrorMessage } = useGame();

  useEffect(() => {
    const invitationCode = new URLSearchParams(window.location.search).get("invite");
    if (invitationCode) setSetupGiftCode(invitationCode.toUpperCase().slice(0,8));
  }, [setSetupGiftCode]);

  const confirmName = async () => {
    if (submitRef.current) return;
    submitRef.current=true;
    try { await handleInitializeUser(); setShowNameConfirmation(false); }
    finally { submitRef.current=false; }
  };

  return (
    <div className={`setup-container scroll-container ${showRegistration ? "is-registration" : "is-world-entry"}`} onClick={handleFirstUserInteraction}>
      <div className="setup-world-shade" aria-hidden="true" />
      {!showRegistration ? (
        <div className="setup-box setup-intro-box auth-box">
          <span className="setup-world-kicker">NEON TOKYO / 20XX</span>
          <h1>ルールのない街で、<br />何者になる？</h1>
          <TutorialNavigator message="ようこそ。まずはあなたの名前を教えて。アタシはアゲハ。" />
          <button className="semantic-cta semantic-cta--primary setup-primary-action" onClick={() => { handleFirstUserInteraction(); setShowRegistration(true); }}>名前を決める</button>
        </div>
      ) : (
        <div className="setup-box auth-box">
          <span className="setup-world-kicker">PLAYER REGISTRATION</span>
          <h2 className="setup-title ui-type-screen-title">名前を教えて</h2>
          <p className="ui-type-body text-secondary mb-4">ゲーム内で表示するプレイヤー名です。</p>
          <label htmlFor="setup-player-name">プレイヤー名（8文字まで）</label>
          <input id="setup-player-name" type="text" autoComplete="nickname" placeholder="プレイヤー名を入力" value={setupUsername} onChange={event=>setSetupUsername(event.target.value)} maxLength={8} className="setup-name-input width-100" />
          {setupGiftCode ? <div className="setup-invite-status" role="status">招待URLを確認しました</div> : (
            <details className="setup-invite-details"><summary>招待コードをお持ちの方</summary><label htmlFor="setup-invite-code">招待コード（任意）</label><input id="setup-invite-code" type="text" autoCapitalize="characters" placeholder="8文字の招待コード" value={setupGiftCode} onChange={event=>setSetupGiftCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8))} maxLength={8} className="setup-invite-input width-100" /></details>
          )}
          <button onClick={()=>setShowNameConfirmation(true)} disabled={setupLoading||!setupUsername.trim()} className="semantic-cta semantic-cta--primary setup-primary-action">この名前で進む</button>
        </div>
      )}

      {showNameConfirmation && <div className="modal-overlay"><div className="modal-card"><div className="modal-title">プレイヤー名の確認</div><div className="modal-desc">「{setupUsername.trim()}」でゲームを始めますか？</div><div className="setup-confirm-actions"><button className="semantic-cta semantic-cta--secondary" onClick={()=>setShowNameConfirmation(false)} disabled={setupLoading}>戻る</button><button className="semantic-cta semantic-cta--primary" aria-busy={setupLoading} disabled={setupLoading} onClick={()=>void confirmName()}>{setupLoading?"登録中...":"この名前で始める"}</button></div></div></div>}
      {errorMessage && <div className="modal-overlay"><div className="modal-card border-danger"><div className="modal-title text-color-danger">エラー</div><div className="modal-desc">{errorMessage}</div><button className="semantic-cta semantic-cta--danger" onClick={()=>setErrorMessage(null)}>閉じる</button></div></div>}
    </div>
  );
}
