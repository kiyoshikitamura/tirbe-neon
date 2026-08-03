"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import OutlawButton from "./ui/OutlawButton";
import { supabase } from "@/utils/supabase";
import "./MonthlyPassBanner.css";

export default function MonthlyPassBanner() {
  const { 
    playCyberSe, setConfirmDialogConfig, session,
    monthlyPassActive, monthlyPassClaimedToday,
    handlePurchaseMonthlyPass, handleClaimDailyPassReward
  } = useGame();

  const handlePurchase = async () => {
    playCyberSe("click");
    setConfirmDialogConfig({
      isOpen: true,
      title: "VIPパス購入",
      message: "月額パス (VIPパス) を購入しますか？",
      confirmText: "購入する",
      cancelText: "キャンセル",
      onConfirm: async () => {
        setConfirmDialogConfig(null);
        const res = await handlePurchaseMonthlyPass();
        if (res?.success) {
          setConfirmDialogConfig({
            isOpen: true,
            title: "購入完了",
            message: "VIPパスを購入しました！毎日ダイヤを受け取れます。",
            confirmText: "OK",
            onConfirm: () => setConfirmDialogConfig(null)
          });
        } else {
          setConfirmDialogConfig({
            isOpen: true,
            title: "購入失敗",
            message: res?.message || "購入に失敗しました。",
            confirmText: "OK",
            onConfirm: () => setConfirmDialogConfig(null)
          });
        }
      },
      onCancel: () => setConfirmDialogConfig(null)
    });
  };

  const handleClaim = async () => {
    playCyberSe("click");
    if (monthlyPassClaimedToday) return;
    
    const res = await handleClaimDailyPassReward();
    if (res?.success) {
      setConfirmDialogConfig({
        isOpen: true,
        title: "報酬獲得",
        message: "VIPパスデイリー報酬: ダイヤx100 を受け取りました。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig(null)
      });
    } else {
      setConfirmDialogConfig({
        isOpen: true,
        title: "エラー",
        message: res?.message || "報酬の受け取りに失敗しました。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig(null)
      });
    }
  };

  return (
    <div className="monthly-pass-banner p-3 mb-3 flex-col-gap-2">
      <div className="flex-row-space-between align-center">
        <div className="flex-col">
          <span className="font-size-10 font-weight-bold" style={{ color: "var(--neon-gold, #ffd700)" }}>VIP PASS</span>
          <div className="monthly-pass-content flex-col gap-2 relative z-10 w-full">
            {monthlyPassActive ? (
              <div className="flex-col items-center gap-1 w-full text-center">
                <span className="font-size-8 font-weight-bold text-white text-shadow-black">
                  VIPパス有効中
                </span>
                <span className="font-size-6 text-emerald-300">
                  {monthlyPassClaimedToday ? "本日の報酬は受け取り済みです。" : "本日のダイヤ(100個)を受け取れます。"}
                </span>
                <OutlawButton 
                  variant={monthlyPassClaimedToday ? "secondary" : "primary"}
                  onClick={handleClaim}
                  className="mt-2 py-1 px-4"
                  disabled={monthlyPassClaimedToday}
                >
                  {monthlyPassClaimedToday ? "受取済" : "報酬を受け取る"}
                </OutlawButton>
              </div>
            ) : (
              <div className="flex-col items-center gap-2">
                <span className="font-size-7 text-secondary">毎日ログインでダイヤを獲得</span>
                <OutlawButton variant="danger" onClick={handlePurchase} className="px-4 py-1 font-size-8">
                  購入する
                </OutlawButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
