import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");

const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing Supabase target: expected=${expectedProjectRef}, actual=${actualProjectRef}`);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const username = `CG${Date.now().toString(36).slice(-6)}`.slice(0, 8);

const { data: auth, error: authError } = await supabase.auth.signInAnonymously();
if (authError || !auth.user) throw authError || new Error("Anonymous QA session was not created.");
const userId = auth.user.id;

const { error: initializeError } = await supabase.rpc("initialize_current_player", { p_username: username });
if (initializeError) throw initializeError;

const { data: beforeCurrency, error: beforeCurrencyError } = await supabase.from("users")
  .select("cash,neon_diamonds").eq("id", userId).single();
if (beforeCurrencyError) throw beforeCurrencyError;

const { data: draw, error: drawError } = await supabase.rpc("execute_character_gacha", {
  p_user_id: userId,
  p_gacha_id: "CHAR_NORMAL",
  p_pull_count: 10,
  p_currency_type: "free",
  p_request_id: crypto.randomUUID(),
});
if (drawError || draw?.status !== "success" || draw.results?.length !== 10) {
  throw drawError || new Error(`Unexpected character draw: ${JSON.stringify(draw)}`);
}

const resultIds = [...new Set(draw.results.map(result => result.character_id))];
const [{ data: releaseRows, error: releaseError }, { data: ownedRows, error: ownedError }, { data: claim, error: claimError }] = await Promise.all([
  supabase.from("character_release_master").select("character_id,rarity").in("character_id", resultIds),
  supabase.from("user_characters").select("character_id,awakening_level").eq("user_id", userId).in("character_id", resultIds),
  supabase.from("user_daily_gacha_claims").select("gacha_type,last_claimed_date").eq("user_id", userId).eq("gacha_type", "CHARACTER").single(),
]);
if (releaseError) throw releaseError;
if (ownedError) throw ownedError;
if (claimError) throw claimError;
if (releaseRows.length !== resultIds.length || releaseRows.some(row => !["N", "R", "SR"].includes(row.rarity))) {
  throw new Error(`Normal draw contained an invalid release character: ${JSON.stringify(releaseRows)}`);
}
if (ownedRows.length !== resultIds.length) {
  throw new Error(`Not every result was reflected in ownership: results=${resultIds.length}, owned=${ownedRows.length}`);
}

const { data: afterCurrency, error: afterCurrencyError } = await supabase.from("users")
  .select("cash,neon_diamonds").eq("id", userId).single();
if (afterCurrencyError) throw afterCurrencyError;
if (afterCurrency.cash !== beforeCurrency.cash || afterCurrency.neon_diamonds !== beforeCurrency.neon_diamonds) {
  throw new Error(`Free draw changed currency: before=${JSON.stringify(beforeCurrency)}, after=${JSON.stringify(afterCurrency)}`);
}

const { error: duplicateError } = await supabase.rpc("execute_character_gacha", {
  p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
});
if (!duplicateError || !/already claimed/i.test(duplicateError.message)) {
  throw new Error(`Duplicate daily draw was not rejected: ${duplicateError?.message || "no error"}`);
}

const { error: specialFreeError } = await supabase.rpc("execute_character_gacha", {
  p_user_id: userId, p_gacha_id: "CHAR_SPECIAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
});
if (!specialFreeError || !/(special gacha is closed|normal ten-pull)/i.test(specialFreeError.message)) {
  throw new Error(`Special gacha accepted free payment: ${specialFreeError?.message || "no error"}`);
}

console.log(JSON.stringify({
  projectRef: actualProjectRef,
  qaUserId: userId,
  resultCount: draw.results.length,
  distinctCharacterCount: resultIds.length,
  resultRarities: releaseRows.reduce((counts, row) => ({ ...counts, [row.rarity]: (counts[row.rarity] || 0) + 1 }), {}),
  dailyClaim: claim,
  currencyUnchanged: true,
  ownershipReflected: true,
  duplicateDrawRejected: true,
  specialFreeRejected: true,
}, null, 2));

await supabase.auth.signOut();
