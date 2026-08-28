import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

loadEnvironmentFile("development");

const target = await verifySupabaseTarget({ environment: "development", mutation: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Development Supabase configuration is incomplete.");

const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
function sql(statement, label) {
  const result = spawnSync(executable, [
    "-X", "--set", "ON_ERROR_STOP=1",
    "--host", connection.host,
    "--port", connection.port,
    "--username", connection.user,
    "--dbname", connection.database,
    "--tuples-only", "--no-align",
    "--command", statement,
  ], {
    encoding: "utf8",
    env: { ...process.env, PGPASSWORD: connection.password },
  });
  if (result.status !== 0) throw new Error(result.stderr || `${label} failed.`);
  return result.stdout.trim();
}

const player = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let userId = null;

try {
  const { data: auth, error: authError } = await player.auth.signInAnonymously();
  if (authError || !auth.user) throw authError || new Error("Anonymous QA fixture creation failed.");
  userId = auth.user.id;

  const username = `QE${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const { error: initializeError } = await player.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;

  const { data: quest, error: questError } = await player
    .from("canonical_quest_master")
    .select("quest_id,display_name,duration_sec,vitality_cost,user_exp,cash_reward,first_clear_user_exp,reward_pool_id,first_clear_reward_pool_id")
    .eq("version", "2026-08-22")
    .eq("unlock_condition", "OPEN")
    .eq("is_production_enabled", true)
    .order("display_order")
    .limit(1)
    .single();
  if (questError || !quest) throw questError || new Error("A released normal Quest was not available.");

  const totalFirstClearXp = Number(quest.user_exp) + Number(quest.first_clear_user_exp);
  const levelFourRequirement = Number(sql(
    "select required_exp from public.canonical_user_level_master where version='2026-08-22' and level=4",
    "Level master lookup",
  ));
  if (!Number.isInteger(totalFirstClearXp) || totalFirstClearXp <= 0 || totalFirstClearXp > levelFourRequirement) {
    throw new Error(`Quest XP cannot form a safe Lv4 boundary fixture: ${totalFirstClearXp}/${levelFourRequirement}`);
  }

  sql(`
    update public.users
       set level=4,
           xp=${levelFourRequirement - totalFirstClearXp},
           vitality=100,
           cash=20000,
           raid_points=5,
           raid_free_entry_consumed=false
     where id='${userId}'::uuid;
    insert into public.user_characters(user_id,character_id,level,awakening_level)
    values ('${userId}'::uuid,'char_reiji_01',21,1),
           ('${userId}'::uuid,'char_mio_01',21,1),
           ('${userId}'::uuid,'char_go_01',21,1),
           ('${userId}'::uuid,'char_koharu_01',21,1),
           ('${userId}'::uuid,'char_ageha_01',21,1)
    on conflict(user_id,character_id) do update set level=excluded.level,awakening_level=excluded.awakening_level;
  `, "Quest/EXP fixture setup");

  const { data: owned, error: ownedError } = await player
    .from("user_characters")
    .select("id,character_id")
    .eq("user_id", userId);
  if (ownedError || !owned?.length) throw ownedError || new Error("Quest party fixture is empty.");
  const ownedByCharacter = new Map(owned.map((row) => [row.character_id, row.id]));
  const party = ["char_reiji_01", "char_mio_01", "char_go_01", "char_koharu_01", "char_ageha_01"]
    .map((characterId) => ownedByCharacter.get(characterId));
  if (party.some((id) => !id)) throw new Error("Quest party fixture is incomplete.");
  const { error: deckError } = await player.rpc("save_pvp_defense_deck", {
    p_character_ids: party,
    p_tactic: "BALANCED",
  });
  if (deckError) throw deckError;

  const beforeUser = JSON.parse(sql(
    `select row_to_json(row) from (select level,xp,vitality,cash from public.users where id='${userId}'::uuid) row`,
    "Before user projection",
  ));
  const beforeProgression = await player.rpc("get_canonical_quest_progression");
  if (beforeProgression.error) throw beforeProgression.error;
  const successorBefore = beforeProgression.data.find((row) => row.unlock_condition === `FIRST_CLEAR:${quest.quest_id}`);
  if (!successorBefore || successorBefore.is_unlocked) throw new Error("Quest successor was not locked before first clear.");
  const { data: raids, error: raidsError } = await player.rpc("get_active_raids");
  if (raidsError || !raids?.[0]?.id) throw raidsError || new Error("An active Raid was not available for the Lv5 unlock proof.");
  const raidBeforeLevelUp = await player.rpc("start_raid_battle", {
    p_instance_id: raids[0].id,
    p_character_ids: [ownedByCharacter.get("char_reiji_01")],
    p_tactic: "BALANCED",
  });
  if (!raidBeforeLevelUp.error || !/level 5/i.test(raidBeforeLevelUp.error.message)) {
    throw new Error(`Lv4 Raid entry was not rejected: ${JSON.stringify(raidBeforeLevelUp)}`);
  }

  const { data: started, error: startError } = await player.rpc("start_patrol", {
    p_course_id: quest.quest_id,
    p_character_id: ownedByCharacter.get("char_reiji_01"),
  });
  if (startError || started?.status !== "success") throw startError || new Error(`Normal dispatch failed: ${JSON.stringify(started)}`);

  // Move only this disposable QA patrol past its canonical expiry. This enters
  // the same server branch as natural wall-clock completion without changing
  // Quest duration or any production Master value.
  sql(`update public.user_patrols set expires_at=now()-interval '1 second' where id='${started.patrol_id}'::uuid and user_id='${userId}'::uuid`, "Natural expiry fixture");

  const { data: replay, error: replayError } = await player.rpc("create_patrol_battle_replay", {
    p_patrol_id: started.patrol_id,
    p_tactic_id: "BALANCED",
  });
  if (replayError || !replay?.replay_session_id) throw replayError || new Error("Natural completion did not become battle-claimable.");
  const { data: battle, error: battleError } = await player.functions.invoke("resolve-battle", {
    body: { replaySessionId: replay.replay_session_id },
  });
  if (battleError || !["PLAYER", "ENEMY"].includes(battle?.winner)) {
    throw battleError || new Error(`Quest battle resolution failed: ${JSON.stringify(battle)}`);
  }

  const { data: reward, error: rewardError } = await player.rpc("claim_patrol_rewards", {
    p_patrol_id: started.patrol_id,
  });
  if (rewardError || reward?.status !== "success") throw rewardError || new Error(`Quest claim failed: ${JSON.stringify(reward)}`);
  if (Number(reward.cash) !== Number(quest.cash_reward) || Number(reward.xp) !== totalFirstClearXp || reward.first_clear !== true) {
    throw new Error(`Quest reward differs from Master: ${JSON.stringify({ quest, reward })}`);
  }
  if (Number(reward.level) !== 5 || Number(reward.current_xp) !== 0 || reward.leveled_up !== true) {
    throw new Error(`Lv4-to-Lv5 boundary failed: ${JSON.stringify(reward)}`);
  }
  const { data: raidAfterLevelUp, error: raidAfterLevelUpError } = await player.rpc("start_raid_battle", {
    p_instance_id: raids[0].id,
    p_character_ids: [ownedByCharacter.get("char_reiji_01")],
    p_tactic: "BALANCED",
  });
  if (raidAfterLevelUpError || !raidAfterLevelUp?.replay_session_id) {
    throw raidAfterLevelUpError || new Error(`Lv5 Raid entry did not unlock: ${JSON.stringify(raidAfterLevelUp)}`);
  }

  const afterProgression = await player.rpc("get_canonical_quest_progression");
  if (afterProgression.error) throw afterProgression.error;
  const successorAfter = afterProgression.data.find((row) => row.quest_id === successorBefore.quest_id);
  if (!successorAfter?.is_unlocked) throw new Error("First-clear successor did not unlock.");

  const guaranteedItems = JSON.parse(sql(`
    select coalesce(json_agg(row_to_json(item)),'[]'::json)
      from (
        select item_id,quantity
          from public.canonical_quest_reward_pool_items
         where version='2026-08-22'
           and reward_pool_id='${quest.first_clear_reward_pool_id}'
           and probability_bp=10000
         order by roll_index
      ) item
  `, "Guaranteed reward Master lookup"));
  for (const item of guaranteedItems) {
    if (!reward.items.some((awarded) => awarded.item_id === item.item_id && Number(awarded.quantity) === Number(item.quantity))) {
      throw new Error(`Guaranteed first-clear reward is missing: ${JSON.stringify(item)}`);
    }
  }

  const presentCountBeforeRetry = Number(sql(
    `select count(*) from public.presents where user_id='${userId}'::uuid`,
    "Present count before retry",
  ));
  const { error: retryError } = await player.rpc("claim_patrol_rewards", { p_patrol_id: started.patrol_id });
  if (!retryError || !/already claimed/i.test(retryError.message)) throw new Error("Duplicate Quest claim was not rejected.");
  const presentCountAfterRetry = Number(sql(
    `select count(*) from public.presents where user_id='${userId}'::uuid`,
    "Present count after retry",
  ));
  if (presentCountAfterRetry !== presentCountBeforeRetry) throw new Error("Duplicate claim changed reward inventory.");
  const firstClearCount = Number(sql(
    `select count(*) from public.user_quest_first_clears where user_id='${userId}'::uuid and quest_id='${quest.quest_id}'`,
    "First-clear ledger count",
  ));
  if (firstClearCount !== 1) throw new Error(`First-clear ledger is not exactly once: ${firstClearCount}`);

  const afterUser = JSON.parse(sql(
    `select row_to_json(row) from (select level,xp,vitality,cash from public.users where id='${userId}'::uuid) row`,
    "After user projection",
  ));
  const patrolStatus = sql(
    `select status from public.user_patrols where id='${started.patrol_id}'::uuid`,
    "Patrol status",
  );

  console.log(JSON.stringify({
    environment: target.environment,
    projectRef: target.projectRef,
    userId,
    username,
    questId: quest.quest_id,
    questName: quest.display_name,
    completion: "NATURAL_EXPIRY_BRANCH",
    before: beforeUser,
    reward: {
      cash: reward.cash,
      xp: reward.xp,
      items: reward.items,
      firstClear: reward.first_clear,
    },
    after: afterUser,
    levelBoundary: "LV4_TO_LV5_PASS",
    levelUnlock: "RAID_ENTRY_LV4_DENY_LV5_ALLOW_PASS",
    questUnlock: `${successorBefore.quest_id}:PASS`,
    patrolStatus,
    rewardExactlyOnce: "PASS",
    firstClearExactlyOnce: "PASS",
    battleWinner: battle.winner,
  }, null, 2));
} finally {
  if (userId) {
    sql(`do $$ declare r record; begin
      for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop
        execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid;
      end loop;
      delete from public.users where id='${userId}'::uuid;
      delete from auth.users where id='${userId}'::uuid;
    end $$;`, "Quest/EXP fixture cleanup");
  }
}
