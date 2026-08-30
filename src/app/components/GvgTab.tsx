"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import { BASE_MAP_MASTER } from "../../utils/game_constants";
import { CHARACTERS_MASTER } from "../../utils/game_constants";
import { getCurrentSession, getGvgPhase } from "../../utils/gvg_utils";
import GvgMatchStatusPanel from "./GvgMatchStatusPanel";
import HubPage from "./ui/HubPage";
import HeroPanel from "./ui/HeroPanel";
import Badge from "./ui/Badge";
import OutlawButton from "./ui/OutlawButton";
import PeriodStatus from "./ui/PeriodStatus";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import "./GvgTab.css";

type GvgBaseView = { id: string; rank: string; name: string; controlledBy: string; description: string; topPoints: number };
type UserCharacterView = { id: string; character_id: string; level: number };

export default function GvgTab() {
  const {
    userGuild,
    handleGvgDailyReset,
    handleGvgSeasonReset,
    gvgResetLoading,
    gvgBases,
    gvgSeasonDay,
    setGvgSeasonDay,
    myGvgMatch,
    gvgDefenseDeck,
    gvgActiveRound,
    setGvgActiveRound,
    startCardBattle,
    handleDeployGvgDefense,
    navigateTab,
    userCharactersDbList,
    playCyberSe,
    setConfirmDialogConfig,
    vitality,
    featureOperatingStates
  } = useGame();
  const isGvgOpen = featureOperatingStates?.GVG === "OPEN";

  const [showDefenseModal, setShowDefenseModal] = useState<boolean>(false);
  const [tempSelectedChars, setTempSelectedChars] = useState<string[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [officialMatch, setOfficialMatch] = useState<any | null>(null);
  const readiness = useScreenReadiness({ assets: SCREEN_ASSET_MANIFESTS.gvg });
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userGuild?.id || !isGvgOpen) {
      setOfficialMatch(null);
      return;
    }
    const loadOfficialMatch = async () => {
      const { data } = await supabase.from("gvg_match_sessions").select("id,status,scheduled_start_at,scheduled_end_at")
        .or(`guild_a_id.eq.${userGuild.id},guild_b_id.eq.${userGuild.id}`)
        .in("status", ["MATCHING", "CONFIRMED", "ACTIVE"])
        .order("scheduled_start_at", { ascending: true }).limit(1).maybeSingle();
      setOfficialMatch(data || null);
    };
    void loadOfficialMatch();
    const timer = window.setInterval(() => void loadOfficialMatch(), 5000);
    return () => window.clearInterval(timer);
  }, [isGvgOpen, userGuild?.id]);
  
  const currentSession = getCurrentSession(now);
  const phase = getGvgPhase(now);
  
  const formatTimeLeft = (target: Date) => {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  const [countdownStr, setCountdownStr] = useState<string>("30:00");

  // カウントダウンエミュレーション
  useEffect(() => {
    if (gvgActiveRound === 0) return;
    
    // 単純な30分カウントダウン（シミュレート用）
    let secondsLeft = 30 * 60;
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        setCountdownStr("00:00");
      } else {
        const m = Math.floor(secondsLeft / 60);
        const s = secondsLeft % 60;
        setCountdownStr(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gvgActiveRound]);

  const openDefenseModal = () => {
    playCyberSe?.("click");
    // 既存デッキがあれば初期ロード
    if (gvgDefenseDeck) {
      const ids = [
        gvgDefenseDeck.character_1_id,
        gvgDefenseDeck.character_2_id,
        gvgDefenseDeck.character_3_id,
        gvgDefenseDeck.character_4_id,
        gvgDefenseDeck.character_5_id
      ].filter(Boolean);
      setTempSelectedChars(ids);
    } else {
      setTempSelectedChars([]);
    }
    setShowDefenseModal(true);
  };

  const toggleCharSelection = (charId: string) => {
    playCyberSe?.("click");
    if (tempSelectedChars.includes(charId)) {
      setTempSelectedChars(prev => prev.filter(id => id !== charId));
    } else {
      if (tempSelectedChars.length >= 5) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "エラー",
          message: "守備メンバーは最大5名までです。",
          confirmText: "OK",
          onConfirm: () => setConfirmDialogConfig({ isOpen: false })
        });
        return;
      }
      setTempSelectedChars(prev => [...prev, charId]);
    }
  };

  const saveDefenseDeck = async () => {
    if (tempSelectedChars.length === 0) {
      setConfirmDialogConfig({
        isOpen: true,
        title: "エラー",
        message: "守備デッキには最低1名のキャラクターを選択してください。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig({ isOpen: false })
      });
      return;
    }
    await handleDeployGvgDefense(tempSelectedChars);
    setShowDefenseModal(false);
  };

  const removeDefenseDeck = async () => {
    setConfirmDialogConfig({
      isOpen: true,
      title: "確認",
      message: "守備デッキの登録を解除しますか？",
      confirmText: "解除",
      cancelText: "キャンセル",
      onConfirm: async () => {
        setConfirmDialogConfig({ isOpen: false });
        await handleDeployGvgDefense([]);
        setShowDefenseModal(false);
      },
      onCancel: () => setConfirmDialogConfig({ isOpen: false })
    });
  };

  const getRoundLabel = (round: number) => {
    if (round === 1) return "第1部 (12:00〜12:30)";
    if (round === 2) return "第2部 (20:00〜20:30)";
    if (round === 3) return "第3部 (23:00〜23:30)";
    return "準備中";
  };

  const isFinalDay = phase === "FINALS";
  const isOfficialActive = isGvgOpen && officialMatch?.status === "ACTIVE";

  // 自ギルドのアライメントと一致する守備（ホーム）拠点を動的マッピング
  const myGuildAlignment = userGuild?.main_alignment || "";
  const getHomeBaseId = (align: string) => {
    if (align === "ORDER") return "shinjuku";
    if (align === "EVIL") return "shibuya";
    if (align === "CHAOS") return "ikebukuro";
    if (align === "JUSTICE") return "roppongi";
    return "akihabara";
  };
  const myHomeBaseId = getHomeBaseId(myGuildAlignment);

  // マッチング対戦相手のギルド名を取得
  const opponentGuildName = myGvgMatch
    ? (myGvgMatch.guild_a_id === userGuild?.id ? myGvgMatch.guild_b?.name : myGvgMatch.guild_a?.name) || "対戦組織"
    : "対戦相手なし (NPC)";

  return (
    <HubPage
      className="gvg-view"
      eyebrow="GUILD VS GUILD"
      title="ギルドバトル（GvG）"
      description="連合の仲間と役割を分担し、決められた時間に敵対連合と競います。"
      status={readiness.status}
      onRetry={readiness.retry}
      headerAction={(
        <OutlawButton
          onClick={() => navigateTab("ranking", "season")}
          variant="ghost"
        >
          順位
        </OutlawButton>
      )}
    >

      <HeroPanel className={`gvg-hero gvg-phase-${phase.toLowerCase()}`}>
        <div className="gvg-hero-status">
          <div className="gvg-countdown-label">
            <Badge tone={isOfficialActive ? "danger" : "magenta"}>
              {isOfficialActive ? "BATTLE LIVE" : isGvgOpen ? "PREPARATION" : "COMING SOON"}
            </Badge>
            <span>{isOfficialActive ? "公式マッチ終了まで" : "次のギルドバトル開始まで"}</span>
          </div>
          <strong>{isOfficialActive
            ? formatTimeLeft(new Date(officialMatch.scheduled_end_at))
            : currentSession?.nextStartsAt
              ? formatTimeLeft(currentSession.nextStartsAt)
              : "--:--:--"}</strong>
        </div>
        <p>{userGuild ? `${userGuild.name}のギルドバトル状況` : "ギルドバトルへの参加にはギルド所属が必要です。"}</p>
      </HeroPanel>

      <PeriodStatus
        label="月次GvGシーズン"
        range={isFinalDay ? "月末特別戦期間" : "通常戦期間"}
        remaining={isOfficialActive
          ? formatTimeLeft(new Date(officialMatch.scheduled_end_at))
          : currentSession?.nextStartsAt
            ? formatTimeLeft(currentSession.nextStartsAt)
            : "--:--:--"}
        cadence="公式マッチの状態は下段に表示"
        tone="magenta"
      />

      <div className="gvg-content">
        {userGuild ? (
          <div className="flex-col-gap-3">
            {isGvgOpen ? (
              <GvgMatchStatusPanel guildId={userGuild.id} />
            ) : (
              <div className="gvg-console-layout p-4" role="status">
                <strong className="text-color-cyan">GvGは準備中です</strong>
                <p className="font-size-8 text-secondary mt-2">開催予定時刻は 12:00 / 20:00 / 23:00 です。開始までは編成や開催情報のみ確認できます。</p>
              </div>
            )}
            {/* 旧拠点制の移行中表示。公式マッチ以外では侵攻できない。 */}
            <div className="gvg-console-layout p-3 flex-col-gap-2" hidden>
              <div className="flex-row-space-between align-center">
                <div>
                  <span className="battle-card-title block text-color-cyan">旧拠点制情報（参照のみ）</span>
                  <span className="font-size-7 text-secondary">※実機検証・テスト用に時間帯や日数を手動で進められます。</span>
                </div>
                <div className="flex-row-gap-2">
                  <button
                    onClick={handleGvgDailyReset}
                    disabled={gvgResetLoading}
                    className="sub-btn border-cyan-subtle font-size-7 height-20 px-2 active-scale-effect"
                  >
                    24:00 日次集計
                  </button>
                  <button
                    onClick={handleGvgSeasonReset}
                    disabled={gvgResetLoading}
                    className="sub-btn border-danger font-size-7 height-20 px-2 active-scale-effect text-color-danger"
                  >
                    シーズン終了
                  </button>
                </div>
              </div>
              <div className="border-top-subtle pt-2 flex-row-space-between align-center">
                <div className="flex-row-gap-2 align-center">
                  <span className="font-size-8 text-secondary">開催期:</span>
                  <select
                    value={gvgActiveRound}
                    onChange={(e) => {
                      playCyberSe?.("click");
                      setGvgActiveRound(Number(e.target.value));
                    }}
                    className="font-size-8 bg-black-60 border-subtle text-white rounded height-20 px-1"
                  >
                    <option value={0}>非開催（準備中）</option>
                    <option value={1}>第1部 (12:00〜)</option>
                    <option value={2}>第2部 (20:00〜)</option>
                    <option value={3}>第3部 (23:00〜)</option>
                  </select>
                </div>
                <div className="flex-row-gap-2 align-center">
                  <span className="font-size-8 text-secondary">シーズン経過日数:</span>
                  <select
                    value={gvgSeasonDay}
                    onChange={(e) => {
                      playCyberSe?.("click");
                      setGvgSeasonDay(Number(e.target.value));
                    }}
                    className="font-size-8 bg-black-60 border-subtle text-white rounded height-20 px-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <option key={d} value={d}>{d}日目{d === 7 ? " (決戦水曜)" : " (通常日)"}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-row-space-between align-center border-top-subtle pt-2 mt-2">
                <div className="flex-col">
                  <span className="font-size-7 text-secondary">開催状況 (リアルタイム)</span>
                  {currentSession?.isActive ? (
                    <span className="font-size-9 font-weight-bold text-color-cyan">
                      第{currentSession.id}部 開催中 (終了まで: {formatTimeLeft(currentSession.endsAt)})
                    </span>
                  ) : (
                    <span className="font-size-9 font-weight-bold text-secondary">
                      準備中 (次回 第{currentSession?.id}部 開始まで: {currentSession?.nextStartsAt ? formatTimeLeft(currentSession.nextStartsAt) : "--:--:--"})
                    </span>
                  )}
                </div>
                <div className="flex-col align-end">
                  <span className="font-size-7 text-secondary">フェーズ</span>
                  <span className="font-size-9 font-weight-bold text-white">
                    {phase === "FINALS" ? "月末本戦 (FINALS)" : "通常戦 (DAILY)"}
                  </span>
                </div>
              </div>
            </div>

            {/* 本日の戦況HUD */}
            <div className="hud-panel p-3 flex-col-gap-2" hidden>
              <div className="flex-row-space-between align-center">
                <span className="font-size-9 font-weight-bold text-white">
                  {isFinalDay ? "【頂上決戦】決戦日・水曜日" : `GvG シーズン経過: ${gvgSeasonDay}日目`}
                </span>
                <span className="font-size-8 text-secondary">
                  ラウンド状態: <span className={gvgActiveRound > 0 ? "text-color-cyan font-weight-bold" : "text-secondary"}>
                    {getRoundLabel(gvgActiveRound)}
                  </span>
                </span>
              </div>

              {gvgActiveRound > 0 ? (
                <div className="bg-black-40 border-subtle rounded p-2 flex-col-gap-1">
                  <div className="flex-row-space-between align-center">
                    <span className="font-size-8 text-color-cyan">ラウンド開催中！</span>
                    <span className="font-size-8 text-secondary">残り時間: <span className="text-white font-weight-bold">{countdownStr}</span></span>
                  </div>
                  <div className="border-top-subtle mt-1 pt-1 flex-row-space-between align-center">
                    <div className="flex-col">
                      <span className="font-size-7 text-secondary">対戦ギルド</span>
                      <span className="font-size-9 font-weight-bold text-white">{opponentGuildName}</span>
                    </div>
                    <div className="flex-row-gap-2 align-center">
                      <div className="text-right">
                        <span className="font-size-7 block text-secondary">自ギルドpt / 相手pt</span>
                        <span className="font-size-9 font-weight-bold text-color-cyan">
                          {myGvgMatch ? `${myGvgMatch.guild_a_id === userGuild.id ? myGvgMatch.guild_a_points : myGvgMatch.guild_b_points} pts` : "0 pts"}
                        </span>
                        <span className="font-size-8 text-secondary"> / </span>
                        <span className="font-size-9 font-weight-bold text-color-magenta">
                          {myGvgMatch ? `${myGvgMatch.guild_a_id === userGuild.id ? myGvgMatch.guild_b_points : myGvgMatch.guild_a_points} pts` : "0 pts"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black-40 border-subtle rounded p-2 text-center font-size-8 text-secondary">
                  現在、ギルドバトルの開催時間外です。メンバーは「守備登録」を行い、次戦に備えてください。
                </div>
              )}
            </div>

            {/* 自分の守備拠点情報 */}
            <div className="gvg-base-card my-home-base p-3 flex-col-gap-2">
              <div className="flex-row-space-between align-center">
                <div>
                  <span className="font-size-10 font-weight-bold text-color-cyan block">
                    守備拠点: {BASE_MAP_MASTER.find(b => b.id === myHomeBaseId)?.name || "設定なし"}
                  </span>
                  <span className="font-size-7 text-secondary">（ギルドのメインアライメントと一致する拠点を防衛します）</span>
                </div>
                <button
                  onClick={openDefenseModal}
                  disabled={gvgResetLoading}
                  className="sub-btn border-cyan height-26 px-3 font-weight-bold active-scale-effect text-color-cyan"
                >
                  {gvgResetLoading ? <span className="simple-spinner" /> : "守備登録"}
                </button>
              </div>

              <div className="bg-black-40 border-subtle rounded p-2 flex-col-gap-1">
                <span className="font-size-8 font-weight-bold text-white block">現在の守備デッキ登録状態:</span>
                {gvgDefenseDeck ? (
                  <div className="flex-row-gap-2 align-center mt-1">
                    <span className="font-size-8 text-color-cyan font-weight-bold bg-black-60 px-2 py-0.5 rounded">配備済</span>
                    <span className="font-size-8 text-secondary">更新日時: {new Date(gvgDefenseDeck.updated_at).toLocaleString()}</span>
                  </div>
                ) : (
                  <span className="font-size-8 text-color-danger">※守備デッキが未登録です！ 侵攻に備えて登録してください。</span>
                )}
              </div>
            </div>

            {/* 侵攻先拠点リスト */}
            <div className="list-container flex-col-gap-2" hidden>
              <span className="font-size-9 font-weight-bold text-secondary px-1">侵攻対象拠点 (守備拠点以外の地区へ侵攻可能)</span>
              {(gvgBases as GvgBaseView[]).map((b) => {
                const isHome = b.id === myHomeBaseId;
                const isRoundActive = gvgActiveRound > 0;

                return (
                  <div key={b.id} className={`list-item flex-col-gap-2 p-3 gvg-base-card ${isHome ? "opacity-60" : ""}`}>
                    <div className="flex-row-space-between align-center">
                      <div className="flex-col">
                        <div className="flex-row-gap-2 align-center">
                          <span className={`gvg-rank-badge-${b.rank.toLowerCase()} font-size-8 font-weight-bold px-2 py-0.5 rounded`}>
                            Rank {b.rank}
                          </span>
                          <span className="font-size-10 font-weight-bold text-white">{b.name}</span>
                        </div>
                      </div>
                      <div className="flex-row-gap-2 align-center">
                        <span className="font-size-8 bg-black-60 border-subtle px-2 py-0.5 rounded text-white">
                          支配: {b.controlledBy}
                        </span>
                        {isHome && <span className="font-size-7 bg-cyan-subtle text-color-cyan px-2 py-0.5 rounded font-weight-bold">ホーム</span>}
                      </div>
                    </div>

                    <div className="font-size-8 text-secondary line-height-14">{b.description}</div>

                    {!isHome && (
                      <div className="flex-row-space-between align-center border-top-subtle pt-2 mt-1">
                        <div className="flex-col">
                          <span className="font-size-7 text-secondary">他組織ポイント</span>
                          <span className="font-size-9 font-weight-bold text-white">{b.topPoints} pts</span>
                        </div>
                        <div className="flex-row-gap-2">
                          <button
                            onClick={() => navigateTab("ranking", "daily")}
                            className="sub-btn border-subtle font-size-8 height-26 px-3 active-scale-effect"
                          >
                            デイリー順位
                          </button>
                          <button
                            disabled
                            onClick={() => startCardBattle("GVG", `${b.name}防衛チーム`, b.id)}
                            className={`sub-btn height-26 px-4 font-size-8 font-weight-bold active-scale-effect ${
                              isRoundActive && vitality >= 20 ? "border-cyan text-color-cyan" : "border-subtle text-secondary opacity-50"
                            }`}
                          >
                            旧拠点制は廃止
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 練習用: 自ギルドの防衛チームとの演習バトル */}
            <div className="gvg-base-card p-3 flex-row-space-between align-center border-magenta-subtle" hidden>
              <div className="flex-col">
                <span className="font-size-9 font-weight-bold text-color-magenta block">防衛演習 (練習バトル)</span>
                <span className="font-size-7 text-secondary">自ギルドの登録防衛デッキと模擬戦を行い、防衛力を試せます。</span>
              </div>
              <button
                disabled
                onClick={() => startCardBattle("GVG", "防衛演習", userGuild.id)}
                className="sub-btn border-magenta-subtle text-color-magenta height-26 px-4 font-size-8 font-weight-bold active-scale-effect"
              >
                新GvGへ統合
              </button>
            </div>
          </div>
        ) : (
          <div className="battle-card border-danger text-color-danger font-size-10 text-center p-4">
            ギルド未所属のため、ギルドバトルに参加できません。
          </div>
        )}
      </div>

      {/* 守備デッキ登録モーダル */}
      {showDefenseModal && (
        <div className="gvg-modal-overlay">
          <div className="gvg-modal-content">
            <div className="gvg-modal-header">
              <span className="font-size-10 font-weight-bold text-white">守備デッキの配備</span>
              <button
                onClick={() => {
                  playCyberSe?.("click");
                  setShowDefenseModal(false);
                }}
                className="sub-btn border-none font-size-10 text-secondary active-scale-effect"
              >
                ✕
              </button>
            </div>
            <div className="gvg-modal-body flex-col-gap-2">
              <span className="font-size-8 text-secondary block">
                手持ちキャラクターから守備メンバー（最大5名）を選択してください。(選択中: {tempSelectedChars.length}/5名)
              </span>
              <div className="character-select-grid mt-2">
                {(userCharactersDbList as UserCharacterView[]).map((char) => {
                  const master = CHARACTERS_MASTER.find(c => c.id === char.character_id);
                  const isSelected = tempSelectedChars.includes(char.id);
                  const avatarUrl = master?.img || "/characters/reiji_transparent_asset.png";

                  return (
                    <div
                      key={char.id}
                      onClick={() => toggleCharSelection(char.id)}
                      className={`char-select-card ${isSelected ? "selected" : ""}`}
                    >
                      <Image src={avatarUrl} alt={master?.jpName || "キャラクター"} width={72} height={72} className="char-select-img mb-1" />
                      <span className="font-size-7 text-white font-weight-bold truncate block w-full text-center">
                        {master?.jpName || "キャラクター"}
                      </span>
                      <span className="font-size-6 text-secondary">Lv.{char.level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="gvg-modal-footer flex-row-space-between">
              {gvgDefenseDeck && (
                <button
                  onClick={removeDefenseDeck}
                  disabled={gvgResetLoading}
                  className="sub-btn border-danger text-color-danger px-3 font-size-8 height-26 active-scale-effect"
                >
                  配備解除
                </button>
              )}
              <div className="flex-row-gap-2 ml-auto">
                <button
                  onClick={() => setShowDefenseModal(false)}
                  className="sub-btn border-subtle px-3 font-size-8 height-26 active-scale-effect"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveDefenseDeck}
                  disabled={tempSelectedChars.length === 0 || gvgResetLoading}
                  className="sub-btn border-cyan text-color-cyan px-4 font-size-8 font-weight-bold height-26 active-scale-effect"
                >
                  配備完了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </HubPage>
  );
}
