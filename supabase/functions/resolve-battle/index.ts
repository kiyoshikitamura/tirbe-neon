import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveBattle, type Tactic } from "./engine.ts";

const allowedTactics = new Set<Tactic>(["ATTACK_PRIORITY", "HEAL_PRIORITY", "SKILL_PRIORITY", "BALANCED", "WEAKNESS_FOCUS"]);

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = request.headers.get("Authorization");
  if (!authorization) return new Response("Unauthorized", { status: 401 });
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { replaySessionId } = await request.json().catch(() => ({}));
  if (typeof replaySessionId !== "string") return Response.json({ error: "replaySessionId is required" }, { status: 400 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: session, error } = await admin.from("battle_replay_sessions").select("*").eq("id", replaySessionId).eq("requester_user_id", user.id).maybeSingle();
  if (error || !session) return Response.json({ error: "Replay session was not found" }, { status: 404 });
  if (session.status === "RESOLVED") {
    const storedEvents = Array.isArray(session.result?.events) ? session.result.events : [];
    if (storedEvents.length > 0) {
      const { count, error: countError } = await admin.from("battle_replay_events")
        .select("id", { count: "exact", head: true })
        .eq("battle_replay_session_id", session.id);
      if (countError) return Response.json({ error: countError.message }, { status: 500 });
      if (count === 0) {
        const events = storedEvents.map((item: { index: number; round: number; type: string; payload: Record<string, unknown> }) => ({
          battle_replay_session_id: session.id,
          event_index: item.index,
          round_number: Math.max(1, item.round),
          event_type: item.type,
          payload: item.payload,
        }));
        const { error: eventError } = await admin.from("battle_replay_events").insert(events);
        if (eventError) return Response.json({ error: eventError.message }, { status: 500 });
      }
    }
    return Response.json(session.result);
  }
  if (session.battle_mode !== "GVG" || !session.source_reference_id) {
    return Response.json({ error: "Only an official GvG replay can be resolved by this function" }, { status: 409 });
  }
  if (session.status !== "PENDING" || !allowedTactics.has(session.tactic_id)) return Response.json({ error: "Replay session is not resolvable" }, { status: 409 });
  const { data: attack, error: attackError } = await admin.from("gvg_attack_logs")
    .select("id").eq("id", session.source_reference_id).eq("attacker_user_id", user.id).eq("battle_result", "PENDING").maybeSingle();
  if (attackError || !attack) return Response.json({ error: "The official GvG attack is not resolvable" }, { status: 409 });
  const result = resolveBattle(Number(session.random_seed), session.tactic_id, session.battle_mode === "RAID" ? 30 : session.battle_mode === "PVP" || session.battle_mode === "GVG" ? 20 : 15, session.player_snapshot, session.enemy_snapshot);
  const { data: resolvedSession, error: updateError } = await admin.from("battle_replay_sessions")
    .update({ status: "RESOLVED", result, resolved_at: new Date().toISOString() })
    .eq("id", session.id).eq("status", "PENDING").select("id").maybeSingle();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  if (!resolvedSession) {
    const { data: latest } = await admin.from("battle_replay_sessions").select("result").eq("id", session.id).maybeSingle();
    return Response.json(latest?.result ?? { error: "Replay resolution is in progress" }, { status: latest?.result ? 200 : 409 });
  }
  const events = result.events.map((item) => ({ battle_replay_session_id: session.id, event_index: item.index, round_number: Math.max(1, item.round), event_type: item.type, payload: item.payload }));
  if (events.length) {
    const { error: eventError } = await admin.from("battle_replay_events").insert(events);
    if (eventError) return Response.json({ error: eventError.message }, { status: 500 });
  }
  return Response.json(result);
});
