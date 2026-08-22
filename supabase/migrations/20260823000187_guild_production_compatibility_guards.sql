-- Preserve the frozen Lv3 membership entry gate across every compatibility
-- route and make the legacy settings RPC project into canonical recruitment.
begin;

create or replace function public.enforce_canonical_guild_join_level()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_level integer;
begin
 select level into v_level from public.users where id=new.user_id;
 if coalesce(v_level,0)<3 then raise exception 'Guild joining requires user level 3' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists canonical_guild_member_level_trigger on public.guild_members;
create trigger canonical_guild_member_level_trigger before insert on public.guild_members
for each row execute function public.enforce_canonical_guild_join_level();
drop trigger if exists canonical_guild_application_level_trigger on public.guild_join_requests;
create trigger canonical_guild_application_level_trigger before insert on public.guild_join_requests
for each row execute function public.enforce_canonical_guild_join_level();

create or replace function public.update_guild_settings(p_guild_id uuid,p_desc text,p_approval boolean,p_kick_days integer)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if p_approval is null or p_kick_days is null or p_kick_days<0 or p_kick_days>30 then raise exception 'Invalid guild settings'; end if;
 return public.update_guild_recruitment(p_guild_id,case when p_approval then 'APPLICATION_REQUIRED' else 'OPEN_JOIN' end,p_desc);
end $$;

revoke all on function public.enforce_canonical_guild_join_level() from public,anon,authenticated;
revoke all on function public.update_guild_settings(uuid,text,boolean,integer) from public,anon;
grant execute on function public.update_guild_settings(uuid,text,boolean,integer) to authenticated;

commit;
notify pgrst,'reload schema';
