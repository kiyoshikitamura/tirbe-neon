import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pvp = read("src/app/components/PvpTab.tsx");
const hook = read("src/app/context/hooks/usePvp.ts");
const skill = read("src/app/components/skill/SkillPresentation.tsx");
const rank = read("src/app/components/presentation/RankPresentation.tsx");
const battle = read("src/app/components/CardBattleView.tsx");
const migration = read("supabase/migrations/20260826000197_pvp_opponent_pagination.sql");

assert(pvp.includes('p_daily: true'), "PvP Top must use Daily ranking authority");
assert(!pvp.includes('`#${ownPvpStanding'), "PvP Top must not render hash ranks");
assert(pvp.includes('pvpPoints < 1 ? openBpShortageDialog()'), "Opponent CTA must precheck BP");
assert(pvp.includes('handleUseItem("PVP_POINT_TICKET")'), "BP recovery must use canonical PvP ticket");
assert(hook.includes('get_pvp_opponents_page'), "Opponent refresh must use server pagination");
assert(hook.includes('p_offset: requestedOffset'), "Opponent pagination must send its offset");
assert(rank.includes('`${value}位`') && rank.includes('"圏外"'), "Rank formatter contract missing");
assert(skill.includes('.slice(0, 6)'), "Shared Skill presentation must cap at six");
assert(skill.includes('mode === "confirmation" && visible.length === 0'), "Confirmation mode must hide empty slots");
assert(battle.includes('<SkillDetailDialog') && battle.includes('<SkillIconGrid'), "Pre-Battle must use shared Skill presentation");
assert(!battle.includes('タップで詳細'), "Non-functional character detail affordance remains");
assert(!battle.includes('setup-match-copy">対戦情報') && !battle.includes('battleMode === "PVP" ? "対決"'), "Legacy Pre-Battle headers remain");
for (const frozen of [
  "abs(coalesce(rank.rank_points,1000)-coalesce(p_my_points,1000))<=300",
  "v_my_power*7000 and v_my_power*14000",
  "abs(coalesce(rank.rank_points,1000)-coalesce(p_my_points,1000))<=500",
  "v_my_power*5000 and v_my_power*18000",
  "order by match_tier,abs(rating-coalesce(p_my_points,1000)),id",
]) assert(migration.includes(frozen), `Frozen matchmaking rule changed or missing: ${frozen}`);
assert(migration.includes("limit 5 offset v_effective_offset"), "Pagination must preserve five-candidate pages");
assert(migration.includes("daily_ranked.rank_position opponent_rank"), "Opponent rank must use Daily server authority");

console.log(JSON.stringify({ status: "PASS", checks: 18, rank: "DAILY", recoveryItem: "PVP_POINT_TICKET", pageSize: 5, maxSkills: 6 }));
