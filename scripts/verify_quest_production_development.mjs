import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Development configuration missing");
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
function sql(statement, label) {
  const result = spawnSync(executable,["-X","--set","ON_ERROR_STOP=1","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",statement],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
  if (result.status !== 0) throw new Error(result.stderr || `${label} failed`);
  return result.stdout;
}

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId = null;
try {
  const { data: auth, error: authError } = await client.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Fixture auth failed");
  userId = auth.user.id;
  const { error: initError } = await client.rpc("initialize_current_player", { p_username: `QB${Date.now().toString(36).slice(-6)}`.slice(0, 8) });
  if (initError) throw initError;
  sql(`insert into public.user_characters(user_id,character_id,level,awakening_level) values
    ('${userId}'::uuid,'char_reiji_01',5,0),('${userId}'::uuid,'char_rui_01',5,0),
    ('${userId}'::uuid,'char_chang_01',5,0),('${userId}'::uuid,'char_mio_01',5,0),
    ('${userId}'::uuid,'char_go_01',5,0)
    on conflict(user_id,character_id) do update set level=excluded.level,awakening_level=0`, "Quest Character fixture");

  const [{ data: quests, error: questError }, { data: encounters, error: encounterError }, { data: pools, error: poolError }, { data: owned, error: ownedError }] = await Promise.all([
    client.from("canonical_quest_master").select("*").eq("version", "2026-08-22").order("display_order"),
    client.from("canonical_quest_encounter_master").select("*").eq("version", "2026-08-22"),
    client.from("canonical_quest_reward_pool_items").select("*").eq("version", "2026-08-22"),
    client.from("user_characters").select("id,character_id").eq("user_id", userId),
  ]);
  if (questError || encounterError || poolError || ownedError) throw questError || encounterError || poolError || ownedError;
  if (quests.length !== 21 || encounters.length !== 21 || quests.some((quest) => !quest.is_production_enabled || quest.unlock_condition !== "NONE")) throw new Error("Canonical Quest DB parity failed");
  if (encounters.some((encounter) => encounter.members.length !== 5 || encounter.normal_attack_power_bp !== 8000)) throw new Error("Encounter DB parity failed");
  if (pools.some((item) => item.item_id === "AWAKENING_BOOK")) throw new Error("AWAKENING_BOOK entered Quest pool");
  const ownedByCharacter = new Map(owned.map((entry) => [entry.character_id, entry]));
  const playerPartyIds = ["char_reiji_01", "char_rui_01", "char_chang_01", "char_mio_01", "char_go_01"].map((id) => ownedByCharacter.get(id)?.id);
  if (playerPartyIds.some((id) => !id)) throw new Error("Fresh Quest party fixture is incomplete");
  const { error: deckError } = await client.rpc("save_pvp_defense_deck", { p_character_ids: playerPartyIds, p_tactic: "ATTACK_PRIORITY" });
  if (deckError) throw deckError;
  const dispatchedCharacter = ownedByCharacter.get("char_reiji_01");

  const cases = [
    ["q_shinjuku_1", "EASY", 60, 5, 5, 200, 300],
    ["q_shinjuku_2", "NORMAL", 180, 10, 10, 300, 700],
    ["q_shinjuku_3", "HARD", 300, 15, 15, 500, 1300],
  ];
  const difficultyBattleResults = [];
  for (const [questId, difficulty, duration, vitalityCost, enemyLevel, firstXp, cash] of cases) {
    sql(`update public.users set vitality=100 where id='${userId}'::uuid`, "vitality reset");
    const { data: started, error: startError } = await client.rpc("start_patrol", { p_course_id: questId, p_character_id: dispatchedCharacter.id });
    if (startError || started.duration_seconds !== duration || started.cost_vitality !== vitalityCost || started.remaining_vitality !== 100 - vitalityCost) throw startError || new Error(`${difficulty} start mismatch`);
    const { error: instantError } = await client.rpc("complete_patrol_instantly", { p_user_id: userId, p_patrol_id: started.patrol_id, p_use_currency: "FREE_PREOPEN" });
    if (instantError) throw instantError;
    const { data: replay, error: replayError } = await client.rpc("create_patrol_battle_replay", { p_patrol_id: started.patrol_id, p_tactic_id: "ATTACK_PRIORITY" });
    if (replayError || replay.enemy_snapshot?.length !== 5) throw replayError || new Error(`${difficulty} snapshot failed`);
    for (const enemy of replay.enemy_snapshot) {
      if (enemy.level !== enemyLevel || enemy.awakeningLevel !== 0 || enemy.skills?.[0]?.effects?.[0] !== "DAMAGE 80% ATK" || enemy.equipment?.length !== 0) throw new Error(`${difficulty} Canonical NPC snapshot mismatch`);
    }
    const { data: result, error: resolveError } = await client.functions.invoke("resolve-battle", { body: { replaySessionId: replay.replay_session_id } });
    if (resolveError || !["PLAYER", "ENEMY"].includes(result?.winner)) throw resolveError || new Error(`${difficulty} battle resolve failed`);
    if (!Number.isInteger(result.rounds) || result.rounds < 2) throw new Error(`${difficulty} tuning smoke resolved as a one-round extreme`);
    difficultyBattleResults.push({ difficulty, winner: result.winner, rounds: result.rounds });
    const { data: reward, error: rewardError } = await client.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
    if (rewardError || reward.first_clear !== true || reward.xp !== firstXp || reward.cash !== cash) throw rewardError || new Error(`${difficulty} first clear mismatch ${JSON.stringify(reward)}`);
  }

  sql(`update public.users set vitality=100 where id='${userId}'::uuid`, "repeat vitality reset");
  const { data: repeatStart, error: repeatStartError } = await client.rpc("start_patrol", { p_course_id: "q_shinjuku_1", p_character_id: dispatchedCharacter.id });
  if (repeatStartError) throw repeatStartError;
  const { error: repeatInstantError } = await client.rpc("complete_patrol_instantly", { p_user_id: userId, p_patrol_id: repeatStart.patrol_id, p_use_currency: "FREE_PREOPEN" });
  if (repeatInstantError) throw repeatInstantError;
  const { data: repeatReplay, error: repeatReplayError } = await client.rpc("create_patrol_battle_replay", { p_patrol_id: repeatStart.patrol_id, p_tactic_id: "ATTACK_PRIORITY" });
  if (repeatReplayError) throw repeatReplayError;
  const { error: repeatResolveError } = await client.functions.invoke("resolve-battle", { body: { replaySessionId: repeatReplay.replay_session_id } });
  if (repeatResolveError) throw repeatResolveError;
  const { data: repeatReward, error: repeatRewardError } = await client.rpc("claim_patrol_rewards", { p_patrol_id: repeatStart.patrol_id });
  if (repeatRewardError || repeatReward.first_clear !== false || repeatReward.xp !== 100) throw repeatRewardError || new Error("Repeat clear reissued First Clear");
  const { error: duplicateError } = await client.rpc("claim_patrol_rewards", { p_patrol_id: repeatStart.patrol_id });
  if (!duplicateError) throw new Error("Duplicate Quest claim was accepted");

  console.log(JSON.stringify({ environment: target.environment, projectRef: target.projectRef, quests: 21, encounters: 21, allUnlockNone: true, difficultyStarts: "PASS", canonicalNpcSnapshot: "PASS", normalAttack80: "PASS", battleFinalize: "PASS", difficultyBattleResults, firstClearExactlyOnce: "PASS", duplicateRejected: true }, null, 2));
} finally {
  if (userId) sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid; end loop; delete from public.users where id='${userId}'::uuid; delete from auth.users where id='${userId}'::uuid; end $$;`, "Quest fixture cleanup");
}
