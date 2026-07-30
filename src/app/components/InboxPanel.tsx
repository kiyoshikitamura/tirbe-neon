import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import "./InboxPanel.css";

export default function InboxPanel() {
  const {
    showInboxPanel,
    setShowInboxPanel,
    inboxPanelTab,
    setInboxPanelTab,
    newsList,
    presents,
    handleClaimPresent,
    handleClaimAllPresents,
    presentClaimLoading,
    playCyberSe
  } = useGame();

  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  if (!showInboxPanel) return null;

  const handleClose = () => {
    playCyberSe("click");
    setShowInboxPanel(false);
  };

  const unclaimedPresents = (presents || []).filter((p: any) => p.status === "UNCLAIMED");

  return (
    <div className="inbox-panel-overlay">
      <div className="inbox-panel-container">
        {/* ヘッダー */}
        <div className="inbox-panel-header">
          <button className="inbox-back-btn active-scale-effect" onClick={handleClose}>
            ‹ 戻る
          </button>
          <div className="inbox-tabs">
            <button
              className={`inbox-tab-btn ${inboxPanelTab === "news" ? "active" : ""}`}
              onClick={() => { setInboxPanelTab("news"); playCyberSe("click"); }}
            >
              お知らせ
            </button>
            <button
              className={`inbox-tab-btn ${inboxPanelTab === "presents" ? "active" : ""}`}
              onClick={() => { setInboxPanelTab("presents"); playCyberSe("click"); }}
            >
              プレゼント
            </button>
          </div>
          <div className="inbox-header-spacer"></div>
        </div>

        {/* コンテンツエリア */}
        <div className="inbox-panel-body scroll-container">
          {inboxPanelTab === "news" && (
            <div className="inbox-news-list">
              {(newsList || []).length === 0 ? (
                <div className="inbox-empty">お知らせはありません</div>
              ) : (
                newsList.map((news: any) => (
                  <div
                    key={news.id}
                    className="inbox-news-item active-scale-effect"
                    onClick={() => { setSelectedNews(news); playCyberSe("click"); }}
                  >
                    <div className="inbox-news-item-header">
                      {news.category === "IMPORTANT" && <span className="news-badge important">重要</span>}
                      {news.isNew && <span className="news-badge new">NEW</span>}
                      <span className="news-date">{news.date || news.created_at}</span>
                    </div>
                    <div className="inbox-news-item-title">{news.title}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {inboxPanelTab === "presents" && (
            <div className="inbox-presents-area">
              <div className="inbox-presents-actions">
                <span className="inbox-presents-count">未受取: {unclaimedPresents.length}件</span>
                <button
                  className="inbox-claim-all-btn active-scale-effect"
                  disabled={unclaimedPresents.length === 0 || presentClaimLoading}
                  onClick={() => { handleClaimAllPresents(); playCyberSe("click"); }}
                >
                  {presentClaimLoading ? <div className="spinner" /> : "一括受け取り"}
                </button>
              </div>
              <div className="inbox-presents-list">
                {unclaimedPresents.length === 0 ? (
                  <div className="inbox-empty">未受取のプレゼントはありません</div>
                ) : (
                  unclaimedPresents.map((p: any) => (
                    <div key={p.id} className="inbox-present-item">
                      <div className="inbox-present-info">
                        <div className="inbox-present-title">{p.title || p.message}</div>
                        <div className="inbox-present-reward">{p.reward || `${p.item_id} x${p.quantity}`}</div>
                        <div className="inbox-present-expire">{p.expireText || "期限なし"}</div>
                      </div>
                      <button
                        className="inbox-claim-btn active-scale-effect"
                        disabled={presentClaimLoading}
                        onClick={() => { handleClaimPresent(p.id); playCyberSe("click"); }}
                      >
                        受け取る
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* お知らせ詳細モーダル */}
      {selectedNews && (
        <div className="inbox-news-modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="inbox-news-modal-content active-scale-effect-none" onClick={e => e.stopPropagation()}>
            <div className="inbox-news-modal-header">
              <h3>{selectedNews.title}</h3>
              <button className="inbox-news-modal-close" onClick={() => setSelectedNews(null)}>✕</button>
            </div>
            <div className="inbox-news-modal-body scroll-container">
              <p className="inbox-news-modal-text">{selectedNews.content || selectedNews.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
