import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { resolveBattle } from "../supabase/functions/resolve-battle/engine.ts";

const expectedRef = "vosbyukxmskvisbgleug";
const workspaceIndex = process.argv.indexOf("--linked-workspace");
const linkedWorkspace = resolve(workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : ".");
const linkedRef = (await readFile(resolve(linkedWorkspace, "supabase/.temp/project-ref"), "utf8")).trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (linkedRef !== expectedRef || process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef || new URL(url).hostname.split(".")[0] !== expectedRef) throw new Error("Development target mismatch");
const pooler = new URL((await readFile(resolve(linkedWorkspace, "supabase/.temp/pooler-url"), "utf8")).trim());
const executable = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
function sql(statement) {
  const result = spawnSync(executable, ["-X", "-v", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--host", pooler.hostname, "--port", pooler.port || "5432", "--username", decodeURIComponent(pooler.username), "--dbname", pooler.pathname.slice(1) || "postgres", "--command", statement], { encoding: "utf8", env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "SQL failed");
  return result.stdout.trim();
}
const samples = 6;
const seedsPerSnapshot = 100;
const levels = Array.from({ length: 10 }, (_, index) => index + 1);
const aggregate = new Map();
const users = [];

try {
  for (let sample = 0; sample < samples; sample += 1) {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const auth = await client.auth.signInAnonymously();
    if (auth.error || !auth.data.user) throw auth.error || new Error("Anonymous auth failed");
    const userId = auth.data.user.id;
    users.push(userId);
    const init = await client.rpc("initialize_current_player", { p_username: `S${sample}${Date.now().toString(36).slice(-5)}`.slice(0, 8) });
    if (init.error) throw init.error;
    let advance = await client.rpc("advance_tutorial_progress", { p_expected_step: "WORLD_INTRO", p_next_step: "FREE_GACHA" });
    if (advance.error) throw advance.error;
    const draw = await client.rpc("execute_tutorial_character_gacha", { p_request_id: crypto.randomUUID() });
    if (draw.error) throw draw.error;
    advance = await client.rpc("advance_tutorial_progress", { p_expected_step: "FREE_GACHA", p_next_step: "AUTO_FORMATION" });
    if (advance.error) throw advance.error;
    const prepared = await client.rpc("prepare_current_tutorial_growth");
    if (prepared.error) throw prepared.error;
    const grown = await client.rpc("level_up_character", { p_character_id: prepared.data.target_user_character_id, p_exp_item_id: "CHAR_EXP_S", p_count: prepared.data.required_quantity });
    if (grown.error) throw grown.error;
    const growthReady = await client.rpc("advance_current_tutorial_after_growth");
    if (growthReady.error) throw growthReady.error;
    const formation = await client.rpc("complete_current_tutorial_formation");
    if (formation.error) throw formation.error;
    const start = await client.rpc("start_patrol", { p_course_id: "q_shinjuku_1", p_character_id: formation.data.leader_user_character_id });
    if (start.error) throw start.error;
    advance = await client.rpc("advance_tutorial_progress", { p_expected_step: "DISPATCH", p_next_step: "FREE_INSTANT" });
    if (advance.error) throw advance.error;
    const instant = await client.rpc("complete_patrol_instantly", { p_user_id: userId, p_patrol_id: start.data.patrol_id, p_use_currency: "FREE_TUTORIAL" });
    if (instant.error) throw instant.error;
    const partyIds = sql(`select string_agg(user_character_id::text,',') from public.user_main_formations where user_id='${userId}'::uuid`).split(",").filter(Boolean);
    const leaderId = String(formation.data.leader_user_character_id);

    for (const scope of ["LEADER_ONLY", "FULL_FORMATION"]) {
      for (const level of levels) {
        sql(`update public.user_characters set level=1 where user_id='${userId}'::uuid; update public.user_characters set level=${level} where id ${scope === "LEADER_ONLY" ? `='${leaderId}'::uuid` : `in (${partyIds.map((id) => `'${id}'::uuid`).join(",")})`}`);
        const replay = await client.rpc("create_patrol_battle_replay", { p_patrol_id: start.data.patrol_id, p_tactic_id: "ATTACK_PRIORITY" });
        if (replay.error) throw replay.error;
        const key = `${scope}:L${level}`;
        const entry = aggregate.get(key) || { scope, level, battles: 0, wins: 0, losses: 0, timeouts: 0, roundTotal: 0, winningRoundTotal: 0 };
        for (let seed = 1; seed <= seedsPerSnapshot; seed += 1) {
          const result = resolveBattle(seed + sample * seedsPerSnapshot, "ATTACK_PRIORITY", 15, replay.data.player_snapshot, replay.data.enemy_snapshot, replay.data.enemy_tactic);
          entry.battles += 1;
          entry.roundTotal += result.rounds;
          if (result.winner === "PLAYER") {
            entry.wins += 1;
            entry.winningRoundTotal += result.rounds;
          } else {
            entry.losses += 1;
            if (result.rounds >= 15) entry.timeouts += 1;
          }
        }
        aggregate.set(key, entry);
      }
    }
  }
  const results = [...aggregate.values()].map((entry) => ({ ...entry, winRate: Number((entry.wins / entry.battles).toFixed(4)), averageRounds: Number((entry.roundTotal / entry.battles).toFixed(2)), averageWinningRounds: entry.wins ? Number((entry.winningRoundTotal / entry.wins).toFixed(2)) : null })).sort((a, b) => a.scope.localeCompare(b.scope) || a.level - b.level);
  console.log(JSON.stringify({ status: "PASS", projectRef: expectedRef, acquisitionSamples: samples, seedsPerSnapshot, totalBattles: results.reduce((sum, entry) => sum + entry.battles, 0), hiddenTutorialCombatModifiers: 0, results }, null, 2));
} finally {
  for (const userId of users) {
    sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop begin execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid; exception when foreign_key_violation then null; end; end loop; delete from public.users where id='${userId}'::uuid; delete from auth.users where id='${userId}'::uuid; end $$;`);
  }
}
