-- Open Beta M3-3b: replaceable, server-authoritative executable skill master.

create table if not exists public.skill_battle_master (
  skill_id text primary key,
  display_name text not null,
  enabled boolean not null default false,
  kind text not null check (kind in ('ATTACK','HEAL','BUFF','DEBUFF')),
  target text not null check (target in ('ENEMY_SINGLE','ENEMY_ALL','ALLY_SINGLE','ALLY_ALL')),
  power_percent integer not null default 0 check (power_percent >= 0),
  cooldown integer not null check (cooldown between 0 and 10),
  initial_cooldown integer not null default 0 check (initial_cooldown between 0 and 10),
  status text check (status in ('POISON','BLIND','SILENCE','STUN')),
  status_chance integer check (status_chance between 5 and 95),
  modifier_stat text check (modifier_stat in ('ATK','DEF','SPD')),
  modifier_percent integer check (modifier_percent between 0 and 25),
  modifier_duration integer check (modifier_duration between 1 and 5),
  exclusive_character_id text,
  source_revision text not null,
  updated_at timestamptz not null default now(),
  check ((kind in ('ATTACK','HEAL') and power_percent > 0) or (kind in ('BUFF','DEBUFF') and modifier_stat is not null)),
  check (not (target = 'ENEMY_ALL' and status in ('SILENCE','STUN')))
);

insert into public.skill_battle_master (skill_id, display_name, enabled, kind, target, power_percent, cooldown, initial_cooldown, status, status_chance, modifier_stat, modifier_percent, modifier_duration, source_revision, exclusive_character_id) values
  ('SKILL_001', 'ストリートパンチ', true, 'ATTACK', 'ENEMY_SINGLE', 50, 2, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_002', 'クイックシールド', true, 'BUFF', 'ALLY_SINGLE', 0, 2, 0, null, null, 'DEF', 15, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_003', 'ノイズヒール', true, 'HEAL', 'ALLY_SINGLE', 30, 2, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_004', 'ステップダッシュ', true, 'BUFF', 'ALLY_SINGLE', 0, 2, 0, null, null, 'SPD', 15, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_005', '毒針', true, 'ATTACK', 'ENEMY_SINGLE', 10, 2, 0, 'POISON', 80, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_006', 'アイアンガード', true, 'BUFF', 'ALLY_SINGLE', 0, 2, 0, null, null, 'DEF', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_007', '罵詈雑言', true, 'DEBUFF', 'ENEMY_SINGLE', 0, 2, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_008', 'スマートスナイプ', true, 'ATTACK', 'ENEMY_SINGLE', 40, 2, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_009', 'ドーピング注射', true, 'BUFF', 'ALLY_SINGLE', 0, 2, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_010', 'ライトフラッシュ', true, 'ATTACK', 'ENEMY_SINGLE', 20, 2, 0, 'BLIND', 75, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_011', 'チャージスラッシュ', true, 'ATTACK', 'ENEMY_SINGLE', 100, 3, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_012', '大旋風パイプ', true, 'ATTACK', 'ENEMY_ALL', 45, 3, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_013', 'フィールド応急手当', true, 'HEAL', 'ALLY_SINGLE', 30, 3, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_014', 'スモークスクリーン', true, 'BUFF', 'ALLY_SINGLE', 0, 3, 0, null, null, 'DEF', 15, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_015', '強酸アジドスプレー', true, 'DEBUFF', 'ENEMY_SINGLE', 0, 3, 0, null, null, 'DEF', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_016', 'ライオットバリア', true, 'BUFF', 'ALLY_SINGLE', 0, 3, 0, null, null, 'DEF', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_017', '不屈の怒号', true, 'BUFF', 'ALLY_SINGLE', 0, 3, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_018', '高圧電撃警棒', true, 'ATTACK', 'ENEMY_SINGLE', 30, 3, 0, 'STUN', 50, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_019', 'バーストラッシュ', true, 'ATTACK', 'ENEMY_SINGLE', 85, 3, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_020', 'タクティカルリロード', true, 'BUFF', 'ALLY_SINGLE', 0, 3, 0, null, null, 'SPD', 15, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_021', '急所撃ち', true, 'ATTACK', 'ENEMY_SINGLE', 160, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_022', '重鉄パイプ大薙ぎ', true, 'ATTACK', 'ENEMY_ALL', 80, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_023', '軍用止血パック', true, 'HEAL', 'ALLY_ALL', 18, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_024', '機動防犯盾陣形', true, 'BUFF', 'ALLY_ALL', 0, 4, 0, null, null, 'DEF', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_025', '催涙ガス噴射', true, 'DEBUFF', 'ENEMY_ALL', 0, 4, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_026', '決起のシュプレヒコール', true, 'BUFF', 'ALLY_ALL', 0, 4, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_027', '血の強襲', true, 'ATTACK', 'ENEMY_SINGLE', 130, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_028', 'シールドクラッシャー', true, 'ATTACK', 'ENEMY_SINGLE', 100, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_029', '継続処置薬', true, 'HEAL', 'ALLY_SINGLE', 30, 4, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_030', '暗号ジャミング', true, 'ATTACK', 'ENEMY_SINGLE', 30, 4, 0, 'SILENCE', 65, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_031', 'カウンタースパイク', true, 'BUFF', 'ALLY_SINGLE', 0, 4, 0, null, null, 'DEF', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_032', '暗器・毒塗りの刃', true, 'ATTACK', 'ENEMY_SINGLE', 90, 4, 0, 'POISON', 80, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_033', '精神統一・明鏡止水', true, 'BUFF', 'ALLY_SINGLE', 0, 4, 0, null, null, 'SPD', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_034', 'フラッシュバン強襲', true, 'ATTACK', 'ENEMY_ALL', 50, 4, 0, 'BLIND', 75, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_035', 'アドレナリンフル開花', true, 'BUFF', 'ALLY_SINGLE', 0, 4, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_036', '一騎当千・無慈悲の一撃', true, 'ATTACK', 'ENEMY_SINGLE', 280, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_037', '広域アサルトフルバースト', true, 'ATTACK', 'ENEMY_ALL', 140, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_038', '絶対防御・鉄壁の要塞', true, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'DEF', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_039', '奇跡の野戦救急執刀', true, 'HEAL', 'ALLY_ALL', 18, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_040', '漆黒の広域強酸大散布', true, 'ATTACK', 'ENEMY_ALL', 30, 5, 0, 'POISON', 80, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_041', '王者の決起・天下布武', true, 'BUFF', 'ALLY_ALL', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_042', '血宴の絶影・連撃', true, 'ATTACK', 'ENEMY_SINGLE', 200, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_043', '壊滅のグランドスラム', true, 'ATTACK', 'ENEMY_ALL', 160, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_044', '狂犬の血の復讐', true, 'ATTACK', 'ENEMY_SINGLE', 220, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_045', '戦術指揮・総攻撃', true, 'BUFF', 'ALLY_ALL', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_046', '毒蜘蛛の檻', true, 'ATTACK', 'ENEMY_ALL', 70, 5, 0, 'POISON', 80, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_047', '反撃の装甲要塞', true, 'BUFF', 'ALLY_ALL', 0, 5, 0, null, null, 'DEF', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_048', '不屈の生命力', true, 'HEAL', 'ALLY_SINGLE', 30, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_049', '無力化の広域閃光爆弾', true, 'ATTACK', 'ENEMY_ALL', 40, 5, 0, 'BLIND', 75, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_050', '決戦の一閃・断罪', true, 'ATTACK', 'ENEMY_SINGLE', 250, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_051', '専用スキル枠_01', false, 'ATTACK', 'ENEMY_SINGLE', 180, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_052', '専用スキル枠_02', false, 'ATTACK', 'ENEMY_SINGLE', 180, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_053', '専用スキル枠_03', false, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'DEF', 15, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_054', '専用スキル枠_04', false, 'HEAL', 'ALLY_SINGLE', 30, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_055', '専用スキル枠_05', false, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_056', '専用スキル枠_06', false, 'DEBUFF', 'ENEMY_SINGLE', 0, 5, 0, null, null, 'ATK', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_057', '専用スキル枠_07', false, 'ATTACK', 'ENEMY_SINGLE', 200, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_058', '専用スキル枠_08', false, 'ATTACK', 'ENEMY_SINGLE', 160, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_059', '専用スキル枠_09', false, 'ATTACK', 'ENEMY_SINGLE', 240, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_060', '専用スキル枠_10', false, 'ATTACK', 'ENEMY_SINGLE', 240, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_061', '専用スキル枠_11', false, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'DEF', 20, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_062', '専用スキル枠_12', false, 'HEAL', 'ALLY_SINGLE', 30, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_063', '専用スキル枠_13', false, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_064', '専用スキル枠_14', false, 'DEBUFF', 'ENEMY_SINGLE', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_065', '専用スキル枠_15', false, 'ATTACK', 'ENEMY_SINGLE', 260, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_066', '専用スキル枠_16', false, 'ATTACK', 'ENEMY_SINGLE', 220, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_067', '専用スキル枠_17', false, 'ATTACK', 'ENEMY_SINGLE', 250, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_068', '専用スキル枠_18', false, 'ATTACK', 'ENEMY_SINGLE', 250, 5, 0, null, null, null, null, null, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_069', '専用スキル枠_19', false, 'BUFF', 'ALLY_SINGLE', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null),
  ('SKILL_070', '専用スキル枠_20', false, 'DEBUFF', 'ENEMY_SINGLE', 0, 5, 0, null, null, 'ATK', 25, 2, 'OPEN_BETA_PROVISIONAL_V1', null)
on conflict (skill_id) do update set
  display_name=excluded.display_name, enabled=excluded.enabled, kind=excluded.kind, target=excluded.target,
  power_percent=excluded.power_percent, cooldown=excluded.cooldown, initial_cooldown=excluded.initial_cooldown,
  status=excluded.status, status_chance=excluded.status_chance, modifier_stat=excluded.modifier_stat,
  modifier_percent=excluded.modifier_percent, modifier_duration=excluded.modifier_duration,
  exclusive_character_id=excluded.exclusive_character_id, source_revision=excluded.source_revision, updated_at=now();


do $migration$
declare
  v_definition text;
  v_updated text;
  v_old_lateral text := $old$    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'skillId', owned.skill_card_id,
        'slotIndex', owned.slot_index,
        'plusValue', greatest(least(coalesce(owned.plus_val, 0), 10), 0),
        'effectScale', case
          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 3
            then 1 + greatest(least(coalesce(owned.plus_val, 0), 10), 0) * 0.05
          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 6
            then 1.15 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 3) * 0.04
          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 9
            then 1.27 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 6) * 0.03
          else 1.41
        end
      ) order by owned.slot_index, owned.skill_card_id) as loadout
      from public.user_skills owned
      where owned.user_id = v_user_id
        and owned.equipped_character_id = base.id::text
    ) skills on true$old$;
  v_new_lateral text := $new$    left join lateral (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', master.skill_id,
        'name', master.display_name,
        'kind', master.kind,
        'target', master.target,
        'powerPercent', round(master.power_percent * scaled.effect_scale)::integer,
        'cooldown', master.cooldown,
        'initialCooldown', master.initial_cooldown,
        'status', master.status,
        'statusChance', case when master.status_chance is null then null else least(95, round(master.status_chance * scaled.effect_scale)::integer) end,
        'modifier', case when master.modifier_stat is null then null else jsonb_build_object(
          'stat', master.modifier_stat,
          'percent', least(25, round(master.modifier_percent * scaled.effect_scale)::integer),
          'duration', master.modifier_duration
        ) end,
        'skillId', master.skill_id,
        'slotIndex', owned.slot_index,
        'plusValue', scaled.plus_value,
        'effectScale', scaled.effect_scale
      )) order by owned.slot_index, master.skill_id) as loadout
      from public.user_skills owned
      join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled
      cross join lateral (
        select greatest(least(coalesce(owned.plus_val, 0), 10), 0) as plus_value,
          case
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 3 then 1 + greatest(least(coalesce(owned.plus_val, 0), 10), 0) * 0.05
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 6 then 1.15 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 3) * 0.04
            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 9 then 1.27 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 6) * 0.03
            else 1.41
          end as effect_scale
      ) scaled
      where owned.user_id = v_user_id
        and owned.equipped_character_id = base.id::text
        and owned.slot_index between 0 and least(5, 2 + greatest(coalesce(base.awakening_level, 0), 0))
        and (master.exclusive_character_id is null or master.exclusive_character_id = base.character_id)
    ) skills on true$new$;
  v_old_output text := $old$    'equippedSkillRefs', canonical.equipped_skill_refs,
    'skills', jsonb_build_array(jsonb_build_object(
      'id', 'basic_attack_' || canonical.id::text, 'name', 'Attack',
      'kind', 'ATTACK', 'target', 'ENEMY_SINGLE', 'powerPercent', 100, 'cooldown', 0
    ))$old$;
  v_new_output text := $new$    'equippedSkillRefs', canonical.equipped_skill_refs,
    -- Basic attack is the engine fallback when no equipped skill is selected
    -- or every equipped skill is cooling down.
    'skills', canonical.equipped_skill_refs$new$;
begin
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) into v_definition;
  if v_definition is null then raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode = 'P0002'; end if;
  v_updated := replace(replace(v_definition, v_old_lateral, v_new_lateral), v_old_output, v_new_output);
  if v_updated = v_definition or position(v_old_lateral in v_updated) > 0 or position(v_old_output in v_updated) > 0 then
    raise exception 'existing patrol skill snapshot did not match the expected M2-4a definition';
  end if;
  execute v_updated;
end;
$migration$;

revoke all on table public.skill_battle_master from public, anon, authenticated;
revoke all on function public.create_patrol_battle_replay(uuid,text) from public, anon;
grant execute on function public.create_patrol_battle_replay(uuid,text) to authenticated;
notify pgrst, 'reload schema';
