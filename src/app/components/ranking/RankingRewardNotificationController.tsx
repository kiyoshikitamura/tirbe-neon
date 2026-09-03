"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../../context/GameContext";
import { canonicalItemName } from "@/domain/gameplay/canonical/items";
import {
  aggregateRankingRewardReceipts,
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
    showPrepMissionDialog,
    prepMissionDialogCheckComplete,
    setRankingRewardNotificationCheckComplete,
  } = useGame();
  const [pending, setPending] = useState<PendingRankingRewardNotification | null>(null);
  const previousHomeRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const requestedUserRef = useRef<string | null>(null);
  const presentedKeyRef = useRef<string | null>(null);

  const pendingKey = pending?.notificationIds.join(":") || null;
  const rewards = useMemo(() => aggregateRankingRewardReceipts(pending?.grants || []).map((reward) => ({
    ...reward,
    name: reward.displayName || canonicalItemName(reward.id),
    kind: reward.rewardKind,
  })), [pending]);
  const hasItemRewards = rewards.some((reward) => reward.kind === "ITEM");
  const hasCosmeticRewards = rewards.some((reward) => reward.kind === "COSMETIC");

  useEffect(() => {
    const userId = session?.user?.id || null;
    if (requestedUserRef.current !== userId) {
      requestedUserRef.current = userId;
      previousHomeRef.current = false;
      presentedKeyRef.current = null;
      setPending(null);
      setRankingRewardNotificationCheckComplete(false);
    }
    const isHome = activeTab === "home";
    const enteredHome = isHome && !previousHomeRef.current;
    previousHomeRef.current = isHome;
    if (!isHome) {
      setRankingRewardNotificationCheckComplete(false);
      return;
    }
    if (!userId || !enteredHome || requestInFlightRef.current) return;
    setRankingRewardNotificationCheckComplete(false);

    let cancelled = false;
    requestInFlightRef.current = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_pending_ranking_reward_notification");
        if (!cancelled && !error) {
          const parsed = parsePendingRankingRewardNotification(data);
          setPending(parsed);
          if (!parsed) setRankingRewardNotificationCheckComplete(true);
        }
        if (!cancelled && error) console.warn("Failed to load ranking reward notification", error);
        if (!cancelled && error) setRankingRewardNotificationCheckComplete(true);
      } finally {
        requestInFlightRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, session?.user?.id, setRankingRewardNotificationCheckComplete]);

  useEffect(() => {
    if (activeTab !== "home"
      || !pending
      || !pendingKey
      || presentedKeyRef.current === pendingKey
      || confirmDialogConfig
      || !loginBonusCheckComplete
      || showLoginBonusModal
      || !prepMissionDialogCheckComplete
      || showPrepMissionDialog
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
        setRankingRewardNotificationCheckComplete(true);
      } finally {
        setGlobalInteractionBlocking(false);
      }
    };
    setConfirmDialogConfig({
      isOpen: true,
      title: "ランキング報酬獲得",
      message: hasCosmeticRewards
        ? `${hasItemRewards ? "アイテム報酬はバッグへ直接付与されました。\n" : ""}ギルド装飾を獲得しました。\nランキング報酬の限定ギルド装飾は、正式オープン後のギルド装飾機能追加時に使用できるようになります。`
        : "ランキング報酬はバッグへ直接付与されました。",
      confirmText: "閉じる",
      cancelText: "",
      onConfirm: acknowledge,
      onCancel: acknowledge,
      kind: "reward",
      rewards,
      delivery: "INVENTORY",
      presentation: "canonical",
    });
  }, [
    activeTab,
    confirmDialogConfig,
    loginBonusCheckComplete,
    pending,
    pendingKey,
    prepMissionDialogCheckComplete,
    rewards,
    hasCosmeticRewards,
    hasItemRewards,
    setConfirmDialogConfig,
    setGlobalInteractionBlocking,
    setRankingRewardNotificationCheckComplete,
    showAccountAuthenticationModal,
    showLoginBonusModal,
    showPrepMissionDialog,
  ]);

  return null;
}
