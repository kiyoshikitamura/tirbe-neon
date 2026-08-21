import { spawnSync } from "node:child_process";
import { canonicalEquipmentFlatStat, canonicalEquipmentLevelCap, canonicalEquipmentLevelScale } from "../src/domain/gameplay/canonical/calculations.ts";
import { getLinkedPostgresConnection, loadEnvironmentFile } from "./postgres_connection.mjs";
import { verifySupabaseTarget } from "./supabase_target_guard.mjs";

loadEnvironmentFile("development");
const target = await verifySupabaseTarget({ environment: "development", mutation: false });
const connection = await getLinkedPostgresConnection();
const executable = process.platform === "win32" ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" : "psql";
const query = String.raw`
with selected as (
  select distinct on (category) equipment_id,category,base_stats
  from public.canonical_equipment_master where version='2026-08-21'
  order by category,equipment_id
), cases(level,plus_val) as (values (1,0),(50,0),(60,1),(80,3),(90,4),(100,5),(100,10)),
flat_rows as (
  select equipment_id,category,level,plus_val,stat,(base_stats->>stat)::integer master_flat,
    public.canonical_equipment_flat_stat((base_stats->>stat)::integer,level,plus_val) value
  from selected cross join cases cross join unnest(array['hp','atk','def','spd','luk']) stat
)
select jsonb_build_object(
  'environment','development',
  'migration_head',(select max(version) from supabase_migrations.schema_migrations),
  'user_counts',jsonb_build_object(
    'characters',(select count(*) from public.user_characters),
    'skills',(select count(*) from public.user_skills),
    'equipments',(select count(*) from public.user_equipments)),
  'cap_violations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'level',level,'plus_val',plus_val))
    from public.user_equipments where level>public.canonical_equipment_level_cap(coalesce(plus_val,0))),'[]'::jsonb),
  'scales',(select jsonb_agg(jsonb_build_object('level',level,'scale',public.equipment_level_battle_scale(level)) order by level)
    from unnest(array[1,2,25,49,50,51,75,99,100]) level),
  'caps',(select jsonb_agg(public.canonical_equipment_level_cap(plus_val) order by plus_val) from generate_series(0,10) plus_val),
  'flat_rows',(select jsonb_agg(to_jsonb(flat_rows) order by category,equipment_id,level,plus_val,stat) from flat_rows),
  'counts',jsonb_build_object(
    'characters',(select count(*) from public.canonical_character_master where version='2026-08-21'),
    'skills',(select count(*) from public.canonical_skill_master where version='2026-08-21'),
    'equipments',(select count(*) from public.canonical_equipment_master where version='2026-08-21'),
    'lb_steps',(select count(*) from public.canonical_equipment_lb_steps where version='2026-08-21'))
);
`;
const result = spawnSync(executable,["-X","-q","-v","ON_ERROR_STOP=1","-At","--host",connection.host,"--port",connection.port,"--username",connection.user,"--dbname",connection.database,"--command",query],{encoding:"utf8",env:{...process.env,PGPASSWORD:connection.password}});
if (result.status !== 0) throw new Error(result.stderr || "Development equipment progression verification failed");
const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
for (const [key,value] of Object.entries({characters:60,skills:70,equipments:170,lb_steps:11})) {
  if (Number(output.counts[key])!==value) throw new Error(`Canonical count mismatch: ${JSON.stringify(output.counts)}`);
}
for (const row of output.scales) {
  if (Math.abs(Number(row.scale)-canonicalEquipmentLevelScale(row.level))>1e-12) throw new Error(`Scale mismatch at Lv${row.level}`);
}
const expectedCaps=[...Array(11).keys()].map(canonicalEquipmentLevelCap);
if (JSON.stringify(output.caps)!==JSON.stringify(expectedCaps)) throw new Error(`Level cap mismatch: ${JSON.stringify(output.caps)}`);
for (const row of output.flat_rows) {
  const expected=canonicalEquipmentFlatStat(Number(row.master_flat),row.level,row.plus_val);
  if (Number(row.value)!==expected) throw new Error(`TS/DB flat stat mismatch: ${JSON.stringify(row)} expected ${expected}`);
}
console.log(JSON.stringify({
  project_ref:target.projectRef,
  environment:output.environment,
  migration_head:output.migration_head,
  counts:output.counts,
  user_counts:output.user_counts,
  cap_violations:output.cap_violations,
  scales:output.scales,
  caps:output.caps,
  flat_parity_rows:output.flat_rows.length,
},null,2));
