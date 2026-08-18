import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF
  || process.env.SUPABASE_PREVIEW_PROJECT_REF
  || process.env.SUPABASE_DEVELOPMENT_PROJECT_REF;
if (!url || !anonKey || !expectedRef || !url.includes(expectedRef)) {
  throw new Error("Supabase target or credentials are missing/mismatched");
}
if (!serviceKey && process.env.SUPABASE_ACCESS_TOKEN) {
  const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${expectedRef}/api-keys`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
  });
  if (!keyResponse.ok) throw new Error(`Could not resolve Development service key (${keyResponse.status})`);
  const keys = await keyResponse.json();
  serviceKey = keys.find((entry) => entry.name === "service_role")?.api_key;
}
if (!serviceKey) throw new Error("Service role key is unavailable for disposable QA fixture cleanup");

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
for (const [name, args] of [
  ["get_active_ranking_seasons", {}],
  ["get_public_power_rankings", { p_daily: false, p_limit: 10, p_offset: 0 }],
  ["get_current_main_formation", {}],
]) {
  const probe = await anon.rpc(name, args);
  if (!probe.error) throw new Error(`anon unexpectedly executed ${name}`);
}

const player = createClient(url, anonKey, { auth: { persistSession: false } });
const other = createClient(url, anonKey, { auth: { persistSession: false } });
const playerSignIn = await player.auth.signInAnonymously();
const otherSignIn = await other.auth.signInAnonymously();
if (playerSignIn.error || !playerSignIn.data.user) throw playerSignIn.error || new Error("player sign-in failed");
if (otherSignIn.error || !otherSignIn.data.user) throw otherSignIn.error || new Error("other sign-in failed");
const playerId = playerSignIn.data.user.id;
const otherId = otherSignIn.data.user.id;

try {
  const masterResult = await admin.from("character_release_master").select("character_id").eq("is_enabled", true).limit(2);
  if (masterResult.error || !masterResult.data?.length) throw masterResult.error || new Error("released character master is empty");
  const firstMasterId = masterResult.data[0].character_id;
  const secondMasterId = masterResult.data[1]?.character_id || firstMasterId;

  const profiles = await admin.from("users").insert([
    { id: playerId, username: `rp${randomUUID().replaceAll("-", "").slice(0, 6)}`, level: 5 },
    { id: otherId, username: `ro${randomUUID().replaceAll("-", "").slice(0, 6)}`, level: 5 },
  ]);
  if (profiles.error) throw profiles.error;
  const owned = await admin.from("user_characters").insert([
    { user_id: playerId, character_id: firstMasterId, level: 1, awakening_level: 0 },
    { user_id: otherId, character_id: secondMasterId, level: 1, awakening_level: 0 },
  ]).select("id,user_id,character_id");
  if (owned.error || owned.data.length !== 2) throw owned.error || new Error("owned character fixture failed");
  const playerCharacter = owned.data.find((row) => row.user_id === playerId);
  const otherCharacter = owned.data.find((row) => row.user_id === otherId);

  const empty = await player.rpc("save_main_formation", { p_character_ids: [] });
  if (empty.error || Number(empty.data?.total_power) !== 0) throw empty.error || new Error("empty formation did not project zero");
  const saved = await player.rpc("save_main_formation", { p_character_ids: [playerCharacter.id] });
  if (saved.error || Number(saved.data?.total_power) <= 0) throw saved.error || new Error("owned formation did not produce Power");
  const originalPower = Number(saved.data.total_power);

  const duplicate = await player.rpc("save_main_formation", { p_character_ids: [playerCharacter.id, playerCharacter.id] });
  if (!duplicate.error) throw new Error("duplicate formation unexpectedly succeeded");
  const crossUser = await player.rpc("save_main_formation", { p_character_ids: [otherCharacter.id] });
  if (!crossUser.error) throw new Error("cross-user formation unexpectedly succeeded");
  const directWrite = await player.from("user_power_rankings").update({ total_power: 999999 }).eq("user_id", playerId);
  if (!directWrite.error) throw new Error("client Power mutation unexpectedly succeeded");

  const levelUpdate = await admin.from("user_characters").update({ level: 2 }).eq("id", playerCharacter.id);
  if (levelUpdate.error) throw levelUpdate.error;
  const refreshed = await player.rpc("get_my_power_snapshot");
  if (refreshed.error || Number(refreshed.data?.total_power) <= originalPower) throw refreshed.error || new Error("level mutation did not refresh Power projection");

  const seasons = await player.rpc("get_active_ranking_seasons");
  if (seasons.error || !Array.isArray(seasons.data) || seasons.data.length !== 5) throw seasons.error || new Error("five active seasons were not returned");
  const rankings = await player.rpc("get_public_power_rankings", { p_daily: false, p_limit: 100, p_offset: 0 });
  if (rankings.error || !rankings.data.some((row) => row.user_id === playerId)) throw rankings.error || new Error("player missing from public Power ranking");
  const detail = await other.rpc("get_public_player_detail", { p_user_id: playerId });
  if (detail.error || detail.data?.user_id !== playerId) throw detail.error || new Error("public player detail failed");
  const publicCharacter = detail.data.main_formation?.[0] || {};
  for (const forbidden of ["user_character_id", "equipment", "skills", "inventory"]) {
    if (forbidden in publicCharacter || forbidden in detail.data) throw new Error(`private field leaked: ${forbidden}`);
  }

  console.log(JSON.stringify({
    target: expectedRef,
    anon_execute: "DENIED",
    empty_formation_power: 0,
    owned_formation_power: originalPower,
    refreshed_power: Number(refreshed.data.total_power),
    duplicate_formation: "DENIED",
    cross_user_formation: "DENIED",
    direct_power_mutation: "DENIED",
    active_seasons: seasons.data.length,
    public_player_private_leakage: "DENIED",
  }, null, 2));
} finally {
  await admin.auth.admin.deleteUser(playerId);
  await admin.auth.admin.deleteUser(otherId);
}
