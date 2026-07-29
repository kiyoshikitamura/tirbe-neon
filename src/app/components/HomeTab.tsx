"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  BASE_MAP_MASTER,
  MASTER_AVATARS,
  PROFILE_BACKGROUNDS,
  PROFILE_FRONT_EFFECTS,
  PROFILE_TITLES,
  getCharacterTransparentImg
} from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import { useImagePreloader } from "../hooks/useImagePreloader";
import { LoginBonusModal } from "./LoginBonusModal";
import AvatarRenderer from "./AvatarRenderer";
import "./HomeTab.css";

/**
 * HomeTab - ルーター ＆ マイページ メインパネル
 * シングルモバイル中心アーキテクチャ (Matte Outlaw Circular UI)
 */
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
  // ⚡ ロード時間の最適化: 画像の事前面言キャッシュ (メモリプリロード) による0秒描画
  useImagePreloader([
    "/bg/bg_base_neontower.png",
    "/bg/bg_base_deepdock.png",
    "/bg/bg_base_junkbazaar.png",
    "/bg/bg_base_kitakuragate.png",
    "/menu/menu_allies.png",
    "/menu/menu_fight.png",
    "/menu/menu_conquest.png",
    "/ui/icon_mission.png",
    "/ui/icon_present.png",
    "/ui/icon_ranking.png",
    "/ui/icon_community.png",
    "/ui/icon_news.png",
    "/ui/icon_settings.png",
    "/ui/icon_cash.png",
    "/ui/icon_dia.png",
    "/ui/icon_map.png"
  ]);

  const {
    currentBaseId,
    gvgBaseControls,
    selectedLeader,
    unreadMissionsCount,
    unclaimedPresentsCount,
    chatChannel,
    setChatChannel,
    guildChats,
    chatInput,
    setChatInput,
    chatCooldown,
    chatSending,
    handleSendChat,
    setHomeSubPanel,
    setInboxTab,
    navigateTab,
    playCyberSe,
    newsList
  } = useGame();

  // チャットチャンネルタブ定義
  const CHAT_TABS = [
    { key: "GLOBAL" as const, label: "全体" },
    { key: "GUILD" as const, label: "ギルド" },
  ];

  // 拠点情報
  const currentBaseInfo = BASE_MAP_MASTER.find(b => b.id === currentBaseId);
  const gvgInfo = gvgBaseControls.find((g: any) => g.base_id === currentBaseId);
  const controllerName = gvgInfo ? (gvgInfo.guilds?.name || "他プレイヤー") : "未支配";
  const baseName = currentBaseInfo?.name || "ネオンタワー";

  // お気に入りリーダーキャラクター
  const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];

  // 拠点背景URLの解決
  const bgUrl =
    currentBaseId === "neon_tower" || currentBaseId === "shinjuku" ? "/bg/bg_base_neontower.png" :
    currentBaseId === "deep_dock" || currentBaseId === "shinagawa" ? "/bg/bg_base_deepdock.png" :
    currentBaseId === "junk_bazar" || currentBaseId === "akihabara" ? "/bg/bg_base_junkbazaar.png" :
    currentBaseId === "kitakura_gate" || currentBaseId === "ikebukuro" ? "/bg/bg_base_kitakuragate.png" :
    "/bg/bg_base_neontower.png";

  // チャットオートスクロール
  const chatLogRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [guildChats]);

  return (
    <div className="mypage-view">

      {/* ビジュアルエリア (50vh: 拠点背景 + 立ち絵 + 拠点HUD + 左右サブアイコン) */}
      <div
        className="mypage-visual-area"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      >
        {/* 暗めの暗部グラデーション */}
        <div className="mypage-visual-overlay"></div>

        {/* 拠点情報オーバーレイ (最上部HUD) */}
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

        {/* サブメニューアイコン - 左側 (ゲームプレイ系: 透過PNG化) */}
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
            onClick={() => { navigateTab("ranking"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_ranking.png" alt="ランキング" className="sub-png-icon" />
            <span className="sub-icon-label">ランキング</span>
          </button>

          <button
            className="sub-icon-unit active-scale-effect"
            onClick={() => { navigateTab("bbs"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_community.png" alt="BBS" className="sub-png-icon" />
            <span className="sub-icon-label">BBS</span>
          </button>
        </div>

        {/* サブメニューアイコン - 右側 (情報・設定系: 透過PNG化) */}
        <div className="mypage-sub-icons-right">
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
            onClick={() => { setHomeSubPanel("profile"); playCyberSe("click"); }}
          >
            <img src="/ui/icon_settings.png" alt="設定" className="sub-png-icon" />
            <span className="sub-icon-label">設定</span>
          </button>
        </div>

        {/* リーダー立ち絵画像 */}
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
      </div>

      {/* 丸型漢字メニューボタン (ビジュアルエリアにネガティブマージン -48px で重ね表示) */}
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

      {/* チャットウィジェット (固定高さ 108px) */}
      <div className="mypage-chat-widget">
        <div className="mypage-chat-header">
          <div className="mypage-chat-tabs">
            {CHAT_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`mypage-chat-tab ${chatChannel === tab.key ? "active" : ""}`}
                onClick={() => setChatChannel(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mypage-chat-log" ref={chatLogRef}>
          {guildChats && guildChats.length > 0 ? (
            guildChats.slice(-6).map((msg: any, index: number) => (
              <div key={index} className="mypage-chat-line">
                <span className="mypage-chat-author">[{msg.user_name || "名無し"}]:</span>
                <span className="mypage-chat-content">{msg.message}</span>
              </div>
            ))
          ) : (
            <div className="mypage-chat-empty">チャットメッセージはありません</div>
          )}
        </div>

        <div className="mypage-chat-input-row">
          <input
            type="text"
            className="mypage-chat-input"
            placeholder={chatCooldown > 0 ? `${chatCooldown}s クールダウン...` : "メッセージを入力..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !chatSending && chatCooldown === 0) {
                handleSendChat();
              }
            }}
            disabled={chatSending || chatCooldown > 0}
            maxLength={140}
          />
          <button
            className="mypage-chat-send active-scale-effect"
            onClick={handleSendChat}
            disabled={chatSending || chatCooldown > 0 || !chatInput.trim()}
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
    setSelectedLeader,
    userCharactersDbList,
    userEquipmentsList,
    userGiftCode,
    handleGenerateGiftCode,
    setHomeSubPanel,
    handleSaveProfile,
    playCyberSe,
    userAvatar,
    handleSaveAvatar,
    userAvatarInventory
  } = useGame();

  const [editName, setEditName] = React.useState(username);
  const [editBio, setEditBio] = React.useState(userBio || "");
  const [editLeader, setEditLeader] = React.useState(selectedLeader);
  const [showGiftModal, setShowGiftModal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // 招待文の生成
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
        {/* プレイヤー名編集 */}
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

        {/* 自己紹介編集 */}
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

        {/* ギフトコード招待機能 */}
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

      {/* ギフトコードポップアップモーダル */}
      {showGiftModal && (
        <div className="modal-backdrop" onClick={() => setShowGiftModal(false)}>
          <div className="modal-content gift-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">招待ギフトコード</h3>
            <div className="gift-code-display">{userGiftCode}</div>
            <p className="gift-code-desc">
              新規プレイヤーが組織設立時にこのコードを入力すると、お互いに報酬がプレゼントBOXへ届きます！（最大10名まで）
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
