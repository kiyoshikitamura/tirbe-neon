-- GvG共通HPハイブリッド方式の基盤。
-- 旧拠点支配テーブルは移行期間中に削除せず、新方式は本テーブル群だけを正とする。

CREATE TABLE IF NOT EXISTS public.gvg_guild_ratings (
  guild_id UUID PRIMARY KEY REFERENCES public.guilds(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1000 CHECK (rating >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gvg_match_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  matched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'MATCHING'
    CHECK (status IN ('MATCHING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  is_npc_match BOOLEAN NOT NULL DEFAULT false,
  guild_a_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE RESTRICT,
  guild_b_id UUID REFERENCES public.guilds(id) ON DELETE RESTRICT,
  npc_guild_name TEXT,
  phases_required SMALLINT NOT NULL DEFAULT 2 CHECK (phases_required = 2),
  guild_a_phase SMALLINT NOT NULL DEFAULT 1 CHECK (guild_a_phase BETWEEN 1 AND 2),
  guild_b_phase SMALLINT NOT NULL DEFAULT 1 CHECK (guild_b_phase BETWEEN 1 AND 2),
  guild_a_phase_max_hp BIGINT NOT NULL DEFAULT 0 CHECK (guild_a_phase_max_hp >= 0),
  guild_b_phase_max_hp BIGINT NOT NULL DEFAULT 0 CHECK (guild_b_phase_max_hp >= 0),
  guild_a_phase_hp BIGINT NOT NULL DEFAULT 0 CHECK (guild_a_phase_hp >= 0),
  guild_b_phase_hp BIGINT NOT NULL DEFAULT 0 CHECK (guild_b_phase_hp >= 0),
  guild_a_collapses SMALLINT NOT NULL DEFAULT 0 CHECK (guild_a_collapses BETWEEN 0 AND 2),
  guild_b_collapses SMALLINT NOT NULL DEFAULT 0 CHECK (guild_b_collapses BETWEEN 0 AND 2),
  guild_a_total_applied_damage BIGINT NOT NULL DEFAULT 0 CHECK (guild_a_total_applied_damage >= 0),
  guild_b_total_applied_damage BIGINT NOT NULL DEFAULT 0 CHECK (guild_b_total_applied_damage >= 0),
  winner_guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
  result_reason TEXT CHECK (result_reason IN ('TWO_COLLAPSES', 'TIMEOUT_PROGRESS', 'TIMEOUT_TIMESTAMP', 'DRAW')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (scheduled_end_at > scheduled_start_at),
  CHECK ((is_npc_match AND guild_b_id IS NULL) OR (NOT is_npc_match AND guild_b_id IS NOT NULL)),
  CHECK (guild_a_phase_hp <= guild_a_phase_max_hp),
  CHECK (guild_b_phase_hp <= guild_b_phase_max_hp)
);

CREATE INDEX IF NOT EXISTS gvg_match_sessions_active_guild_a_idx
  ON public.gvg_match_sessions (guild_a_id, status, scheduled_start_at DESC);
CREATE INDEX IF NOT EXISTS gvg_match_sessions_active_guild_b_idx
  ON public.gvg_match_sessions (guild_b_id, status, scheduled_start_at DESC);

CREATE TABLE IF NOT EXISTS public.gvg_match_member_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_session_id UUID NOT NULL REFERENCES public.gvg_match_sessions(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  defense_deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  defense_is_npc BOOLEAN NOT NULL DEFAULT false,
  npc_power BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_session_id, user_id),
  CHECK (jsonb_typeof(defense_deck) = 'array'),
  CHECK ((defense_is_npc AND npc_power IS NOT NULL) OR NOT defense_is_npc),
  CHECK ((user_id IS NOT NULL AND guild_id IS NOT NULL) OR defense_is_npc)
);

CREATE INDEX IF NOT EXISTS gvg_match_member_snapshots_target_idx
  ON public.gvg_match_member_snapshots (match_session_id, side);

CREATE TABLE IF NOT EXISTS public.gvg_attack_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_session_id UUID NOT NULL REFERENCES public.gvg_match_sessions(id) ON DELETE CASCADE,
  attacker_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  attacker_guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE RESTRICT,
  defender_snapshot_id UUID REFERENCES public.gvg_match_member_snapshots(id) ON DELETE SET NULL,
  battle_session_id UUID,
  battle_result TEXT NOT NULL DEFAULT 'PENDING' CHECK (battle_result IN ('PENDING', 'VICTORY', 'DEFEAT')),
  raw_damage BIGINT NOT NULL CHECK (raw_damage >= 0),
  applied_damage BIGINT NOT NULL CHECK (applied_damage >= 0),
  win_damage_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (battle_result = 'VICTORY' AND win_damage_multiplier = 1.50)
    OR (battle_result = 'DEFEAT' AND win_damage_multiplier = 1.00)
    OR (battle_result = 'PENDING' AND win_damage_multiplier = 1.00)
  )
);

CREATE INDEX IF NOT EXISTS gvg_attack_logs_match_attacker_idx
  ON public.gvg_attack_logs (match_session_id, attacker_user_id, accepted_at DESC);

ALTER TABLE public.gvg_guild_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_match_member_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_attack_logs ENABLE ROW LEVEL SECURITY;

-- 読み取り・更新は後続のSECURITY DEFINER RPCへ集約する。
-- クライアントからの直接更新を許可しない。

CREATE OR REPLACE FUNCTION public.begin_gvg_attack(p_match_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match public.gvg_match_sessions%ROWTYPE;
  v_guild_id UUID;
  v_attacker_side TEXT;
  v_target_side TEXT;
  v_last_target_id UUID;
  v_target public.gvg_match_member_snapshots%ROWTYPE;
  v_attack_id UUID;
  v_vitality INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_match
  FROM public.gvg_match_sessions
  WHERE id = p_match_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_match.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'The GvG match is not active';
  END IF;
  IF now() >= v_match.scheduled_end_at THEN
    RAISE EXCEPTION 'The GvG match has ended';
  END IF;

  SELECT guild_id INTO v_guild_id
  FROM public.guild_members
  WHERE user_id = v_user_id;
  IF v_guild_id IS NULL THEN
    RAISE EXCEPTION 'Guild membership is required';
  END IF;

  IF v_match.guild_a_id = v_guild_id THEN
    v_attacker_side := 'A';
    v_target_side := 'B';
  ELSIF v_match.guild_b_id = v_guild_id THEN
    v_attacker_side := 'B';
    v_target_side := 'A';
  ELSE
    RAISE EXCEPTION 'You are not a member of this GvG match';
  END IF;

  PERFORM public.sync_and_recover_vitality_and_pvp_points(v_user_id);
  SELECT vitality INTO v_vitality FROM public.users WHERE id = v_user_id FOR UPDATE;
  IF COALESCE(v_vitality, 0) < 20 THEN
    RAISE EXCEPTION 'Insufficient AP';
  END IF;

  SELECT defender_snapshot_id INTO v_last_target_id
  FROM public.gvg_attack_logs
  WHERE match_session_id = p_match_session_id
    AND attacker_user_id = v_user_id
    AND battle_result <> 'PENDING'
  ORDER BY accepted_at DESC
  LIMIT 1;

  SELECT * INTO v_target
  FROM public.gvg_match_member_snapshots
  WHERE match_session_id = p_match_session_id
    AND side = v_target_side
    AND (v_last_target_id IS NULL OR id <> v_last_target_id)
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_target
    FROM public.gvg_match_member_snapshots
    WHERE match_session_id = p_match_session_id
      AND side = v_target_side
    ORDER BY random()
    LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No defense target is available';
  END IF;

  UPDATE public.users SET vitality = vitality - 20 WHERE id = v_user_id;

  INSERT INTO public.gvg_attack_logs (
    match_session_id, attacker_user_id, attacker_guild_id, defender_snapshot_id,
    battle_result, raw_damage, applied_damage, win_damage_multiplier, accepted_at
  ) VALUES (
    p_match_session_id, v_user_id, v_guild_id, v_target.id,
    'PENDING', 0, 0, 1.00, now()
  ) RETURNING id INTO v_attack_id;

  RETURN jsonb_build_object(
    'attack_id', v_attack_id,
    'match_session_id', p_match_session_id,
    'attacker_side', v_attacker_side,
    'remaining_ap', v_vitality - 20,
    'defender_snapshot_id', v_target.id,
    'defense_deck', v_target.defense_deck,
    'defense_is_npc', v_target.defense_is_npc,
    'npc_power', v_target.npc_power
  );
END;
$$;

REVOKE ALL ON FUNCTION public.begin_gvg_attack(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_gvg_attack(UUID) TO authenticated;
