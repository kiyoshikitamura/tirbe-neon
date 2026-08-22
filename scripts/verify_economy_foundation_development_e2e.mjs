import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";

const environment = "development";
loadEnvironmentFile(environment);
const target = await verifySupabaseTarget({ environment, mutation: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Development Supabase credentials are incomplete.");
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
function runSql(sql, label) {
  const result = spawnSync(executable, ["-X", "--set", "ON_ERROR_STOP=1", "--host", connection.host, "--port", connection.port, "--username", connection.user, "--dbname", connection.database, "--command", sql], { encoding: "utf8", env: { ...process.env, PGPASSWORD: connection.password } });
  if (result.status !== 0) throw new Error(result.stderr || `${label} failed.`);
  return result.stdout;
}
const player = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId = null;

try {
  const { data: signedIn, error: signInError } = await player.auth.signInAnonymously();
  if (signInError || !signedIn.user) throw signInError || new Error("Anonymous QA user creation failed.");
  userId = signedIn.user.id;
  const username = `EB${Date.now().toString(36).slice(-6)}`.slice(0, 8);
  const { error: initializeError } = await player.rpc("initialize_current_player", { p_username: username });
  if (initializeError) throw initializeError;

  const { data: firstClaim, error: firstClaimError } = await player.rpc("process_login_bonus");
  if (firstClaimError || !firstClaim?.claimed || firstClaim.current_step !== 1 || firstClaim.reward?.item_id !== "CASH" || firstClaim.reward?.quantity !== 5000) {
    throw firstClaimError || new Error(`Day 1 Login Bonus mismatch: ${JSON.stringify(firstClaim)}`);
  }
  const { data: duplicateClaim, error: duplicateClaimError } = await player.rpc("process_login_bonus");
  if (duplicateClaimError || duplicateClaim?.claimed || !duplicateClaim?.already_claimed) throw duplicateClaimError || new Error("Same-day Login Bonus duplicate was not rejected.");

  const previousDay = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  runSql(`update public.user_login_bonuses set current_day=29,total_logins=29,last_claimed_at='${previousDay}'::timestamptz where user_id='${userId}'::uuid;`, "Day 30 setup");
  const { data: day30Claim, error: day30ClaimError } = await player.rpc("process_login_bonus");
  if (day30ClaimError || day30Claim?.current_step !== 30 || day30Claim.reward?.item_id !== "AWAKENING_BOOK" || day30Claim.reward?.quantity !== 1) {
    throw day30ClaimError || new Error(`Day 30 Login Bonus mismatch: ${JSON.stringify(day30Claim)}`);
  }
  const { data: day30Present, error: day30PresentError } = await player.from("presents").select("id,item_id,quantity,status").eq("user_id", userId).eq("item_id", "AWAKENING_BOOK").single();
  if (day30PresentError || day30Present.quantity !== 1 || day30Present.status !== "UNCLAIMED") throw day30PresentError || new Error("Day 30 canonical Present mismatch.");
  const { error: claimPresentError } = await player.rpc("claim_present", { p_present_id: day30Present.id });
  if (claimPresentError) throw claimPresentError;
  const { data: bookBalance, error: bookBalanceError } = await player.from("user_items").select("quantity").eq("user_id", userId).eq("item_id", "AWAKENING_BOOK").single();
  if (bookBalanceError || bookBalance.quantity !== 1) throw bookBalanceError || new Error("Canonical Present did not reach inventory.");

  runSql(`update public.user_login_bonuses set current_day=30,total_logins=30,last_claimed_at='${previousDay}'::timestamptz where user_id='${userId}'::uuid;`, "Loop setup");
  const { data: loopClaim, error: loopClaimError } = await player.rpc("process_login_bonus");
  if (loopClaimError || loopClaim.current_step !== 1 || loopClaim.total_logins !== 31 || loopClaim.reward?.item_id !== "CASH") throw loopClaimError || new Error("30-to-1 Login Bonus loop mismatch.");

  const sql = `begin;
    select set_config('request.jwt.claim.sub','${userId}',true);
    update public.users set cash=100000 where id='${userId}'::uuid;
    create or replace function public.draw_gacha_rarity(p_gacha_id text) returns text language sql volatile security definer set search_path=public as $$ select rarity from public.gacha_items_master where gacha_id=p_gacha_id order by item_id limit 1 $$;
    create or replace function public.draw_gacha_item(p_gacha_id text,p_rarity text) returns text language sql volatile security definer set search_path=public as $$ select item_id from public.gacha_items_master where gacha_id=p_gacha_id and rarity=p_rarity order by item_id limit 1 $$;
    do $$ declare
      v_character_id text; v_owned_id uuid; v_request_one uuid:=gen_random_uuid(); v_request_two uuid:=gen_random_uuid();
      v_result jsonb; v_book_before integer; v_book_after integer; v_cash_before bigint;
    begin
      select item_id into v_character_id from public.gacha_items_master where gacha_id='CHAR_NORMAL' order by item_id limit 1;
      insert into public.user_characters(user_id,character_id,level,awakening_level,awakening_progress)
      values('${userId}'::uuid,v_character_id,1,0,0)
      on conflict(user_id,character_id) do update set awakening_level=0,awakening_progress=0
      returning id into v_owned_id;

      v_result:=public.apply_character_awakening_equivalent('${userId}'::uuid,v_owned_id,1);
      if (v_result->>'awakening_level')::int<>1 or (v_result->>'awakening_progress')::int<>0 then raise exception '+0 duplicate contract mismatch'; end if;
      v_result:=public.apply_character_awakening_equivalent('${userId}'::uuid,v_owned_id,1);
      if (v_result->>'awakening_level')::int<>2 or (v_result->>'awakening_progress')::int<>0 then raise exception '+1 duplicate contract mismatch'; end if;
      v_result:=public.apply_character_awakening_equivalent('${userId}'::uuid,v_owned_id,1);
      if (v_result->>'awakening_level')::int<>2 or (v_result->>'awakening_progress')::int<>1 then raise exception '+2 progress contract mismatch'; end if;

      insert into public.user_items(user_id,item_id,quantity) values('${userId}'::uuid,'AWAKENING_BOOK',2)
      on conflict(user_id,item_id) do update set quantity=greatest(public.user_items.quantity,2),updated_at=now();
      select cash into v_cash_before from public.users where id='${userId}'::uuid;
      v_result:=public.awaken_character(v_owned_id);
      if (v_result->>'awakening_level')::int<>3 or (v_result->>'awakening_progress')::int<>0 then raise exception 'Mixed duplicate/book threshold mismatch'; end if;
      if (select cash from public.users where id='${userId}'::uuid)<>v_cash_before then raise exception 'Awakening Book charged CASH'; end if;

      update public.user_characters set awakening_level=3,awakening_progress=2 where id=v_owned_id;
      v_result:=public.apply_character_awakening_equivalent('${userId}'::uuid,v_owned_id,1);
      if (v_result->>'awakening_level')::int<>4 or (v_result->>'awakening_progress')::int<>0 then raise exception '+3 progress contract mismatch'; end if;
      update public.user_characters set awakening_level=4,awakening_progress=3 where id=v_owned_id;
      v_result:=public.execute_character_gacha('${userId}'::uuid,'CHAR_NORMAL',1,'cash',v_request_one);
      if (select awakening_level from public.user_characters where id=v_owned_id)<>5 or (select awakening_progress from public.user_characters where id=v_owned_id)<>0 then raise exception '+4 duplicate did not reach +5'; end if;

      select coalesce(quantity,0) into v_book_before from public.user_items where user_id='${userId}'::uuid and item_id='AWAKENING_BOOK';
      v_result:=public.execute_character_gacha('${userId}'::uuid,'CHAR_NORMAL',1,'cash',v_request_two);
      select quantity into v_book_after from public.user_items where user_id='${userId}'::uuid and item_id='AWAKENING_BOOK';
      if v_book_after<>v_book_before+1 then raise exception 'Max duplicate did not grant one Awakening Book'; end if;
      v_result:=public.execute_character_gacha('${userId}'::uuid,'CHAR_NORMAL',1,'cash',v_request_two);
      if (select quantity from public.user_items where user_id='${userId}'::uuid and item_id='AWAKENING_BOOK')<>v_book_after then raise exception 'Duplicate retry was not idempotent'; end if;
      if exists(select 1 from public.user_items where user_id='${userId}'::uuid and item_id='LAW_OF_STRIFE' and quantity>0) then raise exception 'Legacy duplicate reward was granted'; end if;
    end $$;
  rollback;`;
  runSql(sql, "Character duplicate rollback fixture");

  console.log(JSON.stringify({ environment: target.environment, projectRef: target.projectRef, loginDay1: "PASS", sameDayDuplicate: "PASS", loginDay30AwakeningBook: "PASS", presentToInventory: "PASS", loginLoop30To1: "PASS", awakeningCurve: "PASS", duplicateBookMix: "PASS", cashAwakeningDependency: 0, characterDuplicateToPlus5: "PASS", maxDuplicateCanonicalBook: "PASS", duplicateIdempotency: "PASS", fixtureRollback: "PASS" }, null, 2));
} finally {
  if (userId) {
    try {
      runSql(`do $$ declare r record; begin
        for r in select table_name from information_schema.columns where table_schema='public' and column_name='user_id' loop
          execute format('delete from public.%I where user_id=$1',r.table_name) using '${userId}'::uuid;
        end loop;
        delete from public.users where id='${userId}'::uuid;
        delete from auth.users where id='${userId}'::uuid;
      end $$;`, "QA cleanup");
    } catch (error) {
      console.warn(`QA cleanup failed for ${userId}: ${error.message}`);
    }
  }
}
