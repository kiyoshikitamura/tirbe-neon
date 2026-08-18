import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const state = JSON.parse(await readFile(".guild-e2e-state.json", "utf8"));
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef || state.projectRef !== expectedProjectRef) throw new Error("Refusing mismatched Supabase target.");

async function restoreClient(player) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.setSession({ access_token: player.accessToken, refresh_token: player.refreshToken });
  if (error) throw error;
  return client;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const leader = await restoreClient(state.leader);
const member = await restoreClient(state.applicant);
leader.realtime.setAuth(state.leader.accessToken);
member.realtime.setAuth(state.applicant.accessToken);
const guildName = `Chat${Date.now().toString(36).slice(-7)}`.slice(0, 12);

const { data: created, error: createError } = await leader.rpc("create_guild_v2", {
  p_user_id: state.leader.userId,
  p_guild_name: guildName,
  p_creation_cost: 5000,
});
if (createError || !created?.guild_id) throw createError || new Error("Guild creation failed.");
const guildId = created.guild_id;

const { error: settingsError } = await leader.rpc("update_guild_settings", {
  p_guild_id: guildId, p_desc: "Open Beta M6 chat E2E", p_approval: true, p_kick_days: 7,
});
if (settingsError) throw settingsError;

const { data: preJoinMessage, error: preJoinSendError } = await leader.rpc("send_chat_message", {
  p_target_type: "GUILD", p_content: "M6 pre-join RLS probe",
});
if (preJoinSendError || !preJoinMessage?.id) throw preJoinSendError || new Error("Pre-join message failed.");

const { data: unauthorizedRows, error: unauthorizedReadError } = await member
  .from("board_posts").select("id").eq("id", preJoinMessage.id);
if (unauthorizedReadError || unauthorizedRows?.length !== 0) {
  throw unauthorizedReadError || new Error("Non-member could read guild chat.");
}

const { data: requested, error: requestError } = await member.rpc("request_guild_join", { p_guild_id: guildId });
if (requestError || requested?.status !== "pending") throw requestError || new Error("Guild application failed.");
const { data: reviewed, error: reviewError } = await leader.rpc("review_guild_join_request", {
  p_request_id: requested.request_id, p_approve: true,
});
if (reviewError || reviewed?.status !== "approved") throw reviewError || new Error("Guild approval failed.");

const { data: initialUnread, error: initialUnreadError } = await member.rpc("get_chat_unread_counts");
if (initialUnreadError || Number(initialUnread?.GUILD || 0) !== 0) throw initialUnreadError || new Error("Initial unread state was not zero.");

await wait(3_100);
const { data: firstMessage, error: firstSendError } = await leader.rpc("send_chat_message", {
  p_target_type: "GUILD", p_content: "M6 unread delivery probe",
});
if (firstSendError || !firstMessage?.id) throw firstSendError || new Error("Guild message failed.");

const { data: fetchedRows, error: fetchError } = await member
  .from("board_posts").select("id,content").eq("id", firstMessage.id);
if (fetchError || fetchedRows?.length !== 1) throw fetchError || new Error("Member did not retrieve the guild message.");

const { data: unreadAfterMessage, error: unreadAfterMessageError } = await member.rpc("get_chat_unread_counts");
if (unreadAfterMessageError || Number(unreadAfterMessage?.GUILD || 0) !== 1) {
  throw unreadAfterMessageError || new Error(`Unread count mismatch: ${JSON.stringify(unreadAfterMessage)}`);
}

const { error: markReadError } = await member.rpc("mark_chat_channel_read", { p_target_type: "GUILD" });
if (markReadError) throw markReadError;
const { data: unreadAfterRead, error: unreadAfterReadError } = await member.rpc("get_chat_unread_counts");
if (unreadAfterReadError || Number(unreadAfterRead?.GUILD || 0) !== 0) throw unreadAfterReadError || new Error("Read state did not clear unread count.");

const { error: cooldownError } = await leader.rpc("send_chat_message", {
  p_target_type: "GUILD", p_content: "M6 cooldown bypass probe",
});
if (!cooldownError || !/cooldown/i.test(cooldownError.message)) throw new Error("Server cooldown was bypassed.");

await wait(3_100);
let realtimePayload = null;
let realtimeSendStarted = false;
const realtimeResult = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Realtime guild message timed out.")), 30_000);
  const channel = member
    .channel(`m6_guild_chat_${guildId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_posts" }, (payload) => {
      if (payload.new?.target_type === "GUILD" && payload.new?.target_id === guildId) {
        realtimePayload = payload.new;
        clearTimeout(timeout);
        resolve(channel);
      }
    })
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || realtimeSendStarted) return;
      realtimeSendStarted = true;
      const { error } = await leader.rpc("send_chat_message", {
        p_target_type: "GUILD", p_content: "M6 realtime delivery probe",
      });
      if (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
});
const realtimeChannel = await realtimeResult;
await Promise.race([
  member.removeChannel(realtimeChannel),
  wait(2_000),
]);
if (!realtimePayload?.id) throw new Error("Realtime payload was empty.");

const { error: directInsertError } = await member.from("board_posts").insert({
  title: "", content: "M6 direct insert probe", author_name: "forged", target_type: "GUILD", target_id: guildId,
});
if (!directInsertError) throw new Error("Direct board_posts insert unexpectedly succeeded.");

const { error: leaveError } = await member.rpc("leave_guild", {
  p_user_id: state.applicant.userId, p_guild_id: guildId, p_is_master: false, p_has_others: true,
});
if (leaveError) throw leaveError;
const { error: dissolveError } = await leader.rpc("leave_guild", {
  p_user_id: state.leader.userId, p_guild_id: guildId, p_is_master: true, p_has_others: false,
});
if (dissolveError) throw dissolveError;

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  guildName,
  guildId,
  leaderUserId: state.leader.userId,
  memberUserId: state.applicant.userId,
  nonMemberReadDenied: true,
  memberFetch: true,
  unreadIncrement: true,
  markRead: true,
  serverCooldown: true,
  realtimeDelivery: true,
  directInsertDenied: true,
  guildDissolved: true,
}, null, 2));

process.exit(0);
