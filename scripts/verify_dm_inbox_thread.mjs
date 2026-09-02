import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDirectMessageConversations } from "../src/app/context/hooks/directMessageConversations.ts";

const currentUserId = "user-current";
const messages = [
  {
    id: "dm-1",
    sender_id: "user-a",
    recipient_id: currentUserId,
    message: "最初のメッセージ",
    created_at: "2026-09-01T10:00:00.000Z",
    is_read: true,
    participant_name: "アキラ",
  },
  {
    id: "dm-2",
    sender_id: currentUserId,
    recipient_id: "user-a",
    message: "返信しました",
    created_at: "2026-09-01T10:05:00.000Z",
    is_read: true,
    participant_name: "アキラ",
  },
  {
    id: "dm-3",
    sender_id: "user-b",
    recipient_id: currentUserId,
    message: "新着です",
    created_at: "2026-09-01T11:00:00.000Z",
    is_read: false,
    participant_name: "ミナト",
  },
  {
    id: "dm-4",
    sender_id: "user-b",
    recipient_id: currentUserId,
    message: "もう一件",
    created_at: "2026-09-01T11:01:00.000Z",
    is_read: false,
    participant_name: "ミナト",
  },
];

const conversations = buildDirectMessageConversations(messages, currentUserId);
assert.deepEqual(conversations.map((conversation) => conversation.userId), ["user-b", "user-a"]);
assert.equal(conversations[0].userName, "ミナト");
assert.equal(conversations[0].latestMessage, "もう一件");
assert.equal(conversations[0].unreadCount, 2);
assert.equal(conversations[1].latestMessage, "返信しました");
assert.equal(conversations[1].unreadCount, 0);

const [modalSource, chatHookSource] = await Promise.all([
  readFile(new URL("../src/app/components/TribeChatModal.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/context/hooks/useChat.ts", import.meta.url), "utf8"),
]);

assert.match(modalSource, /aria-label="DM一覧"/);
assert.match(modalSource, /との会話を開く/);
assert.match(modalSource, /DM一覧に戻る/);
assert.match(modalSource, /activeDirectMessages\.map/);
assert.doesNotMatch(modalSource, /<select[\s>]/);
assert.match(chatHookSource, /\.from\("direct_messages"\)[\s\S]*\.or\(`/);
assert.match(chatHookSource, /start < participantIds\.length; start \+= 100/);
assert.match(chatHookSource, /p_user_ids: participantChunk/);
assert.doesNotMatch(chatHookSource, /\.from\("users"\)/);
assert.match(chatHookSource, /if \(!showTribeChatPanel \|\| chatChannel !== "DM"\) return/);
assert.match(chatHookSource, /query\.range\(page \* pageSize/);
assert.match(chatHookSource, /hydrateDirectMessage\(message\)/);
assert.match(chatHookSource, /send_direct_message/);
assert.match(chatHookSource, /mark_direct_message_read/);

console.log("TN-07 DM Inbox/Thread verification: PASS");
