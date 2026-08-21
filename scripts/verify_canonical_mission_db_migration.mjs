import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const source = JSON.parse(read("src/domain/gameplay/canonical/data/missions_20260821.json"));
const sql = read("supabase/migrations/20260821000173_mission_production_master.sql");

const requireText = (text, label) => {
  if (!sql.includes(text)) throw new Error(`Migration is missing ${label}.`);
};

if (source.missions.length !== 37) throw new Error("Canonical Mission count must be 37.");
requireText("where item_id='NORMAL_GACHA_TICKET' and quantity>0", "legacy generic ticket balance guard");
requireText("NORMAL_GACHA_TICKET_CHARACTER", "Character Normal Ticket integration");
requireText("NORMAL_GACHA_TICKET_SKILL", "Skill Normal Ticket integration");
requireText("NORMAL_GACHA_TICKET_EQUIPMENT", "Equipment Normal Ticket integration");
requireText("EQUIP_LB_PART", "Equipment LB material integration");
requireText("SKILL_MANUAL", "Skill LB material integration");
requireText("perform public.evaluate_mission_progress(v_user_id,'GEAR_LIMIT_BREAK',1)", "Equipment LB progress hook");
requireText("create or replace function public.canonical_funnel_milestone_satisfied", "funnel milestone evaluation");
requireText("create trigger enforce_mission_claim_prerequisite_trigger", "claim prerequisite enforcement");
requireText("create trigger mission_claim_unlock_trigger", "post-claim unlock");
requireText("is_enabled and is_provisional", "Production flag assertion");

const activeFunctionSql = sql.slice(sql.indexOf("create or replace function public.limit_break_equipment"));
for (const legacy of ["'NORMAL_CHARACTER_GACHA_TICKET'", "'EQUIP_LB_HAMMER'", "'SKILL_LB_BOOK'"]) {
  const occurrences = activeFunctionSql.split(legacy).length - 1;
  if (occurrences > 1) throw new Error(`Legacy ID remains in active generated functions: ${legacy}`);
}
if (!sql.includes("reward_item_id in ('NORMAL_CHARACTER_GACHA_TICKET','NORMAL_GACHA_TICKET','EQUIP_LB_HAMMER','SKILL_LB_BOOK')")) {
  throw new Error("Legacy Mission reward zero-count assertion is missing.");
}

const missionLiteralStart = sql.indexOf("$missions$") + "$missions$".length;
const missionLiteralEnd = sql.indexOf("$missions$::jsonb", missionLiteralStart);
const generatedRows = JSON.parse(sql.slice(missionLiteralStart, missionLiteralEnd));
if (generatedRows.length !== 37) throw new Error("Generated Mission row count must be 37.");
for (const mission of source.missions) {
  const generated = generatedRows.find((row) => row.id === mission.id);
  if (!generated || generated.reward_item_id !== mission.rewardItemId || generated.reward_quantity !== mission.rewardQuantity) {
    throw new Error(`Generated Mission mismatch: ${mission.id}`);
  }
}

console.log("Canonical Mission DB migration verification PASS (37 rows, canonical rewards, hooks, prerequisites, category tickets).");
