import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

async function createQaPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user || !data.session) throw error || new Error("Anonymous QA user creation failed.");
  const username = `${prefix}${Date.now().toString(36).slice(-5)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  client.realtime.setAuth(data.session.access_token);
  return { client, userId: data.user.id, username };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const sender = await createQaPlayer("DS");
const recipient = await createQaPlayer("DR");
const outsider = await createQaPlayer("DO");
await writeFile(".dm-e2e-state.json", JSON.stringify({
  projectRef: actualProjectRef,
  sender: { userId: sender.userId, username: sender.username },
  recipient: { userId: recipient.userId, username: recipient.username },
  outsider: { userId: outsider.userId, username: outsider.username },
}, null, 2));

const { data: initialUnread, error: initialUnreadError } = await recipient.client.rpc("get_direct_message_unread_counts");
if (initialUnreadError || initialUnread?.length !== 0) throw initialUnreadError || new Error("Initial DM unread state was not empty.");

const { data: firstMessage, error: firstSendError } = await sender.client.rpc("send_direct_message", {
  p_recipient_id: recipient.userId,
  p_message: "M6 DM unread probe",
});
if (firstSendError || !firstMessage?.id) throw firstSendError || new Error("DM send failed.");

const { data: outsiderRows, error: outsiderReadError } = await outsider.client
  .from("direct_messages").select("id").eq("id", firstMessage.id);
if (outsiderReadError || outsiderRows?.length !== 0) throw outsiderReadError || new Error("Third party could read a direct message.");

const { data: conversation, error: conversationError } = await recipient.client
  .from("direct_messages").select("id,sender_id,recipient_id,message,is_read").eq("id", firstMessage.id);
if (conversationError || conversation?.length !== 1 || conversation[0].is_read) {
  throw conversationError || new Error("Recipient could not fetch the unread DM.");
}

const { data: firstUnread, error: firstUnreadError } = await recipient.client.rpc("get_direct_message_unread_counts");
const senderUnread = firstUnread?.find((row) => row.sender_id === sender.userId);
if (firstUnreadError || Number(senderUnread?.unread_count || 0) !== 1 || senderUnread?.sender_name !== sender.username) {
  throw firstUnreadError || new Error(`DM unread summary mismatch: ${JSON.stringify(firstUnread)}`);
}

const { error: unauthorizedMarkError } = await sender.client.rpc("mark_direct_message_read", { p_message_id: firstMessage.id });
if (!unauthorizedMarkError) throw new Error("Sender unexpectedly marked the recipient's DM as read.");
const { error: firstMarkError } = await recipient.client.rpc("mark_direct_message_read", { p_message_id: firstMessage.id });
if (firstMarkError) throw firstMarkError;
const { data: afterFirstRead, error: afterFirstReadError } = await recipient.client.rpc("get_direct_message_unread_counts");
if (afterFirstReadError || afterFirstRead?.length !== 0) throw afterFirstReadError || new Error("DM unread did not clear.");

let realtimePayload = null;
let realtimeSendStarted = false;
const realtimeResult = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("DM Realtime delivery timed out.")), 30_000);
  const channel = recipient.client
    .channel(`m6_dm_${recipient.userId}_${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
      if (payload.new?.sender_id === sender.userId && payload.new?.recipient_id === recipient.userId) {
        realtimePayload = payload.new;
        clearTimeout(timeout);
        resolve(channel);
      }
    })
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || realtimeSendStarted) return;
      realtimeSendStarted = true;
      const { error } = await sender.client.rpc("send_direct_message", {
        p_recipient_id: recipient.userId,
        p_message: "M6 DM Realtime probe",
      });
      if (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
});
const realtimeChannel = await realtimeResult;
await Promise.race([recipient.client.removeChannel(realtimeChannel), wait(2_000)]);
if (!realtimePayload?.id) throw new Error("DM Realtime payload was empty.");

const { data: realtimeUnread, error: realtimeUnreadError } = await recipient.client.rpc("get_direct_message_unread_counts");
const realtimeSenderUnread = realtimeUnread?.find((row) => row.sender_id === sender.userId);
if (realtimeUnreadError || Number(realtimeSenderUnread?.unread_count || 0) !== 1) {
  throw realtimeUnreadError || new Error(`Realtime DM unread mismatch: ${JSON.stringify(realtimeUnread)}`);
}
const { error: realtimeMarkError } = await recipient.client.rpc("mark_direct_message_read", { p_message_id: realtimePayload.id });
if (realtimeMarkError) throw realtimeMarkError;

const { data: missedMessage, error: missedSendError } = await sender.client.rpc("send_direct_message", {
  p_recipient_id: recipient.userId,
  p_message: "M6 DM reconnect catch-up probe",
});
if (missedSendError || !missedMessage?.id) throw missedSendError || new Error("Disconnected DM send failed.");
const { data: caughtUpRows, error: catchUpError } = await recipient.client
  .from("direct_messages").select("id").eq("id", missedMessage.id);
if (catchUpError || caughtUpRows?.length !== 1) throw catchUpError || new Error("Reconnect fetch did not recover the DM.");

const { error: directInsertError } = await sender.client.from("direct_messages").insert({
  sender_id: sender.userId,
  recipient_id: recipient.userId,
  message: "M6 forged direct insert",
});
if (!directInsertError) throw new Error("Direct direct_messages insert unexpectedly succeeded.");

const anonymous = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: anonymousRows, error: anonymousReadError } = await anonymous
  .from("direct_messages").select("id").eq("id", firstMessage.id);
if (!anonymousReadError && anonymousRows?.length) throw new Error("Anonymous client unexpectedly read a DM.");

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  sender: { userId: sender.userId, username: sender.username },
  recipient: { userId: recipient.userId, username: recipient.username },
  outsider: { userId: outsider.userId, username: outsider.username },
  participantFetch: true,
  thirdPartyReadDenied: true,
  unreadSummary: true,
  recipientOnlyReadUpdate: true,
  realtimeDelivery: true,
  reconnectCatchUp: true,
  directInsertDenied: true,
  anonymousReadDenied: true,
}, null, 2));

process.exit(0);
