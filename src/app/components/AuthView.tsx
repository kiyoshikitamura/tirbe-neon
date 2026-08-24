"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./AuthView.css";
import ExternalBrowserGooglePrompt from "./ExternalBrowserGooglePrompt";

export default function AuthView() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    setupLoading,
    handleEmailLogin,
    handleGoogleLogin,
    handleFirstUserInteraction,
    errorMessage,
    setErrorMessage,
    googleExternalBrowserUrl,
    dismissGoogleExternalBrowserPrompt
  } = useGame();

  return (
    <div className="auth-container" onClick={handleFirstUserInteraction}>
      <div className="auth-card">
        <h1 className="auth-title blink">
          TRIBE NEON
        </h1>
        <p className="auth-subtitle">Tokyo Syndicate System</p>
        
        <div className="flex-col-gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={setupLoading}
            className="auth-btn-google semantic-cta semantic-cta--primary width-100 active-scale-effect"
            aria-busy={setupLoading}
          >
            {setupLoading ? "ログイン中..." : "Googleで始める"}
          </button>

          <div className="auth-method-divider"><span>またはメールで続ける</span></div>
          <input 
            type="email" 
            placeholder="メールアドレス" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
          <input 
            type="password" 
            placeholder="パスワード (6文字以上)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          
          <div className="mt-2">
            <button 
              onClick={handleEmailLogin}
              disabled={setupLoading}
              className="auth-btn-cyan semantic-cta semantic-cta--secondary width-100 active-scale-effect"
              aria-busy={setupLoading}
            >
              {setupLoading ? "ログイン中..." : "メールでログイン"}
            </button>
          </div>
        </div>

      </div>

      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">エラー</div>
            <div className="modal-desc">{errorMessage}</div>
            <button 
              className="semantic-cta semantic-cta--danger width-100 active-scale-effect"
              onClick={() => setErrorMessage(null)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {googleExternalBrowserUrl && (
        <ExternalBrowserGooglePrompt
          url={googleExternalBrowserUrl}
          onClose={dismissGoogleExternalBrowserPrompt}
        />
      )}
    </div>
  );
}
