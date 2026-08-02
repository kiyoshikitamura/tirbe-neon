CREATE TABLE IF NOT EXISTS public.user_monthly_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  daily_claimed_at DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE OR REPLACE FUNCTION public.purchase_monthly_pass(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_monthly_passes (user_id, expires_at)
    VALUES (p_user_id, now() + interval '30 days')
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_pass_reward(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pass public.user_monthly_passes%ROWTYPE;
BEGIN
    SELECT * INTO v_pass FROM public.user_monthly_passes WHERE user_id = p_user_id AND is_active = true AND expires_at > now() FOR UPDATE;
    IF v_pass.id IS NULL THEN
        RAISE EXCEPTION '有効な月額パスがありません。';
    END IF;

    IF v_pass.daily_claimed_at = CURRENT_DATE THEN
        RAISE EXCEPTION '本日の報酬は既に受け取り済みです。';
    END IF;

    UPDATE public.user_monthly_passes SET daily_claimed_at = CURRENT_DATE WHERE id = v_pass.id;
    UPDATE public.users SET diamonds = diamonds + 100 WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
