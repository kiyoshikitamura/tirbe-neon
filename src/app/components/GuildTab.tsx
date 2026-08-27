"use client";

import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import "./GuildTab.css";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";
import UserIdentityRow from "./profile/UserIdentityRow";
import { supabase } from "@/utils/supabase";
import { GUILD_PRODUCTION, guildMemberCap, guildRecruitmentMode, type GuildRecruitmentMode } from "@/domain/gameplay/canonical/guild_production";

function guildRoleLabel(role?: string | null): string {
  if (role === "MASTER") return "ギルドマスター";
  if (role === "SUBMASTER" || role === "SUB_MASTER") return "副団長";
  return "メンバー";
}

const guildAlignmentLabel = (value?: string | null) => ({
  JUSTICE: "正義", EVIL: "悪", ORDER: "秩序", CHAOS: "混沌",
}[String(value || "").toUpperCase()] || "未設定");

export default function GuildTab() {
  const {
    userLevel,
    userGuild,
    setUserGuild,
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
    guildLevelMaster,
    fetchGuildDetail,
    setShowTribeChatPanel,
    setChatChannel,
    fetchPlayerDetail,
  } = useGame();

  const [guildSearchQuery, setGuildSearchQuery] = useState("");
  const [guildDescriptionDraft, setGuildDescriptionDraft] = useState(userGuild?.description || "");
  const [recruitmentModeDraft, setRecruitmentModeDraft] = useState<GuildRecruitmentMode>(guildRecruitmentMode(userGuild?.recruitment_mode, Boolean(userGuild?.approval_required)));
  const [welcomeDraft, setWelcomeDraft] = useState(userGuild?.welcome_message || "");
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [recommendedGuilds, setRecommendedGuilds] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeMembers7d, setActiveMembers7d] = useState<number | null>(null);
  const [mainAlignmentDraft, setMainAlignmentDraft] = useState(userGuild?.main_alignment || "JUSTICE");
  const [subAlignmentDraft, setSubAlignmentDraft] = useState(userGuild?.sub_alignment || "ORDER");
  useEffect(() => {
    if (userGuild) return;
    setRecommendationsLoading(true);
    void (async () => {
      try {
        const [{ data }, { data: publicGuilds }] = await Promise.all([
          supabase.rpc("get_recommended_guilds", { p_limit: 5 }),
          supabase.rpc("search_guilds", { p_query: "" }),
        ]);
        if (Array.isArray(data)) {
          const publicById = new Map<string, any>((publicGuilds || []).map((guild: any) => [guild.id, guild]));
          setRecommendedGuilds(data.map((guild: any) => ({ ...guild, ...publicById.get(guild.guild_id), guild_id: guild.guild_id })));
        }
      } finally {
        setRecommendationsLoading(false);
      }
    })();
  }, [userGuild?.id]);
  useEffect(() => {
    setGuildDescriptionDraft(userGuild?.description || "");
    setRecruitmentModeDraft(guildRecruitmentMode(userGuild?.recruitment_mode, Boolean(userGuild?.approval_required)));
  }, [userGuild?.id, userGuild?.description, userGuild?.approval_required, userGuild?.recruitment_mode]);
  useEffect(() => {
    setWelcomeDraft(userGuild?.welcome_message || "");
  }, [userGuild?.id, userGuild?.welcome_message]);
  useEffect(() => {
    setMainAlignmentDraft(["JUSTICE", "EVIL", "ORDER", "CHAOS"].includes(userGuild?.main_alignment) ? userGuild.main_alignment : "JUSTICE");
    setSubAlignmentDraft(["JUSTICE", "EVIL", "ORDER", "CHAOS"].includes(userGuild?.sub_alignment) ? userGuild.sub_alignment : "ORDER");
  }, [userGuild?.id, userGuild?.main_alignment, userGuild?.sub_alignment]);
  useEffect(() => {
    if (!userGuild?.id) {
      setActiveMembers7d(null);
      return;
    }
    void supabase.rpc("get_public_guild_detail", { p_guild_id: userGuild.id }).then(({ data }) => {
      setActiveMembers7d(typeof data?.active_members_7d === "number" ? data.active_members_7d : null);
    });
  }, [userGuild?.id]);
  const penalty = getGuildPenaltyState();

  const isMaster = userGuildMember?.role === "MASTER";
  const isSubMaster = userGuildMember?.role === "SUBMASTER" || userGuildMember?.role === "SUB_MASTER";
  const saveWelcomeMessage = async () => {
    if ((!isMaster && !isSubMaster) || savingWelcome) return;
    setSavingWelcome(true);
    try {
      const { data, error } = await supabase.rpc("set_current_guild_welcome_message", {
        p_message: welcomeDraft,
      });
      if (error) throw error;
      const welcomeMessage = data?.welcome_message || "";
      setUserGuild((current: any) => current ? { ...current, welcome_message: welcomeMessage } : current);
      setWelcomeDraft(welcomeMessage);
      setEditingWelcome(false);
      playCyberSe("click");
    } catch (error) {
      console.warn("Failed to update guild welcome message:", error);
    } finally {
      setSavingWelcome(false);
    }
  };

  // 外枠ベゼルCSSクラスの取得
  const getLevelBorderClass = (level: number) => {
    if (level >= 30) return "pulsing-gold-border";
    if (level >= 16) return "gold-border";
    if (level >= 6) return "silver-border";
    return "bronze-border";
  };

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

  const runGuildSearch = async () => {
    if (searchLoading) return;
    setSearchLoading(true);
    try {
      await handleSearchGuilds(guildSearchQuery);
      setHasSearched(Boolean(guildSearchQuery.trim()));
    } finally {
      setSearchLoading(false);
    }
  };

  // アライメント変換マップ
  const alignmentEnToJp: { [key: string]: string } = {
    JUSTICE: "正義",
    EVIL: "悪",
    ORDER: "秩序",
    CHAOS: "混沌"
  };

  if (!userGuild) {
    const joinUnlocked = userLevel >= 3 && !penalty.isPenalty;
    const createUnlocked = userLevel >= GUILD_PRODUCTION.creation.userLevel
      && cash >= GUILD_PRODUCTION.creation.cashCost;
    const renderGuildCard = (g: any) => {
      const guild = { ...g, id: g.id || g.guild_id };
      const pendingRequest = pendingGuildJoinRequests.find((request: any) => request.guild_id === guild.id);
      const hasOtherPendingRequest = pendingGuildJoinRequests.length > 0 && !pendingRequest;
      const isFull = Number(guild.member_count || 0) >= Number(guild.member_limit || 10);
      const recruitmentMode = guildRecruitmentMode(guild.recruitment_mode, guild.approval_required);
      return (
        <div key={guild.id} className="guild-lobby-guild-card">
          {guild.emblem_url || guild.logo_icon
            ? <img className="guild-lobby-guild-mark" src={guild.emblem_url || guild.logo_icon} alt="" />
            : <div className="guild-lobby-guild-mark is-placeholder" aria-hidden="true" />}
          <button className="guild-lobby-guild-info guild-detail-trigger" onClick={() => void fetchGuildDetail(guild.id)}>
            <strong>{guild.name}</strong>
            <span>Lv.{guild.level} ・ {guild.member_count || 0}/{guild.member_limit || guildMemberCap(Number(guild.level || 1))}名 ・ {isFull ? "満員" : "空きあり"} ・ {recruitmentMode === "OPEN_JOIN" ? "自由加入" : recruitmentMode === "APPLICATION_REQUIRED" ? "承認制" : "募集停止"}</span>
            <span className="guild-attribute-line">メイン属性 {guildAlignmentLabel(guild.main_alignment)} ・ サブ属性 {guildAlignmentLabel(guild.sub_alignment)}</span>
            <span className="guild-activity-line">直近7日アクティブ {guild.active_members_7d ?? "-"}人 ・ レイド貢献 {Number(guild.raid_contribution_7d || 0).toLocaleString()} ・ 総合力 {Number(guild.guild_power || 0).toLocaleString()}</span>
            <small>詳細を見る ›</small>
          </button>
          {pendingRequest ? (
            <OutlawButton variant="secondary" className="font-size-8 px-3" disabled={gvgResetLoading} loadingLabel="取消中…" onClick={() => handleCancelGuildJoinRequest(pendingRequest.id)}>
              申請中（取消）
            </OutlawButton>
          ) : (
            <OutlawButton
              variant={joinUnlocked && !isFull && !hasOtherPendingRequest ? "primary" : "secondary"}
              className="font-size-8 px-3"
              disabled={!joinUnlocked || isFull || hasOtherPendingRequest || recruitmentMode === "CLOSED" || gvgResetLoading}
              onClick={() => handleDemoJoinGuild(guild.id, guild.name, recruitmentMode === "APPLICATION_REQUIRED")}
            >
              {!joinUnlocked ? "利用不可" : isFull ? "満員" : hasOtherPendingRequest ? "他へ申請中" : recruitmentMode === "CLOSED" ? "募集停止" : recruitmentMode === "APPLICATION_REQUIRED" ? "加入申請" : "加入する"}
            </OutlawButton>
          )}
        </div>
      );
    };
    return (
      <div className="view-container guild-lobby-view">
        <h1 className="sr-only">ギルド</h1>
        <div className="scroll-container flex-1 guild-lobby-scroll">
          {penalty.isPenalty && (
            <div className="guild-lobby-notice">脱退後の参加制限中です。残り {Math.ceil(penalty.secondsLeft / 3600)} 時間</div>
          )}

          <details className={`guild-lobby-create ${createUnlocked ? "is-ready" : ""}`}>
            <summary>ギルドを設立する <small>Lv.{GUILD_PRODUCTION.creation.userLevel} / {GUILD_PRODUCTION.creation.cashCost.toLocaleString()}キャッシュ</small></summary>
            <div className="guild-create-form">
              <input
                type="text"
                placeholder="ギルド名を入力 (12文字)"
                value={newGuildName}
                onChange={(e) => setNewGuildName(e.target.value)}
                maxLength={GUILD_PRODUCTION.creation.nameMax}
                disabled={cash < GUILD_PRODUCTION.creation.cashCost || userLevel < GUILD_PRODUCTION.creation.userLevel}
                className="guild-create-input bg-black-60 border-subtle text-white p-2 rounded outline-none"
              />
              <OutlawButton
                variant={createUnlocked ? "primary" : "secondary"}
                onClick={handleCreateGuild}
                disabled={gvgResetLoading || cash < GUILD_PRODUCTION.creation.cashCost || !newGuildName.trim() || userLevel < GUILD_PRODUCTION.creation.userLevel}
              >
                {gvgResetLoading ? <div className="spinner" /> : userLevel < GUILD_PRODUCTION.creation.userLevel ? `Lv.${GUILD_PRODUCTION.creation.userLevel}で解放` : cash < GUILD_PRODUCTION.creation.cashCost ? "資金不足" : "創設する"}
              </OutlawButton>
            </div>
          </details>

          <section className="guild-lobby-section">
            <div className="guild-lobby-section-heading"><span>おすすめギルド</span><small>{recommendedGuilds.length}件</small></div>
            <div className="guild-lobby-list">
              {recommendationsLoading && <div className="guild-lobby-empty" role="status"><strong>おすすめを取得中</strong></div>}
              {recommendedGuilds.map(renderGuildCard)}
              {!recommendationsLoading && recommendedGuilds.length === 0 && (
                <div className="guild-lobby-empty"><strong>おすすめギルドがありません</strong><span>ギルド名から検索できます。</span></div>
              )}
            </div>
          </section>

          <section className="guild-lobby-section guild-lobby-search-section">
            <div className="guild-lobby-section-heading"><span>ギルドを検索</span>{hasSearched && <small>{allGuildsDbList.length}件</small>}</div>
            <div className="guild-search-form mb-3">
              <input
                type="search"
                value={guildSearchQuery}
                onChange={(event) => setGuildSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runGuildSearch();
                }}
                maxLength={30}
                placeholder="ギルド名で検索"
                className="guild-search-input bg-black-60 border-subtle text-white p-2 rounded outline-none"
              />
              <OutlawButton className="guild-search-button" variant="secondary" onClick={() => void runGuildSearch()} disabled={gvgResetLoading || searchLoading}>
                {searchLoading ? "検索中…" : "検索"}
              </OutlawButton>
            </div>
            {hasSearched && <div className="guild-lobby-list guild-search-results">
              {allGuildsDbList.map(renderGuildCard)}
              {allGuildsDbList.length === 0 && (
                <div className="guild-lobby-empty"><strong>参加できるTRIBEが見つかりません</strong><span>検索条件を変えるか、時間をおいてもう一度確認してください。</span></div>
              )}
            </div>}
          </section>

        </div>
      </div>
    );
  }

  // レベルアップ用のXP情報算出
  const currentLvlMaster = guildLevelMaster.find((l: any) => l.level === userGuild.level) || { next_xp: GUILD_PRODUCTION.levels.find((entry) => entry.level === Number(userGuild.level))?.requiredExp ?? 0 };
  const xpNeeded = currentLvlMaster.next_xp;
  const xpPercent = xpNeeded > 0 ? Math.min((userGuild.xp / xpNeeded) * 100, 100) : 100;

  return (
    <div className={`view-container guild-main-container ${borderClass} ${decorationClass}`}>
      {guildSubTab === "home" && <div className="guild-my-page-scroll">
        <section className={`guild-visual-identity ${bannerClass}`} aria-label="ギルド情報">
          <div className="guild-identity-main">
            {userGuild.logo_icon && userGuild.logo_icon !== "guild_icon_default.png"
              ? <img className="guild-identity-icon" src={userGuild.logo_icon} alt="" />
              : <span className="guild-identity-icon is-default" aria-hidden="true" />}
            <div className="guild-identity-copy">
              <strong>{userGuild.name}</strong>
              <span>Lv.{userGuild.level}　{guildMembersList.length}/{userGuild.member_limit || guildMemberCap(Number(userGuild.level || 1))}人</span>
            </div>
            <small>{guildRoleLabel(userGuildMember?.role)}</small>
          </div>
          <div className="guild-identity-attributes"><span>メイン属性 <b>{guildAlignmentLabel(userGuild.main_alignment)}</b></span><i>×</i><span>サブ属性 <b>{guildAlignmentLabel(userGuild.sub_alignment)}</b></span></div>
          <div className="guild-level-progress"><span>Lv EXP</span><div className="xp-bar-container"><div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} /></div><small>{xpNeeded > 0 ? `${userGuild.xp} / ${xpNeeded}` : "MAX"}</small></div>
        </section>

        <section className="guild-status-strip" aria-label="ギルド状況">
          <div><small>戦績</small><strong>準備中</strong></div>
          <div><small>直近7日アクティブ</small><strong>{activeMembers7d ?? "-"}人</strong></div>
          <div><small>資金</small><strong>{Number(userGuild.funds || 0).toLocaleString()}</strong></div>
        </section>

        <section className="guild-welcome-compact">
          <strong>ようこそ {userGuild.name} へ</strong>
          <p>{userGuild.welcome_message || "歓迎メッセージは未設定です。"}</p>
        </section>

        <nav className="guild-action-grid" aria-label="ギルド機能">
          <button type="button" onClick={() => { setChatChannel("GUILD"); setShowTribeChatPanel(true); }}><strong>ギルドチャット</strong><span>メンバーと話す</span></button>
          <button type="button" onClick={() => setGuildSubTab("members")}><strong>メンバー</strong><span>{guildMembersList.length}人</span></button>
          <button type="button" className="is-coming-soon" disabled><strong>抗争</strong><span>準備中</span></button>
          <button type="button" className="is-coming-soon" disabled><strong>資金＆ショップ</strong><span>COMING SOON</span></button>
        </nav>

        {(isMaster || isSubMaster) && <button type="button" className="guild-settings-link" onClick={() => setGuildSubTab("settings")}>ギルド設定</button>}
        <div className="guild-leave-action"><button type="button" onClick={handleLeaveGuild} disabled={gvgResetLoading}>ギルドを脱退</button></div>
      </div>}

      {guildSubTab !== "home" && <div className="guild-secondary-view">
        <div className="guild-secondary-heading"><button type="button" onClick={() => setGuildSubTab("home")} aria-label="ギルドマイページへ戻る">←</button><strong>{guildSubTab === "members" ? "メンバー" : "ギルド設定"}</strong></div>
        <div className="scroll-container flex-1">
        
        {/* 1. メンバーリスト表示 */}
        {guildSubTab === "members" && (
          <div className="flex-col-gap-3">
            {(isMaster || isSubMaster) && guildJoinRequests.length > 0 && (
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
                        <OutlawButton variant="primary" disabled={gvgResetLoading} loadingLabel="承認中…" onClick={() => handleReviewGuildJoinRequest(request.id, true)}>承認</OutlawButton>
                        <OutlawButton variant="danger" disabled={gvgResetLoading} loadingLabel="処理中…" onClick={() => handleReviewGuildJoinRequest(request.id, false)}>却下</OutlawButton>
                      </div>
                    </div>
                  ))}
                </div>
              </OutlawCard>
            )}
            <p className="guild-member-list-note">ギルドマスター、副団長、メンバーの順に表示します。</p>

            <div className="guild-member-list">
              {[...guildMembersList].sort((a: any, b: any) => {
                const order = (role: string) => role === "MASTER" ? 0 : ["SUBMASTER", "SUB_MASTER"].includes(role) ? 1 : 2;
                return order(a.role) - order(b.role);
              }).map((m: any) => {
                const isMe = m.user_id === userGuildMember.user_id;
                const isLoaderPending = m.userLevel === null;

                return (
                  <div 
                    key={m.id} 
                    className="guild-member-row"
                  >
                    <UserIdentityRow
                      userName={m.users?.username || "プレイヤー"}
                      guildName={userGuild.name}
                      title={isMe ? "あなた" : undefined}
                      leaderCharacterId={m.users?.favorite_character_id}
                      onOpen={!isLoaderPending ? () => { playCyberSe("click"); void fetchPlayerDetail(m.user_id); } : undefined}
                      variant="compact"
                    />
                    <span className="guild-member-role">{guildRoleLabel(m.role)}</span>
                    {(isMaster || isSubMaster) && !isMe && <div className="guild-member-management">
                      {isMaster && !isMe && (
                        <>
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
                            団長を交代
                          </OutlawButton>
                          <OutlawButton 
                            variant="danger"
                            className="font-size-7 py-0.5 px-2" 
                            onClick={() => handleKickMember(m.user_id, m.users?.username)}
                          >
                            追放
                          </OutlawButton>
                        </>
                      )}
                      {isSubMaster && !isMe && (
                        <>
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
                        </>
                      )}
                    </div>}
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
              <div className="font-bold text-neon-cyan mb-2">歓迎メッセージ</div>
              {!editingWelcome ? <>
                <p className="font-size-8 text-secondary">{userGuild.welcome_message || "歓迎メッセージは未設定です。"}</p>
                <OutlawButton variant="secondary" className="width-100 mt-2" onClick={() => setEditingWelcome(true)}>編集</OutlawButton>
              </> : <div className="guild-welcome-editor">
                <label htmlFor="guild-welcome-message">新メンバーへの歓迎メッセージ</label>
                <textarea id="guild-welcome-message" value={welcomeDraft} onChange={(event) => setWelcomeDraft(event.target.value)} maxLength={120} rows={3} disabled={savingWelcome} />
                <div className="guild-welcome-editor-meta"><span>{welcomeDraft.length}/120</span><span>マイページに1〜2行で表示されます。</span></div>
                <div className="guild-welcome-editor-actions"><OutlawButton variant="secondary" disabled={savingWelcome} onClick={() => { setWelcomeDraft(userGuild.welcome_message || ""); setEditingWelcome(false); }}>キャンセル</OutlawButton><OutlawButton variant="primary" disabled={savingWelcome} onClick={() => void saveWelcomeMessage()}>{savingWelcome ? "保存中…" : "保存"}</OutlawButton></div>
              </div>}
            </OutlawCard>
            <OutlawCard>
              <div className="font-bold text-neon-cyan mb-2">加入・公開設定</div>
              <textarea
                value={guildDescriptionDraft}
                onChange={(event) => setGuildDescriptionDraft(event.target.value)}
                maxLength={200}
                disabled={(!isMaster && !isSubMaster) || gvgResetLoading}
                placeholder="ギルド紹介（200文字以内）"
                className="width-100 bg-black-60 border-subtle text-white font-size-8 p-2 rounded outline-none"
              />
              <label className="flex flex-col gap-2 mt-3 font-size-8 text-secondary">
                募集モード
                <select value={recruitmentModeDraft} onChange={(event) => setRecruitmentModeDraft(event.target.value as GuildRecruitmentMode)} disabled={(!isMaster && !isSubMaster) || gvgResetLoading} className="bg-black-60 border-subtle text-white font-size-9 p-2 rounded outline-none">
                  <option value="OPEN_JOIN">即時加入</option>
                  <option value="APPLICATION_REQUIRED">加入申請・承認制</option>
                  <option value="CLOSED">募集停止</option>
                </select>
              </label>
              {(isMaster || isSubMaster) && (
                <OutlawButton
                  variant="primary"
                  className="width-100 mt-3"
                  disabled={gvgResetLoading}
                  onClick={() => void handleUpdateGuildSettings(guildDescriptionDraft, recruitmentModeDraft)}
                >
                  設定を保存
                </OutlawButton>
              )}
            </OutlawCard>
            <OutlawCard glowLine="right">
              <div className="font-bold text-neon-magenta mb-1">ギルド属性</div>
              <p className="font-size-8 text-secondary mt-1 mb-4">GvGで使用するメイン属性とサブ属性です。通常バトルには適用されません。</p>
              <div className="flex-col-gap-3 text-left">
                <div>
                  <label className="font-size-8 text-secondary block font-bold mb-1">メイン属性</label>
                  <div className="guild-attribute-options mt-1">
                    {["JUSTICE", "EVIL", "ORDER", "CHAOS"].map(val => {
                      const jpVal = alignmentEnToJp[val] || val;
                      const isSel = mainAlignmentDraft === val;
                      return (
                        <OutlawButton 
                          key={val}
                          variant={isSel ? "neon" : "secondary"}
                          disabled={!isMaster && !isSubMaster}
                          onClick={() => setMainAlignmentDraft(val)}
                          className="flex-1 font-size-8 py-2 font-bold"
                        >
                          {jpVal}
                        </OutlawButton>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2">
                  <label className="font-size-8 text-secondary block font-bold mb-1">サブ属性</label>
                  <div className="guild-attribute-options mt-1">
                    {["JUSTICE", "EVIL", "ORDER", "CHAOS"].map(val => {
                      const jpVal = alignmentEnToJp[val] || val;
                      const isSel = subAlignmentDraft === val;
                      return (
                        <OutlawButton 
                          key={val}
                          variant={isSel ? "neon" : "secondary"}
                          disabled={!isMaster && !isSubMaster}
                          onClick={() => setSubAlignmentDraft(val)}
                          className="flex-1 font-size-8 py-2 font-bold"
                        >
                          {jpVal}
                        </OutlawButton>
                      );
                    })}
                  </div>
                </div>
                <OutlawButton
                  variant="primary"
                  className="width-100 mt-3"
                  disabled={gvgResetLoading || (!isMaster && !isSubMaster)}
                  onClick={() => void handleUpdateGuildAlignment(mainAlignmentDraft, subAlignmentDraft)}
                >
                  属性を保存
                </OutlawButton>
              </div>
            </OutlawCard>
          </div>
        )}

        </div>
      </div>}

    </div>
  );
}
