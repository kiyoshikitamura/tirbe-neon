"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  BASE_MAP_MASTER,
  PROFILE_BACKGROUNDS,
  PROFILE_FRONT_EFFECTS,
  PROFILE_TITLES,
  getCharacterTransparentImg
} from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import { useImagePreloader } from "../hooks/useImagePreloader";
import { LoginBonusModal } from "./LoginBonusModal";
import "./HomeTab.css";

// イベントバナー用サンプルデータ
const EVENT_BANNERS = [
  {
    id: 1,
    title: "【レイドイベント】強敵「雷神」襲来中！",
    imgUrl: "/bg/bg_gacha_ssr.png",
    targetTab: "raid"
  },
  {
    id: 2,
    title: "【ピックアップガチャ】SSR「剛」新登場！",
    imgUrl: "/bg/bg_gacha_sr.png",
    targetTab: "gacha"
  },
  {
    id: 3,
    title: "【GvG抗争】第2シーズン 覇権争奪戦 開幕",
    imgUrl: "/bg/bg_gacha_normal.png",
    targetTab: "guild"
  }
];

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

/**
 * MainMyPage - マイページメイン画面
 */
function MainMyPage() {
  // ⚡ ロード時間の最適化: 全17個のUIアイコン・拠点/所持背景・バナー画像事前メモリキャッシュ (0秒描画)
  useImagePreloader([
    "/bg/bg_base_neontower.png",
    "/bg/bg_base_deepdock.png",
    "/bg/bg_base_junkbazaar.png",
    "/bg/bg_base_kitakuragate.png",
    "/shinjuku_neon_icon_1783765789862.png",
    "/tokyo_map.png",
    "/shibuya_scramble.png",
    "/bg/bg_gacha_ssr.png",
    "/bg/bg_gacha_sr.png",
    "/bg/bg_gacha_normal.png",
    "/menu/menu_allies.png",
    "/menu/menu_fight.png",
    "/menu/menu_conquest.png",
    "/ui/icon_bag.png",
    "/ui/icon_cash.png",
    "/ui/icon_community.png",
    "/ui/icon_dia.png",
    "/ui/icon_footer_character.png",
    "/ui/icon_footer_gacha.png",
    "/ui/icon_footer_guild.png",
    "/ui/icon_footer_mypage.png",
    "/ui/icon_footer_shop.png",
    "/ui/icon_friends.png",
    "/ui/icon_map.png",
    "/ui/icon_mission.png",
    "/ui/icon_news.png",
    "/ui/icon_present.png",
    "/ui/icon_raid.png",
    "/ui/icon_ranking.png",
    "/ui/icon_settings.png"
  ]);

  const {
    currentBaseId,
    gvgBaseControls,
    selectedLeader,
    unreadMissionsCount,
    unclaimedPresentsCount,
    chatChannel,
    guildChats,
    setHomeSubPanel,
    setInboxTab,
    navigateTab,
    playCyberSe,
    newsList,
    userCharactersDbList,
    userEquipmentsList,
    selectedBgMode,
    titleEquipped,
    interiorItem,
    equippedFrontEffect
  } = useGame();

  // モーダル表示フラグ (暗号メッセージアプリ『トライブ』)
  const [showTribeChatModal, setShowTribeChatModal] = useState(false);

  // イベントバナーのスライドステート
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  // バナー自動スライドタイマー
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % EVENT_BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 拠点情報
  const currentBaseInfo = BASE_MAP_MASTER.find(b => b.id === currentBaseId);
  const gvgInfo = gvgBaseControls.find((g: any) => g.base_id === currentBaseId);
  const controllerName = gvgInfo ? (gvgInfo.guilds?.name || "他プレイヤー") : "未支配";
  const baseName = currentBaseInfo?.name || "ネオンタワー";

  // お気に入りリーダーキャラクター
  const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];

  // 背景URLの決定（任意背景選択 or 拠点自動連動）
  const getBgUrl = () => {
    if (selectedBgMode && selectedBgMode !== "auto") {
      const customBg = PROFILE_BACKGROUNDS.find(b => b.id === selectedBgMode);
      if (customBg && customBg.img) return customBg.img;
      if (selectedBgMode === "shinjuku") return "/bg/bg_base_neontower.png";
      if (selectedBgMode === "deepdock") return "/bg/bg_base_deepdock.png";
      if (selectedBgMode === "junkbazaar") return "/bg/bg_base_junkbazaar.png";
      if (selectedBgMode === "kitakuragate") return "/bg/bg_base_kitakuragate.png";
    }
    // デフォルト拠点連動
    if (currentBaseId === "neon_tower" || currentBaseId === "shinjuku") return "/bg/bg_base_neontower.png";
    if (currentBaseId === "deep_dock" || currentBaseId === "shinagawa") return "/bg/bg_base_deepdock.png";
    if (currentBaseId === "junk_bazar" || currentBaseId === "akihabara") return "/bg/bg_base_junkbazaar.png";
    if (currentBaseId === "kitakura_gate" || currentBaseId === "ikebukuro") return "/bg/bg_base_kitakuragate.png";
    return "/bg/bg_base_neontower.png";
  };

  const bgUrl = getBgUrl();

  // 取合力 (総合力) の安全計算 (DBデータベース基準)
  const totalPower = React.useMemo(() => {
    if (!userCharactersDbList || userCharactersDbList.length === 0) return 0;
    return userCharactersDbList.reduce((sum: number, charRec: any) => {
      const stats = getCharacterTotalStats(charRec, userEquipmentsList || []);
      return sum + stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
    }, 0);
  }, [userCharactersDbList, userEquipmentsList]);

  // 最新1行チャットの取得
  const latestChatMsg = React.useMemo(() => {
    if (guildChats && guildChats.length > 0) {
      const last = guildChats[guildChats.length - 1];
      return `[${last.user_name || "名無し"}]: ${last.message}`;
    }
    return "チャットメッセージはありません";
  }, [guildChats]);

  return (
    <div className="mypage-view">
      {/* 1. ビジュアルエリア (50vh) */}
      <div className="mypage-visual-area" style={{ backgroundImage: `url('${bgUrl}')` }}>
        {/* レイヤー1: 暗部グラデーション */}
        <div className="mypage-visual-overlay" />

        {/* レイヤー2: 最上段HUD (拠点名 | 支配状況 | 拠点移動) */}
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
            <img src="/ui/icon_map.png" alt="Map" className="overlay-map-icon" />
            拠点移動
          </button>
        </div>

        {/* 取合力 (総合力) 表示パネル (最上段下中央・透過グレー) */}
        <div className="mypage-power-panel">
          <span className="mypage-power-label">取合力</span>
          <span className="mypage-power-val">{totalPower.toLocaleString()}</span>
        </div>

        {/* 左小アイコン (6個) */}
        <div className="mypage-sub-icons-left">
          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("missions"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_mission.png" alt="ミッション" className="sub-png-icon" />
            <span className="sub-icon-label">ミッション</span>
            {unreadMissionsCount > 0 && (
              <span className="small-badge-alert">{unreadMissionsCount}</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("ranking"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_ranking.png" alt="ランキング" className="sub-png-icon" />
            <span className="sub-icon-label">ランキング</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("profile"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_friends.png" alt="友達" className="sub-png-icon" />
            <span className="sub-icon-label">友達</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("bbs"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_community.png" alt="コミュニティ" className="sub-png-icon" />
            <span className="sub-icon-label">コミュニティ</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("raid"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_raid.png" alt="レイド" className="sub-png-icon" />
            <span className="sub-icon-label">レイド</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("map"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_map.png" alt="マップ" className="sub-png-icon" />
            <span className="sub-icon-label">マップ</span>
          </button>
        </div>

        {/* 右小アイコン (4個) */}
        <div className="mypage-sub-icons-right">
          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("profile"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_bag.png" alt="マイバッグ" className="sub-png-icon" />
            <span className="sub-icon-label">マイバッグ</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("inbox"); setInboxTab("news"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_news.png" alt="お知らせ" className="sub-png-icon" />
            <span className="sub-icon-label">お知らせ</span>
            {newsList && newsList.length > 0 && (
              <span className="small-badge-alert">!</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("inbox"); setInboxTab("presents"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_present.png" alt="プレゼント" className="sub-png-icon" />
            <span className="sub-icon-label">プレゼント</span>
            {unclaimedPresentsCount > 0 && (
              <span className="small-badge-alert">{unclaimedPresentsCount}</span>
            )}
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { setHomeSubPanel("profile"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_settings.png" alt="設定" className="sub-png-icon" />
            <span className="sub-icon-label">設定</span>
          </button>
        </div>

        {/* レイヤー構造 (重なり順 z-index) */}
        {/* レイヤー: 置物インテリア (z-index: 2) */}
        {interiorItem && interiorItem !== "none" && (
          <div className="mypage-interior-layer">
            <span className="mypage-interior-badge">{interiorItem}</span>
          </div>
        )}

        {/* レイヤー: リーダー立ち絵キャラクター (z-index: 3) */}
        <div className="mypage-leader-container">
          <img
            src={getCharacterTransparentImg(leaderChar.name)}
            alt={leaderChar.jpName}
            className="mypage-leader-img"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png";
            }}
          />
        </div>

        {/* レイヤー: 称号プレートバナー (z-index: 4) */}
        {titleEquipped && titleEquipped !== "title_none" && (
          <div className="mypage-title-banner-layer">
            <span className="mypage-title-banner-badge">{titleEquipped}</span>
          </div>
        )}

        {/* レイヤー: 前面エフェクト (z-index: 5) */}
        {equippedFrontEffect && equippedFrontEffect !== "effect_none" && (
          <div className="mypage-front-effect-layer" />
        )}
      </div>

      {/* 2. 丸型漢字メニューボタン (ネガティブマージン -48px でビジュアルエリアに重ね) */}
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
        >
          <img src="/menu/menu_conquest.png" alt="制圧" />
        </button>
      </div>

      {/* 3. イベントバナーエリア (スライド＋矢印＋ドット) */}
      <div className="mypage-event-banner-area">
        <button
          className="banner-arrow-btn left active-scale-effect"
          onClick={() => {
            setCurrentBannerIdx((prev) => (prev - 1 + EVENT_BANNERS.length) % EVENT_BANNERS.length);
            playCyberSe("click");
          }}
        >
          ‹
        </button>

        <div
          className="banner-slide-content active-scale-effect"
          onClick={() => {
            const target = EVENT_BANNERS[currentBannerIdx].targetTab;
            if (target) navigateTab(target);
            playCyberSe("click");
          }}
        >
          <img
            src={EVENT_BANNERS[currentBannerIdx].imgUrl}
            alt={EVENT_BANNERS[currentBannerIdx].title}
            className="banner-img"
          />
          <div className="banner-title-overlay">
            {EVENT_BANNERS[currentBannerIdx].title}
          </div>
        </div>

        <button
          className="banner-arrow-btn right active-scale-effect"
          onClick={() => {
            setCurrentBannerIdx((prev) => (prev + 1) % EVENT_BANNERS.length);
            playCyberSe("click");
          }}
        >
          ›
        </button>

        {/* インジケータードット */}
        <div className="banner-dots">
          {EVENT_BANNERS.map((banner, idx) => (
            <span
              key={banner.id}
              className={`banner-dot ${idx === currentBannerIdx ? "active" : ""}`}
              onClick={() => setCurrentBannerIdx(idx)}
            />
          ))}
        </div>
      </div>

      {/* 4. 1行チャットプレビュー (タップで『トライブ』起動) */}
      <div
        className="mypage-chat-preview-bar active-scale-effect"
        onClick={() => {
          setShowTribeChatModal(true);
          playCyberSe("click");
        }}
      >
        <span className="chat-preview-tag">[チャット]</span>
        <span className="chat-preview-text">{latestChatMsg}</span>
        <span className="chat-preview-arrow">💬 『トライブ』を開く ▸</span>
      </div>

      {/* 暗号メッセージアプリ 『トライブ』 モーダル */}
      {showTribeChatModal && (
        <TribeChatModal onClose={() => setShowTribeChatModal(false)} />
      )}
    </div>
  );
}

/**
 * TribeChatModal - 暗号メッセージアプリ『トライブ』モーダル
 */
function TribeChatModal({ onClose }: { onClose: () => void }) {
  const {
    chatChannel,
    setChatChannel,
    guildChats,
    chatInput,
    setChatInput,
    chatCooldown,
    chatSending,
    handleSendChat,
    directMessages,
    dmRecipientId,
    setDmRecipientId,
    handleSendDirectMessage,
    playCyberSe
  } = useGame();

  const [activeTab, setActiveTab] = useState<"GLOBAL" | "GUILD" | "DM">(
    chatChannel === "GUILD" ? "GUILD" : "GLOBAL"
  );

  const [dmText, setDmText] = useState("");

  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [guildChats, directMessages, activeTab]);

  const handleSend = () => {
    if (activeTab === "DM") {
      if (!dmText.trim() || !dmRecipientId) return;
      handleSendDirectMessage(dmRecipientId, dmText);
      setDmText("");
    } else {
      setChatChannel(activeTab);
      handleSendChat();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content tribe-modal" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="tribe-modal-header">
          <h3 className="tribe-modal-title">暗号メッセージ『トライブ』</h3>
          <button className="tribe-modal-close-btn active-scale-effect" onClick={onClose}>
            ✕ 閉じる
          </button>
        </div>

        {/* タブ切り替え (全体 / ギルド / 個人チャット) */}
        <div className="tribe-tabs">
          <button
            className={`tribe-tab-btn ${activeTab === "GLOBAL" ? "active" : ""}`}
            onClick={() => { setActiveTab("GLOBAL"); setChatChannel("GLOBAL"); playCyberSe("click"); }}
          >
            全体
          </button>
          <button
            className={`tribe-tab-btn ${activeTab === "GUILD" ? "active" : ""}`}
            onClick={() => { setActiveTab("GUILD"); setChatChannel("GUILD"); playCyberSe("click"); }}
          >
            ギルド
          </button>
          <button
            className={`tribe-tab-btn ${activeTab === "DM" ? "active" : ""}`}
            onClick={() => { setActiveTab("DM"); playCyberSe("click"); }}
          >
            個人チャット (DM)
          </button>
        </div>

        {/* DM時: 送信相手選択ドロップダウン */}
        {activeTab === "DM" && (
          <div className="tribe-dm-recipient-bar">
            <span className="dm-recipient-label">送信先:</span>
            <select
              className="dm-recipient-select"
              value={dmRecipientId}
              onChange={(e) => setDmRecipientId(e.target.value)}
            >
              <option value="">-- 相手を選択 --</option>
              <option value="usr_01">アキラ (ID: usr_01)</option>
              <option value="usr_02">ケンジ (ID: usr_02)</option>
              <option value="usr_03">レイジ (ID: usr_03)</option>
            </select>
          </div>
        )}

        {/* メッセージログ領域 */}
        <div className="tribe-chat-log" ref={chatLogRef}>
          {activeTab === "DM" ? (
            directMessages && directMessages.length > 0 ? (
              directMessages.map((msg: any) => (
                <div key={msg.id} className="tribe-chat-line dm-line">
                  <span className="tribe-chat-time">
                    [{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                  </span>
                  <span className="tribe-chat-author">{msg.sender_name || "ユーザー"}:</span>
                  <span className="tribe-chat-msg">{msg.message}</span>
                </div>
              ))
            ) : (
              <div className="tribe-chat-empty">個人メッセージはありません</div>
            )
          ) : guildChats && guildChats.length > 0 ? (
            guildChats.map((msg: any, idx: number) => (
              <div key={idx} className="tribe-chat-line">
                <span className="tribe-chat-author">[{msg.user_name || "名無し"}]:</span>
                <span className="tribe-chat-msg">{msg.message}</span>
              </div>
            ))
          ) : (
            <div className="tribe-chat-empty">メッセージはありません</div>
          )}
        </div>

        {/* 入力フォーム ＆ 送信ボタン */}
        <div className="tribe-chat-input-row">
          <input
            type="text"
            className="tribe-chat-input"
            placeholder={
              activeTab === "DM"
                ? "個人メッセージを入力..."
                : chatCooldown > 0
                ? `${chatCooldown}s クールダウン...`
                : "メッセージを入力..."
            }
            value={activeTab === "DM" ? dmText : chatInput}
            onChange={(e) => {
              if (activeTab === "DM") setDmText(e.target.value);
              else setChatInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            maxLength={140}
          />
          <button
            className="tribe-chat-send-btn active-scale-effect"
            onClick={handleSend}
            disabled={
              activeTab === "DM"
                ? !dmText.trim() || !dmRecipientId
                : chatSending || chatCooldown > 0 || !chatInput.trim()
            }
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================
// 2. プロフィール / 設定 パネル
// ==============================================
function ProfilePanel() {
  const {
    username,
    userBio,
    selectedLeader,
    userGiftCode,
    handleGenerateGiftCode,
    setHomeSubPanel,
    handleSaveProfile,
    playCyberSe,
    selectedBgMode,
    setSelectedBgMode,
    interiorItem,
    setInteriorItem
  } = useGame();

  const [editName, setEditName] = useState(username);
  const [editBio, setEditBio] = useState(userBio || "");
  const [editLeader, setEditLeader] = useState(selectedLeader);
  const [editBg, setEditBg] = useState(selectedBgMode || "auto");
  const [editInterior, setEditInterior] = useState(interiorItem || "none");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteText = React.useMemo(() => {
    if (!userGiftCode) return "";
    return `【TRIBE: NEON REIGN】組織設立の招待状！招待コード[${userGiftCode}]を入力して豪華ボーナスを受け取ろう！`;
  }, [userGiftCode]);

  const handleCopyCode = () => {
    if (!userGiftCode) return;
    navigator.clipboard.writeText(userGiftCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLineShare = () => {
    if (!userGiftCode) return;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(inviteText)}`;
    window.open(url, "_blank");
  };

  const handleSave = async () => {
    setSelectedBgMode(editBg);
    setInteriorItem(editInterior);
    await handleSaveProfile(editName, editBio, editLeader);
    setHomeSubPanel("main");
  };

  return (
    <div className="subpanel-container">
      <div className="subpanel-header">
        <button
          className="subpanel-back-btn active-scale-effect"
          onClick={() => { setHomeSubPanel("main"); playCyberSe("click"); }}
        >
          ← 戻る
        </button>
        <h2 className="subpanel-title">プロフィール・設定</h2>
      </div>

      <div className="subpanel-body">
        {/* プレイヤー名 */}
        <div className="profile-field-group">
          <label className="profile-label">プレイヤー名</label>
          <input
            type="text"
            className="profile-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={12}
          />
        </div>

        {/* 自己紹介 */}
        <div className="profile-field-group">
          <label className="profile-label">自己紹介</label>
          <textarea
            className="profile-textarea"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            maxLength={100}
            rows={3}
          />
        </div>

        {/* 任意背景選択 */}
        <div className="profile-field-group">
          <label className="profile-label">マイページ背景設定</label>
          <select
            className="profile-select"
            value={editBg}
            onChange={(e) => setEditBg(e.target.value)}
          >
            <option value="auto">拠点自動連動 (デフォルト)</option>
            <option value="shinjuku">新宿・歌舞伎町</option>
            <option value="shibuya">渋谷・スクランブル</option>
            <option value="ikebukuro">池袋・サンシャイン</option>
            <option value="roppongi">六本木・ナイトクラブ</option>
            <option value="deepdock">ディープドック</option>
            <option value="junkbazaar">ジャンクバザール</option>
            <option value="kitakuragate">キタクラゲート</option>
          </select>
        </div>

        {/* 置物インテリア装飾選択 */}
        <div className="profile-field-group">
          <label className="profile-label">アジト置物インテリア</label>
          <select
            className="profile-select"
            value={editInterior}
            onChange={(e) => setEditInterior(e.target.value)}
          >
            <option value="none">なし</option>
            <option value="ネオンサイン">ネオン看板</option>
            <option value="レザーソファ">レザーソファ</option>
            <option value="ゴールデントロフィー">黄金トロフィー</option>
            <option value="大型バイク">改造アメリカンバイク</option>
          </select>
        </div>

        {/* お気に入りリーダー設定 */}
        <div className="profile-field-group">
          <label className="profile-label">お気に入りリーダー設定</label>
          <div className="leader-select-grid">
            {CHARACTERS_MASTER.map((char) => (
              <button
                key={char.id}
                className={`leader-select-card ${editLeader === char.id ? "selected" : ""}`}
                onClick={() => setEditLeader(char.id)}
              >
                <img
                  src={getCharacterTransparentImg(char.name)}
                  alt={char.jpName}
                  className="leader-select-img"
                />
                <span className="leader-select-name">{char.jpName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ギフトコード */}
        <div className="profile-field-group">
          <label className="profile-label">ユーザー招待・ギフトコード</label>
          <div className="gift-code-area">
            {userGiftCode ? (
              <button
                className="gift-code-show-btn active-scale-effect"
                onClick={() => setShowGiftModal(true)}
              >
                ギフトコードを確認・招待
              </button>
            ) : (
              <button
                className="gift-code-gen-btn active-scale-effect"
                onClick={handleGenerateGiftCode}
              >
                ギフトコードを発行する
              </button>
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        <button
          className="profile-save-btn active-scale-effect"
          onClick={handleSave}
        >
          設定を保存
        </button>
      </div>

      {/* ギフトコードモーダル */}
      {showGiftModal && (
        <div className="modal-backdrop" onClick={() => setShowGiftModal(false)}>
          <div className="modal-content gift-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">招待ギフトコード</h3>
            <div className="gift-code-display">{userGiftCode}</div>
            <p className="gift-code-desc">
              新規プレイヤーが組織設立時にこのコードを入力すると、お互いに報酬が届きます！
            </p>
            <div className="gift-actions">
              <button className="gift-action-btn copy-btn active-scale-effect" onClick={handleCopyCode}>
                {copied ? "コピー完了!" : "コードをコピー"}
              </button>
              <button className="gift-action-btn line-btn active-scale-effect" onClick={handleLineShare}>
                LINEで招待
              </button>
            </div>
            <button className="modal-close-btn active-scale-effect" onClick={() => setShowGiftModal(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================
// 3. ミッション パネル
// ==============================================
function MissionsPanel() {
  const {
    missionMasters,
    userMissions,
    handleClaimMissionReward,
    setHomeSubPanel,
    playCyberSe
  } = useGame();

  return (
    <div className="subpanel-container">
      <div className="subpanel-header">
        <button
          className="subpanel-back-btn active-scale-effect"
          onClick={() => { setHomeSubPanel("main"); playCyberSe("click"); }}
        >
          ← 戻る
        </button>
        <h2 className="subpanel-title">ミッション</h2>
      </div>

      <div className="subpanel-body">
        <div className="missions-list">
          {missionMasters && missionMasters.length > 0 ? (
            missionMasters.map((m: any) => {
              const uMission = userMissions?.find((um: any) => um.mission_id === m.id);
              const progress = uMission?.progress || 0;
              const completed = progress >= m.target_value;
              const claimed = uMission?.claimed || false;

              return (
                <div key={m.id} className="mission-card">
                  <div className="mission-info">
                    <span className="mission-title">{m.title}</span>
                    <span className="mission-desc">{m.description}</span>
                    <span className="mission-progress">進捗: {progress} / {m.target_value}</span>
                  </div>
                  <div className="mission-action">
                    {claimed ? (
                      <span className="mission-claimed-badge">受取済</span>
                    ) : completed ? (
                      <button
                        className="mission-claim-btn active-scale-effect"
                        onClick={() => handleClaimMissionReward(m.id)}
                      >
                        報酬受取
                      </button>
                    ) : (
                      <span className="mission-locked-badge">未達成</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="subpanel-empty">現在配信中のミッションはありません</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================
// 4. プレゼント / お知らせ インボックス パネル
// ==============================================
function InboxPanel() {
  const {
    inboxTab,
    setInboxTab,
    presentsList,
    newsList,
    handleClaimPresent,
    handleClaimAllPresents,
    setHomeSubPanel,
    playCyberSe
  } = useGame();

  return (
    <div className="subpanel-container">
      <div className="subpanel-header">
        <button
          className="subpanel-back-btn active-scale-effect"
          onClick={() => { setHomeSubPanel("main"); playCyberSe("click"); }}
        >
          ← 戻る
        </button>
        <div className="inbox-tabs">
          <button
            className={`inbox-tab-btn ${inboxTab === "presents" ? "active" : ""}`}
            onClick={() => setInboxTab("presents")}
          >
            プレゼント
          </button>
          <button
            className={`inbox-tab-btn ${inboxTab === "news" ? "active" : ""}`}
            onClick={() => setInboxTab("news")}
          >
            お知らせ
          </button>
        </div>
      </div>

      <div className="subpanel-body">
        {inboxTab === "presents" ? (
          <div className="presents-area">
            {presentsList && presentsList.length > 0 && (
              <button
                className="presents-claim-all-btn active-scale-effect"
                onClick={handleClaimAllPresents}
              >
                一括受取
              </button>
            )}

            <div className="presents-list">
              {presentsList && presentsList.length > 0 ? (
                presentsList.map((p: any) => (
                  <div key={p.id} className="present-card">
                    <div className="present-info">
                      <span className="present-title">{p.title || "プレゼント"}</span>
                      <span className="present-desc">{p.message}</span>
                    </div>
                    <button
                      className="present-claim-btn active-scale-effect"
                      onClick={() => handleClaimPresent(p.id)}
                    >
                      受取
                    </button>
                  </div>
                ))
              ) : (
                <div className="subpanel-empty">届いているプレゼントはありません</div>
              )}
            </div>
          </div>
        ) : (
          <div className="news-area">
            <div className="news-list">
              {newsList && newsList.length > 0 ? (
                newsList.map((n: any) => (
                  <div key={n.id} className="news-card">
                    <div className="news-header-line">
                      <span className="news-category">[{n.category || "お知らせ"}]</span>
                      <span className="news-title">{n.title}</span>
                    </div>
                    <div className="news-body">{n.content}</div>
                  </div>
                ))
              ) : (
                <div className="subpanel-empty">現在新しいお知らせはありません</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
