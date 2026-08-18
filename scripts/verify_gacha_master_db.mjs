import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF;
if (!url || !anonKey || !expectedProjectRef) throw new Error("Missing Supabase Development configuration.");
const actualProjectRef = new URL(url).hostname.split(".")[0];
if (actualProjectRef !== expectedProjectRef) throw new Error(`Refusing Supabase target: ${actualProjectRef}`);

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
const [{ data: masters, error: mastersError }, { data: items, error: itemsError }] = await Promise.all([
  supabase.from("gacha_masters").select("id,name,gacha_type,cost_cash,cost_diamond").order("id"),
  supabase.from("gacha_items_master").select("gacha_id,item_id,rarity,weight"),
]);
if (mastersError) throw mastersError;
if (itemsError) throw itemsError;

const pools = {};
for (const item of items) pools[item.gacha_id] = (pools[item.gacha_id] || 0) + 1;
console.log(JSON.stringify({ projectRef: actualProjectRef, masters, pools }, null, 2));
