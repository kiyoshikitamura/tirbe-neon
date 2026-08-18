import React, { useState, useRef, useEffect } from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import { supabase } from "../../utils/supabase";
import "./TribeChatModal.css";

export default function TribeChatModal() {
  const {
    showTribeChatPanel,
    setShowTribeChatPanel,
    session,
    userGuild,
    userGuildMember,
    guildMembersList,
    userFriends,
    chatChannel,
    setChatChannel,
    chatUnreadCounts,
    guildChats,
    chatInput,
    setChatInput,
    chatReplyTo,
    setChatReplyTo,
    chatCooldown,
    chatSending,
    handleSendChat,
    playCyberSe,
    dmRecipientId,
    setDmRecipientId,
    directMessages,
    dmUnreadConversations,
    dmUnreadTotal,
    handleSendDirectMessage,
    fetchPlayerDetail,
    navigateTab
  } = useGame();

  const [localDmText, setLocalDmText] = useState("");
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const hasProfileSelectedRecipient = Boolean(
    dmRecipientId
      && !guildMembersList?.some((member: any) => member.user_id === dmRecipientId)
      && !userFriends?.some((friend: any) => friend.id === dmRecipientId)
  );
  const unreadOnlyRecipients = (dmUnreadConversations || []).filter((conversation: any) => (
    conversation.sender_id !== session?.user?.id
      && !guildMembersList?.some((member: any) => member.user_id === conversation.sender_id)
      && !userFriends?.some((friend: any) => friend.id === conversation.sender_id)
      && conversation.sender_id !== dmRecipientId
  ));
  const getDmUnreadCount = (userId: string) => Number(
    dmUnreadConversations?.find((conversation: any) => conversation.sender_id === userId)?.unread_count || 0
  );

  useEffect(() => {
    if (showTribeChatPanel && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [guildChats, directMessages, showTribeChatPanel, chatChannel]);

  if (!showTribeChatPanel) return null;

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !chatSending && chatCooldown === 0) {
      if (chatChannel === "DM") {
        if (localDmText.trim() && dmRecipientId) {
          const sent = await handleSendDirectMessage(dmRecipientId, localDmText);
          if (sent) setLocalDmText("");
        }
      } else {
        if (chatInput.trim()) {
          handleSendChat();
        }
      }
    }
  };

  const handleSend = async () => {
    if (chatChannel === "DM") {
      if (localDmText.trim() && dmRecipientId) {
        const sent = await handleSendDirectMessage(dmRecipientId, localDmText);
        if (sent) setLocalDmText("");
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
            { id: "GLOBAL", label: `全体${chatUnreadCounts?.GLOBAL ? ` (${chatUnreadCounts.GLOBAL})` : ""}` },
            { id: "GUILD", label: `ギルド${chatUnreadCounts?.GUILD ? ` (${chatUnreadCounts.GUILD})` : ""}`, disabled: !userGuild },
            { id: "DM", label: `個人(DM)${dmUnreadTotal ? ` (${dmUnreadTotal})` : ""}` }
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
                type="hidden"
                placeholder="ユーザーIDを入力..."
                value={dmRecipientId || ""}
                onChange={(e) => setDmRecipientId(e.target.value)}
                className="tribe-dm-recipient-input form-input"
                style={{ flex: 1 }}
              />
              {(
                <select
                  value={dmRecipientId || ""}
                  onChange={(e) => setDmRecipientId(e.target.value)}
                  className="tribe-dm-recipient-select form-input"
                  style={{ flex: 1 }}
                >
                  {hasProfileSelectedRecipient && (
                    <option value={dmRecipientId}>
                      プロフィールから選択したユーザー{getDmUnreadCount(dmRecipientId || "") ? `（未読${getDmUnreadCount(dmRecipientId || "")}）` : ""}
                    </option>
                  )}
                  <option value="">送信相手を選択</option>
                  {unreadOnlyRecipients.length > 0 && (
                    <optgroup label="未読DM">
                      {unreadOnlyRecipients.map((conversation: any) => (
                        <option key={conversation.sender_id} value={conversation.sender_id}>
                          {conversation.sender_name}（未読{conversation.unread_count}）
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {guildMembersList?.map((m: any) => (
                    m.user_id !== session?.user?.id && (
                      <option key={m.user_id} value={m.user_id}>
                        {m.users?.username || "プレイヤー名"} (Lv.{m.userLevel || 1}){getDmUnreadCount(m.user_id) ? `（未読${getDmUnreadCount(m.user_id)}）` : ""}
                      </option>
                    )
                  ))}
                  {userFriends?.length > 0 && (
                    <optgroup label="フレンド">
                      {userFriends.map((friend: any) => (
                        <option key={friend.id} value={friend.id}>
                          {friend.username || "プレイヤー"} (Lv.{friend.level || 1}){getDmUnreadCount(friend.id) ? `（未読${getDmUnreadCount(friend.id)}）` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
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
                      <button
                        type="button"
                        className="tribe-msg-author"
                        onClick={() => {
                          const profileUserId = isSelf ? msg.recipient_id : msg.sender_id;
                          if (profileUserId) fetchPlayerDetail(profileUserId);
                        }}
                      >
                        {msg.sender_name || "ユーザー"}
                      </button>
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
                      <button
                        type="button"
                        className="tribe-msg-author"
                        onClick={() => {
                          if (msg.user_id && msg.user_id !== session?.user?.id) fetchPlayerDetail(msg.user_id);
                        }}
                      >
                        {msg.author_name}
                      </button>
                    </div>
                    {msg.reply_to_message_id && (
                      <div className="tribe-msg-reply-source">返信先のメッセージ</div>
                    )}
                    <div className="tribe-msg-bubble">{msg.content || ""}</div>
                    {!msg.is_system && (
                      <button type="button" className="tribe-msg-reply" onClick={() => setChatReplyTo(msg)}>返信</button>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* メッセージ入力エリア */}
        <div className="tribe-modal-footer" style={{ marginTop: 'auto' }}>
          {chatChannel !== "DM" && chatReplyTo && (
            <div className="tribe-reply-composer">
              <div><b>{chatReplyTo.author_name}</b><span>{chatReplyTo.content}</span></div>
              <button type="button" onClick={() => setChatReplyTo(null)} aria-label="返信を解除">×</button>
            </div>
          )}
          {chatChannel === "GUILD" && userGuild && (
            <OutlawButton
              variant="secondary"
              fullWidth
              onClick={() => {
                void supabase.rpc("record_client_funnel_event", {
                  p_event_name: "guild_chat_raid_click", p_source_screen: "guild_chat",
                  p_source_cta: "open_raid", p_object_id: userGuild.id, p_metadata: {}
                });
                setShowTribeChatPanel(false);
                navigateTab("raid");
                playCyberSe("click");
              }}
            >
              TRIBE Contributionを増やす（レイドへ）
            </OutlawButton>
          )}
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
