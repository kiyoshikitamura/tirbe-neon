import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const projectRef = new URL(url).hostname.split(".")[0];
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!expectedProjectRef || projectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef || "<unset>"}, actual=${projectRef}`);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const probes = [
  ["get_current_onboarding_state", undefined],
  ["initialize_current_player", { p_username: "schema-probe" }],
  ["complete_tutorial_authentication", { p_auth_method: "EMAIL" }],
];

let missing = 0;
for (const [name, params] of probes) {
  const { error } = await supabase.rpc(name, params);
  if (!error) {
    console.log(`${name}: reachable`);
    continue;
  }
  if (!error.code) {
    throw new Error(`${name}: inconclusive response (${error.message || "unknown error"})`);
  }
  const schemaMissing = error.code === "PGRST202" || /schema cache|function .* does not exist/i.test(error.message);
  if (schemaMissing) missing += 1;
  console.log(`${name}: ${schemaMissing ? "MISSING" : "present (authentication rejected as expected)"} [${error.code || "unknown"}]`);
}

if (missing > 0) process.exitCode = 2;
