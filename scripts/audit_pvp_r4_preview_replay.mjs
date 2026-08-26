import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !serviceRoleKey || !expectedRef) throw new Error("Preview Supabase environment is required.");
const actualRef = new URL(url).hostname.split(".")[0];
if (actualRef !== expectedRef || actualRef !== "sufvuqdnqohpfzkwxohq") throw new Error(`Refusing Supabase target ${actualRef}.`);

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: rows, error } = await admin.from("battle_replay_sessions")
  .select("id,requester_user_id,created_at,player_snapshot,enemy_snapshot,result,finalization_result")
  .eq("battle_mode", "PVP")
  .order("created_at", { ascending: false })
  .limit(1);
if (error) throw error;
if (!rows?.[0]) throw new Error("No Preview PvP replay was found.");

const replay = rows[0];
const { data: formationRows, error: formationError } = await admin.from("user_main_formations")
  .select("slot,user_character_id")
  .eq("user_id", replay.requester_user_id)
  .order("slot");
if (formationError) throw formationError;
const ownedIds = (formationRows || []).map((entry) => entry.user_character_id);
const { data: ownedRows, error: ownedError } = ownedIds.length > 0
  ? await admin.from("user_characters").select("id,character_id").in("id", ownedIds)
  : { data: [], error: null };
if (ownedError) throw ownedError;
const characterIdByOwnedId = new Map((ownedRows || []).map((entry) => [entry.id, entry.character_id]));
const currentMainFormationCharacterIds = (formationRows || []).map((entry) => characterIdByOwnedId.get(entry.user_character_id)).filter(Boolean);
const events = Array.isArray(replay.result?.events) ? replay.result.events
  : Array.isArray(replay.finalization_result?.events) ? replay.finalization_result.events
  : [];
const players = Array.isArray(replay.player_snapshot) ? replay.player_snapshot : replay.player_snapshot?.units || [];
const enemies = Array.isArray(replay.enemy_snapshot) ? replay.enemy_snapshot : replay.enemy_snapshot?.units || [];
const playerIds = new Set(players.map((entry) => String(entry.id)));
const enemyIds = new Set(enemies.map((entry) => String(entry.id)));
const actionForSide = (ids) => events.find((entry) => entry.type === "ACTION" && ids.has(String(entry.payload?.actorId)) && String(entry.payload?.skillId || "BASIC_ATTACK") !== "BASIC_ATTACK");
const damageForSide = (ids) => events.find((entry) => entry.type === "DAMAGE" && ids.has(String(entry.payload?.targetId)) && Number.isFinite(Number(entry.payload?.remainingHp)));
const defeatForSide = (ids) => events.find((entry) => entry.type === "DEFEAT" && ids.has(String(entry.payload?.targetId)));
const skillMaster = JSON.parse(fs.readFileSync(new URL("../src/domain/gameplay/canonical/data/skills_20260821.json", import.meta.url), "utf8")).skills;
const canonicalName = (action) => skillMaster.find((skill) => skill.skill_id === action?.payload?.skillId)?.name || null;
const playerSkillEvent = actionForSide(playerIds);
const enemySkillEvent = actionForSide(enemyIds);
const playerDamageEvent = damageForSide(playerIds);
const enemyDamageEvent = damageForSide(enemyIds);
const damageProjection = (event, units) => {
  if (!event) return null;
  const unit = units.find((entry) => String(entry.id) === String(event.payload?.targetId));
  const maxHp = Number(unit?.stats?.hp ?? unit?.maxHp ?? unit?.hp ?? 0);
  const remainingHp = Number(event.payload?.remainingHp ?? 0);
  return {
    ...event.payload,
    maxHp,
    expectedRenderedPercent: maxHp > 0 ? Number((remainingHp / maxHp * 100).toFixed(2)) : null,
  };
};

console.log(JSON.stringify({
  previewRef: actualRef,
  replayId: replay.id,
  createdAt: replay.created_at,
  requesterUserId: replay.requester_user_id,
  currentMainFormationCharacterIds,
  playerCharacterIds: players.map((entry) => entry.characterId || entry.character_id),
  enemyCharacterIds: enemies.map((entry) => entry.characterId || entry.character_id),
  eventCount: events.length,
  playerDamage: damageProjection(playerDamageEvent, players),
  enemyDamage: damageProjection(enemyDamageEvent, enemies),
  playerSkill: playerSkillEvent ? { ...playerSkillEvent.payload, canonicalName: canonicalName(playerSkillEvent) } : null,
  enemySkill: enemySkillEvent ? { ...enemySkillEvent.payload, canonicalName: canonicalName(enemySkillEvent) } : null,
  playerDefeat: defeatForSide(playerIds)?.payload || null,
  enemyDefeat: defeatForSide(enemyIds)?.payload || null,
}, null, 2));
