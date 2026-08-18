import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
const state = JSON.parse(await readFile(".guild-e2e-state.json", "utf8"));
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (!url || !anonKey || actualProjectRef !== expectedProjectRef || state.projectRef !== expectedProjectRef) {
  throw new Error("Refusing mismatched Supabase target.");
}

async function restore(player) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.setSession({ access_token: player.accessToken, refresh_token: player.refreshToken });
  if (error) throw error;
  return client;
}

const leader = await restore(state.leader);
const member = await restore(state.applicant);
const { data: leaderMembership, error: leaderMembershipError } = await leader.from("guild_members").select("guild_id,role").eq("user_id", state.leader.userId).maybeSingle();
const { data: memberMembership, error: memberMembershipError } = await member.from("guild_members").select("guild_id,role").eq("user_id", state.applicant.userId).maybeSingle();
if (leaderMembershipError || memberMembershipError) throw leaderMembershipError || memberMembershipError;
const guildId = leaderMembership?.guild_id;
if (!guildId || memberMembership?.guild_id !== guildId) throw new Error("E2E guild membership is not intact.");

const { data: leaderPosts, error: leaderPostsError } = await leader.from("board_posts").select("id,content,target_id,created_at").eq("target_type", "GUILD").eq("target_id", guildId).order("created_at", { ascending: false }).limit(5);
const { data: memberPosts, error: memberPostsError } = await member.from("board_posts").select("id,content,target_id,created_at").eq("target_type", "GUILD").eq("target_id", guildId).order("created_at", { ascending: false }).limit(5);
const { data: unread, error: unreadError } = await member.rpc("get_chat_unread_counts");
if (leaderPostsError || memberPostsError || unreadError) throw leaderPostsError || memberPostsError || unreadError;

const statuses = [];
let received = null;
let sendStarted = false;
const realtimeOutcome = await new Promise((resolve) => {
  const channel = member
    .channel(`m6_diagnostic_${guildId}_${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_posts" }, (payload) => {
      received = payload.new;
      resolve({ result: "received", channel });
    })
    .subscribe(async (status, error) => {
      statuses.push({ status, error: error?.message || null });
      if (status === "SUBSCRIBED" && !sendStarted) {
        sendStarted = true;
        const { error: sendError } = await leader.rpc("send_chat_message", {
          p_target_type: "GUILD",
          p_content: `M6 active realtime probe ${Date.now()}`,
        });
        if (sendError) resolve({ result: `send_error:${sendError.message}`, channel });
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve({ result: status, channel });
    });
  setTimeout(() => resolve({ result: "timeout", channel }), 20_000);
});
console.log(JSON.stringify({
  projectRef: actualProjectRef,
  guildId,
  leaderMembership,
  memberMembership,
  leaderVisiblePostCount: leaderPosts?.length || 0,
  memberVisiblePostCount: memberPosts?.length || 0,
  latestPost: memberPosts?.[0] || null,
  unread,
  realtimeStatuses: statuses,
  passiveRealtimeResult: realtimeOutcome.result,
  passiveRealtimePayload: received,
}, null, 2));

await Promise.race([
  member.removeChannel(realtimeOutcome.channel),
  new Promise((resolve) => setTimeout(resolve, 2_000)),
]);
await Promise.race([
  Promise.all([leader.auth.signOut(), member.auth.signOut()]),
  new Promise((resolve) => setTimeout(resolve, 2_000)),
]);
process.exit(0);
