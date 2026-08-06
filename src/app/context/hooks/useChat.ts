"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { CHARACTERS_MASTER } from "@/utils/game_constants";

export function useChat(
  session: any,
  username: string,
  selectedLeader: string,
  userGuildMember: any,
  playCyberSe: (type: string) => void,
  setErrorMessage: (message: string) => void
) {
  const [guildChats, setGuildChats] = useState<any[]>([]);
  const [chatChannel, setChatChannel] = useState<"GLOBAL" | "GUILD" | "DM">("GLOBAL");
  const [chatInput, setChatInput] = useState<string>("");
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [chatCooldown, setChatCooldown] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);

  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [dmRecipientId, setDmRecipientId] = useState<string | null>(null);

  const [bbsThreads, setBbsThreads] = useState<any[]>([]);
  const [bbsActiveThread, setBbsActiveThread] = useState<any | null>(null);
  const [bbsPosts, setBbsPosts] = useState<any[]>([]);
  const [bbsLoading, setBbsLoading] = useState<boolean>(false);

  const markDirectMessagesRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const results = await Promise.all(messageIds.map(async (messageId) => {
      const { error } = await supabase.rpc("mark_direct_message_read", {
        p_message_id: messageId
      });
      if (error) {
        console.warn("direct message read update error:", error.message);
        return null;
      }
      return messageId;
    }));
    const markedIds = new Set(results.filter((messageId): messageId is string => messageId !== null));
    if (markedIds.size > 0) {
      setDirectMessages((previous) => previous.map((message) => (
        markedIds.has(message.id) ? { ...message, is_read: true } : message
      )));
    }
  };

  useEffect(() => {
    if (chatCooldown <= 0) return;
    const timer = setTimeout(() => {
      setChatCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatCooldown]);

  useEffect(() => {
    if (!session?.user?.id || !dmRecipientId) {
      setDirectMessages([]);
      return;
    }

    const fetchDirectMessages = async () => {
      const currentUserId = session.user.id;
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${dmRecipientId}),and(sender_id.eq.${dmRecipientId},recipient_id.eq.${currentUserId})`)
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("direct_messages fetch error:", error.message);
        return;
      }
      const messages = data || [];
      setDirectMessages(messages);
      void markDirectMessagesRead(messages
        .filter((message) => message.recipient_id === currentUserId && !message.is_read)
        .map((message) => message.id));
    };

    fetchDirectMessages();
  }, [session?.user?.id, dmRecipientId]);

  useEffect(() => {
    if (!session?.user?.id || !dmRecipientId) return;
    const currentUserId = session.user.id;
    const channel = supabase
      .channel(`direct_messages_${currentUserId}_${dmRecipientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const message = payload.new as any;
          const isConversationMessage = (message.sender_id === currentUserId && message.recipient_id === dmRecipientId)
            || (message.sender_id === dmRecipientId && message.recipient_id === currentUserId);
          if (isConversationMessage) {
            setDirectMessages((previous) => previous.some((entry) => entry.id === message.id) ? previous : [...previous, message]);
            if (message.recipient_id === currentUserId && !message.is_read) {
              void markDirectMessagesRead([message.id]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, dmRecipientId]);

  const handleSendChat = async () => {
    if (!session || !chatInput.trim() || chatCooldown > 0) return;
    setChatSending(true);
    playCyberSe("click");

    const content = chatInput.trim();
    const temporaryMessageId = "temp_" + Date.now();
    try {
      const targetId = chatChannel === "GUILD" 
        ? (userGuildMember?.guild_id || null) 
        : null;

      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const newPost = {
        id: temporaryMessageId,
        user_id: session.user.id,
        author_name: username,
        author_avatar_url: avatarUrlToSend,
        content,
        target_type: chatChannel,
        target_id: targetId,
        is_system: false,
        created_at: new Date().toISOString()
      };
      setGuildChats(prev => [...prev, newPost]);

      const { data, error } = await supabase.rpc("send_chat_message", {
        p_target_type: chatChannel,
        p_content: content
      });
      if (error) throw error;
      if (data) {
        setGuildChats((previous) => previous.map((message) => message.id === temporaryMessageId ? data : message));
      }
      setChatInput("");
      setChatCooldown(chatChannel === "GUILD" ? 3 : 10);
    } catch (err: any) {
      setGuildChats((previous) => previous.filter((message) => message.id !== temporaryMessageId));
      console.warn(err.message);
      setErrorMessage(err.message || "チャットの送信に失敗しました。");
    } finally {
      setChatSending(false);
    }
  };

  const handleSendDirectMessage = async (recipientId: string, text: string) => {
    if (!session?.user?.id || !recipientId || !text.trim()) return false;
    if (chatSending) return false;
    setChatSending(true);
    playCyberSe("click");
    try {
      const { data, error } = await supabase.rpc("send_direct_message", {
        p_recipient_id: recipientId,
        p_message: text.trim()
      });
      if (error) throw error;
      setDirectMessages((prev) => [...prev, {
        ...(data || {}),
        id: data?.id || `dm_${Date.now()}`,
        sender_id: session.user.id,
        sender_name: username,
        recipient_id: recipientId,
        message: data?.message || text.trim(),
        created_at: data?.created_at || new Date().toISOString()
      }]);
      return true;
    } catch (err: any) {
      console.warn("direct message send error:", err.message);
      setErrorMessage(err.message || "DMの送信に失敗しました。");
      return false;
    } finally {
      setChatSending(false);
    }
  };

  const fetchBbsThreads = async (category: "RECRUIT" | "STRATEGY_CHAT") => {
    setBbsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bbs_threads")
        .select("*")
        .eq("category", category)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setBbsThreads(data || []);
    } catch (err: any) {
      console.warn("fetchBbsThreads error:", err.message);
      setErrorMessage(err.message || "スレッドの取得に失敗しました。");
    } finally {
      setBbsLoading(false);
    }
  };

  const fetchBbsPosts = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from("bbs_posts")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setBbsPosts(data || []);
    } catch (err: any) {
      console.warn("fetchBbsPosts error:", err.message);
      setErrorMessage(err.message || "返信の取得に失敗しました。");
    }
  };

  const createBbsThread = async (category: "RECRUIT" | "STRATEGY_CHAT", title: string, content: string) => {
    if (!session) return;
    try {
      const { data, error } = await supabase.rpc("create_bbs_thread", {
        p_category: category,
        p_title: title,
        p_content: content
      });
      if (error) throw error;

      if (data) {
        setBbsThreads(prev => [data, ...prev]);
        setBbsActiveThread(data);
        await fetchBbsPosts(data.id);
      }
    } catch (err: any) {
      console.warn("createBbsThread error:", err.message);
      setErrorMessage(err.message || "スレッドの作成に失敗しました。");
      throw err;
    }
  };

  const createBbsPost = async (threadId: string, content: string) => {
    if (!session) return;
    try {
      const { data, error } = await supabase.rpc("create_bbs_post", {
        p_thread_id: threadId,
        p_content: content
      });
      if (error) throw error;

      if (data) {
        setBbsPosts(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.warn("createBbsPost error:", err.message);
      setErrorMessage(err.message || "返信の送信に失敗しました。");
      throw err;
    }
  };

  return {
    guildChats, setGuildChats,
    chatChannel, setChatChannel,
    chatInput, setChatInput,
    chatSending, setChatSending,
    chatCooldown, setChatCooldown,
    activeUsersCount, setActiveUsersCount,
    directMessages, setDirectMessages,
    dmRecipientId, setDmRecipientId,
    bbsThreads, setBbsThreads,
    bbsActiveThread, setBbsActiveThread,
    bbsPosts, setBbsPosts,
    bbsLoading, setBbsLoading,
    handleSendChat,
    handleSendDirectMessage,
    fetchBbsThreads,
    fetchBbsPosts,
    createBbsThread,
    createBbsPost
  };
}
