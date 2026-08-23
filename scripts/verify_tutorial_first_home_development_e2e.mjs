import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expectedRef = "vosbyukxmskvisbgleug";
const workspaceIndex = process.argv.indexOf("--linked-workspace");
const linkedWorkspace = resolve(workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : ".");
const linkedRef = (await readFile(resolve(linkedWorkspace, "supabase/.temp/project-ref"), "utf8")).trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (linkedRef !== expectedRef || process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef || new URL(url).hostname.split(".")[0] !== expectedRef) {
  throw new Error(`Refusing non-Development target: linked=${linkedRef}`);
}
if (!anonKey || !process.env.SUPABASE_DB_PASSWORD) throw new Error("Development credentials are required");
const pooler = new URL((await readFile(resolve(linkedWorkspace, "supabase/.temp/pooler-url"), "utf8")).trim());
const executable = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
function sql(statement) {
  const result = spawnSync(executable, ["-X", "-v", "ON_ERROR_STOP=1", "--tuples-only", "--no-align",
    "--host", pooler.hostname, "--port", pooler.port || "5432", "--username", decodeURIComponent(pooler.username),
    "--dbname", pooler.pathname.slice(1) || "postgres", "--command", statement],
  { encoding: "utf8", env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "SQL failed");
  return result.stdout.trim();
}

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let userId;
try {
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user || !auth.session) throw authError || new Error("Anonymous auth failed");
  userId = auth.user.id;
  const username = `C1${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const init = await client.rpc("initialize_current_player", { p_username: username });
  if (init.error) throw init.error;
  const initialUser = await client.from("users").select("current_base_id,favorite_character_id,vitality").eq("id", userId).single();
  if (initialUser.error || initialUser.data.current_base_id !== "shinjuku" || initialUser.data.favorite_character_id !== null) {
    throw initialUser.error || new Error(`Fresh state mismatch: ${JSON.stringify(initialUser.data)}`);
  }
  if (sql(`select count(*) from public.user_characters where user_id='${userId}'::uuid`) !== "0") throw new Error("Fresh user did not start with Character 0");

  for (const [expected, next] of [["WORLD_INTRO", "FREE_GACHA"], ["FREE_GACHA", "AUTO_FORMATION"]]) {
    const advanced = await client.rpc("advance_tutorial_progress", { p_expected_step: expected, p_next_step: next });
    if (advanced.error) throw advanced.error;
  }
  const premature = await client.rpc("complete_current_tutorial_formation");
  if (!premature.error) throw new Error("Formation without tutorial gacha unexpectedly succeeded");
  if (sql(`select count(*) from public.user_main_formations where user_id='${userId}'::uuid`) !== "0"
      || sql(`select favorite_character_id is null from public.users where id='${userId}'::uuid`) !== "t") {
    throw new Error("Failed formation left partial formation/favorite state");
  }
  sql(`update public.tutorial_progress set step_id='FREE_GACHA' where user_id='${userId}'::uuid`);

  const requestId = crypto.randomUUID();
  const draw = await client.rpc("execute_tutorial_character_gacha", { p_request_id: requestId });
  if (draw.error || draw.data?.results?.length !== 10 || draw.data.results[9]?.rarity !== "SSR") {
    throw draw.error || new Error(`Tutorial draw mismatch: ${JSON.stringify(draw.data)}`);
  }
  const retryDraw = await client.rpc("execute_tutorial_character_gacha", { p_request_id: requestId });
  if (retryDraw.error || JSON.stringify(retryDraw.data) !== JSON.stringify(draw.data)) throw retryDraw.error || new Error("Tutorial gacha retry changed result");
  const rarityMismatch = sql(`select count(*) from jsonb_array_elements((select result_payload->'results' from public.gacha_execution_history where user_id='${userId}'::uuid and request_id='${requestId}'::uuid)) result left join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=result->>'character_id' where master.rarity is distinct from result->>'rarity'`);
  if (rarityMismatch !== "0") throw new Error(`Tutorial result rarity mismatch=${rarityMismatch}`);
  const guaranteedCharacterId = String(draw.data.results[9].character_id);
  const guaranteedOwnedId = sql(`select id from public.user_characters where user_id='${userId}'::uuid and character_id='${guaranteedCharacterId}'`);
  const awakeningBefore = Number(sql(`select awakening_level from public.user_characters where id='${guaranteedOwnedId}'::uuid`));
  sql(`update public.user_characters set awakening_level=least(awakening_level+1,5) where id='${guaranteedOwnedId}'::uuid`);
  const awakeningAfter = Number(sql(`select awakening_level from public.user_characters where id='${guaranteedOwnedId}'::uuid`));
  if (awakeningAfter !== Math.min(awakeningBefore + 1, 5)) throw new Error("Tutorial duplicate Awakening persistence regressed");
  if (sql(`select count(*) from public.user_funnel_milestones where user_id='${userId}'::uuid and milestone='first_growth'`) !== "0") {
    throw new Error("Tutorial gacha duplicate awakening completed FIRST_GROWTH before visible Growth");
  }
  const toFormation = await client.rpc("advance_tutorial_progress", { p_expected_step: "FREE_GACHA", p_next_step: "AUTO_FORMATION" });
  if (toFormation.error) throw toFormation.error;
  const formationBeforeGrowth = await client.rpc("complete_current_tutorial_formation");
  if (!formationBeforeGrowth.error) throw new Error("Formation before visible Growth was not rejected");
  const growthPreparation = await client.rpc("prepare_current_tutorial_growth");
  if (growthPreparation.error || growthPreparation.data?.required_level !== 7 || growthPreparation.data?.required_quantity !== 6 || growthPreparation.data?.granted_quantity !== 6) {
    throw growthPreparation.error || new Error(`Tutorial Growth preparation mismatch: ${JSON.stringify(growthPreparation.data)}`);
  }
  const growth = await client.rpc("level_up_character", { p_character_id: growthPreparation.data.target_user_character_id, p_exp_item_id: "CHAR_EXP_S", p_count: growthPreparation.data.required_quantity });
  if (growth.error || growth.data?.level !== 7 || growth.data?.cash_spent !== 600) throw growth.error || new Error(`Canonical Growth failed: ${JSON.stringify(growth.data)}`);
  const growthRetry = await client.rpc("prepare_current_tutorial_growth");
  if (growthRetry.error || growthRetry.data?.status !== "growth_complete" || growthRetry.data?.granted_quantity !== 0) throw growthRetry.error || new Error("Tutorial Growth supply retry was not idempotent");
  const growthAdvance = await client.rpc("advance_current_tutorial_after_growth");
  if (growthAdvance.error || growthAdvance.data?.status !== "ready_for_formation" || growthAdvance.data?.tutorial_step !== "AUTO_FORMATION") throw growthAdvance.error || new Error("Growth did not unlock Formation");
  if (sql(`select count(*) from public.user_funnel_milestones where user_id='${userId}'::uuid and milestone='first_growth'`) !== "1") throw new Error("FIRST_GROWTH authoritative milestone mismatch");
  const formation = await client.rpc("complete_current_tutorial_formation");
  if (formation.error || formation.data?.status !== "advanced") throw formation.error || new Error(`Formation failed: ${JSON.stringify(formation.data)}`);
  const retryFormation = await client.rpc("complete_current_tutorial_formation");
  if (retryFormation.error || retryFormation.data?.status !== "already_advanced") throw retryFormation.error || new Error("Formation retry was not idempotent");
  const leader = String(formation.data.leader_character_id);
  const favorite = sql(`select favorite_character_id from public.users where id='${userId}'::uuid`);
  const slotOne = sql(`select owned.character_id from public.user_main_formations formation join public.user_characters owned on owned.id=formation.user_character_id where formation.user_id='${userId}'::uuid and formation.slot=1`);
  if (favorite !== leader || slotOne !== leader) throw new Error(`Leader persistence mismatch: result=${leader}, favorite=${favorite}, slot1=${slotOne}`);

  const beforeVitality = Number(sql(`select vitality from public.users where id='${userId}'::uuid`));
  const start = await client.rpc("start_patrol", { p_course_id: "q_shinjuku_1", p_character_id: formation.data.leader_user_character_id });
  if (start.error) throw start.error;
  const afterVitality = Number(sql(`select vitality from public.users where id='${userId}'::uuid`));
  if (beforeVitality - afterVitality !== 5) throw new Error(`Tutorial Vitality cost mismatch: ${beforeVitality}->${afterVitality}`);
  if (start.data?.tutorial_step !== "FREE_INSTANT") {
    const advance = await client.rpc("advance_tutorial_progress", { p_expected_step: "DISPATCH", p_next_step: "FREE_INSTANT" });
    if (advance.error) throw advance.error;
  }
  const instant = await client.rpc("complete_patrol_instantly", { p_user_id: userId, p_patrol_id: start.data.patrol_id, p_use_currency: "FREE_TUTORIAL" });
  if (instant.error || instant.data?.tutorial_step !== "TUTORIAL_BATTLE") throw instant.error || new Error("Tutorial instant completion failed");
  let battle;
  let replay;
  let battleAttempts = 0;
  const battleResults = [];
  do {
    battleAttempts += 1;
    replay = await client.rpc("create_patrol_battle_replay", { p_patrol_id: start.data.patrol_id, p_tactic_id: "ATTACK_PRIORITY" });
    if (replay.error || replay.data?.enemy_snapshot?.length !== 3 || replay.data?.enemy_tactic !== "BALANCED") throw replay.error || new Error("Tutorial encounter snapshot mismatch");
    battle = await client.functions.invoke("resolve-battle", { body: { replaySessionId: replay.data.replay_session_id } });
    if (battle.error || !["PLAYER", "ENEMY"].includes(battle.data?.winner)) throw battle.error || new Error("Authoritative tutorial battle failed");
    battleResults.push({ winner: battle.data.winner, rounds: battle.data.rounds, replaySessionId: replay.data.replay_session_id });
  } while (battle.data.winner === "ENEMY" && battleAttempts < 10);
  if (battle.data.winner !== "PLAYER") throw new Error(`Fresh tutorial party did not win within the supported retry contract: ${JSON.stringify({ characters: draw.data.results.map((entry) => entry.character_id), battleResults })}`);
  const reward = await client.rpc("claim_patrol_rewards", { p_patrol_id: start.data.patrol_id });
  if (reward.error) throw reward.error;
  const complete = await client.rpc("advance_tutorial_progress", { p_expected_step: "TUTORIAL_BATTLE", p_next_step: "RULE_GUIDE" });
  if (complete.error) throw complete.error;
  const finish = await client.rpc("advance_tutorial_progress", { p_expected_step: "RULE_GUIDE", p_next_step: "COMPLETE" });
  if (finish.error) throw finish.error;

  const reload = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const restored = await reload.auth.setSession({ access_token: auth.session.access_token, refresh_token: auth.session.refresh_token });
  if (restored.error) throw restored.error;
  const reloaded = await reload.from("users").select("current_base_id,favorite_character_id").eq("id", userId).single();
  if (reloaded.error || reloaded.data.current_base_id !== "shinjuku" || reloaded.data.favorite_character_id !== leader) throw reloaded.error || new Error("Reload persistence mismatch");

  // Normal Production Growth outside FREE_GACHA must retain the existing
  // authoritative FIRST_GROWTH trigger semantics.
  sql(`delete from public.user_funnel_milestones where user_id='${userId}'::uuid and milestone='first_growth'; insert into public.user_items(user_id,item_id,quantity) values('${userId}'::uuid,'CHAR_EXP_S',1) on conflict(user_id,item_id) do update set quantity=greatest(public.user_items.quantity,1);`);
  const productionGrowth = await client.rpc("level_up_character", { p_character_id: formation.data.leader_user_character_id, p_exp_item_id: "CHAR_EXP_S", p_count: 1 });
  if (productionGrowth.error || Number(productionGrowth.data?.level) !== 8) throw productionGrowth.error || new Error("Production Character Growth path regressed");
  if (sql(`select count(*) from public.user_funnel_milestones where user_id='${userId}'::uuid and milestone='first_growth'`) !== "1") throw new Error("Production Character Level Up did not record FIRST_GROWTH");

  console.log(JSON.stringify({ status: "PASS", projectRef: expectedRef, characterZero: true, town: "shinjuku", tutorialDraw: "10 / slot10 SSR / Canonical rarity", duplicateAwakening: { before: awakeningBefore, after: awakeningAfter, firstGrowthBeforeVisibleGrowth: 0 }, growth: { target: growthPreparation.data.target_character_id, before: 1, after: 7, item: "CHAR_EXP_S", consumed: 6, cash: 600, firstGrowth: "PASS" }, productionGrowthTrigger: "PASS", rollback: "PASS", idempotency: "PASS", leader, formationSlot1: slotOne, favorite, vitalityCost: 5, encounter: "q_shinjuku_1 / 3 / Lv5 / +0 / BALANCED / Canonical Skills", battleWinner: battle.data.winner, battleAttempts, tutorialComplete: true, reloadPersistence: "PASS", hiddenTutorialCombatModifiers: 0 }, null, 2));
} finally {
  if (userId) {
    sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop begin execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid; exception when foreign_key_violation then null; end; end loop; delete from public.users where id='${userId}'::uuid; delete from auth.users where id='${userId}'::uuid; end $$;`);
  }
}
