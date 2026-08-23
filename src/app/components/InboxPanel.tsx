import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
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
    setShowInboxPanel(false);
  };

  const unclaimedPresents = (presents || []).filter((p: any) => p.status === "UNCLAIMED");

  const renderNewsContent = () => (
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
  );

  const renderPresentsContent = () => (
    <div className="inbox-presents-area">
      <div className="inbox-presents-actions">
        <span className="inbox-presents-count">未受取: {unclaimedPresents.length}件</span>
        <OutlawButton
          variant="primary"
          disabled={unclaimedPresents.length === 0 || presentClaimLoading}
          isLoading={presentClaimLoading}
          loadingLabel="一括受取中…"
          onClick={handleClaimAllPresents}
        >
          一括受け取り
        </OutlawButton>
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
              <OutlawButton
                variant="primary"
                disabled={presentClaimLoading}
                isLoading={Boolean(p.loading)}
                loadingLabel="受取中…"
                onClick={() => handleClaimPresent(p.id)}
              >
                受け取る
              </OutlawButton>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <FullScreenPanel title="受信箱" onClose={handleClose}>
        <div className="inbox-panel-container-inner">
          <SubTabNav
            tabs={[
              { id: "news", label: "お知らせ" },
              { id: "presents", label: "プレゼント" }
            ]}
            activeTabId={inboxPanelTab}
            onSelect={(id) => setInboxPanelTab(id as any)}
            className="mb-3"
          />

          {inboxPanelTab === "news" ? renderNewsContent() : renderPresentsContent()}
        </div>
      </FullScreenPanel>

      {/* お知らせ詳細モーダル */}
      {selectedNews && (
        <div className="inbox-news-modal-overlay" onClick={() => setSelectedNews(null)}>
          <div className="inbox-news-modal-content active-scale-effect-none" onClick={e => e.stopPropagation()}>
            <div className="inbox-news-modal-header">
              <h3>{selectedNews.title}</h3>
              <button className="inbox-news-modal-close" onClick={() => setSelectedNews(null)}>✕</button>
            </div>
            <div className="inbox-news-modal-body scroll-container custom-scrollbar">
              <p className="inbox-news-modal-text">{selectedNews.content || selectedNews.desc}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
