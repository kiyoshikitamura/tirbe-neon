-- 8. Guild decorations
CREATE OR REPLACE FUNCTION public.buy_guild_decoration_v2(
    p_guild_id UUID, 
    p_type TEXT, 
    p_item_id TEXT, 
    p_cost BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_funds BIGINT;
    v_list JSONB;
BEGIN
    SELECT funds INTO v_funds FROM public.guilds WHERE id = p_guild_id;
    IF v_funds IS NULL OR v_funds < p_cost THEN
        RETURN jsonb_build_object('error', 'ギルド資金が不足しています。');
    END IF;

    IF p_type = 'DECORATION' THEN
        SELECT COALESCE(unlocked_decorations, '[]'::jsonb) INTO v_list FROM public.guilds WHERE id = p_guild_id;
        IF v_list ? p_item_id THEN
            RETURN jsonb_build_object('error', 'このアイテムは既に購入済みです。');
        END IF;
        UPDATE public.guilds SET funds = funds - p_cost, unlocked_decorations = v_list || to_jsonb(p_item_id) WHERE id = p_guild_id;
    ELSE
        SELECT COALESCE(unlocked_banners, '[]'::jsonb) INTO v_list FROM public.guilds WHERE id = p_guild_id;
        IF v_list ? p_item_id THEN
            RETURN jsonb_build_object('error', 'このアイテムは既に購入済みです。');
        END IF;
        UPDATE public.guilds SET funds = funds - p_cost, unlocked_banners = v_list || to_jsonb(p_item_id) WHERE id = p_guild_id;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
