import { useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";

export const useFriends = () => {
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendSearchResult, setFriendSearchResult] = useState<any>(null);
  const [selectedBattleHelper, setSelectedBattleHelper] = useState<string | null>(null);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);

  const fetchFriends = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_friends")
        .select(`
          id,
          user_id_1,
          user_id_2,
          created_at
        `)
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const friendIds = data.map(f => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, username, level, avatar_url, title_equipped")
          .in("id", friendIds);
          
        if (usersError) throw usersError;
        
        const { data: powerData } = await supabase
          .from("user_power_rankings")
          .select("user_id, current_power")
          .in("user_id", friendIds);

        const mergedFriends = usersData.map(u => ({
          ...u,
          friendshipId: data.find(f => (f.user_id_1 === userId && f.user_id_2 === u.id) || (f.user_id_2 === userId && f.user_id_1 === u.id))?.id,
          power: powerData?.find(p => p.user_id === u.id)?.current_power || 0
        }));
        
        setUserFriends(mergedFriends);
      } else {
        setUserFriends([]);
      }
    } catch (e) {
      console.warn("Failed to fetch friends:", e);
    }
  }, []);

  const fetchFriendRequests = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*, users!friend_requests_sender_id_fkey(username, avatar_url, level)")
        .eq("receiver_id", userId)
        .eq("status", "PENDING");

      if (error) throw error;
      
      if (data) {
        setFriendRequests(data.map((r: any) => ({
          id: r.id,
          senderId: r.sender_id,
          username: r.users?.username || "Unknown",
          avatarUrl: r.users?.avatar_url,
          level: r.users?.level || 1,
          createdAt: r.created_at
        })));
      }
    } catch (e) {
      console.warn("Failed to fetch friend requests:", e);
    }
  }, []);

  const searchUserByName = async (username: string) => {
    setIsFriendsLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_user_by_name", { p_username: username });
      if (error) throw error;
      if (data && data.length > 0) {
        setFriendSearchResult(data[0]);
      } else {
        setFriendSearchResult(null);
      }
    } catch (e) {
      console.warn("Failed to search user:", e);
      setFriendSearchResult(null);
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const sendFriendRequest = async (senderId: string, receiverId: string) => {
    setIsFriendsLoading(true);
    try {
      const { error } = await supabase.rpc("send_friend_request", {
        p_sender_id: senderId,
        p_receiver_id: receiverId
      });
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.warn("Failed to send friend request:", e);
      return { success: false, message: e.message };
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string, userId: string) => {
    setIsFriendsLoading(true);
    try {
      const { error } = await supabase.rpc("accept_friend_request", {
        p_request_id: requestId
      });
      if (error) throw error;
      
      await fetchFriendRequests(userId);
      await fetchFriends(userId);
      return { success: true };
    } catch (e: any) {
      console.warn("Failed to accept friend request:", e);
      return { success: false, message: e.message };
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string, userId: string) => {
    setIsFriendsLoading(true);
    try {
      const { error } = await supabase.rpc("reject_friend_request", {
        p_request_id: requestId
      });
      if (error) throw error;
      
      await fetchFriendRequests(userId);
      return { success: true };
    } catch (e: any) {
      console.warn("Failed to reject friend request:", e);
      return { success: false, message: e.message };
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const removeFriend = async (userId: string, friendUserId: string) => {
    setIsFriendsLoading(true);
    try {
      const { error } = await supabase.rpc("remove_friend", {
        p_user_id: userId,
        p_friend_id: friendUserId
      });
      if (error) throw error;
      
      await fetchFriends(userId);
      return { success: true };
    } catch (e: any) {
      console.warn("Failed to remove friend:", e);
      return { success: false, message: e.message };
    } finally {
      setIsFriendsLoading(false);
    }
  };

  return {
    userFriends,
    friendRequests,
    friendSearchResult,
    isFriendsLoading,
    selectedBattleHelper,
    setSelectedBattleHelper,
    fetchFriends,
    fetchFriendRequests,
    searchUserByName,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  };
};
