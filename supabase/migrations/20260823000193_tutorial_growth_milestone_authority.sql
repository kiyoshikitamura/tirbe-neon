-- Phase C1-R3: a duplicate Character awakening during FREE_GACHA is ownership
-- resolution, not the player's explicit FIRST_GROWTH action.
begin;

create or replace function public.on_progression_growth_funnel()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_changed boolean:=false;
  v_tutorial_step text;
begin
  if tg_table_name='user_characters' then
    v_changed:=coalesce(new.level,1)>coalesce(old.level,1)
      or coalesce(new.awakening_level,0)>coalesce(old.awakening_level,0);

    -- Tutorial gacha duplicate resolution may increase awakening. It must not
    -- complete the explicit Growth funnel step before the player levels up.
    if coalesce(new.level,1)=coalesce(old.level,1)
       and coalesce(new.awakening_level,0)>coalesce(old.awakening_level,0) then
      select step_id into v_tutorial_step
      from public.tutorial_progress
      where user_id=new.user_id;
      if v_tutorial_step='FREE_GACHA' then v_changed:=false; end if;
    end if;
  elsif tg_table_name='user_equipments' then
    v_changed:=coalesce(new.level,1)>coalesce(old.level,1)
      or coalesce(new.plus_val,0)>coalesce(old.plus_val,0);
  elsif tg_table_name='user_skills' then
    v_changed:=coalesce(new.plus_val,0)>coalesce(old.plus_val,0);
  end if;

  if v_changed then
    perform public.record_funnel_milestone(
      new.user_id,
      'first_growth',
      jsonb_build_object('source',tg_table_name)
    );
  end if;
  return new;
end;
$$;

commit;
