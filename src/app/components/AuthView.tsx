"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./AuthView.css";

export default function AuthView() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    setupLoading,
    handleEmailLogin,
    handleEmailSignup,
    handleGoogleLogin,
    handleGoogleDemoLogin,
    handleFirstUserInteraction,
    errorMessage,
    setErrorMessage
  } = useGame();

  return (
    <div className="auth-container" onClick={handleFirstUserInteraction}>
      <div className="auth-card">
        <h1 className="auth-title blink">
          TRIBE: NEON REIGN
        </h1>
        <p className="auth-subtitle">Tokyo Syndicate System</p>
        
        <div className="flex-col-gap-3">
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
          
          <div className="flex-row-gap-4 mt-2">
            <button 
              onClick={handleEmailLogin}
              disabled={setupLoading}
              className="auth-btn-cyan active-scale-effect"
            >
              {setupLoading ? <div className="spinner" /> : "ログイン"}
            </button>
            <button 
              onClick={handleEmailSignup}
              disabled={setupLoading}
              className="auth-btn-magenta-outline active-scale-effect"
            >
              {setupLoading ? <div className="spinner" /> : "新規登録"}
            </button>
          </div>

          <div className="border-top-ultra-subtle pt-4 mt-2">
            <button 
              onClick={handleGoogleLogin}
              disabled={setupLoading}
              className="auth-btn-google active-scale-effect"
            >
              Googleでログイン
            </button>

            <button 
              onClick={handleGoogleDemoLogin}
              disabled={setupLoading}
              className="auth-btn-google-demo active-scale-effect"
            >
              Googleデモ認証でテスト
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="auth-error-text mt-4">{errorMessage}</p>
        )}
      </div>

      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">エラー</div>
            <div className="modal-desc">{errorMessage}</div>
            <button 
              className="modal-close-btn background-danger active-scale-effect" 
              onClick={() => setErrorMessage(null)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
