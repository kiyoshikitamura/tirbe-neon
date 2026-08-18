import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const username = `SK${Date.now().toString(36).slice(-6)}`.slice(0, 8);
const { data: auth, error: authError } = await client.auth.signInAnonymously();
if (authError || !auth.user || !auth.session) throw authError || new Error("Anonymous sign-in failed.");
const userId = auth.user.id;

const { error: initializeError } = await client.rpc("initialize_current_player", { p_username: username });
if (initializeError) throw initializeError;
const { data: owned, error: ownedError } = await client.from("user_characters")
  .select("id,character_id").eq("user_id", userId).limit(1).single();
if (ownedError || !owned) throw ownedError || new Error("Starter character was not created.");

const { error: gachaError } = await client.rpc("execute_asset_gacha", {
  p_user_id: userId,
  p_gacha_id: "SKILL_NORMAL",
  p_pull_count: 10,
  p_currency_type: "free",
  p_request_id: crypto.randomUUID(),
});
if (gachaError) throw gachaError;
const { data: skill, error: skillError } = await client.from("user_skills")
  .select("id,skill_card_id").eq("user_id", userId).order("created_at").limit(1).single();
if (skillError || !skill) throw skillError || new Error("Free skill gacha did not grant a skill.");
const { error: directUpdateError } = await client.from("user_skills").update({
  equipped_character_id: owned.id,
  slot_index: 1,
}).eq("id", skill.id).eq("user_id", userId);
if (!directUpdateError) throw new Error("Direct user_skills loadout update was unexpectedly accepted.");
const { error: equipError } = await client.rpc("set_character_skill", {
  p_character_id: owned.id,
  p_skill_id: skill.id,
  p_slot_index: 1,
});
if (equipError) throw equipError;

const { error: deckError } = await client.rpc("save_pvp_defense_deck", {
  p_character_ids: [owned.id],
  p_tactic: "SKILL_PRIORITY",
});
if (deckError) throw deckError;
const questId = "q_shibuya_2";
const { data: started, error: startError } = await client.rpc("start_patrol", {
  p_course_id: questId,
  p_character_id: owned.id,
});
if (startError || !started?.patrol_id || started.has_battle !== true) {
  throw startError || new Error(`Patrol was not assigned a battle: ${JSON.stringify(started)}`);
}
const { error: instantError } = await client.rpc("complete_patrol_instantly", {
  p_user_id: userId,
  p_patrol_id: started.patrol_id,
  p_use_currency: "CASH",
});
if (instantError) throw instantError;
const { data: replay, error: replayError } = await client.rpc("create_patrol_battle_replay", {
  p_patrol_id: started.patrol_id,
  p_tactic_id: "SKILL_PRIORITY",
});
if (replayError || !replay?.replay_session_id) throw replayError || new Error("Patrol replay was not created.");

const { data: session, error: sessionError } = await client.from("battle_replay_sessions")
  .select("player_snapshot").eq("id", replay.replay_session_id).single();
if (sessionError || !session) throw sessionError || new Error("Replay snapshot was not readable.");
const snapshotSkill = session.player_snapshot?.flatMap((unit) => unit.skills || [])
  .find((entry) => entry.id === skill.skill_card_id);
if (!snapshotSkill) throw new Error(`Equipped skill ${skill.skill_card_id} was excluded from the server snapshot.`);

const { data: result, error: resolveError } = await client.functions.invoke("resolve-battle", {
  body: { replaySessionId: replay.replay_session_id },
});
if (resolveError || !Array.isArray(result?.events)) throw resolveError || new Error("Battle result was invalid.");
const skillAction = result.events.find((entry) => entry.type === "ACTION" && entry.payload?.skillId === skill.skill_card_id);
if (!skillAction) throw new Error(`Equipped skill ${skill.skill_card_id} did not produce an ACTION event.`);

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  userId,
  patrolId: started.patrol_id,
  replaySessionId: replay.replay_session_id,
  skillId: skill.skill_card_id,
  snapshotKind: snapshotSkill.kind,
  snapshotTarget: snapshotSkill.target,
  snapshotCooldown: snapshotSkill.cooldown,
  actionRound: skillAction.round,
  winner: result.winner,
}, null, 2));
