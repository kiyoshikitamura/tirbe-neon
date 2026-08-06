"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./SetupView.css";

export default function SetupView() {
  const {
    setupUsername,
    setSetupUsername,
    setupLoading,
    handleInitializeUser,
    handleFirstUserInteraction,
    errorMessage,
    setErrorMessage,
  } = useGame();

  return (
    <div
      className="setup-container app-container flex-col-center h-screen bg-black justify-center scroll-container"
      onClick={handleFirstUserInteraction}
    >
      <div className="setup-box auth-box border-cyan-glow background-black-80 shadow-cyan-20">
        <h2 className="setup-title font-size-18 text-color-cyan font-weight-bold mb-1">
          PLAYER REGISTRATION
        </h2>
        <p className="font-size-8 text-secondary mb-4">
          Enter a player name to begin the tutorial.
        </p>

        <div className="flex-col-gap-3 text-left">
          <div>
            <label className="font-size-9 text-secondary font-weight-bold mb-1 block">
              PLAYER NAME (up to 8 characters)
            </label>
            <input
              type="text"
              placeholder="Enter player name"
              value={setupUsername}
              onChange={(event) => setSetupUsername(event.target.value)}
              maxLength={8}
              className="bg-black border-subtle text-white font-size-10 p-2 rounded outline-none width-100"
            />
          </div>

          <button
            onClick={handleInitializeUser}
            disabled={setupLoading || !setupUsername.trim()}
            className="claim-reward-btn mt-4 font-weight-bold py-2 flex-row-center-spinner active-scale-effect justify-center"
          >
            {setupLoading ? <div className="spinner" /> : "START TUTORIAL"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">ERROR</div>
            <div className="modal-desc">{errorMessage}</div>
            <button className="modal-close-btn background-danger active-scale-effect" onClick={() => setErrorMessage(null)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
