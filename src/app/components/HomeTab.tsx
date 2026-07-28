"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  BASE_MAP_MASTER,
  MASTER_AVATARS,
  PROFILE_BACKGROUNDS,
  PROFILE_FRONT_EFFECTS,
  PROFILE_TITLES
} from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import AvatarRenderer from "./AvatarRenderer";
import { LoginBonusModal } from "./LoginBonusModal";
import "./HomeTab.css";

// ==============================================
// HomeTab - ルーター (homeSubPanel による画面切替)
// ==============================================
export default function HomeTab() {
  const {
    homeSubPanel,
    showLoginBonusModal,
    setShowLoginBonusModal,
    loginBonusMasters,
    userLoginBonus,
    loginBonusClaimResult,
    setHomeSubPanel,
    setInboxTab,
  } = useGame();

  const renderContent = () => {
    switch (homeSubPanel) {
      case "profile":
        return <ProfilePanel />;
      case "missions":
        return <MissionsPanel />;
      case "inbox":
        return <InboxPanel />;
      case "main":
      default:
        return <MainMyPage />;
    }
  };

  return (
    <>
      {renderContent()}
      {showLoginBonusModal && (
        <LoginBonusModal
          masters={loginBonusMasters}
          currentStep={userLoginBonus?.current_step || loginBonusClaimResult?.current_step || 1}
          claimResult={loginBonusClaimResult}
          onClose={() => setShowLoginBonusModal(false)}
          onOpenPresents={() => {
            setShowLoginBonusModal(false);
            setHomeSubPanel("inbox");
            setInboxTab("presents");
          }}
        />
      )}
    </>
  );
}

// ==============================================
// 1. マイページ (メインパネル)
// ==============================================
function MainMyPage() {
  const {
    currentBaseId,
    gvgBaseControls,
    userGuild,
    userGuildMember,
    selectedLeader,
    unreadMissionsCount,
    unclaimedPresentsCount,
    chatChannel,
    setChatChannel,
    activeUsersCount,
    guildChats,
    chatInput,
    setChatInput,
    chatCooldown,
    chatSending,
    handleSendChat,
    homeSubPanel,
    setHomeSubPanel,
    setInboxTab,
    navigateTab,
    showLoginBonusModal,
    setShowLoginBonusModal,
    loginBonusMasters,
    userLoginBonus,
    loginBonusClaimResult,
    playCyberSe,
    userCharactersDbList,
    userEquipmentsList,
    newsList,
    userAvatar,
    hasActivePatrolBattle
  } = useGame();

  // チャット折り畳みステート
  const [chatOpen, setChatOpen] = React.useState(true);

  // チャンネルタブ定義
  const CHAT_TABS = [
    { key: "GLOBAL" as const, label: "全体" },
    { key: "GUILD" as const, label: "ギルド" },
  ];

  // 拠点情報
  const currentBaseInfo = BASE_MAP_MASTER.find(b => b.id === currentBaseId);
  const gvgInfo = gvgBaseControls.find((g: any) => g.base_id === currentBaseId);
  const controllerName = gvgInfo ? (gvgInfo.guilds?.name || "他プレイヤー") : "未支配";
  const baseName = currentBaseInfo?.name || "ネオンタワー";

  // リーダーキャラクター
  const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];

  // 総合力（パーティ全キャラのステータス合計）
  const totalPower = React.useMemo(() => {
    if (!userCharactersDbList || userCharactersDbList.length === 0) return 0;
    return userCharactersDbList.reduce((sum: number, charRec: any) => {
      const stats = getCharacterTotalStats(charRec, userEquipmentsList || []);
      return sum + stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
    }, 0);
  }, [userCharactersDbList, userEquipmentsList]);

  // 本番拠点背景URLの解決 (FIX済み public/bg/bg_base_*.png)
  const bgUrl =
    currentBaseId === "neon_tower" || currentBaseId === "shinjuku" ? "/bg/bg_base_neontower.png" :
    currentBaseId === "deep_dock" || currentBaseId === "shinagawa" ? "/bg/bg_base_deepdock.png" :
    currentBaseId === "junk_bazar" || currentBaseId === "akihabara" ? "/bg/bg_base_junkbazaar.png" :
    currentBaseId === "kitakura_gate" || currentBaseId === "ikebukuro" ? "/bg/bg_base_kitakuragate.png" :
    "/bg/bg_base_neontower.png";

  // マウント時にスクロール位置をトップにリセット（タブ復帰時の見切れ防止）
  React.useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, []);

  // チャットオートスクロール（チャットログコンテナ内のみ）
  const chatLogRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [guildChats]);

  return (
    <div className="mypage-view">

      {/* ビジュアルエリア - 拠点背景 + 立ち絵 + 拠点オーバーレイ + 丸ボタン */}
      <div
        className="mypage-visual-area"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      >
        {/* ダークグラデーションオーバーレイ */}
        <div className="mypage-visual-overlay"></div>

        {/* 拠点情報オーバーレイ（上部） */}
        <div className="mypage-base-overlay">
          <div className="mypage-base-overlay-info">
            <span className="mypage-base-overlay-label">拠点</span>
            <span className="mypage-base-overlay-name">{baseName}</span>
            <span className="mypage-base-overlay-sep">｜</span>
            <span className="mypage-base-overlay-controller">支配: {controllerName}</span>
          </div>
          <button
            className="mypage-base-overlay-move active-scale-effect"
            onClick={() => { navigateTab("map"); playCyberSe("click"); }}
          >
            拠点移動
          </button>
        </div>

        {/* サブメニューアイコン - 左側（ゲームプレイ系） */}
        <div className="mypage-sub-icons-left">
          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("missions"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-cyan" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <span className="sub-icon-label">ミッション</span>
            {unreadMissionsCount > 0 && (
              <span className="small-badge-alert">{unreadMissionsCount}</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("inbox"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-magenta" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 14H4V8h16v10z" />
            </svg>
            <span className="sub-icon-label">プレゼント</span>
            {unclaimedPresentsCount > 0 && (
              <span className="small-badge-alert">{unclaimedPresentsCount}</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("ranking"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-silver" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="sub-icon-label">ランキング</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("bbs"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-silver" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <span className="sub-icon-label">BBS</span>
          </button>
        </div>

        {/* サブメニューアイコン - 右側（情報・設定系） */}
        <div className="mypage-sub-icons-right">
          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("inbox"); setInboxTab("news"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-gold" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="sub-icon-label">お知らせ</span>
            {newsList && newsList.length > 0 && (
              <span className="small-badge-alert">!</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("profile"); playCyberSe("click"); }}
          >
            <svg viewBox="0 0 24 24" className="sub-svg-icon icon-white" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
            </svg>
            <span className="sub-icon-label">設定</span>
          </button>
        </div>

        {/* リーダー立ち絵画像 */}
        <div className="mypage-leader-container">
          <img src={leaderChar.img} alt={leaderChar.jpName} className="mypage-leader-img" />
        </div>
      </div>

      {/* 丸型漢字メニューボタン（ビジュアルエリアに重ねて配置） */}
      <div className="mypage-circle-menu">
        <button
          className="mypage-circle-btn mypage-circle-btn-allies active-scale-effect"
          onClick={() => { navigateTab("guild"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_allies.png" alt="連合" />
        </button>
        <button
          className="mypage-circle-btn mypage-circle-btn-fight active-scale-effect"
          onClick={() => { navigateTab("pvp"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_fight.png" alt="喧嘩" />
        </button>
        <button
          className="mypage-circle-btn mypage-circle-btn-conquest active-scale-effect"
          onClick={() => { navigateTab("patrol"); playCyberSe("click"); }}
          style={{ position: "relative" }}
        >
          <img src="/menu/menu_conquest.png" alt="制圧" />
          {hasActivePatrolBattle && <span className="mypage-badge-dot" />}
        </button>
      </div>

      {/* モバイルチャットウィジェット (PCではPCLeftChatが担当するため非表示) */}
      <div className="mypage-chat-widget">
        <div
          className="chat-widget-header"
          onClick={() => { if (!chatOpen) setChatOpen(true); }}
        >
          <div className="chat-title-row">
            <span className="chat-title">暗号アプリ『トライブ』</span>
            <span className="chat-online-count">オンライン：{activeUsersCount}名</span>
            <button
              className="chat-toggle-btn active-scale-effect"
              onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }}
            >
              {chatOpen ? "×" : "▲"}
            </button>
          </div>
        </div>

        {chatOpen && (
          <>
            {/* チャンネル切替タブ */}
            <div className="chat-channel-tabs">
              {CHAT_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`chat-channel-tab active-scale-effect ${chatChannel === tab.key ? "active" : ""}`}
                  onClick={() => { setChatChannel(tab.key); playCyberSe("click"); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="chat-messages-log" ref={chatLogRef}>
              {guildChats.map((msg: any, idx: number) => (
                <div key={idx} className="chat-row">
                  <span className={`chat-sender ${msg.user_id === userGuildMember?.user_id ? "chat-sender-self" : "chat-sender-other"}`}>
                    [{msg.author_name}]:
                  </span>{" "}
                  <span className="chat-content-text">{msg.content}</span>
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <input
                type="text"
                placeholder={chatCooldown > 0 ? `制限中 (${chatCooldown}秒)` : "暗号送信..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                maxLength={140}
                disabled={chatCooldown > 0}
                className="chat-input-box"
              />
              <button
                onClick={handleSendChat}
                disabled={chatSending || !chatInput.trim() || chatCooldown > 0}
                className="chat-send-btn active-scale-effect"
              >
                {chatSending ? <div className="spinner" /> : chatCooldown > 0 ? `${chatCooldown}s` : "送信"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==============================================
// 2. プロフィール & 環境設定
// ==============================================
function ProfilePanel() {
  const {
    username, setUsername,
    selectedLeader, setSelectedLeader,
    currentBaseId, setCurrentBaseId,
    bio, setBio,
    avatarUrl, setAvatarUrl,
    bgmEnabled,
    seEnabled,
    handleToggleSound,
    handleLogout,
    handleUpdateProfile,
    profileLoading,
    userCharactersDbList,
    setHomeSubPanel,
    playCyberSe,
    giftCode,
    handleGenerateGiftCode,
    equippedBackground, setEquippedBackground,
    equippedFrontEffect, setEquippedFrontEffect,
    titleEquipped, setTitleEquipped,
    characterLevel, userGuild, diamonds, cash, pvpPoints
  } = useGame();

  const isBackgroundUnlocked = (bgId: string) => {
    if (bgId === "bg_default") return true;
    if (bgId === "bg_kabukicho") return (characterLevel || 1) >= 5;
    if (bgId === "bg_wharf") return !!userGuild;
    if (bgId === "bg_bazar") return (cash || 0) >= 20000;
    return false;
  };

  const isFrontEffectUnlocked = (effectId: string) => {
    if (effectId === "effect_none") return true;
    if (effectId === "effect_lightning") return (pvpPoints || 1000) >= 1050;
    if (effectId === "effect_sparks") return (characterLevel || 1) >= 10;
    if (effectId === "effect_smoke") return (userCharactersDbList || []).length >= 3;
    return false;
  };

  const isTitleUnlocked = (titleId: string) => {
    if (titleId === "title_none") return true;
    if (titleId === "title_kabukicho_emperor") return (characterLevel || 1) >= 15;
    if (titleId === "title_neon_overlord") return (diamonds || 0) >= 300;
    if (titleId === "title_gvg_champion") return !!userGuild;
    return false;
  };

  const [showGiftModal, setShowGiftModal] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  const handleCopyCode = () => {
    if (!giftCode) return;
    navigator.clipboard.writeText(giftCode);
    setCopied(true);
    playCyberSe("click");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLineInvite = () => {
    if (!giftCode) return;
    const message = `『TRIBE: NEON REIGN』を一緒に遊ぼう！\nゲーム開始時に私のギフトコード【${giftCode}】を入力すると、お互いに豪華報酬がもらえるぞ！\n東京支配の戦いに参入せよ！`;
    const url = `https://line.me/R/share?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    playCyberSe("click");
  };

  return (
    <div className="mypage-profile-panel">
      <div className="view-header-row">
        <h2 className="view-title">環境設定</h2>
        <button className="sub-btn active-scale-effect" onClick={() => { setHomeSubPanel("main"); playCyberSe("click"); }}>戻る</button>
      </div>

      <div className="subpanel-scroll">
        {/* 基本情報 */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">基本情報編集</div>

          <div className="profile-form-group">
            <label className="profile-label">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ユーザー名を入力"
              maxLength={12}
              className="profile-input"
            />
          </div>

          <div className="profile-form-group">
            <label className="profile-label">代表リーダー設定</label>
            <select
              value={selectedLeader}
              onChange={(e) => { setSelectedLeader(e.target.value); playCyberSe("click"); }}
              className="profile-select"
            >
              {CHARACTERS_MASTER.filter((c: any) => userCharactersDbList.some((uc: any) => uc.character_id === c.id)).map((c: any) => (
                <option key={c.id} value={c.id}>{c.jpName}</option>
              ))}
            </select>
          </div>

          <div className="profile-form-group">
            <label className="profile-label">現在滞在拠点</label>
            <select
              value={currentBaseId}
              onChange={(e) => { setCurrentBaseId(e.target.value); playCyberSe("click"); }}
              className="profile-select profile-select-magenta"
            >
              {BASE_MAP_MASTER.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>

          <div className="profile-form-group">
            <label className="profile-label">自己紹介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="自己紹介を入力"
              maxLength={140}
              rows={3}
              className="profile-textarea"
            />
          </div>
        </div>

        {/* アバターアイコン選択 */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">アバターアイコン選択</div>
          <div className="avatar-grid">
            {MASTER_AVATARS.map((av: any, idx: number) => {
              const isSelected = avatarUrl === av.url;
              return (
                <div
                  key={idx}
                  onClick={() => { setAvatarUrl(av.url); playCyberSe("click"); }}
                  className={`avatar-option cursor-pointer ${isSelected ? "avatar-option-selected" : ""}`}
                >
                  <img src={av.url} alt={av.label} className="avatar-select-img" />
                  <span className="avatar-option-label">{av.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* カスタマイズ設定 */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">カスタムレイヤー設定</div>

          <div className="profile-form-group">
            <label className="profile-label">装着背景</label>
            <select
              value={equippedBackground}
              onChange={(e) => { setEquippedBackground(e.target.value); playCyberSe("click"); }}
              className="profile-select"
            >
              {PROFILE_BACKGROUNDS.map((bg) => {
                const unlocked = isBackgroundUnlocked(bg.id);
                return (
                  <option key={bg.id} value={bg.id} disabled={!unlocked}>
                    {bg.name} {!unlocked ? `[未解放: ${bg.desc}]` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="profile-form-group">
            <label className="profile-label">装着前面エフェクト</label>
            <select
              value={equippedFrontEffect}
              onChange={(e) => { setEquippedFrontEffect(e.target.value); playCyberSe("click"); }}
              className="profile-select"
            >
              {PROFILE_FRONT_EFFECTS.map((eff) => {
                const unlocked = isFrontEffectUnlocked(eff.id);
                return (
                  <option key={eff.id} value={eff.id} disabled={!unlocked}>
                    {eff.name} {!unlocked ? `[未解放: ${eff.desc}]` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="profile-form-group">
            <label className="profile-label">装着称号</label>
            <select
              value={titleEquipped}
              onChange={(e) => { setTitleEquipped(e.target.value); playCyberSe("click"); }}
              className="profile-select"
            >
              {PROFILE_TITLES.map((t) => {
                const unlocked = isTitleUnlocked(t.id);
                return (
                  <option key={t.id} value={t.id} disabled={!unlocked}>
                    {t.name} {!unlocked ? `[未解放: ${t.desc}]` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 音響設定 */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">音響設定</div>

          <div className="sound-toggle-row">
            <span className="sound-toggle-label">BGM 再生: {bgmEnabled ? "ON" : "OFF"}</span>
            <button onClick={() => handleToggleSound("bgm")} className="sub-btn active-scale-effect">切り替え</button>
          </div>

          <div className="sound-toggle-row">
            <span className="sound-toggle-label">SE 再生: {seEnabled ? "ON" : "OFF"}</span>
            <button onClick={() => handleToggleSound("se")} className="sub-btn active-scale-effect">切り替え</button>
          </div>
        </div>

        {/* 招待ギフトコード */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">招待ギフトコード</div>
          <div className="subpanel-card-gap">
            <p className="gift-code-info-text">
              友達をゲームに招待して、豪華報酬を手に入れましょう。
            </p>
            {giftCode ? (
              <div className="gift-code-row">
                <span className="gift-code-display-inline">{giftCode}</span>
                <button
                  onClick={() => { setShowGiftModal(true); playCyberSe("click"); }}
                  className="sub-btn active-scale-effect"
                >
                  招待コード詳細
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateGiftCode}
                className="claim-reward-btn active-scale-effect"
                disabled={profileLoading}
              >
                {profileLoading ? <div className="spinner" /> : "ギフトコードを発行する"}
              </button>
            )}
          </div>
        </div>

        {/* アカウント切断 */}
        <div className="upgrade-card danger-card">
          <div className="upgrade-card-title danger-title">アカウント切断</div>
          <button
            onClick={handleLogout}
            className="logout-btn active-scale-effect"
          >
            ログアウト
          </button>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleUpdateProfile}
          disabled={profileLoading}
          className="claim-reward-btn profile-save-btn active-scale-effect"
        >
          {profileLoading ? <div className="spinner" /> : "設定を保存 (DB同期)"}
        </button>
      </div>

      {/* 招待ギフトコード詳細モーダル */}
      {showGiftModal && giftCode && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="gift-modal-title">招待ギフトコード</h3>
            <p className="gift-modal-desc">
              このギフトコードを新規プレイヤーがゲーム開始時にセットアップ画面で入力すると、招待した側と入力した側の両方に豪華報酬が届きます！(最大10人まで)
            </p>

            <div className="gift-code-display">
              <span className="gift-code-text">{giftCode}</span>
              <button
                onClick={handleCopyCode}
                className="sub-btn active-scale-effect"
              >
                {copied ? "コピー済" : "コピー"}
              </button>
            </div>

            <button
              onClick={handleLineInvite}
              className="line-invite-btn active-scale-effect"
            >
              LINEで招待する
            </button>

            <button
              className="gift-modal-close-btn active-scale-effect"
              onClick={() => { setShowGiftModal(false); playCyberSe("click"); }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================
// 3. ミッション一覧
// ==============================================
function MissionsPanel() {
  const {
    missionTab,
    setMissionTab,
    missions,
    missionClaimLoading,
    handleClaimAllMissions,
    handleClaimMission,
    handleDailyMissionReset,
    setHomeSubPanel,
    playCyberSe
  } = useGame();

  return (
    <div className="mypage-missions-panel">
      <div className="view-header-row">
        <h2 className="view-title">ミッション</h2>
        <button className="sub-btn active-scale-effect" onClick={() => { setHomeSubPanel("main"); playCyberSe("click"); }}>戻る</button>
      </div>

      <div className="missions-toolbar">
        <div className="tab-menu missions-tab-group">
          <button
            onClick={() => { setMissionTab("DAILY"); playCyberSe("click"); }}
            className={`tab-btn missions-tab-btn ${missionTab === "DAILY" ? "active" : ""}`}
          >
            デイリー
          </button>
          <button
            onClick={() => { setMissionTab("NORMAL"); playCyberSe("click"); }}
            className={`tab-btn missions-tab-btn ${missionTab === "NORMAL" ? "active" : ""}`}
          >
            通常
          </button>
        </div>
        <button
          className="sub-btn missions-reset-btn active-scale-effect"
          onClick={handleDailyMissionReset}
        >
          4:00リセット
        </button>
        <button
          className="sub-btn missions-claim-all-btn active-scale-effect"
          disabled={missionClaimLoading || missions.filter((m: any) => m.status === "CLEAR" && m.category === missionTab).length === 0}
          onClick={handleClaimAllMissions}
        >
          一括受取
        </button>
      </div>

      <div className="list-container scroll-container subpanel-scroll">
        {missions.filter((m: any) => m.category === missionTab).map((m: any) => (
          <div key={m.id} className="list-item">
            <div className="item-left">
              <span className="item-title">{m.title}</span>
              <span className="item-desc">{m.desc}</span>
              <span className="item-reward">{m.reward}</span>
              <div className="item-progress-bg">
                <div
                  className="item-progress-fill"
                  style={{ width: `${Math.min((m.progress / m.target) * 100, 100)}%` }}
                />
              </div>
            </div>

            {m.loading ? (
              <div className="spinner" />
            ) : (
              <button
                className={`action-btn active-scale-effect ${m.status === "CLEAR" ? "claim" : m.status === "CLAIMED" ? "claimed" : "progress"}`}
                disabled={m.status !== "CLEAR"}
                onClick={() => handleClaimMission(m.id)}
              >
                {m.status === "CLEAR" ? "受取る" : m.status === "CLAIMED" ? "受取済" : `${m.progress}/${m.target}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==============================================
// 4. インボックス (プレゼント / お知らせ)
// ==============================================
function InboxPanel() {
  const {
    inboxTab,
    setInboxTab,
    presents,
    presentClaimLoading,
    handleClaimAllPresents,
    handleClaimPresent,
    newsList,
    selectedNews,
    setSelectedNews,
    setHomeSubPanel,
    playCyberSe
  } = useGame();

  return (
    <div className="mypage-inbox-panel">
      <div className="view-header-row">
        <h2 className="view-title">インボックス</h2>
        <button className="sub-btn active-scale-effect" onClick={() => { playCyberSe("click"); setSelectedNews(null); setHomeSubPanel("main"); }}>戻る</button>
      </div>

      <div className="inbox-toolbar">
        <div className="tab-menu inbox-tab-group">
          <button
            onClick={() => { setInboxTab("presents"); playCyberSe("click"); setSelectedNews(null); }}
            className={`tab-btn inbox-tab-btn ${inboxTab === "presents" ? "active" : ""}`}
          >
            プレゼント
          </button>
          <button
            onClick={() => { setInboxTab("news"); playCyberSe("click"); }}
            className={`tab-btn inbox-tab-btn ${inboxTab === "news" ? "active" : ""}`}
          >
            お知らせ
          </button>
        </div>
        {inboxTab === "presents" && (
          <button
            className="sub-btn inbox-claim-all-btn active-scale-effect"
            disabled={presentClaimLoading || presents.filter((p: any) => p.status === "UNCLAIMED").length === 0}
            onClick={handleClaimAllPresents}
          >
            一括受取
          </button>
        )}
      </div>

      <div className="list-container scroll-container subpanel-scroll">
        {inboxTab === "presents" ? (
          presents.map((p: any) => (
            <div key={p.id} className="list-item">
              <div className="item-left">
                <span className="item-title">
                  {p.title} - <span className="inbox-expire-text">{p.expireText}</span>
                </span>
                <span className="item-desc">{p.desc}</span>
                <span className="item-reward">{p.reward}</span>
              </div>

              {p.loading ? (
                <div className="spinner" />
              ) : (
                <button
                  className={`action-btn active-scale-effect ${p.status === "UNCLAIMED" ? "claim" : "claimed"}`}
                  disabled={p.status !== "UNCLAIMED"}
                  onClick={() => handleClaimPresent(p.id)}
                >
                  {p.status === "UNCLAIMED" ? "受取る" : "受取済"}
                </button>
              )}
            </div>
          ))
        ) : (
          !selectedNews ? (
            newsList.map((n: any) => (
              <div
                key={n.id}
                className="list-item cursor-pointer"
                onClick={() => { setSelectedNews(n); playCyberSe("click"); }}
              >
                <div className="item-left">
                  <span className="item-title">{n.title}</span>
                  <span className="item-desc">{n.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="news-detail-wrapper">
              <div className="news-detail-header">
                <h3 className="news-detail-title">{selectedNews.title}</h3>
                <button className="sub-btn active-scale-effect news-detail-close" onClick={() => setSelectedNews(null)}>閉じる</button>
              </div>
              <div className="news-body-content scroll-container">{selectedNews.content}</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}


