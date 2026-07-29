"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGame } from "../context/GameContext";
import "./TribeChatModal.css";

interface TribeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TribeChatModal({ isOpen, onClose }: TribeChatModalProps) {
  const {
    userGuild,
    userGuildMember,
    chatChannel,
    setChatChannel,
    guildChats,
    chatInput,
    setChatInput,
    chatCooldown,
    chatSending,
    handleSendChat,
    playCyberSe,
    dmRecipientId,
    setDmRecipientId,
    directMessages,
    handleSendDirectMessage
  } = useGame();

  const [localDmText, setLocalDmText] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [guildChats, directMessages, isOpen, chatChannel]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !chatSending && chatCooldown === 0) {
      if (chatChannel === "DM") {
        if (localDmText.trim() && dmRecipientId) {
          handleSendDirectMessage(dmRecipientId, localDmText);
          setLocalDmText("");
        }
      } else {
        if (chatInput.trim()) {
          handleSendChat();
        }
      }
    }
  };

  const handleSend = () => {
    if (chatChannel === "DM") {
      if (localDmText.trim() && dmRecipientId) {
        handleSendDirectMessage(dmRecipientId, localDmText);
        setLocalDmText("");
      }
    } else {
      if (chatInput.trim()) {
        handleSendChat();
      }
    }
  };

  const safeDirectMessages = directMessages || [];
  const safeGuildChats = guildChats || [];

  return (
    <div className="tribe-modal-overlay" onClick={onClose}>
      <div className="tribe-modal-container active-scale-effect-none" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="tribe-modal-header">
          <div className="tribe-modal-title-row">
            <span className="tribe-modal-tag">SECURE COMM</span>
            <h3 className="tribe-modal-title">暗号メッセージ『トライブ』</h3>
          </div>
          <button className="tribe-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* チャンネルタブ (全体 / ギルド / DM) */}
        <div className="tribe-modal-tabs">
          <button
            className={`tribe-modal-tab-btn ${chatChannel === "GLOBAL" ? "active" : ""}`}
            onClick={() => { setChatChannel("GLOBAL"); playCyberSe("click"); }}
          >
            全体
          </button>
          <button
            className={`tribe-modal-tab-btn ${chatChannel === "GUILD" ? "active" : ""}`}
            disabled={!userGuild}
            onClick={() => { setChatChannel("GUILD"); playCyberSe("click"); }}
            style={{ opacity: !userGuild ? 0.4 : 1 }}
          >
            ギルド
          </button>
          <button
            className={`tribe-modal-tab-btn ${chatChannel === "DM" ? "active" : ""}`}
            onClick={() => { setChatChannel("DM"); playCyberSe("click"); }}
          >
            個人(DM)
          </button>
        </div>

        {/* DM相手選択ドロップダウン (DM時のみ) */}
        {chatChannel === "DM" && (
          <div className="tribe-dm-recipient-selector">
            <label className="tribe-dm-label">送信相手ID:</label>
            <input
              type="text"
              placeholder="相手のユーザーIDを入力..."
              value={dmRecipientId || ""}
              onChange={(e) => setDmRecipientId(e.target.value)}
              className="tribe-dm-recipient-input"
            />
          </div>
        )}

        {/* チャットメッセージログ表示領域 */}
        <div className="tribe-modal-body scroll-container">
          {chatChannel === "DM" ? (
            safeDirectMessages.length === 0 ? (
              <div className="tribe-modal-empty">ダイレクトメッセージのログはありません</div>
            ) : (
              safeDirectMessages.map((msg: any, idx: number) => {
                const isSelf = msg.sender_id === userGuildMember?.user_id;
                const timeStr = msg?.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <div key={idx} className={`tribe-msg-row ${isSelf ? "self" : "other"}`}>
                    <div className="tribe-msg-header">
                      <span className="tribe-msg-author">{msg.sender_name || "ユーザー"}</span>
                      {timeStr && <span className="tribe-msg-time">{timeStr}</span>}
                    </div>
                    <div className="tribe-msg-bubble">{msg.message || msg.content || ""}</div>
                  </div>
                );
              })
            )
          ) : (
            safeGuildChats.length === 0 ? (
              <div className="tribe-modal-empty">メッセージログはありません</div>
            ) : (
              safeGuildChats.map((msg: any, idx: number) => {
                const isSelf = msg.user_id === userGuildMember?.user_id;
                return (
                  <div key={idx} className={`tribe-msg-row ${isSelf ? "self" : "other"}`}>
                    <div className="tribe-msg-header">
                      <span className="tribe-msg-author">{msg.author_name}</span>
                    </div>
                    <div className="tribe-msg-bubble">{msg.content || ""}</div>
                  </div>
                );
              })
            )
          )}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* メッセージ入力エリア */}
        <div className="tribe-modal-footer">
          <input
            type="text"
            placeholder={
              chatCooldown > 0
                ? `送信制限中 (${chatCooldown}秒)`
                : chatChannel === "DM"
                ? "暗号DMを入力..."
                : `${chatChannel === "GLOBAL" ? "全体" : "ギルド"}へ送信...`
            }
            value={chatChannel === "DM" ? localDmText : chatInput}
            onChange={(e) => {
              if (chatChannel === "DM") {
                setLocalDmText(e.target.value);
              } else {
                setChatInput(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            maxLength={140}
            disabled={chatCooldown > 0}
            className="tribe-modal-input"
          />
          <button
            onClick={handleSend}
            disabled={
              chatSending ||
              chatCooldown > 0 ||
              (chatChannel === "DM" ? !localDmText.trim() || !dmRecipientId : !chatInput.trim())
            }
            className="tribe-modal-send-btn active-scale-effect"
          >
            {chatSending ? <div className="spinner" /> : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
