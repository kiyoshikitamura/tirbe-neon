"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../../context/GameContext";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import {
  aggregateRankingRewardItems,
  parsePendingRankingRewardNotification,
  type PendingRankingRewardNotification,
} from "@/domain/ranking/rankingRewardNotification";
import { supabase } from "@/utils/supabase";

export default function RankingRewardNotificationController() {
  const {
    activeTab,
    session,
    confirmDialogConfig,
    setConfirmDialogConfig,
    setGlobalInteractionBlocking,
    loginBonusCheckComplete,
    showLoginBonusModal,
    showAccountAuthenticationModal,
  } = useGame();
  const [pending, setPending] = useState<PendingRankingRewardNotification | null>(null);
  const previousHomeRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const requestedUserRef = useRef<string | null>(null);
  const presentedKeyRef = useRef<string | null>(null);

  const pendingKey = pending?.notificationIds.join(":") || null;
  const rewards = useMemo(() => aggregateRankingRewardItems(pending?.grants || []).map((reward) => ({
    ...reward,
    name: canonicalItemName(reward.id),
  })), [pending]);

  useEffect(() => {
    const userId = session?.user?.id || null;
    if (requestedUserRef.current !== userId) {
      requestedUserRef.current = userId;
      previousHomeRef.current = false;
      presentedKeyRef.current = null;
      setPending(null);
    }
    const isHome = activeTab === "home";
    const enteredHome = isHome && !previousHomeRef.current;
    previousHomeRef.current = isHome;
    if (!userId || !enteredHome || requestInFlightRef.current) return;

    let cancelled = false;
    requestInFlightRef.current = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_pending_ranking_reward_notification");
        if (!cancelled && !error) setPending(parsePendingRankingRewardNotification(data));
        if (!cancelled && error) console.warn("Failed to load ranking reward notification", error);
      } finally {
        requestInFlightRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, session?.user?.id]);

  useEffect(() => {
    if (activeTab !== "home"
      || !pending
      || !pendingKey
      || presentedKeyRef.current === pendingKey
      || confirmDialogConfig
      || !loginBonusCheckComplete
      || showLoginBonusModal
      || showAccountAuthenticationModal) return;

    presentedKeyRef.current = pendingKey;
    const acknowledge = async () => {
      setGlobalInteractionBlocking(true);
      try {
        const { data, error } = await supabase.rpc("acknowledge_ranking_reward_notifications", {
          p_notification_ids: pending.notificationIds,
        });
        if (error) throw error;
        if (Number(data?.acknowledged) !== pending.notificationIds.length) {
          throw new Error("ranking reward notification acknowledgement was incomplete");
        }
        setPending(null);
        setConfirmDialogConfig(null);
      } finally {
        setGlobalInteractionBlocking(false);
      }
    };
    setConfirmDialogConfig({
      isOpen: true,
      title: "ランキング報酬獲得",
      message: "ランキング報酬を獲得しました。",
      confirmText: "閉じる",
      cancelText: "",
      onConfirm: acknowledge,
      onCancel: acknowledge,
      kind: "reward",
      rewards,
      delivery: "PRESENT",
      presentation: "canonical",
    });
  }, [
    activeTab,
    confirmDialogConfig,
    loginBonusCheckComplete,
    pending,
    pendingKey,
    rewards,
    setConfirmDialogConfig,
    setGlobalInteractionBlocking,
    showAccountAuthenticationModal,
    showLoginBonusModal,
  ]);

  return null;
}
