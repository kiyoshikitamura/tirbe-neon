import assert from "node:assert/strict";
import fs from "node:fs";

const pvp = fs.readFileSync(new URL("../src/app/components/PvpTab.tsx", import.meta.url), "utf8");
const ranking = fs.readFileSync(new URL("../src/app/components/RankingTab.tsx", import.meta.url), "utf8");
const pvpHook = fs.readFileSync(new URL("../src/app/context/hooks/usePvp.ts", import.meta.url), "utf8");
const productionSql = fs.readFileSync(new URL("../supabase/migrations/20260822000184_pvp_raid_ranking_production.sql", import.meta.url), "utf8");
const matchmaking = JSON.parse(fs.readFileSync(new URL("../src/domain/gameplay/canonical/data/pvp_matchmaking_20260822.json", import.meta.url), "utf8"));

assert.match(pvp, /supabase\.rpc\("get_public_pvp_rankings", \{ p_daily: false, p_limit: 100, p_offset: 0 \}\)/);
assert.match(pvp, /rankPosition: Number\(ownRow\.rank_position\)/);
assert.match(pvp, /ownPvpStanding \? `#\$\{ownPvpStanding\.rankPosition\}` : "圏外"/);
assert.doesNotMatch(pvp, /row\?\.rank_position \|\| \(index >= 0 \? index \+ 1/);
assert.match(ranking, /serverRank = Number\(sortedPvpRankings\[idx\]\.rank_position\)/);
assert.match(ranking, /serverRank = Number\(item\.rank_position\)/);

assert.match(pvp, /const handleRefreshOpponents = async \(\) =>/);
assert.match(pvp, /await fetchPvpOpponents\(session\.user\.id, displayedPvpRate\)/);
assert.match(pvpHook, /if \(opponentsRequestRef\.current\) return opponentsRequestRef\.current/);
assert.match(pvpHook, /opponentsRequestRef\.current = request/);
assert.equal(matchmaking.refreshAllowed, true);
assert.match(productionSql, /selected as \(select \* from candidates order by match_tier,abs\(rating-coalesce\(p_my_points,1000\)\),id limit 5\)/);

console.log("PvP R7 rank authority and refresh request contract: PASS");
