export interface DirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  message?: string | null;
  content?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  participant_name?: string | null;
  sender_name?: string | null;
}

export interface DirectMessageConversation {
  userId: string;
  userName: string;
  latestMessage: string;
  latestAt: string;
  unreadCount: number;
}

export function buildDirectMessageConversations(
  messages: DirectMessageRow[],
  currentUserId: string,
  unreadNames: Array<{ sender_id: string; sender_name: string; unread_count: number }> = []
): DirectMessageConversation[] {
  const unreadBySender = new Map(unreadNames.map((entry) => [entry.sender_id, entry]));
  const conversations = new Map<string, DirectMessageConversation>();

  for (const message of messages) {
    const otherUserId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id;
    if (!otherUserId || otherUserId === currentUserId) continue;

    const createdAt = message.created_at || "";
    const unread = message.recipient_id === currentUserId && !message.is_read ? 1 : 0;
    const unreadName = unreadBySender.get(otherUserId)?.sender_name;
    const userName = message.participant_name || unreadName || "ユーザー";
    const existing = conversations.get(otherUserId);

    if (!existing) {
      conversations.set(otherUserId, {
        userId: otherUserId,
        userName,
        latestMessage: message.message || message.content || "",
        latestAt: createdAt,
        unreadCount: unread,
      });
      continue;
    }

    existing.unreadCount += unread;
    if (existing.userName === "ユーザー" && userName !== "ユーザー") existing.userName = userName;
    if (createdAt >= existing.latestAt) {
      existing.latestAt = createdAt;
      existing.latestMessage = message.message || message.content || "";
    }
  }

  return [...conversations.values()].sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}
