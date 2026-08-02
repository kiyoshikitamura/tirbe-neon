"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import OutlawButton from "./ui/OutlawButton";
import { supabase } from "@/utils/supabase";
import "./MonthlyPassBanner.css";

export default function MonthlyPassBanner() {
  const { playCyberSe, setConfirmDialogConfig, session } = useGame();
  const [passActive, setPassActive] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassStatus = async () => {
      if (!session?.user?.id) return;
      try {
        // mock checking logic (In a real app, this would hit the DB via Context or query)
        const { data, error } = await supabase
          .from("user_monthly_passes")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString());

        if (data && data.length > 0) {
          setPassActive(true);
          const today = new Date().toISOString().split("T")[0];
          setClaimedToday(data[0].daily_claimed_at === today);
        } else {
          setPassActive(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassStatus();
  }, [session]);

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
        try {
          await supabase.rpc("purchase_monthly_pass", { p_user_id: session?.user?.id });
          setPassActive(true);
          setClaimedToday(false);
          setConfirmDialogConfig({
            isOpen: true,
            title: "購入完了",
            message: "VIPパスを購入しました！毎日ダイヤを受け取れます。",
            confirmText: "OK",
            onConfirm: () => setConfirmDialogConfig(null)
          });
        } catch (err: any) {
          console.error(err);
        }
      },
      onCancel: () => setConfirmDialogConfig(null)
    });
  };

  const handleClaim = async () => {
    playCyberSe("click");
    if (claimedToday) return;
    try {
      const res = await supabase.rpc("claim_daily_pass_reward", { p_user_id: session?.user?.id });
      if (res.error) throw res.error;
      setClaimedToday(true);
      setConfirmDialogConfig({
        isOpen: true,
        title: "報酬獲得",
        message: "VIPパスデイリー報酬: ダイヤx100 を受け取りました。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig(null)
      });
    } catch (err: any) {
      console.error(err);
      setConfirmDialogConfig({
        isOpen: true,
        title: "エラー",
        message: err.message || "報酬の受け取りに失敗しました。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig(null)
      });
    }
  };

  if (loading) return null;

  return (
    <div className="monthly-pass-banner p-3 mb-3 flex-col-gap-2">
      <div className="flex-row-space-between align-center">
        <div className="flex-col">
          <span className="font-size-10 font-weight-bold" style={{ color: "var(--neon-gold, #ffd700)" }}>VIP PASS</span>
          <span className="font-size-7 text-secondary">毎日ログインでダイヤを獲得</span>
        </div>
        {!passActive ? (
          <OutlawButton variant="danger" onClick={handlePurchase} className="px-4 py-1 font-size-8">
            購入する
          </OutlawButton>
        ) : (
          <OutlawButton 
            variant={claimedToday ? "secondary" : "primary"} 
            onClick={handleClaim} 
            disabled={claimedToday}
            className="px-4 py-1 font-size-8"
          >
            {claimedToday ? "受取済" : "報酬を受取"}
          </OutlawButton>
        )}
      </div>
    </div>
  );
}
