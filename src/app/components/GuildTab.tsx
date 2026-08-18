"use client";

import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import "./GuildTab.css";
import SectionHeader from "./ui/SectionHeader";
import SubTabNav from "./ui/SubTabNav";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";
import FullScreenPanel from "./ui/FullScreenPanel";
import { supabase } from "@/utils/supabase";

const DECORATIONS_SHOP = [
  { id: "bg_neon_kabukicho", name: "歌舞伎町ネオン背景", cost: 5000, type: "DECORATION", desc: "鈍く光るネオン街の夜背景" },
  { id: "bg_industrial_docks", name: "インダストリアルドック背景", cost: 10000, type: "DECORATION", desc: "鉄錆とナイロンギアが似合う倉庫街" },
  { id: "banner_neon_reign", name: "ネオンレイン称号バナー", cost: 3000, type: "BANNER", desc: "銀の金属ベゼル装飾バナー" },
  { id: "banner_kabukicho_king", name: "歌舞伎町キング称号バナー", cost: 8000, type: "BANNER", desc: "鈍い光沢を放つ金のバナー" }
];

export default function GuildTab() {
  const {
    userLevel,
    userGuild,
    userGuildMember,
    cash,
    newGuildName,
    setNewGuildName,
    handleCreateGuild,
    allGuildsDbList,
    handleDemoJoinGuild,
    handleSearchGuilds,
    pendingGuildJoinRequests,
    handleCancelGuildJoinRequest,
    guildJoinRequests,
    handleReviewGuildJoinRequest,
    guildSubTab,
    setGuildSubTab,
    guildMembersList,
    handleUpdateMemberRole,
    handleKickMember,
    handleLeaveGuild,
    handleUpdateGuildAlignment,
    handleUpdateGuildSettings,
    gvgResetLoading,
    getGuildPenaltyState,
    playCyberSe,
    gvgBaseControls,
    // 追加の新機能
    handleDonateToGuild,
    handleBuyGuildDecoration,
    handleEquipGuildDecoration,
    guildLevelMaster,
    fetchGuildDetail,
    setShowTribeChatPanel,
    navigateTab,
    setChatChannel,
    setChatInput
  } = useGame();

  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [donateAmount, setDonateAmount] = useState<number>(1000);
  const [guildSearchQuery, setGuildSearchQuery] = useState("");
  const [guildDescriptionDraft, setGuildDescriptionDraft] = useState(userGuild?.description || "");
  const [approvalRequiredDraft, setApprovalRequiredDraft] = useState(Boolean(userGuild?.approval_required));
  const [recommendedGuilds, setRecommendedGuilds] = useState<any[]>([]);
  useEffect(() => {
    if (userGuild) return;
    void supabase.rpc("get_recommended_guilds", { p_limit: 5 }).then(({ data }) => {
      if (Array.isArray(data)) setRecommendedGuilds(data);
    });
  }, [userGuild?.id]);
  useEffect(() => {
    setGuildDescriptionDraft(userGuild?.description || "");
    setApprovalRequiredDraft(Boolean(userGuild?.approval_required));
  }, [userGuild?.id, userGuild?.description, userGuild?.approval_required]);
  const penalty = getGuildPenaltyState();

  const isMaster = userGuildMember?.role === "MASTER";
  const isSubMaster = userGuildMember?.role === "SUBMASTER" || userGuildMember?.role === "SUB_MASTER";
  const canPurchaseDecorations = isMaster || isSubMaster;
  const canChangeDecorations = isMaster;

  // 支配中拠点の動的取得
  const getControlledBases = () => {
    if (!userGuild || !gvgBaseControls) return [];
    const bases = ["shinjuku", "shibuya", "ikebukuro", "roppongi", "akihabara"];
    const baseNames: { [key: string]: string } = {
      shinjuku: "新宿",
      shibuya: "渋谷",
      ikebukuro: "池袋", roppongi: "六本木", akihabara: "秋葉原",
      
    };

    const controlled: string[] = [];

    bases.forEach(baseId => {
      const baseRecords = gvgBaseControls.filter((c: any) => c.base_id === baseId);
      if (baseRecords.length === 0) return;

      let maxPoints = -1;
      let winnerGuildId = "";
      baseRecords.forEach((r: any) => {
        if (r.daily_points > maxPoints) {
          maxPoints = r.daily_points;
          winnerGuildId = r.guild_id;
        }
      });

      if (winnerGuildId === userGuild.id && maxPoints > 0) {
        controlled.push(baseNames[baseId]);
      }
    });

    return controlled;
  };

  // 外枠ベゼルCSSクラスの取得
  const getLevelBorderClass = (level: number) => {
    if (level >= 30) return "pulsing-gold-border";
    if (level >= 16) return "gold-border";
    if (level >= 6) return "silver-border";
    return "bronze-border";
  };

  const controlledBases = getControlledBases();
  const borderClass = userGuild ? getLevelBorderClass(userGuild.level) : "";
  const decorationClass = userGuild?.equipped_decoration === "bg_neon_kabukicho"
    ? "guild-decoration-neon-kabukicho"
    : userGuild?.equipped_decoration === "bg_industrial_docks"
      ? "guild-decoration-industrial-docks"
      : "";
  const bannerClass = userGuild?.equipped_banner === "banner_neon_reign"
    ? "guild-banner-neon-reign"
    : userGuild?.equipped_banner === "banner_kabukicho_king"
      ? "guild-banner-kabukicho-king"
      : "";

  // アライメント変換マップ
  const alignmentEnToJp: { [key: string]: string } = {
    JUSTICE: "正義",
    EVIL: "悪",
    ORDER: "秩序",
    CHAOS: "混沌"
  };

  if (!userGuild) {
    const joinUnlocked = userLevel >= 3 && !penalty.isPenalty;
    const createUnlocked = userLevel >= 8 && cash >= 5000 && !penalty.isPenalty;
    const recommendationById = new Map(recommendedGuilds.map((guild) => [guild.guild_id, guild]));
    const guildById = new Map(allGuildsDbList.map((guild: any) => [guild.id, guild]));
    recommendedGuilds.forEach((guild: any) => {
      if (!guildById.has(guild.guild_id)) guildById.set(guild.guild_id, { ...guild, id: guild.guild_id });
    });
    const displayGuilds = Array.from(guildById.values()).sort((a: any, b: any) => Number(recommendationById.get(b.id)?.recommendation_score || 0) - Number(recommendationById.get(a.id)?.recommendation_score || 0));
    return (
      <div className="view-container guild-lobby-view">
        <SectionHeader title="ギルド" />
        <div className="scroll-container flex-1 guild-lobby-scroll">
          <section className="guild-lobby-hero">
            <img src="/menu/menu_allies.png" alt="連合" className="guild-lobby-hero-emblem" />
            <div>
              <p className="guild-lobby-kicker">ALLY NETWORK</p>
              <h2>一人では獲れない街がある。</h2>
              <p>仲間と連合を組み、GvGで拠点を奪え。日々の成長は、次の抗争の武器になる。</p>
            </div>
          </section>

          <section className={`guild-lobby-unlock ${joinUnlocked ? "is-ready" : ""}`}>
            <div><span>連合への加入</span><strong>{joinUnlocked ? "参加可能" : `Lv.${userLevel} / Lv.3`}</strong></div>
            <div className="guild-lobby-progress"><span style={{ width: `${Math.min((userLevel / 3) * 100, 100)}%` }} /></div>
            <p>{joinUnlocked ? "加入先を選んで、仲間と活動を始めよう。" : "プレイヤーLv.3で加入先を選べるようになります。"}</p>
          </section>

          {penalty.isPenalty && (
            <div className="guild-lobby-notice">脱退後の参加制限中です。残り {Math.ceil(penalty.secondsLeft / 3600)} 時間</div>
          )}

          <section className="guild-lobby-section">
            <div className="guild-lobby-section-heading"><span>募集中の連合</span><small>Lv.3から加入</small></div>
            <div className="flex gap-2 mb-3">
              <input
                type="search"
                value={guildSearchQuery}
                onChange={(event) => setGuildSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSearchGuilds(guildSearchQuery);
                }}
                maxLength={30}
                placeholder="ギルド名で検索"
                className="flex-1 bg-black-60 border-subtle text-white font-size-9 p-2 rounded outline-none"
              />
              <OutlawButton variant="secondary" onClick={() => void handleSearchGuilds(guildSearchQuery)} disabled={gvgResetLoading}>
                検索
              </OutlawButton>
            </div>
            <div className="guild-lobby-list">
              {displayGuilds.map((g: any) => {
                const activity = recommendationById.get(g.id);
                const pendingRequest = pendingGuildJoinRequests.find((request: any) => request.guild_id === g.id);
                const hasOtherPendingRequest = pendingGuildJoinRequests.length > 0 && !pendingRequest;
                const isFull = Number(g.member_count || 0) >= Number(g.member_limit || 10);
                return (
                <div key={g.id} className="guild-lobby-guild-card">
                  <div className="guild-lobby-guild-mark">連</div>
                  <button className="guild-lobby-guild-info guild-detail-trigger" onClick={() => void fetchGuildDetail(g.id)}>
                    <strong>{g.name}</strong>
                    <span>Lv.{g.level} ・ {g.member_count || 0}/{g.member_limit || 10}名 ・ {g.approval_required ? "承認制" : "即時加入"}</span>
                    <span className="guild-activity-line">活動 {activity?.active_members_7d ?? "-"}人 ・ Raid {Number(activity?.raid_contribution_7d || 0).toLocaleString()} ・ 戦力 {Number(activity?.guild_power || 0).toLocaleString()}</span>
                    <small>詳細・実績を見る ›</small>
                  </button>
                  {pendingRequest ? (
                    <OutlawButton variant="secondary" className="font-size-8 px-3" disabled={gvgResetLoading} onClick={() => void handleCancelGuildJoinRequest(pendingRequest.id)}>
                      申請取消
                    </OutlawButton>
                  ) : (
                    <OutlawButton
                      variant={joinUnlocked && !isFull && !hasOtherPendingRequest ? "primary" : "secondary"}
                      className="font-size-8 px-3"
                      disabled={!joinUnlocked || isFull || hasOtherPendingRequest || gvgResetLoading}
                      onClick={() => handleDemoJoinGuild(g.id, g.name)}
                    >
                      {!joinUnlocked ? "Lv.3で解放" : isFull ? "満員" : hasOtherPendingRequest ? "他へ申請中" : g.approval_required ? "加入申請" : "加入する"}
                    </OutlawButton>
                  )}
                </div>
                );
              })}
              {allGuildsDbList.length === 0 && (
                <div className="font-size-8 text-secondary text-center py-4">条件に一致するギルドはありません。</div>
              )}
            </div>
          </section>

          <section className={`guild-lobby-create ${createUnlocked ? "is-ready" : ""}`}>
            <div className="guild-lobby-section-heading"><span>新しい連合を立ち上げる</span><small>Lv.8 / 5,000 Cash</small></div>
            <p>あなたの看板を掲げ、仲間を集めて街を取りに行く。</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="ギルド名を入力 (12文字)" 
                value={newGuildName}
                onChange={(e) => setNewGuildName(e.target.value)}
                maxLength={12}
                disabled={penalty.isPenalty || cash < 5000 || userLevel < 8}
                className="flex-1 bg-black-60 border-subtle text-white font-size-9 p-2 rounded outline-none"
              />
              <OutlawButton 
                variant={createUnlocked ? "primary" : "secondary"}
                onClick={handleCreateGuild}
                disabled={gvgResetLoading || penalty.isPenalty || cash < 5000 || !newGuildName.trim() || userLevel < 8}
              >
                {gvgResetLoading ? <div className="spinner" /> : userLevel < 8 ? "Lv.8で解放" : cash < 5000 ? "資金不足" : "創設する"}
              </OutlawButton>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // レベルアップ用のXP情報算出
  const currentLvlMaster = guildLevelMaster.find((l: any) => l.level === userGuild.level) || { next_xp: userGuild.level * 1000 };
  const xpNeeded = currentLvlMaster.next_xp;
  const xpPercent = Math.min((userGuild.xp / xpNeeded) * 100, 100);

  return (
    <div className={`view-container guild-main-container ${borderClass} ${decorationClass}`}>
      
      {/* ギルド情報ヘッダーエリア */}
      <div className={`guild-header-hud bg-black-80 p-3 rounded border-bottom-edge ${bannerClass}`}>
        <div className="flex-row-space-between align-center">
          <div>
            <h2 className="guild-title-name text-white font-weight-bold font-size-12">
              {userGuild.name}
            </h2>
            <div className="font-size-8 text-secondary mt-1">
              レベル: <span className="text-white font-bold">{userGuild.level}</span> (XP: {userGuild.xp} / {xpNeeded})
            </div>
          </div>
          <div className="text-right">
            <div className="font-size-7 text-secondary">ギルド資金</div>
            <div className="font-size-10 text-color-cyan font-bold">
              {(userGuild.funds || 0).toLocaleString()} Cash
            </div>
          </div>
        </div>

        {/* 支配拠点表示 */}
        <div className="guild-control-bases mt-2 pt-2 border-t border-gray-800 flex-row-space-between align-center">
          <span className="font-size-7 text-secondary">現在制圧中の抗争拠点:</span>
          <div className="flex gap-1 font-size-7">
            {controlledBases.length > 0 ? (
              controlledBases.map((baseName, idx) => (
                <span key={idx} className="bg-neon-magenta text-black px-2 py-0.5 rounded font-weight-bold">
                  {baseName}
                </span>
              ))
            ) : (
              <span className="text-secondary">なし</span>
            )}
          </div>
        </div>

        {/* XPバー */}
        <div className="xp-bar-container mt-2">
          <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      <section className="guild-welcome-card" aria-label="TRIBEへようこそ">
        <div><small>SYSTEM / WELCOME</small><strong>{userGuild.name}へようこそ</strong></div>
        <p>{userGuild.welcome_message || "加入ありがとう。まずは挨拶して、仲間とレイドへ挑もう。"}</p>
        <OutlawButton variant="primary" onClick={() => {
          setChatChannel("GUILD");
          setChatInput("はじめまして！よろしくお願いします！");
          setShowTribeChatPanel(true);
        }}>挨拶する</OutlawButton>
        <small>定型文は送信前に編集できます。自動送信されません。</small>
      </section>
      <section className="guild-membership-summary" aria-label="所属TRIBE">
        <div><small>MEMBERSHIP</small><strong>所属TRIBE</strong><span>{guildMembersList.length}/{userGuild.member_limit || 10}名 ・ {userGuild.approval_required ? "承認制" : "募集中"}</span></div>
        <div className="guild-membership-actions"><OutlawButton variant="primary" onClick={() => setShowTribeChatPanel(true)}>TRIBE Chat</OutlawButton><OutlawButton variant="secondary" onClick={() => navigateTab("raid")}>レイドへ</OutlawButton></div>
      </section>
      <section className="guild-gvg-coming-soon" aria-label="GvG開催予定">
        <div>
          <small>GvG / PRE-OPEN</small>
          <strong>COMING SOON</strong>
          <span>開催予定 12:00 / 20:00 / 23:00</span>
        </div>
        <p>実戦参加は正式オープン後に、既存の参加条件に従って判定されます。</p>
      </section>
      
      {/* サブタブメニュー */}
      <div className="mt-3">
        <SubTabNav
          tabs={[
            { id: "members", label: "メンバー" },
            { id: "settings", label: "属性設定" },
            { id: "shop", label: "資金＆ショップ" },
          ]}
          activeTabId={guildSubTab}
          onSelect={setGuildSubTab}
        />
      </div>

      <div className="scroll-container flex-1 mt-2">
        
        {/* 1. メンバーリスト表示 */}
        {guildSubTab === "members" && (
          <div className="flex-col-gap-3">
            {isMaster && guildJoinRequests.length > 0 && (
              <OutlawCard glowLine="left">
                <div className="font-bold text-neon-cyan mb-2">加入申請</div>
                <div className="flex-col-gap-2">
                  {guildJoinRequests.map((request: any) => (
                    <div key={request.id} className="list-item flex-row-space-between align-center p-2">
                      <div>
                        <strong className="font-size-9 text-white">{request.user?.username || "申請ユーザー"}</strong>
                        <div className="font-size-7 text-secondary">Lv.{request.user?.level || 1}</div>
                      </div>
                      <div className="flex gap-2">
                        <OutlawButton variant="primary" disabled={gvgResetLoading} onClick={() => void handleReviewGuildJoinRequest(request.id, true)}>承認</OutlawButton>
                        <OutlawButton variant="danger" disabled={gvgResetLoading} onClick={() => void handleReviewGuildJoinRequest(request.id, false)}>却下</OutlawButton>
                      </div>
                    </div>
                  ))}
                </div>
              </OutlawCard>
            )}
            <div className="flex justify-between items-center guild-quit-btn-row p-1">
              <span className="font-size-8 text-secondary">メンバー階級と貢献度（タップで詳細）</span>
              <OutlawButton 
                variant="danger"
                onClick={handleLeaveGuild} 
                disabled={gvgResetLoading}
                className="font-size-8 py-1 px-3"
              >
                {gvgResetLoading ? <div className="spinner" /> : isMaster ? "解散 / 脱退" : "ギルド脱退"}
              </OutlawButton>
            </div>

            <div className="list-container">
              {guildMembersList.map((m: any) => {
                const isMe = m.user_id === userGuildMember.user_id;
                const isLoaderPending = m.userLevel === null;

                return (
                  <div 
                    key={m.id} 
                    className="list-item flex-col-gap-1 p-2 guild-member-card interactive-member-item active-scale-effect"
                    onClick={() => {
                      if (!isLoaderPending) {
                        setSelectedMember(m);
                        playCyberSe("click");
                      }
                    }}
                  >
                    <div className="flex-row-space-between align-center w-full">
                      <div className="flex items-center gap-2 guild-member-info">
                        <img 
                          src={m.users?.avatar_url || "/reiji_transparent_asset.png"} 
                          className="rounded-full border-subtle guild-member-img"
                          alt={m.users?.username} 
                        />
                        <div className="flex flex-col">
                          <span className="font-size-9 font-weight-bold text-white">{m.users?.username || "名無しの幹部"}</span>
                          {isLoaderPending ? (
                            <div className="member-loading-spinner" />
                          ) : (
                            <span className="font-size-7 text-secondary">
                              Lv.{m.userLevel} ｜ 総合力: {m.userPower?.toLocaleString() ?? 0}
                            </span>
                          )}
                        </div>
                        {isMe && <span className="font-size-7 text-color-cyan font-bold">(あなた)</span>}
                      </div>
                      <span className="font-size-8 bg-black-60 px-2 py-0.5 rounded text-secondary border border-gray-800">
                        {m.role === "MASTER" ? "マスター" : ["SUBMASTER", "SUB_MASTER"].includes(m.role) ? "サブマスター" : "一般メンバー"}
                      </span>
                    </div>

                    <div className="flex-row-space-between align-center mt-2 font-size-8 text-secondary border-t border-gray-900 pt-2 w-full">
                      <span>週間貢献度: <span className="text-white font-bold">{m.weekly_contribution || 0}</span></span>
                      {isMaster && !isMe && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <OutlawButton 
                            variant="secondary"
                            className="font-size-7 py-0.5 px-2" 
                            onClick={() => handleUpdateMemberRole(m.user_id, m.users?.username, ["SUBMASTER", "SUB_MASTER"].includes(m.role) ? "MEMBER" : "SUB_MASTER")}
                          >
                            {["SUBMASTER", "SUB_MASTER"].includes(m.role) ? "降格" : "昇格"}
                          </OutlawButton>
                          <OutlawButton
                            variant="secondary"
                            className="font-size-7 py-0.5 px-2"
                            onClick={() => handleUpdateMemberRole(m.user_id, m.users?.username, "MASTER")}
                          >
                            MASTER譲渡
                          </OutlawButton>
                          <OutlawButton 
                            variant="danger"
                            className="font-size-7 py-0.5 px-2" 
                            onClick={() => handleKickMember(m.user_id, m.users?.username)}
                          >
                            追放
                          </OutlawButton>
                        </div>
                      )}
                      {isSubMaster && !isMe && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {m.role === "MEMBER" ? (
                            <OutlawButton 
                              variant="danger"
                              className="font-size-7 py-0.5 px-2" 
                              onClick={() => handleKickMember(m.user_id, m.users?.username)}
                            >
                              追放
                            </OutlawButton>
                          ) : (
                            <span className="font-size-7 text-secondary">権限なし</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. 属性設定表示 */}
        {guildSubTab === "settings" && (
          <div className="flex-col-gap-3">
            <OutlawCard>
              <div className="font-bold text-neon-cyan mb-2">加入・公開設定</div>
              <textarea
                value={guildDescriptionDraft}
                onChange={(event) => setGuildDescriptionDraft(event.target.value)}
                maxLength={200}
                disabled={!isMaster || gvgResetLoading}
                placeholder="ギルド紹介（200文字以内）"
                className="width-100 bg-black-60 border-subtle text-white font-size-8 p-2 rounded outline-none"
              />
              <label className="flex items-center gap-2 mt-3 font-size-8 text-secondary">
                <input
                  type="checkbox"
                  checked={approvalRequiredDraft}
                  onChange={(event) => setApprovalRequiredDraft(event.target.checked)}
                  disabled={!isMaster || gvgResetLoading}
                />
                加入時にMASTERの承認を必要とする
              </label>
              {isMaster && (
                <OutlawButton
                  variant="primary"
                  className="width-100 mt-3"
                  disabled={gvgResetLoading}
                  onClick={() => void handleUpdateGuildSettings(guildDescriptionDraft, approvalRequiredDraft)}
                >
                  設定を保存
                </OutlawButton>
              )}
            </OutlawCard>
            <OutlawCard glowLine="right">
              <div className="font-bold text-neon-magenta mb-1">ギルドアライメント設定</div>
              <p className="font-size-8 text-secondary mt-1 mb-4">GvGの攻撃力・HP倍率ボーナスに影響する属性を決定します。</p>
              
              <div className="flex-col-gap-3 text-left">
                <div>
                  <label className="font-size-8 text-secondary block font-bold mb-1">主アライメント: HP +20% / ATK +20% ボーナス</label>
                  <div className="flex gap-2 mt-1">
                    {["ORDER", "CHAOS"].map(val => {
                      const jpVal = alignmentEnToJp[val] || val;
                      const isSel = userGuild.main_alignment === val;
                      return (
                        <OutlawButton 
                          key={val}
                          variant={isSel ? "neon" : "secondary"}
                          disabled={!isMaster}
                          onClick={() => handleUpdateGuildAlignment(val, userGuild.sub_alignment)}
                          className="flex-1 font-size-8 py-2 font-bold"
                        >
                          {jpVal}
                        </OutlawButton>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2">
                  <label className="font-size-8 text-secondary block font-bold mb-1">副アライメント: HP +10% / ATK +10% ボーナス</label>
                  <div className="flex gap-2 mt-1">
                    {["JUSTICE", "EVIL"].map(val => {
                      const jpVal = alignmentEnToJp[val] || val;
                      const isSel = userGuild.sub_alignment === val;
                      return (
                        <OutlawButton 
                          key={val}
                          variant={isSel ? "neon" : "secondary"}
                          disabled={!isMaster}
                          onClick={() => handleUpdateGuildAlignment(userGuild.main_alignment, val)}
                          className="flex-1 font-size-8 py-2 font-bold"
                        >
                          {jpVal}
                        </OutlawButton>
                      );
                    })}
                  </div>
                </div>
              </div>
            </OutlawCard>
          </div>
        )}

        {/* 3. ギルド資金＆装飾ショップ */}
        {guildSubTab === "shop" && (
          <div className="flex-col-gap-3 p-1">
            
            {/* 献金モジュール */}
            <OutlawCard glowLine="left">
              <div className="font-bold text-neon-cyan mb-1">ギルド献金</div>
              <p className="font-size-8 text-secondary mt-1 mb-3">
                個人キャッシュをギルドに寄付し、ギルド資金の追加、ギルドXP・貢献度を獲得します。
              </p>
              
              <div className="flex align-center justify-between gap-3 mt-2">
                <select 
                  value={donateAmount} 
                  onChange={(e) => setDonateAmount(Number(e.target.value))}
                  className="bg-black-60 border-subtle text-white font-size-9 p-2 rounded outline-none flex-1"
                >
                  <option value={1000}>1,000 Cash (XP+20 / 貢献度+10)</option>
                  <option value={5000}>5,000 Cash (XP+120 / 貢献度+60)</option>
                  <option value={10000}>10,000 Cash (XP+300 / 貢献度+150)</option>
                </select>
                <OutlawButton 
                  variant="primary"
                  onClick={() => handleDonateToGuild(donateAmount)}
                  disabled={cash < donateAmount || gvgResetLoading}
                >
                  献金する
                </OutlawButton>
              </div>
              <div className="font-size-7 text-secondary mt-2 text-right">
                あなたの所持金: <span className="text-white font-bold">{cash.toLocaleString()} Cash</span>
              </div>
            </OutlawCard>

            {/* 装飾ショップモジュール */}
            <OutlawCard>
              <div className="font-bold mb-1">装飾ショップ</div>
              <p className="font-size-8 text-secondary mt-1 mb-3">
                ギルド資金を使用して、マイページ背景装飾や称号バナーを購入します。購入はマスター／副マスター、適用・解除はマスターのみ行えます。
              </p>

              <div className="flex-col-gap-2">
                {DECORATIONS_SHOP.map(item => {
                  const unlockField = item.type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
                  const equipField = item.type === "DECORATION" ? "equipped_decoration" : "equipped_banner";
                  
                  const unlockedList = Array.isArray(userGuild[unlockField]) ? userGuild[unlockField] : [];
                  const isUnlocked = unlockedList.includes(item.id);
                  const isEquipped = userGuild[equipField] === item.id;

                  const canAfford = (userGuild.funds || 0) >= item.cost;

                  return (
                    <div key={item.id} className="shop-item-card p-3 rounded bg-black-60 border border-gray-800 mt-2 flex-row-space-between align-center">
                      <div>
                        <div className="font-size-9 font-weight-bold text-white flex items-center gap-2">
                          {item.name}
                          <span className="font-size-7 text-secondary bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                            {item.type === "DECORATION" ? "背景" : "バナー"}
                          </span>
                        </div>
                        <div className="font-size-8 text-secondary mt-1">{item.desc}</div>
                        <div className="font-size-8 text-color-cyan font-bold mt-1">コスト: {item.cost.toLocaleString()} 資金</div>
                      </div>

                      <div className="flex gap-2">
                        {!isUnlocked ? (
                          <OutlawButton 
                            variant="secondary"
                            disabled={!canPurchaseDecorations || !canAfford || gvgResetLoading}
                            onClick={() => handleBuyGuildDecoration(item.id, item.cost, item.type as any)}
                            className="font-size-8 px-3 py-1 text-neon-magenta"
                          >
                            購入
                          </OutlawButton>
                        ) : isEquipped ? (
                          <OutlawButton 
                            variant="secondary"
                            disabled={!canChangeDecorations || gvgResetLoading}
                            onClick={() => handleEquipGuildDecoration(item.type as any, null)}
                            className="font-size-8 px-3 py-1 text-gray-400"
                          >
                            解除
                          </OutlawButton>
                        ) : (
                          <OutlawButton 
                            variant="primary"
                            disabled={!canChangeDecorations || gvgResetLoading}
                            onClick={() => handleEquipGuildDecoration(item.type as any, item.id)}
                            className="font-size-8 px-3 py-1"
                          >
                            適用
                          </OutlawButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </OutlawCard>

          </div>
        )}

      </div>

      {/* --- 構成員詳細プロフィール紹介ポップアップモーダル --- */}
      {selectedMember && (
        <FullScreenPanel
          onClose={() => setSelectedMember(null)}
          title="メンバープロフィール"
        >
          <div className="p-4 text-left">
            {/* 基本情報 */}
            <div className="flex items-center gap-3">
              <img 
                src={selectedMember.users?.avatar_url || "/reiji_transparent_asset.png"} 
                className="rounded-full border-cyan modal-profile-img" 
                alt="profile"
              />
              <div>
                <h3 className="font-size-11 font-weight-bold text-white">
                  {selectedMember.users?.username || "名無しの幹部"}
                </h3>
                <div className="flex gap-2 mt-1 align-center">
                  <span className="font-size-7 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded text-secondary">
                    {selectedMember.role === "MASTER" ? "マスター" : ["SUBMASTER", "SUB_MASTER"].includes(selectedMember.role) ? "サブマスター" : "一般メンバー"}
                  </span>
                  <span className="font-size-8 text-white font-bold">
                    Lv.{selectedMember.userLevel || 1}
                  </span>
                </div>
              </div>
            </div>

            {/* 自己紹介(bio) */}
            <div className="mt-3 p-2 rounded bg-black-60 border border-gray-800 font-size-8 text-secondary">
              {selectedMember.users?.bio || "自己紹介は登録されていません。"}
            </div>

            {/* ステータス */}
            <div className="grid grid-cols-2 gap-2 mt-3 font-size-8">
              <div className="p-2 rounded bg-gray-900 border border-gray-800 flex justify-between">
                <span className="text-secondary">総合力</span>
                <span className="text-white font-bold">{(selectedMember.userPower || 0).toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-gray-900 border border-gray-800 flex justify-between">
                <span className="text-secondary">累積貢献度</span>
                <span className="text-white font-bold">{(selectedMember.total_contribution || 0).toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-gray-900 border border-gray-800 flex justify-between col-span-2">
                <span className="text-secondary">週間貢献度</span>
                <span className="text-color-cyan font-bold">{(selectedMember.weekly_contribution || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* 現状パーティ(5名)表示 */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              <span className="font-size-8 text-secondary font-bold block mb-2">防衛パーティ（現状編成）</span>
              <div className="flex justify-between gap-1">
                {Array.isArray(selectedMember.partyCharIds) && selectedMember.partyCharIds.length > 0 ? (
                  selectedMember.partyCharIds.map((charId: string, idx: number) => {
                    const master = CHARACTERS_MASTER.find(c => c.id === charId);
                    return (
                      <div key={idx} className="party-slot-avatar flex flex-col items-center flex-1">
                        <img 
                          src={master?.img || "/reiji_transparent_asset.png"} 
                          className="rounded border border-gray-800 bg-black-80 w-10 h-10 object-cover"
                          alt={master?.jpName}
                        />
                        <span className="font-size-7 text-secondary mt-1 truncate w-full text-center">
                          {master?.jpName || "不明"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span className="font-size-8 text-secondary text-center w-full py-2">未編成またはロード中...</span>
                )}
              </div>
            </div>
          </div>
        </FullScreenPanel>
      )}

    </div>
  );
}
