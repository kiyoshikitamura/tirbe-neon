-- 13. Raid Respawn RPC
CREATE OR REPLACE FUNCTION public.admin_respawn_raid_boss(p_boss_id TEXT, p_max_hp INTEGER, p_base_id TEXT) RETURNS JSONB AS $$
BEGIN
    UPDATE public.raid_bosses SET 
        current_hp = p_max_hp,
        base_id = p_base_id,
        status = 'ACTIVE',
        spawned_at = now(),
        expires_at = now() + interval '24 hours'
    WHERE id = p_boss_id;
    
    DELETE FROM public.raid_damage_logs WHERE raid_boss_id = p_boss_id;
    DELETE FROM public.user_raid_claimed_rewards;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
