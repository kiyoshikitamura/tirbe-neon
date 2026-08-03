import React, { useState, useRef, useEffect } from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import "./TribeChatModal.css";

export default function TribeChatModal() {
  const {
    showTribeChatPanel,
    setShowTribeChatPanel,
    session,
    userGuild,
    userGuildMember,
    guildMembersList,
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
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTribeChatPanel && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [guildChats, directMessages, showTribeChatPanel, chatChannel]);

  if (!showTribeChatPanel) return null;

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

  const handleClose = () => {
    setShowTribeChatPanel(false);
  };

  return (
    <FullScreenPanel title="暗号メッセージ『トライブ』" onClose={handleClose}>
      <div className="tribe-modal-container-inner flex-col" style={{ height: '100%' }}>
        {/* チャンネルタブ (全体 / ギルド / DM) */}
        <SubTabNav
          tabs={[
            { id: "GLOBAL", label: "全体" },
            { id: "GUILD", label: "ギルド", disabled: !userGuild },
            { id: "DM", label: "個人(DM)" }
          ]}
          activeTabId={chatChannel}
          onSelect={(id) => setChatChannel(id as any)}
          className="mb-3"
        />

        {/* DM相手選択ドロップダウン (DM時のみ) */}
        {chatChannel === "DM" && (
          <div className="tribe-dm-recipient-selector mb-3">
            <label className="tribe-dm-label font-size-8 text-secondary mb-1 block">送信相手:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="ユーザーIDを入力..."
                value={dmRecipientId || ""}
                onChange={(e) => setDmRecipientId(e.target.value)}
                className="tribe-dm-recipient-input form-input"
                style={{ flex: 1 }}
              />
              {userGuild && guildMembersList && guildMembersList.length > 0 && (
                <select
                  value={dmRecipientId || ""}
                  onChange={(e) => setDmRecipientId(e.target.value)}
                  className="tribe-dm-recipient-select form-input"
                  style={{ flex: 1 }}
                >
                  <option value="">ギルドメンバーから選択</option>
                  {guildMembersList.map((m: any) => (
                    m.user_id !== session?.user?.id && (
                      <option key={m.user_id} value={m.user_id}>
                        {m.users?.username || "プレイヤー名"} (Lv.{m.userLevel || 1})
                      </option>
                    )
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* チャットメッセージログ表示領域 */}
        <div className="tribe-modal-body custom-scrollbar flex-1 mb-3" ref={chatBodyRef}>
          {chatChannel === "DM" ? (
            safeDirectMessages.length === 0 ? (
              <div className="tribe-modal-empty">ダイレクトメッセージのログはありません</div>
            ) : (
              safeDirectMessages.map((msg: any, idx: number) => {
                const isSelf = msg.sender_id === session?.user?.id;
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
                const isSelf = msg.user_id === session?.user?.id;
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
        </div>

        {/* メッセージ入力エリア */}
        <div className="tribe-modal-footer" style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
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
              className="tribe-modal-input form-input"
              style={{ flex: 1 }}
            />
            <OutlawButton
              variant="primary"
              onClick={handleSend}
              disabled={
                chatSending ||
                chatCooldown > 0 ||
                (chatChannel === "DM" ? !localDmText.trim() || !dmRecipientId : !chatInput.trim())
              }
              style={{ width: '80px' }}
            >
              {chatSending ? <div className="spinner" /> : "送信"}
            </OutlawButton>
          </div>
        </div>
      </div>
    </FullScreenPanel>
  );
}
