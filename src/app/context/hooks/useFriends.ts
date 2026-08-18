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
          user_id,
          friend_id,
          status,
          created_at
        `)
        .eq("user_id", userId)
        .eq("status", "ACCEPTED");

      if (error) throw error;
      
      if (data && data.length > 0) {
        const friendIds = data.map(f => f.friend_id);
        const { data: usersData, error: usersError } = await supabase.rpc("get_public_profiles", { p_user_ids: friendIds });
        if (usersError) throw usersError;
        
        const mergedFriends = (usersData || []).map((u: any) => ({
          ...u,
          friendshipId: data.find(f => f.friend_id === (u.user_id || u.id))?.id,
          power: Number(u.total_power || 0)
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
        .select("*")
        .eq("receiver_id", userId)
        .eq("status", "PENDING");

      if (error) throw error;
      
      if (data) {
        const { data: profiles } = await supabase.rpc("get_public_profiles", { p_user_ids: data.map((r: any) => r.sender_id) });
        const profileById = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));
        setFriendRequests(data.map((r: any) => ({
          id: r.id,
          senderId: r.sender_id,
          username: profileById.get(r.sender_id)?.username || "Unknown",
          avatarUrl: profileById.get(r.sender_id)?.avatar_url,
          level: profileById.get(r.sender_id)?.level || 1,
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

  const sendFriendRequest = async (_senderId: string, receiverId: string) => {
    setIsFriendsLoading(true);
    try {
      const { error } = await supabase.rpc("send_friend_request", {
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
