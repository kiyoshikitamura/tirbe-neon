-- サーバー確定バトルとクライアント再生を分離する基盤。
-- 既存battle_sessionsはPreview互換のため残し、新規実装は本テーブル群を使用する。

CREATE TABLE IF NOT EXISTS public.battle_replay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  battle_mode TEXT NOT NULL CHECK (battle_mode IN ('QUEST', 'PVP', 'RAID', 'GVG')),
  source_reference_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'RESOLVED', 'CANCELLED')),
  tactic_id TEXT NOT NULL,
  random_seed BIGINT NOT NULL,
  player_snapshot JSONB NOT NULL,
  enemy_snapshot JSONB NOT NULL,
  result JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(player_snapshot) = 'array'),
  CHECK (jsonb_typeof(enemy_snapshot) = 'array'),
  CHECK ((status = 'RESOLVED' AND result IS NOT NULL AND resolved_at IS NOT NULL) OR status <> 'RESOLVED')
);

CREATE INDEX IF NOT EXISTS battle_replay_sessions_owner_idx
  ON public.battle_replay_sessions (requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS battle_replay_sessions_reference_idx
  ON public.battle_replay_sessions (source_reference_id);

CREATE TABLE IF NOT EXISTS public.battle_replay_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  battle_replay_session_id UUID NOT NULL REFERENCES public.battle_replay_sessions(id) ON DELETE CASCADE,
  event_index INTEGER NOT NULL CHECK (event_index >= 0),
  round_number SMALLINT NOT NULL CHECK (round_number >= 1),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_replay_session_id, event_index),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS battle_replay_events_session_idx
  ON public.battle_replay_events (battle_replay_session_id, event_index);

ALTER TABLE public.gvg_attack_logs
  ADD COLUMN IF NOT EXISTS battle_replay_session_id UUID
  REFERENCES public.battle_replay_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.battle_replay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_replay_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own battle replay sessions"
  ON public.battle_replay_sessions
  FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "Read own battle replay events"
  ON public.battle_replay_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.battle_replay_sessions s
      WHERE s.id = battle_replay_events.battle_replay_session_id
        AND s.requester_user_id = auth.uid()
    )
  );

-- クライアントは結果を書けない。開始要求だけを SECURITY DEFINER で受け付ける。
-- Clients may create only their own pending replay requests.
CREATE OR REPLACE FUNCTION public.create_battle_replay_pending(
  p_battle_mode TEXT, p_tactic_id TEXT, p_random_seed BIGINT,
  p_player_snapshot JSONB, p_enemy_snapshot JSONB, p_source_reference_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_battle_mode NOT IN ('QUEST', 'PVP', 'RAID', 'GVG') THEN RAISE EXCEPTION 'Invalid battle mode'; END IF;
  IF p_tactic_id NOT IN ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') THEN RAISE EXCEPTION 'Invalid tactic'; END IF;
  IF jsonb_typeof(p_player_snapshot) <> 'array' OR jsonb_array_length(p_player_snapshot) NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Invalid player roster'; END IF;
  IF jsonb_typeof(p_enemy_snapshot) <> 'array' OR jsonb_array_length(p_enemy_snapshot) NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Invalid enemy roster'; END IF;
  INSERT INTO public.battle_replay_sessions (
    requester_user_id, battle_mode, source_reference_id, tactic_id, random_seed, player_snapshot, enemy_snapshot
  ) VALUES (
    v_user_id, p_battle_mode, p_source_reference_id, p_tactic_id, p_random_seed, p_player_snapshot, p_enemy_snapshot
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_battle_replay_pending(TEXT, TEXT, BIGINT, JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_battle_replay_pending(TEXT, TEXT, BIGINT, JSONB, JSONB, UUID) TO authenticated;

-- INSERT/UPDATEはサーバー側の戦闘解決処理だけに限定する。
