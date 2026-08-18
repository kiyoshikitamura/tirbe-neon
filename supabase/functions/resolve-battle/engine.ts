export type Tactic = "ATTACK_PRIORITY" | "HEAL_PRIORITY" | "SKILL_PRIORITY" | "BALANCED" | "WEAKNESS_FOCUS";
type Team = "PLAYER" | "ENEMY";
type Alignment = "JUSTICE" | "EVIL" | "ORDER" | "CHAOS";
type Status = "POISON" | "BLIND" | "SILENCE" | "STUN";

type Skill = {
  id: string; name: string; kind: "ATTACK" | "HEAL" | "BUFF" | "DEBUFF";
  target: "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL";
  powerPercent: number; cooldown: number; initialCooldown?: number;
  status?: Status; statusChance?: number;
  modifier?: { stat: "ATK" | "DEF" | "SPD"; percent: number; duration: number };
};
type InputUnit = { id: string; name: string; team: Team; alignment: Alignment; stats: { hp: number; atk: number; def: number; spd: number; luk: number; statusResistance?: number }; skills: Skill[] };
type Unit = InputUnit & { hp: number; cooldowns: Record<string, number>; statuses: Partial<Record<Status, number>>; rawDamage: number; modifiers: Array<{ stat: "ATK" | "DEF" | "SPD"; percent: number; remaining: number }> };
type Event = { index: number; round: number; type: string; payload: Record<string, unknown> };

const advantage: Record<Alignment, Alignment> = { JUSTICE: "EVIL", EVIL: "ORDER", ORDER: "CHAOS", CHAOS: "JUSTICE" };
const statusChance: Record<Status, number> = { POISON: 80, BLIND: 75, SILENCE: 65, STUN: 50 };

class Rng {
  private state: number;

  constructor(state: number) { this.state = state >>> 0 || 1; }
  next() { this.state ^= this.state << 13; this.state ^= this.state >>> 17; this.state ^= this.state << 5; return (this.state >>> 0) / 0x1_0000_0000; }
}

const live = (units: Unit[]) => units.filter((unit) => unit.hp > 0);
const ratio = (unit: Unit) => unit.hp / Math.max(1, unit.stats.hp);
const effectiveStat = (unit: Unit, stat: "ATK" | "DEF" | "SPD") => {
  const base = stat === "ATK" ? unit.stats.atk : stat === "DEF" ? unit.stats.def : unit.stats.spd;
  const percent = unit.modifiers.filter((modifier) => modifier.stat === stat).reduce((sum, modifier) => sum + modifier.percent, 0);
  return Math.max(0, Math.floor(base * (1 + percent / 100)));
};
const event = (events: Event[], round: number, type: string, payload: Record<string, unknown>) => events.push({ index: events.length, round, type, payload });
const enemyTarget = (actor: Unit, targets: Unit[], tactic: Tactic) => live(targets).sort((a, b) => {
  const aAdvantage = tactic === "WEAKNESS_FOCUS" && advantage[actor.alignment] === a.alignment ? 1 : 0;
  const bAdvantage = tactic === "WEAKNESS_FOCUS" && advantage[actor.alignment] === b.alignment ? 1 : 0;
  return bAdvantage - aAdvantage || ratio(a) - ratio(b) || a.id.localeCompare(b.id);
})[0];
const allyTarget = (targets: Unit[]) => live(targets).sort((a, b) => ratio(a) - ratio(b) || a.id.localeCompare(b.id))[0];

function chooseSkill(actor: Unit, allies: Unit[], tactic: Tactic): Skill | undefined {
  if (actor.statuses.SILENCE) return undefined;
  const available = actor.skills.filter((skill) => actor.cooldowns[skill.id] === 0);
  const attacks = available.filter((skill) => skill.kind === "ATTACK");
  const heals = available.filter((skill) => skill.kind === "HEAL");
  const needsHeal = live(allies).length > 0 && ratio(allyTarget(allies)) < 0.7;
  const strongest = (skills: Skill[]) => skills.sort((a, b) => b.powerPercent - a.powerPercent || a.id.localeCompare(b.id))[0];
  if (tactic === "HEAL_PRIORITY" && needsHeal && heals.length) return strongest(heals);
  if (tactic === "SKILL_PRIORITY") return strongest(available);
  if ((tactic === "ATTACK_PRIORITY" || tactic === "WEAKNESS_FOCUS") && attacks.length) return strongest(attacks);
  if (tactic === "BALANCED" && needsHeal && heals.length) return strongest(heals);
  return strongest(attacks) ?? strongest(available);
}

export function resolveBattle(seed: number, tactic: Tactic, maxRounds: number, player: InputUnit[], enemy: InputUnit[]) {
  const rng = new Rng(seed);
  const makeUnit = (unit: InputUnit): Unit => ({ ...unit, hp: unit.stats.hp, statuses: {}, rawDamage: 0, modifiers: [], cooldowns: Object.fromEntries(unit.skills.map((skill) => [skill.id, Math.max(0, skill.initialCooldown ?? 0)])) });
  const players = player.map(makeUnit);
  const enemies = enemy.map(makeUnit);
  const events: Event[] = [];
  let round = 0;
  while (round < maxRounds && live(players).length && live(enemies).length) {
    round++;
    const order = [...live(players), ...live(enemies)].sort((a, b) => effectiveStat(b, "SPD") - effectiveStat(a, "SPD") || (a.team === b.team ? a.id.localeCompare(b.id) : a.team === "PLAYER" ? -1 : 1));
    for (const actor of order) {
      if (actor.hp <= 0 || !live(players).length || !live(enemies).length) continue;
      for (const id of Object.keys(actor.cooldowns)) actor.cooldowns[id] = Math.max(0, actor.cooldowns[id] - 1);
      if (actor.statuses.POISON) {
        const amount = Math.max(1, Math.floor(actor.stats.atk * 0.2));
        actor.hp = Math.max(0, actor.hp - amount);
        event(events, round, "DAMAGE", { actorId: actor.id, targetId: actor.id, amount, source: "POISON", remainingHp: actor.hp });
        if (actor.hp === 0) { event(events, round, "DEFEAT", { targetId: actor.id }); continue; }
      }
      if (actor.statuses.STUN) {
        event(events, round, "ACTION", { actorId: actor.id, action: "STUN_SKIP" });
      } else {
        const allies = actor.team === "PLAYER" ? players : enemies;
        const foes = actor.team === "PLAYER" ? enemies : players;
        const skill = chooseSkill(actor, allies, tactic);
        const chosen: Skill = skill ?? { id: "BASIC_ATTACK", name: "通常攻撃", kind: "ATTACK", target: "ENEMY_SINGLE", powerPercent: 100, cooldown: 0 };
        const targets = chosen.target === "ENEMY_ALL" ? live(foes) : chosen.target === "ALLY_ALL" ? live(allies) : [chosen.target.startsWith("ALLY") ? allyTarget(allies) : enemyTarget(actor, foes, tactic)];
        event(events, round, "ACTION", { actorId: actor.id, skillId: chosen.id, target: chosen.target });
        for (const target of targets.filter(Boolean)) {
          if (chosen.kind === "HEAL") {
            const amount = Math.floor(actor.stats.hp * chosen.powerPercent / 100);
            target.hp = Math.min(target.stats.hp, target.hp + amount);
            event(events, round, "HEAL", { actorId: actor.id, targetId: target.id, amount, remainingHp: target.hp });
            continue;
          }
          if ((chosen.kind === "BUFF" || chosen.kind === "DEBUFF") && chosen.modifier) {
            const percent = chosen.kind === "DEBUFF" ? -Math.abs(chosen.modifier.percent) : Math.abs(chosen.modifier.percent);
            target.modifiers = target.modifiers.filter((modifier) => modifier.stat !== chosen.modifier?.stat);
            target.modifiers.push({ stat: chosen.modifier.stat, percent, remaining: Math.max(1, chosen.modifier.duration) });
            event(events, round, "EFFECT", { actorId: actor.id, targetId: target.id, kind: chosen.kind, stat: chosen.modifier.stat, percent, duration: chosen.modifier.duration });
            continue;
          }
          if (chosen.kind !== "ATTACK") continue;
          const hit = !actor.statuses.BLIND || rng.next() < 0.8;
          if (!hit) { event(events, round, "DAMAGE", { actorId: actor.id, targetId: target.id, amount: 0, hit: false }); continue; }
          const targetDef = effectiveStat(target, "DEF");
          const mitigation = targetDef / (targetDef + 27000);
          const critical = rng.next() < Math.min(0.35, 0.05 + actor.stats.luk * 0.002);
          const attribute = advantage[actor.alignment] === target.alignment ? 1.2 : 1;
          const amount = Math.max(1, Math.floor(effectiveStat(actor, "ATK") * chosen.powerPercent / 100 * (1 - mitigation) * attribute * (critical ? 1.5 : 1) * (0.95 + rng.next() * 0.1)));
          actor.rawDamage += amount;
          target.hp = Math.max(0, target.hp - amount);
          event(events, round, "DAMAGE", { actorId: actor.id, targetId: target.id, amount, critical, hit: true, remainingHp: target.hp });
          if (target.hp === 0) event(events, round, "DEFEAT", { targetId: target.id });
          if (chosen.status && target.hp > 0 && rng.next() * 100 < Math.max(5, Math.min(95, (chosen.statusChance ?? statusChance[chosen.status]) - (target.stats.statusResistance ?? 0)))) {
            target.statuses[chosen.status] = chosen.status === "POISON" ? 3 : chosen.status === "BLIND" ? 2 : 1;
            event(events, round, "STATUS", { actorId: actor.id, targetId: target.id, status: chosen.status });
          }
        }
        if (skill) actor.cooldowns[skill.id] = skill.cooldown;
      }
      for (const status of Object.keys(actor.statuses) as Status[]) {
        actor.statuses[status] = Math.max(0, (actor.statuses[status] ?? 0) - 1);
        if (actor.statuses[status] === 0) delete actor.statuses[status];
      }
      actor.modifiers = actor.modifiers.map((modifier) => ({ ...modifier, remaining: modifier.remaining - 1 })).filter((modifier) => modifier.remaining > 0);
    }
  }
  const winner: Team = live(enemies).length === 0 ? "PLAYER" : "ENEMY";
  event(events, round, "RESULT", { winner, rounds: round });
  return { winner, rounds: round, events, playerRawDamage: players.reduce((total, unit) => total + unit.rawDamage, 0), enemyRawDamage: enemies.reduce((total, unit) => total + unit.rawDamage, 0) };
}
