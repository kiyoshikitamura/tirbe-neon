-- Phase 3 Additional: buy_avatar_part RPC
CREATE OR REPLACE FUNCTION public.buy_avatar_part(
    p_user_id UUID,
    p_part_id TEXT,
    p_currency_type TEXT,
    p_price INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT cash, neon_diamonds INTO v_user FROM public.users WHERE id = p_user_id;

    IF p_currency_type = 'CASH' THEN
        IF v_user.cash < p_price THEN
            RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
        END IF;
        UPDATE public.users SET cash = cash - p_price WHERE id = p_user_id;
    ELSIF p_currency_type = 'DIAMOND' THEN
        IF v_user.neon_diamonds < p_price THEN
            RETURN jsonb_build_object('error', 'ダイヤが不足しています。');
        END IF;
        UPDATE public.users SET neon_diamonds = neon_diamonds - p_price WHERE id = p_user_id;
    ELSE
        RETURN jsonb_build_object('error', '不正な通貨タイプです。');
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_test_cash RPC
CREATE OR REPLACE FUNCTION public.add_test_cash(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET cash = cash + p_amount WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_user_vitality RPC
CREATE OR REPLACE FUNCTION public.add_user_vitality(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET vitality = LEAST(vitality + p_amount, 200) WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_favorite_character RPC
CREATE OR REPLACE FUNCTION public.update_favorite_character(p_user_id UUID, p_character_id TEXT)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET favorite_character_id = p_character_id WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_test_diamonds (v2 with p_amount)
CREATE OR REPLACE FUNCTION public.add_test_diamonds(p_user_id UUID, p_amount INTEGER DEFAULT 50)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET neon_diamonds = neon_diamonds + p_amount WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
