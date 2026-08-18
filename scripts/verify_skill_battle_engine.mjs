const { resolveBattle } = await import("../supabase/functions/resolve-battle/engine.ts");

const player = [{
  id: "support", name: "Support", team: "PLAYER", alignment: "ORDER",
  stats: { hp: 5000, atk: 1000, def: 500, spd: 200, luk: 0 },
  skills: [{ id: "buff", name: "Buff", kind: "BUFF", target: "ALLY_ALL", powerPercent: 0, cooldown: 3, modifier: { stat: "ATK", percent: 20, duration: 2 } }],
}];
const enemy = [{
  id: "enemy", name: "Enemy", team: "ENEMY", alignment: "JUSTICE",
  stats: { hp: 5000, atk: 1, def: 0, spd: 10, luk: 0 }, skills: [],
}];

const first = resolveBattle(77, "SKILL_PRIORITY", 3, player, enemy);
const second = resolveBattle(77, "SKILL_PRIORITY", 3, player, enemy);
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Executable skill battle is not deterministic");
if (!first.events.some((event) => event.type === "EFFECT" && event.payload.stat === "ATK" && event.payload.percent === 20)) throw new Error("BUFF effect was not applied by the Edge engine");
if (!first.events.some((event) => event.type === "DAMAGE" && Number(event.payload.amount) > 1000)) throw new Error("BUFF did not affect subsequent fallback damage");

const statusResult = resolveBattle(9, "SKILL_PRIORITY", 1, [{
  ...player[0], id: "jammer", skills: [{ id: "poison", name: "Poison", kind: "ATTACK", target: "ENEMY_SINGLE", powerPercent: 10, cooldown: 2, status: "POISON", statusChance: 95 }],
}], enemy);
if (!statusResult.events.some((event) => event.type === "STATUS" && event.payload.status === "POISON")) throw new Error("Approved status effect was not applied");

console.log("Executable skill battle engine verification passed.");
