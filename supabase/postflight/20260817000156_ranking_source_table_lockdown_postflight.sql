with targets(table_name) as (
  values ('pvp_ranks'::text),('gvg_match_sessions'),('gvg_attack_logs')
), resolved as (
  select target.table_name,relation.oid
  from targets target
  join pg_class relation on relation.relname=target.table_name
  join pg_namespace namespace on namespace.oid=relation.relnamespace and namespace.nspname='public'
), checks as (
  select 10 display_order,'source_table_inventory' check_name,
    case when count(*)=3 then 'PASS' else 'FAIL' end status,count(*)||'/3 source table(s)' detail from resolved
  union all
  select 20,'consumer_mutation_denied',
    case when count(*) filter(where has_table_privilege('authenticated',oid,'INSERT') or has_table_privilege('authenticated',oid,'UPDATE') or has_table_privilege('authenticated',oid,'DELETE'))=0 then 'PASS' else 'FAIL' end,
    count(*) filter(where has_table_privilege('authenticated',oid,'INSERT') or has_table_privilege('authenticated',oid,'UPDATE') or has_table_privilege('authenticated',oid,'DELETE'))||' mutable source table(s)' from resolved
  union all
  select 30,'pvp_direct_read_denied',case when not has_table_privilege('authenticated','public.pvp_ranks','SELECT') then 'PASS' else 'FAIL' end,
    'PvP ranking is exposed only through read-only RPCs'
  union all
  select 40,'gvg_scoped_read_retained',case when has_table_privilege('authenticated','public.gvg_match_sessions','SELECT') and has_table_privilege('authenticated','public.gvg_attack_logs','SELECT') then 'PASS' else 'FAIL' end,
    'Existing GvG screens retain RLS-scoped read access'
)
select * from checks order by display_order;
