import { resolveBattle } from "./engine.ts";

const player = [{
  id: "player-1",
  name: "Player",
  team: "PLAYER" as const,
  alignment: "JUSTICE" as const,
  stats: { hp: 2_000, atk: 900, def: 100, spd: 120, luk: 20 },
  skills: [{
    id: "player-strike",
    name: "Strike",
    activationType: "ACTIVE" as const,
    target: "ENEMY_SINGLE" as const,
    effects: ["DAMAGE 160% ATK"],
    cooldown: 0,
    availableFromRound: 1,
  }],
}];

const enemy = [{
  id: "enemy-1",
  name: "Enemy",
  team: "ENEMY" as const,
  alignment: "EVIL" as const,
  stats: { hp: 400, atk: 10, def: 0, spd: 10, luk: 0 },
  skills: [],
}];

Deno.test("same replay seed produces the exact same resolution", () => {
  const first = resolveBattle(91_337, "ATTACK_PRIORITY", 30, player, enemy);
  const second = resolveBattle(91_337, "ATTACK_PRIORITY", 30, player, enemy);

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error("Replay resolution must be deterministic for a fixed seed");
  }
});

Deno.test("a defeated defense gives the player the win and records damage", () => {
  const result = resolveBattle(91_337, "ATTACK_PRIORITY", 30, player, enemy);

  if (result.winner !== "PLAYER") throw new Error("Expected player victory");
  if (result.playerRawDamage <= 0) throw new Error("Expected recorded player damage");
  if (!result.events.some((entry) => entry.type === "DEFEAT" && entry.payload.targetId === "enemy-1")) {
    throw new Error("Expected a defense defeat event");
  }
});

Deno.test("an unresolved round limit is an enemy win", () => {
  const result = resolveBattle(1, "BALANCED", 0, player, enemy);

  if (result.winner !== "ENEMY" || result.rounds !== 0) {
    throw new Error("Unresolved battles must not grant a player victory");
  }
});
