import fs from "node:fs";

const sourcePath = "supabase/migrations/20260822000174_economy_foundation_canonical.sql";
const outputPath = "supabase/migrations/20260822000175_character_awakening_copy_equivalent.sql";
const source = fs.readFileSync(sourcePath, "utf8");
const items = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/items_20260822.json", "utf8"));
const login = JSON.parse(fs.readFileSync("src/domain/gameplay/canonical/data/login_bonus_20260822.json", "utf8"));
const curve = [1, 1, 2, 3, 4];

if (curve.reduce((sum, value) => sum + value, 0) !== 11) throw new Error("Awakening cumulative copy-equivalent must be 11.");
const book = items.items.find((item) => item.id === "AWAKENING_BOOK");
if (book?.runtimeUsage?.copyEquivalentValue !== 1 || book.runtimeUsage?.duplicateOverflowQuantity !== 1 || book.runtimeUsage?.cashCost !== 0) {
  throw new Error("AWAKENING_BOOK Canonical runtime contract is incomplete.");
}
const ticketDays = new Map(login.rewards.filter((reward) => [5, 15, 20, 29].includes(reward.day)).map((reward) => [reward.day, reward.rewardItemId]));
const expectedTicketDays = new Map([[5, "SPECIAL_TICKET_CHARACTER"], [15, "SPECIAL_TICKET_SKILL"], [20, "SPECIAL_TICKET_EQUIPMENT"], [29, "SPECIAL_TICKET_CHARACTER"]]);
for (const [day, itemId] of expectedTicketDays) if (ticketDays.get(day) !== itemId) throw new Error(`Login day ${day} ticket mismatch.`);

function extractFunction(name, nextName) {
  const lower = source.toLowerCase();
  const start = lower.indexOf(`create or replace function public.${name}`);
  const end = nextName ? lower.indexOf(`create or replace function public.${nextName}`, start + 1) : source.indexOf("$$;", start) + 3;
  if (start < 0 || end <= start) throw new Error(`Unable to extract ${name}.`);
  return source.slice(start, end).trim();
}

const helperCallBlock = (userExpression, characterExpression, resultVariable, slotSuffix = "") => `
      ${resultVariable} := public.apply_character_awakening_equivalent(${userExpression}, ${characterExpression}, 1);
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity,
        'outcome', ${resultVariable}->>'outcome',
        'awakening_progress_added', 1,
        'awakening_level', (${resultVariable}->>'awakening_level')::integer,
        'awakening_progress', (${resultVariable}->>'awakening_progress')::integer,
        'awakening_required', (${resultVariable}->>'awakening_required')::integer${slotSuffix}));`;

let characterGacha = extractFunction("execute_character_gacha", "execute_tutorial_character_gacha");
characterGacha = characterGacha.replace("  v_is_special boolean;", "  v_is_special boolean;\n  v_progress jsonb;");
const characterOld = `    if found and coalesce(v_existing.awakening_level, 0) < 5 then
      update public.user_characters set awakening_level = coalesce(awakening_level, 0) + 1
      where id = v_existing.id;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'awakening'));`;
characterGacha = characterGacha.replace(characterOld, `    if found and coalesce(v_existing.awakening_level, 0) < 5 then${helperCallBlock("p_user_id", "v_existing.id", "v_progress")}`);
characterGacha = characterGacha.replace(
  "'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'converted'",
  "'type', 'CHARACTER', 'character_id', v_item_id, 'rarity', v_rarity, 'outcome', 'converted', 'converted_item_id', 'AWAKENING_BOOK', 'converted_quantity', 1",
);
characterGacha = characterGacha.replace(
  "values (p_user_id, v_item_id, 1, 0);",
  "values (p_user_id, v_item_id, 1, 0);",
);
if (!characterGacha.includes("apply_character_awakening_equivalent(p_user_id, v_existing.id, 1)")) throw new Error("Character gacha transformation failed.");

let tutorialGacha = extractFunction("execute_tutorial_character_gacha", null);
tutorialGacha = tutorialGacha.replace("  v_inserted integer;", "  v_inserted integer;\n  v_progress jsonb;");
const tutorialOld = `    if found and coalesce(v_existing.awakening_level,0)<5 then
      update public.user_characters set awakening_level=coalesce(awakening_level,0)+1 where id=v_existing.id;
      v_results:=v_results||jsonb_build_array(jsonb_build_object('type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','awakening','tutorial_slot',v_index));`;
const tutorialNew = `    if found and coalesce(v_existing.awakening_level,0)<5 then
      v_progress := public.apply_character_awakening_equivalent(v_user_id, v_existing.id, 1);
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,
        'outcome',v_progress->>'outcome','awakening_progress_added',1,
        'awakening_level',(v_progress->>'awakening_level')::integer,
        'awakening_progress',(v_progress->>'awakening_progress')::integer,
        'awakening_required',(v_progress->>'awakening_required')::integer,
        'tutorial_slot',v_index));`;
tutorialGacha = tutorialGacha.replace(tutorialOld, tutorialNew);
tutorialGacha = tutorialGacha.replace(
  "'outcome','converted','tutorial_slot',v_index",
  "'outcome','converted','converted_item_id','AWAKENING_BOOK','converted_quantity',1,'tutorial_slot',v_index",
);
if (!tutorialGacha.includes("apply_character_awakening_equivalent(v_user_id, v_existing.id, 1)")) throw new Error("Tutorial gacha transformation failed.");

let pity = extractFunction("exchange_pity_reward", null);
pity = pity.replace("  v_awaken integer;", "  v_awaken integer;\n  v_character_row_id uuid;\n  v_progress jsonb;");
const pityOld = `    SELECT awakening_level INTO v_awaken FROM public.user_characters
    WHERE user_id = p_user_id AND character_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_awaken IS NULL THEN
      INSERT INTO public.user_characters (user_id, character_id, level, awakening_level) VALUES (p_user_id, p_reward_id, 1, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 5 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'AWAKENING_BOOK', 1)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 1;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted');
    ELSE
      UPDATE public.user_characters SET awakening_level = v_awaken + 1 WHERE user_id = p_user_id AND character_id = p_reward_id;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'awakening');
    END IF;`;
const pityNew = `    SELECT id, awakening_level INTO v_character_row_id, v_awaken FROM public.user_characters
    WHERE user_id = p_user_id AND character_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_character_row_id IS NULL THEN
      INSERT INTO public.user_characters (user_id, character_id, level, awakening_level, awakening_progress) VALUES (p_user_id, p_reward_id, 1, 0, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 5 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'AWAKENING_BOOK', 1)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 1, updated_at = now();
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted', 'converted_item_id', 'AWAKENING_BOOK', 'converted_quantity', 1);
    ELSE
      v_progress := public.apply_character_awakening_equivalent(p_user_id, v_character_row_id, 1);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id,
        'outcome', v_progress->>'outcome', 'awakening_progress_added', 1,
        'awakening_level', (v_progress->>'awakening_level')::integer,
        'awakening_progress', (v_progress->>'awakening_progress')::integer,
        'awakening_required', (v_progress->>'awakening_required')::integer);
    END IF;`;
pity = pity.replace(pityOld, pityNew);
if (!pity.includes("apply_character_awakening_equivalent(p_user_id, v_character_row_id, 1)")) throw new Error("Pity transformation failed.");

const runtimeUsage = JSON.stringify(book.runtimeUsage).replaceAll("'", "''");
const sql = `-- Generated by scripts/generate_character_awakening_copy_equivalent_migration.mjs.
-- 00174 is physically applied in Development and intentionally remains immutable.
begin;

alter table public.user_characters add column if not exists awakening_progress integer not null default 0;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='user_characters_awakening_progress_range') then
    alter table public.user_characters add constraint user_characters_awakening_progress_range check(awakening_progress between 0 and 3);
  end if;
end $$;

create or replace function public.canonical_character_awakening_required(p_awakening_level integer)
returns integer language sql immutable parallel safe as $$
  select case greatest(0,least(5,coalesce(p_awakening_level,0)))
    when 0 then 1 when 1 then 1 when 2 then 2 when 3 then 3 when 4 then 4 else 0 end
$$;

create or replace function public.apply_character_awakening_equivalent(
  p_user_id uuid, p_character_id uuid, p_equivalents integer default 1
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_level integer;
  v_progress integer;
  v_remaining integer:=greatest(0,coalesce(p_equivalents,0));
  v_required integer;
  v_advanced integer:=0;
begin
  select coalesce(awakening_level,0),coalesce(awakening_progress,0) into v_level,v_progress
  from public.user_characters where id=p_character_id and user_id=p_user_id for update;
  if not found then raise exception 'owned character not found' using errcode='P0002'; end if;
  if v_level>=5 then
    return jsonb_build_object('outcome','max','awakening_level',5,'awakening_progress',0,'awakening_required',0,'levels_advanced',0);
  end if;
  while v_remaining>0 and v_level<5 loop
    v_progress:=v_progress+1;
    v_remaining:=v_remaining-1;
    v_required:=public.canonical_character_awakening_required(v_level);
    if v_progress>=v_required then
      v_progress:=v_progress-v_required;
      v_level:=v_level+1;
      v_advanced:=v_advanced+1;
      if v_level>=5 then v_progress:=0; end if;
    end if;
  end loop;
  update public.user_characters set awakening_level=v_level,awakening_progress=v_progress where id=p_character_id and user_id=p_user_id;
  return jsonb_build_object(
    'outcome',case when v_advanced>0 then 'awakening' else 'awakening_progress' end,
    'awakening_level',v_level,'awakening_progress',v_progress,
    'awakening_required',public.canonical_character_awakening_required(v_level),
    'levels_advanced',v_advanced,'copy_equivalent_added',p_equivalents);
end $$;
revoke all on function public.apply_character_awakening_equivalent(uuid,uuid,integer) from public,anon,authenticated;

create or replace function public.awaken_character(p_character_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid();
  v_level integer;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select coalesce(awakening_level,0) into v_level from public.user_characters where id=p_character_id and user_id=v_user_id for update;
  if not found then raise exception 'owned character not found' using errcode='P0002'; end if;
  if v_level>=5 then raise exception 'character awakening is already at maximum' using errcode='23514'; end if;
  update public.user_items set quantity=quantity-1,updated_at=now()
  where user_id=v_user_id and item_id='AWAKENING_BOOK' and quantity>=1;
  if not found then raise exception 'insufficient Awakening Book' using errcode='23514'; end if;
  v_result:=public.apply_character_awakening_equivalent(v_user_id,p_character_id,1);
  return jsonb_build_object('status','success','consumed_item_id','AWAKENING_BOOK','consumed_quantity',1)||v_result;
end $$;

${characterGacha}

${tutorialGacha}

${pity}

update public.canonical_item_master
set description='任意キャラクターへ1 copy-equivalentを加算する限定供給素材です。',
    runtime_usage='${runtimeUsage}'::jsonb
where version='2026-08-22' and item_id='AWAKENING_BOOK';

update public.login_bonus_master set item_id='SPECIAL_TICKET_SKILL',item_name='SPスキルチケット 1' where day_number=15;
update public.login_bonus_master set item_id='SPECIAL_TICKET_EQUIPMENT',item_name='SP装備チケット 1' where day_number=20;
update public.canonical_reward_supply_sources
set status='FROZEN',notes='30-day fixed supply: Character/Skill/Equipment Special Tickets 2/1/1 and Awakening Book 1'
where version='2026-08-22' and source='LOGIN_BONUS';

do $$ begin
  if public.canonical_character_awakening_required(0)<>1 or public.canonical_character_awakening_required(1)<>1
     or public.canonical_character_awakening_required(2)<>2 or public.canonical_character_awakening_required(3)<>3
     or public.canonical_character_awakening_required(4)<>4 or public.canonical_character_awakening_required(5)<>0 then
    raise exception 'Character awakening copy-equivalent curve mismatch';
  end if;
  if (select count(*) from public.login_bonus_master where item_id='SPECIAL_TICKET_CHARACTER')<>2
     or (select count(*) from public.login_bonus_master where item_id='SPECIAL_TICKET_SKILL')<>1
     or (select count(*) from public.login_bonus_master where item_id='SPECIAL_TICKET_EQUIPMENT')<>1 then
    raise exception 'Login Special Ticket allocation mismatch';
  end if;
end $$;

commit;
`;

if (/required_cash|cash_spent|LAW_OF_STRIFE/.test(sql)) throw new Error("Legacy Character Awakening dependency entered 00175.");
fs.writeFileSync(outputPath, sql);
console.log(`Generated ${outputPath}`);
