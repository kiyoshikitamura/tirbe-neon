import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: authError } = await client.auth.signInAnonymously();
if (authError) throw authError;
const { data, error } = await client.from("patrol_npcs").select("id,quest_id,npc_name,npc_level,enemy_data");
if (error) throw error;
if (!data?.length) throw new Error("Authenticated patrol NPC master read returned no rows.");
if (data.some((npc) => !npc.id || !npc.quest_id || !npc.npc_name)) throw new Error("Patrol NPC master has incomplete identity fields.");
console.log(JSON.stringify({ projectRef: actualProjectRef, patrolNpcCount: data.length, questIds: [...new Set(data.map((npc) => npc.quest_id))] }, null, 2));

