import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF || process.env.SUPABASE_PREVIEW_PROJECT_REF || process.env.SUPABASE_DEVELOPMENT_PROJECT_REF;
if (!url || !anonKey || !serviceKey || !expectedRef || !url.includes(expectedRef)) {
  throw new Error("Supabase target or credentials are missing/mismatched");
}

const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
const anonProbe = await publicClient.rpc("get_current_skill_display", { p_skill_ids: [] });
if (!anonProbe.error) throw new Error("anon unexpectedly executed get_current_skill_display");

const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: signIn, error: signInError } = await authClient.auth.signInAnonymously();
if (signInError || !signIn.user) throw signInError || new Error("anonymous QA sign-in failed");

const userId = signIn.user.id;
try {
  const skillResult = await authClient.rpc("get_current_skill_display", { p_skill_ids: [] });
  if (skillResult.error || !Array.isArray(skillResult.data)) throw skillResult.error || new Error("skill display result is not an array");

  const ownPvp = await authClient.rpc("get_pvp_opponents", { p_user_id: userId, p_my_points: 1000 });
  if (ownPvp.error || !Array.isArray(ownPvp.data)) throw ownPvp.error || new Error("PvP candidates result is not an array");

  const crossUser = await authClient.rpc("get_pvp_opponents", { p_user_id: randomUUID(), p_my_points: 1000 });
  if (!crossUser.error) throw new Error("cross-user PvP candidate lookup unexpectedly succeeded");

  console.log(JSON.stringify({
    target: expectedRef,
    anon_execute: "DENIED",
    authenticated_skill_display: "PASS",
    authenticated_pvp_candidates: "PASS",
    cross_user_lookup: "DENIED",
    candidate_count: ownPvp.data.length,
  }, null, 2));
} finally {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  await admin.auth.admin.deleteUser(userId);
}
