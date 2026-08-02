CREATE TABLE IF NOT EXISTS public.user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  friend_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE OR REPLACE FUNCTION public.send_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_user_id = p_friend_id THEN
        RAISE EXCEPTION '自分自身には申請できません。';
    END IF;

    -- 自分から相手
    INSERT INTO public.user_friends (user_id, friend_id, status)
    VALUES (p_user_id, p_friend_id, 'PENDING')
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    -- 相手から自分（双方向で保持する設計）
    INSERT INTO public.user_friends (user_id, friend_id, status)
    VALUES (p_friend_id, p_user_id, 'RECEIVED')
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_friends SET status = 'ACCEPTED', updated_at = now()
    WHERE user_id = p_user_id AND friend_id = p_friend_id;

    UPDATE public.user_friends SET status = 'ACCEPTED', updated_at = now()
    WHERE user_id = p_friend_id AND friend_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friend(p_user_id UUID, p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_friends WHERE user_id = p_user_id AND friend_id = p_friend_id;
    DELETE FROM public.user_friends WHERE user_id = p_friend_id AND friend_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
