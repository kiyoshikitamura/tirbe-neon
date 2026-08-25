import { createClient } from "@supabase/supabase-js";
import { resolveBattle } from "../supabase/functions/resolve-battle/engine.ts";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expectedRef = "vosbyukxmskvisbgleug";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey || new URL(url).hostname.split(".")[0] !== expectedRef) throw new Error("Development target mismatch");
const workspaceIndex = process.argv.indexOf("--linked-workspace");
const linkedWorkspace = resolve(workspaceIndex >= 0 ? process.argv[workspaceIndex + 1] : ".");
const linkedRef = (await readFile(resolve(linkedWorkspace, "supabase/.temp/project-ref"), "utf8")).trim();
if (linkedRef !== expectedRef || process.env.SUPABASE_EXPECTED_PROJECT_REF !== expectedRef) throw new Error("Development link mismatch");
const pooler = new URL((await readFile(resolve(linkedWorkspace, "supabase/.temp/pooler-url"), "utf8")).trim());
const executable = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
function sql(statement) {
  const result = spawnSync(executable, ["-X", "-v", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--host", pooler.hostname, "--port", pooler.port || "5432", "--username", decodeURIComponent(pooler.username), "--dbname", pooler.pathname.slice(1) || "postgres", "--command", statement], { encoding: "utf8", env: { ...process.env, PGPASSWORD: process.env.SUPABASE_DB_PASSWORD } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "SQL failed");
}
const scales = [10000, 7500, 5000, 3500];
const users = [];
const aggregate = new Map(scales.map((scaleBp) => [scaleBp, { scaleBp, battles: 0, wins: 0, rounds: 0, min: 99, max: 0, learned: 0 }]));

try {
  for (let sample = 0; sample < 3; sample += 1) {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await client.auth.signInAnonymously();
    if (auth.error || !auth.data.user) throw auth.error || new Error("Anonymous auth failed");
    users.push(auth.data.user.id);
    const call = async (name, args = {}) => {
      const result = await client.rpc(name, args);
      if (result.error) throw result.error;
      return result.data;
    };
    await call("initialize_current_player", { p_username: `R10${sample}${Date.now().toString(36).slice(-4)}`.slice(0, 8) });
    await call("advance_tutorial_progress", { p_expected_step: "WORLD_INTRO", p_next_step: "FREE_GACHA" });
    await call("execute_tutorial_character_gacha", { p_request_id: crypto.randomUUID() });
    await call("advance_tutorial_progress", { p_expected_step: "FREE_GACHA", p_next_step: "AUTO_FORMATION" });
    const prepared = await call("prepare_current_tutorial_growth");
    await call("level_up_character", { p_character_id: prepared.target_user_character_id, p_exp_item_id: "CHAR_EXP_S", p_count: prepared.required_quantity });
    await call("advance_current_tutorial_after_growth");
    const formation = await call("complete_current_tutorial_formation");
    const patrol = await call("start_patrol", { p_course_id: "q_shinjuku_1", p_character_id: formation.leader_user_character_id });
    await call("advance_tutorial_progress", { p_expected_step: "DISPATCH", p_next_step: "FREE_INSTANT" });
    await call("complete_patrol_instantly", { p_user_id: auth.data.user.id, p_patrol_id: patrol.patrol_id, p_use_currency: "FREE_TUTORIAL" });
    const replay = await call("create_patrol_battle_replay", { p_patrol_id: patrol.patrol_id, p_tactic_id: "ATTACK_PRIORITY" });
    const playerIds = new Set(replay.player_snapshot.map((unit) => unit.id));
    for (const scaleBp of scales) {
      const enemy = replay.enemy_snapshot.map((unit) => ({ ...unit, stats: { ...unit.stats, hp: Math.max(1, Math.round(unit.stats.hp * scaleBp / 10000)), def: Math.max(0, Math.round(unit.stats.def * scaleBp / 10000)) } }));
      const entry = aggregate.get(scaleBp);
      for (let seed = 1; seed <= 200; seed += 1) {
        const result = resolveBattle(seed + sample * 1000, "ATTACK_PRIORITY", 15, replay.player_snapshot, enemy, replay.enemy_tactic);
        entry.battles += 1; entry.wins += result.winner === "PLAYER" ? 1 : 0; entry.rounds += result.rounds; entry.min = Math.min(entry.min, result.rounds); entry.max = Math.max(entry.max, result.rounds);
        const actions = result.events.filter((event) => event.type === "ACTION" && playerIds.has(event.payload.actorId));
        if (actions.some((event) => event.payload.skillId === "BASIC_ATTACK") && actions.some((event) => event.payload.skillId !== "BASIC_ATTACK")) entry.learned += 1;
      }
    }
  }
  console.log(JSON.stringify([...aggregate.values()].map((entry) => ({ ...entry, winRate: entry.wins / entry.battles, averageRounds: entry.rounds / entry.battles, learnedBothRate: entry.learned / entry.battles })), null, 2));
} finally {
  for (const id of users) sql(`do $$ declare r record; begin for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop begin execute format('delete from public.%I where user_id=$1',r.table_name) using '${id}'::uuid; exception when foreign_key_violation then null; end; end loop; delete from public.users where id='${id}'::uuid; delete from auth.users where id='${id}'::uuid; end $$;`);
}
