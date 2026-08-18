-- PvP rankings are exposed by get_public_pvp_rankings(), not table SELECT.

begin;
drop policy if exists "authenticated read pvp ranks" on public.pvp_ranks;
drop policy if exists "Allow all access to pvp_ranks" on public.pvp_ranks;
commit;
