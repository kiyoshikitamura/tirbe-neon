-- Phase B2: permit the frozen Lv100 cap while retaining over-cap accounts for audit.
begin;

alter table public.users
  drop constraint if exists users_level_positive_check;

alter table public.users
  add constraint users_level_positive_check check (level between 1 and 100) not valid;

commit;
