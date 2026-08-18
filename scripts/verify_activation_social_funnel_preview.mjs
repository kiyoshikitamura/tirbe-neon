import { createClient } from "@supabase/supabase-js";

if (typeof process.loadEnvFile === "function") process.loadEnvFile(process.env.SUPABASE_ENV_FILE || ".env.preview.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !serviceRoleKey || !expectedRef) throw new Error("Missing Preview configuration.");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== expectedRef) throw new Error(`Refusing unexpected Supabase target ${actualRef}.`);

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUserIds = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function createPlayer(prefix) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous sign-in failed.");
  createdUserIds.push(auth.user.id);
  const username = `${prefix}${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;
  const { data: characters, error: characterError } = await client.from("user_characters").select("id").limit(1);
  if (characterError || !characters?.[0]) throw characterError || new Error("Starter character missing.");
  return { client, id: auth.user.id, username, characterId: characters[0].id };
}

async function resolve(client, replaySessionId) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { data, error } = await client.functions.invoke("resolve-battle", { body: { replaySessionId } });
    if (!error) return data;
    lastError = error;
    if (attempt < 4) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  const detail = await lastError?.context?.json?.().catch(() => null);
  throw new Error(`resolve-battle failed after retries: ${JSON.stringify(detail || lastError?.message)}`);
}

async function recordClientEvent(client, eventName, sourceScreen, sourceCta = null, objectId = null) {
  const { error } = await client.rpc("record_client_funnel_event", {
    p_event_name: eventName,
    p_source_screen: sourceScreen,
    p_source_cta: sourceCta,
    p_object_id: objectId,
    p_metadata: { e2e: true },
  });
  if (error) throw error;
}

try {
  const player = await createPlayer("FP");
  const opponent = await createPlayer("FO");
  const leader = await createPlayer("FG");
  const recommendationLeaders = await Promise.all([createPlayer("FR"), createPlayer("FS")]);

  await Promise.all([
    admin.from("users").update({ level: 8, cash: 20000, last_active_at: new Date().toISOString() }).eq("id", leader.id),
    ...recommendationLeaders.map((candidate) => admin.from("users").update({ level: 8, cash: 20000, last_active_at: new Date().toISOString() }).eq("id", candidate.id)),
    admin.from("users").update({ level: 5, cash: 1000 }).eq("id", opponent.id),
    admin.from("users").update({ pvp_points: 5, cash: 2000 }).eq("id", player.id),
  ]);
  const { error: deckError } = await opponent.client.rpc("save_pvp_defense_deck", {
    p_character_ids: [opponent.characterId], p_tactic: "BALANCED",
  });
  if (deckError) throw deckError;

  await recordClientEvent(player.client, "game_start", "p0_e2e");
  const tutorialTransitions = [
    ["WORLD_INTRO", "FREE_GACHA"],
    ["FREE_GACHA", "AUTO_FORMATION"],
    ["AUTO_FORMATION", "DISPATCH"],
    ["DISPATCH", "FREE_INSTANT"],
    ["FREE_INSTANT", "TUTORIAL_BATTLE"],
    ["TUTORIAL_BATTLE", "RULE_GUIDE"],
    ["RULE_GUIDE", "COMPLETE"],
  ];
  for (const [expected, next] of tutorialTransitions.slice(0, 1)) {
    const { error } = await player.client.rpc("advance_tutorial_progress", { p_expected_step: expected, p_next_step: next });
    if (error) throw error;
  }
  const { error: gachaError } = await player.client.rpc("execute_character_gacha", {
    p_user_id: player.id, p_gacha_id: "CHAR_NORMAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: crypto.randomUUID(),
  });
  if (gachaError) throw gachaError;
  for (const [expected, next] of tutorialTransitions.slice(1)) {
    const { error } = await player.client.rpc("advance_tutorial_progress", { p_expected_step: expected, p_next_step: next });
    if (error) throw error;
  }
  const { error: materialError } = await admin.from("user_items").upsert({
    user_id: player.id, item_id: "CHAR_EXP_S", quantity: 10,
  }, { onConflict: "user_id,item_id" });
  if (materialError) throw materialError;
  const { error: growthError } = await player.client.rpc("level_up_character", {
    p_character_id: player.characterId, p_exp_item_id: "CHAR_EXP_S", p_count: 1,
  });
  if (growthError) throw growthError;

  const { data: pvpStart, error: pvpStartError } = await player.client.rpc("start_pvp_battle", {
    p_opponent_user_id: opponent.id,
    p_character_ids: [player.characterId],
    p_tactic: "ATTACK_PRIORITY",
  });
  if (pvpStartError) throw pvpStartError;
  const pvpResult = await resolve(player.client, pvpStart.replay_session_id);
  assert(["PLAYER", "ENEMY"].includes(pvpResult?.winner), "First PvP was not server-finalized.");
  await recordClientEvent(player.client, "pvp_to_raid_cta", "pvp_result", "raid");
  const { data: levelAfterPvp } = await admin.from("users").select("level,xp").eq("id", player.id).single();
  assert(levelAfterPvp?.level === 5, "First PvP did not unlock Raid at Lv5.");

  const { data: raids, error: raidsError } = await player.client.rpc("get_active_raids");
  if (raidsError) throw raidsError;
  assert(raids?.length === 2 && new Set(raids.map((raid) => raid.baseId)).size === 2, "Daily two-location Raid contract failed.");
  const { data: firstRaidStart, error: firstRaidStartError } = await player.client.rpc("start_raid_battle", {
    p_instance_id: raids[0].id, p_character_ids: [player.characterId], p_tactic: "ATTACK_PRIORITY",
  });
  if (firstRaidStartError) throw firstRaidStartError;
  assert(firstRaidStart.guild_id_snapshot === null, "First Raid was not started as an unguilded player.");
  const firstRaidResult = await resolve(player.client, firstRaidStart.replay_session_id);
  assert(firstRaidResult?.mode === "RAID", "First Raid was not server-finalized.");
  await recordClientEvent(player.client, "raid_to_guild_cta", "raid_result", "guild");

  const guildName = `P0${Date.now().toString(36).slice(-7)}`.slice(0, 12);
  const { data: createdGuild, error: createGuildError } = await leader.client.rpc("create_guild_v2", {
    p_user_id: leader.id, p_guild_name: guildName, p_creation_cost: 5000,
  });
  if (createGuildError || !createdGuild?.guild_id) throw createGuildError || new Error("Guild creation failed.");
  const guildId = createdGuild.guild_id;
  const { error: settingsError } = await leader.client.rpc("update_guild_settings", {
    p_guild_id: guildId, p_desc: "Open Beta P0 funnel E2E", p_approval: true, p_kick_days: 7,
  });
  if (settingsError) throw settingsError;
  const { error: leaderChatError } = await leader.client.rpc("send_chat_message", {
    p_target_type: "GUILD", p_content: "P0 active guild recommendation probe",
  });
  if (leaderChatError) throw leaderChatError;
  for (const [index, candidate] of recommendationLeaders.entries()) {
    const { data: extraGuild, error: extraGuildError } = await candidate.client.rpc("create_guild_v2", {
      p_user_id: candidate.id,
      p_guild_name: `R${index}${Date.now().toString(36).slice(-7)}`.slice(0, 12),
      p_creation_cost: 5000,
    });
    if (extraGuildError || !extraGuild?.guild_id) throw extraGuildError || new Error("Recommendation fixture Guild creation failed.");
  }

  const { data: recommendations, error: recommendationError } = await player.client.rpc("get_recommended_guilds", { p_limit: 5 });
  if (recommendationError) throw recommendationError;
  assert(recommendations?.length >= 3 && recommendations.length <= 5, "Recommendation v1.1 did not return 3-5 available Guilds.");
  assert(recommendations.every((guild) => guild.member_count < guild.member_limit), "Recommendation included a full Guild.");
  const recommendedGuild = recommendations[0];
  assert(typeof recommendedGuild?.recommendation_score === "number", "Recommendation v1.1 score is missing.");
  await recordClientEvent(player.client, "guild_recommendation_impression", "raid", null, recommendedGuild.guild_id);
  await recordClientEvent(player.client, "guild_recommendation_click", "raid", "recommended_guild", recommendedGuild.guild_id);
  await recordClientEvent(player.client, "guild_detail_view", "raid", "recommended_guild", recommendedGuild.guild_id);
  await recordClientEvent(player.client, "guild_detail_join_click", "guild_detail", "apply", guildId);

  const { data: requested, error: requestError } = await player.client.rpc("request_guild_join", { p_guild_id: guildId });
  if (requestError || requested?.status !== "pending") throw requestError || new Error("Recommended Guild application failed.");
  const { data: reviewed, error: reviewError } = await leader.client.rpc("review_guild_join_request", {
    p_request_id: requested.request_id, p_approve: true,
  });
  if (reviewError || reviewed?.status !== "approved") throw reviewError || new Error("Recommended Guild approval failed.");
  await recordClientEvent(player.client, "guild_welcome_chat_click", "guild_welcome", "open_chat", guildId);
  const { error: activationError } = await player.client.rpc("send_chat_message", {
    p_target_type: "GUILD", p_content: "P0 guild activation probe",
  });
  if (activationError) throw activationError;
  await recordClientEvent(player.client, "guild_chat_raid_click", "guild_chat", "open_raid", guildId);

  const { data: secondRaidStart, error: secondRaidStartError } = await player.client.rpc("start_raid_battle", {
    p_instance_id: raids[1].id, p_character_ids: [player.characterId], p_tactic: "ATTACK_PRIORITY",
  });
  if (secondRaidStartError) throw secondRaidStartError;
  assert(secondRaidStart.guild_id_snapshot === guildId, "Second Raid did not snapshot Guild membership.");
  const secondRaidResult = await resolve(player.client, secondRaidStart.replay_session_id);
  assert(secondRaidResult?.mode === "RAID", "Second Raid was not server-finalized.");
  const { data: rankings, error: rankingError } = await player.client.rpc("get_raid_rankings", { p_instance_id: raids[1].id });
  if (rankingError) throw rankingError;
  assert(rankings?.guild?.some((guild) => guild.guild_id === guildId), "Guild Raid ranking is missing the snapped contribution.");

  const { data: retryResult, error: retryError } = await player.client.functions.invoke("resolve-battle", {
    body: { replaySessionId: secondRaidStart.replay_session_id },
  });
  if (retryError) throw retryError;
  assert(JSON.stringify(retryResult) === JSON.stringify(secondRaidResult), "Second Raid retry was not idempotent.");
  const { count: contributionCount } = await admin.from("raid_damage_logs")
    .select("id", { count: "exact", head: true })
    .eq("battle_replay_session_id", secondRaidStart.replay_session_id);
  assert(contributionCount === 1, "Retry duplicated Raid contribution.");

  const { error: unsupportedEventError } = await player.client.rpc("record_client_funnel_event", {
    p_event_name: "forged_reward", p_source_screen: "e2e", p_source_cta: null, p_object_id: null, p_metadata: {},
  });
  assert(unsupportedEventError, "Client funnel event allowlist was bypassed.");
  const { data: milestones } = await player.client.from("user_funnel_milestones").select("milestone,occurrence_count");
  const milestoneNames = new Set((milestones || []).map((row) => row.milestone));
  for (const expected of ["tutorial_complete", "first_gacha", "first_growth", "first_battle", "first_pvp", "first_raid", "guild_join_applied", "guild_joined", "guild_activation", "second_raid"]) {
    assert(milestoneNames.has(expected), `Missing funnel milestone: ${expected}`);
  }
  const { data: funnelMissions, error: funnelMissionError } = await player.client
    .from("user_missions")
    .select("mission_id,status,missions!inner(is_provisional,condition_params)")
    .like("mission_id", "ob_funnel_%");
  if (funnelMissionError) throw funnelMissionError;
  assert(funnelMissions?.length === 9, "Nine P0+ funnel Missions were not assigned.");
  assert(funnelMissions.every((mission) => mission.status === "CLEAR" || mission.status === "CLAIMED"), "Funnel Mission progress did not follow server milestones.");

  await recordClientEvent(player.client, "home_primary_cta_impression", "home", "second_raid");
  await recordClientEvent(player.client, "home_primary_cta_click", "home", "second_raid");
  await recordClientEvent(player.client, "mission_cta_click", "mission", "ob_funnel_second_raid_01");
  await recordClientEvent(player.client, "ranking_player_detail", "ranking", "pvp_player", opponent.id);
  await recordClientEvent(player.client, "ranking_guild_detail", "ranking", "raid_guild", guildId);

  console.log(JSON.stringify({
    projectRef: actualRef,
    status: "PASS",
    chain: ["First PvP", "Raid CTA", "First Raid (unguilded)", "Guild Recommendation", "Guild Detail", "Guild Apply", "Guild Approval/Join", "Guild Chat Activation", "Second Raid"],
    pvpReplayId: pvpStart.replay_session_id,
    raidReplayIds: [firstRaidStart.replay_session_id, secondRaidStart.replay_session_id],
    guildId,
    milestones: [...milestoneNames].sort(),
    checks: ["Lv5 bridge", "two 24h Raid locations", "Guild snapshot", "Guild ranking", "retry idempotency", "event allowlist", "Recommendation v1.1", "nine Funnel Missions", "P0+ CTA analytics"],
  }, null, 2));
} finally {
  for (const userId of createdUserIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Failed to delete Preview QA user ${userId}: ${error.message}`);
  }
}
