import { readFile, rm } from "node:fs/promises";
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

const leader = await restoreClient(state.leader);
const applicant = await restoreClient(state.applicant);
const guildName = `E2E${Date.now().toString(36).slice(-7)}`.slice(0, 12);

const { data: created, error: createError } = await leader.rpc("create_guild_v2", {
  p_user_id: state.leader.userId, p_guild_name: guildName, p_creation_cost: 5000,
});
if (createError || !created?.guild_id) throw createError || new Error("Guild creation failed.");
const guildId = created.guild_id;

const { error: settingsError } = await leader.rpc("update_guild_settings", {
  p_guild_id: guildId, p_desc: "Open Beta M5 E2E", p_approval: true, p_kick_days: 7,
});
if (settingsError) throw settingsError;

const { data: searchResults, error: searchError } = await applicant.rpc("search_guilds", { p_query: guildName });
if (searchError || searchResults?.length !== 1 || searchResults[0].id !== guildId || !searchResults[0].approval_required) {
  throw searchError || new Error(`Guild search failed: ${JSON.stringify(searchResults)}`);
}

const { data: requested, error: requestError } = await applicant.rpc("request_guild_join", { p_guild_id: guildId });
if (requestError || requested?.status !== "pending") throw requestError || new Error("Guild application failed.");
const requestId = requested.request_id;

const { error: unauthorizedReviewError } = await applicant.rpc("review_guild_join_request", { p_request_id: requestId, p_approve: true });
if (!unauthorizedReviewError || !/(only the guild master|review permission)/i.test(unauthorizedReviewError.message)) {
  throw new Error("Applicant unexpectedly reviewed their own request.");
}

const { data: reviewed, error: reviewError } = await leader.rpc("review_guild_join_request", { p_request_id: requestId, p_approve: true });
if (reviewError || reviewed?.status !== "approved") throw reviewError || new Error("Guild approval failed.");

const { data: members, error: membersError } = await leader.from("guild_members").select("user_id,role").eq("guild_id", guildId);
if (membersError || members?.length !== 2) throw membersError || new Error(`Expected two members: ${JSON.stringify(members)}`);

const { error: roleError } = await leader.rpc("set_guild_member_role", {
  p_guild_id: guildId, p_target_user_id: state.applicant.userId, p_new_role: "SUB_MASTER",
});
if (roleError) throw roleError;
const { data: promoted, error: promotedError } = await applicant.from("guild_members").select("role").eq("user_id", state.applicant.userId).single();
if (promotedError || promoted?.role !== "SUB_MASTER") throw promotedError || new Error("SUB_MASTER promotion was not reflected.");

const { error: directWriteError } = await applicant.from("guild_members").update({ role: "MASTER" }).eq("user_id", state.applicant.userId);
if (!directWriteError) throw new Error("Direct guild role mutation unexpectedly succeeded.");

const { error: leaveError } = await applicant.rpc("leave_guild", {
  p_user_id: state.applicant.userId, p_guild_id: guildId, p_is_master: false, p_has_others: true,
});
if (leaveError) throw leaveError;
const { data: applicantMembership, error: applicantMembershipError } = await applicant.from("guild_members").select("id").eq("user_id", state.applicant.userId).maybeSingle();
if (applicantMembershipError || applicantMembership) throw applicantMembershipError || new Error("Applicant membership remained after leaving.");

const { error: dissolveError } = await leader.rpc("leave_guild", {
  p_user_id: state.leader.userId, p_guild_id: guildId, p_is_master: true, p_has_others: false,
});
if (dissolveError) throw dissolveError;

console.log(JSON.stringify({
  projectRef: actualProjectRef, guildName, guildId,
  leaderUserId: state.leader.userId, applicantUserId: state.applicant.userId,
  create: true, search: true, application: true, unauthorizedReviewRejected: true,
  approval: true, memberCount: 2, subMasterPromotion: true,
  directRoleWriteRejected: true, memberLeave: true, guildDissolved: true,
}, null, 2));

await Promise.all([leader.auth.signOut(), applicant.auth.signOut()]);
await rm(".guild-e2e-state.json", { force: true });
