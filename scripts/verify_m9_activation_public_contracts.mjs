import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF
  || process.env.SUPABASE_PREVIEW_PROJECT_REF
  || process.env.SUPABASE_DEVELOPMENT_PROJECT_REF;
if (!url || !anonKey || !serviceKey || !expectedRef || !url.includes(expectedRef)) {
  throw new Error("Supabase target or credentials are missing/mismatched");
}

const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
const anonGuildProbe = await anonClient.rpc("get_public_guild_detail", { p_guild_id: randomUUID() });
if (!anonGuildProbe.error) throw new Error("anon unexpectedly executed get_public_guild_detail");
const anonEventProbe = await anonClient.rpc("record_client_funnel_event", {
  p_event_name: "ranking_viewed", p_source_screen: "ranking", p_source_cta: null,
  p_object_id: null, p_metadata: {},
});
if (!anonEventProbe.error) throw new Error("anon unexpectedly recorded ranking_viewed");

const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: signIn, error: signInError } = await authClient.auth.signInAnonymously();
if (signInError || !signIn.user) throw signInError || new Error("anonymous QA sign-in failed");

const userId = signIn.user.id;
const guildId = randomUUID();
const suffix = randomUUID().slice(0, 8);
try {
  const profileInsert = await admin.from("users").insert({
    id: userId, username: `q${suffix.slice(0, 6)}`, level: 5, cash: 10000,
  });
  if (profileInsert.error) throw profileInsert.error;
  const guildInsert = await admin.from("guilds").insert({
    id: guildId, name: `ACTIVATION_QA_${suffix}`, description: "Public snapshot QA",
    level: 1, approval_required: false, leader_id: userId, funds: 987654,
  });
  if (guildInsert.error) throw guildInsert.error;

  const detail = await authClient.rpc("get_public_guild_detail", { p_guild_id: guildId });
  if (detail.error || !detail.data) throw detail.error || new Error("public Guild detail was empty");
  const requiredKeys = ["guild_id", "name", "level", "description", "approval_required", "member_count", "member_limit", "leader_name"];
  for (const key of requiredKeys) if (!(key in detail.data)) throw new Error(`public Guild detail is missing ${key}`);
  for (const key of ["funds", "leader_id", "members", "join_requests"]) {
    if (key in detail.data) throw new Error(`private field leaked: ${key}`);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const event = await authClient.rpc("record_client_funnel_event", {
      p_event_name: "ranking_viewed", p_source_screen: "ranking", p_source_cta: "activation",
      p_object_id: null, p_metadata: {},
    });
    if (event.error) throw event.error;
  }
  const milestone = await admin.from("user_funnel_milestones")
    .select("milestone,occurrence_count").eq("user_id", userId).eq("milestone", "ranking_viewed").single();
  if (milestone.error || Number(milestone.data?.occurrence_count) !== 2) {
    throw milestone.error || new Error("ranking_viewed did not use the idempotent milestone row");
  }

  const missingGuild = await authClient.rpc("get_public_guild_detail", { p_guild_id: randomUUID() });
  if (!missingGuild.error) throw new Error("unknown Guild unexpectedly returned a snapshot");

  console.log(JSON.stringify({
    target: expectedRef,
    anon_execute: "DENIED",
    authenticated_public_guild_detail: "PASS",
    private_field_leakage: "DENIED",
    ranking_viewed_milestone: "PASS",
    ranking_occurrence_count: milestone.data.occurrence_count,
  }, null, 2));
} finally {
  await admin.from("guilds").delete().eq("id", guildId);
  await admin.auth.admin.deleteUser(userId);
}
