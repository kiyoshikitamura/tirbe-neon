-- Open Beta M7-2b: reviewed provisional mission set.
-- Stable IDs and upserts make every content/economy value replaceable.

UPDATE public.missions
SET is_enabled = false
WHERE is_enabled;

-- Required for PostgREST's user_missions -> missions embedded read used by UI.
ALTER TABLE public.user_missions
  DROP CONSTRAINT IF EXISTS user_missions_mission_id_fkey;
ALTER TABLE public.user_missions
  ADD CONSTRAINT user_missions_mission_id_fkey
  FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

INSERT INTO public.missions (
  id, category, trigger_type, title, desc_text, description,
  target_value, condition_params, reward_item_id, reward_qty, reward_quantity,
  prerequisite_mission_id, display_order, is_enabled, is_repeatable, is_provisional
)
VALUES
  ('ob_daily_login_01', 'DAILY', 'DAILY_LOGIN', '毎日の顔出し', 'ゲームにログインする', 'ゲームにログインする',
    1, '{}'::jsonb, 'CHAR_EXP_S', 5, 5, NULL, 10, true, true, true),
  ('ob_daily_patrol_01', 'DAILY', 'PATROL_CLEAR', '本日のシノギ', 'クエスト派遣を1回完了する', 'クエスト派遣を1回完了する',
    1, '{}'::jsonb, 'CASH', 1000, 1000, NULL, 20, true, true, true),
  ('ob_daily_char_level_01', 'DAILY', 'CHAR_LEVEL_UP', '仲間を鍛えろ', 'キャラクターを合計1レベル強化する', 'キャラクターを合計1レベル強化する',
    1, '{}'::jsonb, 'CHAR_EXP_S', 3, 3, NULL, 30, true, true, true),
  ('ob_daily_gear_level_01', 'DAILY', 'GEAR_UPGRADE', '得物を磨け', '装備品を合計1レベル強化する', '装備品を合計1レベル強化する',
    1, '{}'::jsonb, 'EQUIP_EXP_S', 3, 3, NULL, 40, true, true, true),

  ('ob_normal_patrol_01', 'NORMAL', 'PATROL_CLEAR', '街へ繰り出せ I', 'クエスト派遣を1回完了する', 'クエスト派遣を1回完了する',
    1, '{}'::jsonb, 'CHAR_EXP_S', 5, 5, NULL, 110, true, false, true),
  ('ob_normal_patrol_02', 'NORMAL', 'PATROL_CLEAR', '街へ繰り出せ II', 'さらにクエスト派遣を10回完了する', 'さらにクエスト派遣を10回完了する',
    10, '{}'::jsonb, 'CHAR_EXP_M', 3, 3, 'ob_normal_patrol_01', 111, true, false, true),
  ('ob_normal_patrol_03', 'NORMAL', 'PATROL_CLEAR', '街へ繰り出せ III', 'さらにクエスト派遣を30回完了する', 'さらにクエスト派遣を30回完了する',
    30, '{}'::jsonb, 'CHAR_EXP_M', 5, 5, 'ob_normal_patrol_02', 112, true, false, true),

  ('ob_normal_char_level_01', 'NORMAL', 'CHAR_LEVEL_UP', '仲間を鍛えろ I', 'キャラクターを合計5レベル強化する', 'キャラクターを合計5レベル強化する',
    5, '{}'::jsonb, 'CHAR_EXP_S', 10, 10, NULL, 120, true, false, true),
  ('ob_normal_char_level_02', 'NORMAL', 'CHAR_LEVEL_UP', '仲間を鍛えろ II', 'さらにキャラクターを合計20レベル強化する', 'さらにキャラクターを合計20レベル強化する',
    20, '{}'::jsonb, 'CHAR_EXP_M', 5, 5, 'ob_normal_char_level_01', 121, true, false, true),
  ('ob_normal_char_level_03', 'NORMAL', 'CHAR_LEVEL_UP', '仲間を鍛えろ III', 'さらにキャラクターを合計50レベル強化する', 'さらにキャラクターを合計50レベル強化する',
    50, '{}'::jsonb, 'CHAR_EXP_L', 2, 2, 'ob_normal_char_level_02', 122, true, false, true),

  ('ob_normal_gear_level_01', 'NORMAL', 'GEAR_UPGRADE', '得物を磨け I', '装備品を合計5レベル強化する', '装備品を合計5レベル強化する',
    5, '{}'::jsonb, 'EQUIP_EXP_S', 10, 10, NULL, 130, true, false, true),
  ('ob_normal_gear_level_02', 'NORMAL', 'GEAR_UPGRADE', '得物を磨け II', 'さらに装備品を合計20レベル強化する', 'さらに装備品を合計20レベル強化する',
    20, '{}'::jsonb, 'EQUIP_EXP_M', 5, 5, 'ob_normal_gear_level_01', 131, true, false, true),
  ('ob_normal_gear_level_03', 'NORMAL', 'GEAR_UPGRADE', '得物を磨け III', 'さらに装備品を合計50レベル強化する', 'さらに装備品を合計50レベル強化する',
    50, '{}'::jsonb, 'EQUIP_EXP_L', 2, 2, 'ob_normal_gear_level_02', 132, true, false, true),

  ('ob_normal_gear_lb_01', 'NORMAL', 'GEAR_LIMIT_BREAK', '装備の壁を壊せ I', '装備品を1回限界突破する', '装備品を1回限界突破する',
    1, '{}'::jsonb, 'CASH', 5000, 5000, NULL, 140, true, false, true),
  ('ob_normal_gear_lb_02', 'NORMAL', 'GEAR_LIMIT_BREAK', '装備の壁を壊せ II', 'さらに装備品を3回限界突破する', 'さらに装備品を3回限界突破する',
    3, '{}'::jsonb, 'EQUIP_LB_HAMMER', 1, 1, 'ob_normal_gear_lb_01', 141, true, false, true),

  ('ob_normal_skill_lb_01', 'NORMAL', 'SKILL_LIMIT_BREAK', '技を研ぎ澄ませ I', 'スキルを1回限界突破する', 'スキルを1回限界突破する',
    1, '{}'::jsonb, 'CASH', 5000, 5000, NULL, 150, true, false, true),
  ('ob_normal_skill_lb_02', 'NORMAL', 'SKILL_LIMIT_BREAK', '技を研ぎ澄ませ II', 'さらにスキルを3回限界突破する', 'さらにスキルを3回限界突破する',
    3, '{}'::jsonb, 'SKILL_LB_BOOK', 1, 1, 'ob_normal_skill_lb_01', 151, true, false, true),

  ('ob_normal_guild_join_01', 'NORMAL', 'GUILD_JOIN', '仲間と旗を掲げろ', 'ギルドに加入する', 'ギルドに加入する',
    1, '{}'::jsonb, 'GACHA_TICKET', 3, 3, NULL, 160, true, false, true)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  trigger_type = EXCLUDED.trigger_type,
  title = EXCLUDED.title,
  desc_text = EXCLUDED.desc_text,
  description = EXCLUDED.description,
  target_value = EXCLUDED.target_value,
  condition_params = EXCLUDED.condition_params,
  reward_item_id = EXCLUDED.reward_item_id,
  reward_qty = EXCLUDED.reward_qty,
  reward_quantity = EXCLUDED.reward_quantity,
  prerequisite_mission_id = EXCLUDED.prerequisite_mission_id,
  display_order = EXCLUDED.display_order,
  is_enabled = EXCLUDED.is_enabled,
  is_repeatable = EXCLUDED.is_repeatable,
  is_provisional = EXCLUDED.is_provisional;

-- Existing users receive only current daily rows and unlocked normal roots.
-- DAILY_LOGIN becomes clear through sync_current_missions on the next app sync.
INSERT INTO public.user_missions (
  user_id, mission_id, current_progress, progress_val, status, cycle_date
)
SELECT
  u.id, m.id, 0, 0, 'PROGRESS',
  CASE WHEN m.category = 'DAILY'
    THEN ((clock_timestamp() AT TIME ZONE 'Asia/Tokyo') - interval '4 hours')::date
    ELSE NULL
  END
FROM public.users u
CROSS JOIN public.missions m
WHERE m.is_enabled
  AND (m.category = 'DAILY' OR (m.category = 'NORMAL' AND m.prerequisite_mission_id IS NULL))
ON CONFLICT (user_id, mission_id) DO NOTHING;

-- Present rewards must distinguish real equipment masters from item IDs such
-- as EQUIP_EXP_S. Keep the grant helper internal and expose auth.uid-only APIs.
CREATE OR REPLACE FUNCTION public.grant_present_payload(
  p_user_id uuid,
  p_item_id text,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Invalid present quantity'; END IF;

  IF p_item_id = 'CASH' THEN
    UPDATE public.users SET cash = cash + p_quantity WHERE id = p_user_id;
  ELSIF p_item_id IN ('DIA', 'DIAMOND') THEN
    UPDATE public.users SET neon_diamonds = neon_diamonds + p_quantity WHERE id = p_user_id;
  ELSIF EXISTS (
    SELECT 1 FROM public.equipment_battle_master WHERE equipment_id = p_item_id
  ) THEN
    INSERT INTO public.user_equipments (
      user_id, equipment_id, equipment_master_id, level, plus_val
    )
    SELECT p_user_id, p_item_id, p_item_id, 1, 0
    FROM generate_series(1, p_quantity);
  ELSE
    INSERT INTO public.user_items (user_id, item_id, quantity)
    VALUES (p_user_id, p_item_id, p_quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE
    SET quantity = public.user_items.quantity + EXCLUDED.quantity;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_present(p_present_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_present public.presents%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_present
  FROM public.presents
  WHERE id = p_present_id
    AND user_id = v_user_id
    AND status = 'UNCLAIMED'
    AND (expire_at IS NULL OR expire_at > clock_timestamp())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Present is not claimable'; END IF;

  PERFORM public.grant_present_payload(v_user_id, v_present.item_id, v_present.quantity);
  UPDATE public.presents
  SET status = 'CLAIMED', claimed_at = clock_timestamp()
  WHERE id = v_present.id;
  RETURN jsonb_build_object('status', 'success', 'present_id', v_present.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_all_presents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_present public.presents%ROWTYPE;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  FOR v_present IN
    SELECT * FROM public.presents
    WHERE user_id = v_user_id
      AND status = 'UNCLAIMED'
      AND (expire_at IS NULL OR expire_at > clock_timestamp())
    ORDER BY id
    FOR UPDATE
  LOOP
    PERFORM public.grant_present_payload(v_user_id, v_present.item_id, v_present.quantity);
    UPDATE public.presents
    SET status = 'CLAIMED', claimed_at = clock_timestamp()
    WHERE id = v_present.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('status', 'success', 'claimed_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_present_payload(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_present(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_all_presents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_present(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_all_presents() TO authenticated;

REVOKE ALL ON FUNCTION public.claim_present(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_all_presents(uuid) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
