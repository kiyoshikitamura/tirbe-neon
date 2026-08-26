-- R9 User Identity: future profiles start without fictional self-introduction.
-- Existing rows are intentionally untouched; presentation distinguishes the
-- historical seed value without consuming the user's daily edit allowance.
begin;

alter table public.users alter column bio set default ''::text;

commit;
notify pgrst, 'reload schema';
