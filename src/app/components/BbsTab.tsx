"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase"; // もし supabase クライアントが別にあれば
import "./BbsTab.css";

export default function BbsTab() {
  const {
    session,
    username,
    selectedLeader,
    bbsThreads,
    setBbsThreads,
    bbsActiveThread,
    setBbsActiveThread,
    bbsPosts,
    setBbsPosts,
    bbsLoading,
    fetchBbsThreads,
    createBbsThread,
    fetchBbsPosts,
    createBbsPost,
    playCyberSe,
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<"RECRUIT" | "STRATEGY_CHAT">("RECRUIT");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // スレッド作成用
  const [newTitle, setNewTitle] = useState<string>("");
  const [newContent, setNewContent] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  // 返信用
  const [replyContent, setReplyContent] = useState<string>("");
  const [replying, setReplying] = useState<boolean>(false);

  const postsEndRef = useRef<HTMLDivElement>(null);

  // カテゴリ変更時にスレッド取得
  useEffect(() => {
    if (session) {
      fetchBbsThreads(activeCategory);
    }
  }, [activeCategory, session]);

  // レスが更新されたら最下部にスクロール
  useEffect(() => {
    if (bbsActiveThread) {
      postsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [bbsPosts, bbsActiveThread]);

  // リアルタイム購読（スレッド一覧用）
  useEffect(() => {
    if (!session || bbsActiveThread) return;

    const channel = supabase
      .channel("realtime_bbs_threads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bbs_threads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newThread = payload.new as any;
            if (newThread.category === activeCategory) {
              setBbsThreads((prev: any[]) => {
                if (prev.some((t) => t.id === newThread.id)) return prev;
                return [newThread, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedThread = payload.new as any;
            if (updatedThread.category === activeCategory) {
              setBbsThreads((prev: any[]) => {
                const filtered = prev.filter((t) => t.id !== updatedThread.id);
                const nextList = [updatedThread, ...filtered];
                return nextList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, bbsActiveThread, activeCategory]);

  // リアルタイム購読（レス一覧用）
  useEffect(() => {
    if (!session || !bbsActiveThread) return;

    const channel = supabase
      .channel(`realtime_bbs_posts_${bbsActiveThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bbs_posts",
        },
        (payload) => {
          const newPost = payload.new as any;
          if (newPost.thread_id === bbsActiveThread.id) {
            setBbsPosts((prev: any[]) => {
              if (prev.some((p) => p.id === newPost.id)) return prev;
              return [...prev, newPost];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, bbsActiveThread]);

  // スレッド作成処理
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || creating) return;

    setCreating(true);
    playCyberSe("click");
    try {
      await createBbsThread(activeCategory, newTitle.trim(), newContent.trim());
      setNewTitle("");
      setNewContent("");
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  // レス投稿処理
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || replying || !bbsActiveThread) return;

    setReplying(true);
    playCyberSe("click");
    try {
      await createBbsPost(bbsActiveThread.id, replyContent.trim());
      setReplyContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(false);
    }
  };

  // 時間フォーマット関数
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;

    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="bbs-view-container">
      {/* ヘッダー */}
      <div className="bbs-header-panel">
        <div className="bbs-header-left">
          <span className="bbs-header-tag">BBS COMMUNICATION</span>
          <h2 className="bbs-header-title">
            BBS <span className="bbs-header-sub">【BBSテスト環境検証用】</span>
          </h2>
        </div>
        {!bbsActiveThread && (
          <button
            className="bbs-create-btn active-scale-effect"
            onClick={() => {
              playCyberSe("click");
              setShowCreateModal(true);
            }}
          >
            新規スレッド
          </button>
        )}
      </div>

      {/* スレッド詳細表示 */}
      {bbsActiveThread ? (
        <div className="bbs-detail-panel">
          <div className="bbs-detail-top">
            <button
              className="bbs-back-btn active-scale-effect"
              onClick={() => {
                playCyberSe("click");
                setBbsActiveThread(null);
                setBbsPosts([]);
                fetchBbsThreads(activeCategory);
              }}
            >
              ← 一覧に戻る
            </button>
            <span className="bbs-detail-category-badge">
              {bbsActiveThread.category === "RECRUIT" ? "ギルドメンバー募集" : "攻略＆雑談"}
            </span>
          </div>

          <div className="bbs-thread-main-card">
            <div className="bbs-post-author-row">
              <div className="bbs-author-avatar-wrapper">
                <img
                  src={bbsActiveThread.author_avatar_url || "/reiji_transparent_asset.png"}
                  alt=""
                  className="bbs-author-avatar"
                />
              </div>
              <div className="bbs-author-info">
                <span className="bbs-author-name">{bbsActiveThread.author_name}</span>
                <span className="bbs-post-time">{formatTime(bbsActiveThread.created_at)}</span>
              </div>
            </div>
            <h3 className="bbs-thread-main-title">{bbsActiveThread.title}</h3>
            <p className="bbs-thread-main-content">{bbsActiveThread.content}</p>
          </div>

          {/* 返信一覧 */}
          <div className="bbs-posts-container scroll-container">
            {bbsPosts.length === 0 ? (
              <div className="bbs-no-posts">最初の返信を書き込みましょう。</div>
            ) : (
              bbsPosts.map((post: any) => (
                <div key={post.id} className="bbs-post-card">
                  <div className="bbs-post-author-row">
                    <div className="bbs-author-avatar-wrapper">
                      <img
                        src={post.author_avatar_url || "/reiji_transparent_asset.png"}
                        alt=""
                        className="bbs-author-avatar"
                      />
                    </div>
                    <div className="bbs-author-info">
                      <span className="bbs-author-name">{post.author_name}</span>
                      <span className="bbs-post-time">{formatTime(post.created_at)}</span>
                    </div>
                  </div>
                  <p className="bbs-post-content">{post.content}</p>
                </div>
              ))
            )}
            <div ref={postsEndRef} />
          </div>

          {/* 返信フォーム */}
          <form className="bbs-reply-form" onSubmit={handleCreatePost}>
            <textarea
              className="bbs-reply-textarea"
              placeholder="メッセージを入力...（最大200文字）"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              maxLength={200}
              required
            />
            <button
              type="submit"
              className="bbs-reply-submit-btn active-scale-effect"
              disabled={replying || !replyContent.trim()}
            >
              {replying ? "送信中..." : "書き込む"}
            </button>
          </form>
        </div>
      ) : (
        /* スレッド一覧表示 */
        <div className="bbs-list-panel">
          {/* カテゴリ切替タブ */}
          <div className="bbs-category-tabs">
            <button
              className={`bbs-category-tab active-scale-effect ${activeCategory === "RECRUIT" ? "active" : ""}`}
              onClick={() => {
                setActiveCategory("RECRUIT");
                playCyberSe("click");
              }}
            >
              ギルドメンバー募集
            </button>
            <button
              className={`bbs-category-tab active-scale-effect ${activeCategory === "STRATEGY_CHAT" ? "active" : ""}`}
              onClick={() => {
                setActiveCategory("STRATEGY_CHAT");
                playCyberSe("click");
              }}
            >
              攻略＆雑談
            </button>
          </div>

          {/* スレッド一覧 */}
          <div className="bbs-threads-list scroll-container">
            {bbsLoading ? (
              <div className="bbs-list-loading">
                <div className="spinner" />
              </div>
            ) : bbsThreads.length === 0 ? (
              <div className="bbs-empty-threads">スレッドがありません。新しく作成しましょう。</div>
            ) : (
              bbsThreads.map((thread: any) => (
                <div
                  key={thread.id}
                  className="bbs-thread-card active-scale-effect"
                  onClick={async () => {
                    playCyberSe("click");
                    setBbsActiveThread(thread);
                    await fetchBbsPosts(thread.id);
                  }}
                >
                  <div className="bbs-thread-card-header">
                    <h4 className="bbs-thread-title">{thread.title}</h4>
                    <span className="bbs-thread-date">{formatTime(thread.updated_at)}</span>
                  </div>
                  <p className="bbs-thread-preview">{thread.content}</p>
                  <div className="bbs-thread-footer">
                    <span className="bbs-thread-author">投稿者: {thread.author_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* スレッド作成モーダル */}
      {showCreateModal && (
        <div className="bbs-modal-overlay">
          <div className="bbs-modal-content">
            <div className="bbs-modal-header">
              <h3>スレッド作成</h3>
              <button
                className="bbs-modal-close-btn active-scale-effect"
                onClick={() => {
                  playCyberSe("click");
                  setShowCreateModal(false);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateThread}>
              <div className="bbs-form-group">
                <label>スレッドタイトル</label>
                <input
                  type="text"
                  placeholder="タイトルを入力してください（最大50文字）"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="bbs-form-group">
                <label>本文</label>
                <textarea
                  placeholder="本文を入力してください（最大200文字）"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div className="bbs-modal-actions">
                <button
                  type="button"
                  className="bbs-modal-cancel-btn active-scale-effect"
                  onClick={() => {
                    playCyberSe("click");
                    setShowCreateModal(false);
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bbs-modal-submit-btn active-scale-effect"
                  disabled={creating || !newTitle.trim() || !newContent.trim()}
                >
                  {creating ? "作成中..." : "スレッドを作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
