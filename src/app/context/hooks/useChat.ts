"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { CHARACTERS_MASTER } from "@/utils/game_constants";

export function useChat(
  session: any,
  username: string,
  selectedLeader: string,
  userGuildMember: any,
  playCyberSe: (type: string) => void
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

  useEffect(() => {
    if (chatCooldown <= 0) return;
    const timer = setTimeout(() => {
      setChatCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatCooldown]);

  const handleSendChat = async () => {
    if (!session || !chatInput.trim() || chatCooldown > 0) return;
    setChatSending(true);
    playCyberSe("click");

    try {
      const targetId = chatChannel === "GUILD" 
        ? (userGuildMember?.guild_id || null) 
        : null;

      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const newPost = {
        id: "temp_" + Date.now(),
        user_id: session.user.id,
        author_name: username,
        author_avatar_url: avatarUrlToSend,
        content: chatInput,
        target_type: chatChannel,
        target_id: targetId,
        is_system: false,
        created_at: new Date().toISOString()
      };
      setGuildChats(prev => [...prev, newPost]);

      await supabase.from("board_posts").insert({
        user_id: session.user.id,
        author_name: username,
        author_avatar_url: avatarUrlToSend,
        content: chatInput,
        target_type: chatChannel,
        target_id: targetId,
        is_system: false
      });
      setChatInput("");
      setChatCooldown(chatChannel === "GUILD" ? 3 : 10);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setChatSending(false);
    }
  };

  const handleSendDirectMessage = async (recipientId: string, text: string) => {
    if (!text.trim()) return;
    playCyberSe("click");
    const newMsg = {
      id: "dm_" + Date.now(),
      sender_id: session?.user?.id || "my_id",
      sender_name: username,
      recipient_id: recipientId,
      message: text,
      created_at: new Date().toISOString(),
    };
    try {
      if (session?.user?.id) {
        await supabase.from("direct_messages").insert({
          sender_id: session.user.id,
          recipient_id: recipientId,
          message: text,
        });
      }
    } catch (err: any) {
      console.warn("direct_messages insert error:", err.message);
    }
    setDirectMessages((prev) => [...prev, newMsg]);
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
    }
  };

  const createBbsThread = async (category: "RECRUIT" | "STRATEGY_CHAT", title: string, content: string) => {
    if (!session) return;
    try {
      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const { data, error } = await supabase
        .from("bbs_threads")
        .insert({
          category,
          title,
          content,
          user_id: session.user.id,
          author_name: username,
          author_avatar_url: avatarUrlToSend
        })
        .select()
        .single();
      if (error) throw error;

      if (data) {
        setBbsThreads(prev => [data, ...prev]);
        setBbsActiveThread(data);
        await fetchBbsPosts(data.id);
      }
    } catch (err: any) {
      console.warn("createBbsThread error:", err.message);
      throw err;
    }
  };

  const createBbsPost = async (threadId: string, content: string) => {
    if (!session) return;
    try {
      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const { data, error } = await supabase
        .from("bbs_posts")
        .insert({
          thread_id: threadId,
          user_id: session.user.id,
          author_name: username,
          author_avatar_url: avatarUrlToSend,
          content
        })
        .select()
        .single();
      if (error) throw error;

      if (data) {
        setBbsPosts(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.warn("createBbsPost error:", err.message);
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
