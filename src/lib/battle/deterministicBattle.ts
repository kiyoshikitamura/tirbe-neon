export type BattleTactic = "ATTACK_PRIORITY" | "HEAL_PRIORITY" | "SKILL_PRIORITY" | "BALANCED" | "WEAKNESS_FOCUS";
export type BattleTeam = "PLAYER" | "ENEMY";
export type StatusId = "POISON" | "BLIND" | "SILENCE" | "STUN";
export type SkillKind = "ATTACK" | "HEAL" | "BUFF" | "DEBUFF";
export type TargetType = "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL";

export interface BattleStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  luk: number;
  statusResistance?: number;
}

export interface BattleSkill {
  id: string;
  name: string;
  kind: SkillKind;
  target: TargetType;
  powerPercent: number;
  cooldown: number;
  initialCooldown?: number;
  status?: StatusId;
  statusChance?: number;
  modifier?: { stat: "ATK" | "DEF" | "SPD"; percent: number; duration: number };
}

export interface BattleUnitInput {
  id: string;
  name: string;
  team: BattleTeam;
  alignment: "JUSTICE" | "EVIL" | "ORDER" | "CHAOS";
  stats: BattleStats;
  skills: BattleSkill[];
}

interface BattleUnit extends BattleUnitInput {
  hp: number;
  statuses: Partial<Record<StatusId, number>>;
  cooldowns: Record<string, number>;
  rawDamage: number;
  modifiers: Array<{ stat: "ATK" | "DEF" | "SPD"; percent: number; remaining: number }>;
}

export interface BattleReplayEvent {
  index: number;
  round: number;
  type: "ACTION" | "DAMAGE" | "HEAL" | "STATUS" | "EFFECT" | "DEFEAT" | "RESULT";
  payload: Record<string, unknown>;
}

export interface DeterministicBattleInput {
  seed: number;
  tactic: BattleTactic;
  maxRounds: number;
  player: BattleUnitInput[];
  enemy: BattleUnitInput[];
}

export interface DeterministicBattleResult {
  winner: BattleTeam;
  rounds: number;
  events: BattleReplayEvent[];
  playerRawDamage: number;
  enemyRawDamage: number;
  player: BattleUnit[];
  enemy: BattleUnit[];
}

const ATTRIBUTE_ADVANTAGE: Record<BattleUnitInput["alignment"], BattleUnitInput["alignment"]> = {
  JUSTICE: "EVIL",
  EVIL: "ORDER",
  ORDER: "CHAOS",
  CHAOS: "JUSTICE",
};

const STATUS_BASE_CHANCE: Record<StatusId, number> = { POISON: 80, BLIND: 75, SILENCE: 65, STUN: 50 };

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 0x1_0000_0000;
  }
}

function toRuntimeUnit(unit: BattleUnitInput): BattleUnit {
  return {
    ...unit,
    hp: unit.stats.hp,
    statuses: {},
    cooldowns: Object.fromEntries(unit.skills.map((skill) => [skill.id, Math.max(0, skill.initialCooldown ?? 0)])),
    rawDamage: 0,
    modifiers: [],
  };
}

function effectiveStat(unit: BattleUnit, stat: "ATK" | "DEF" | "SPD"): number {
  const base = stat === "ATK" ? unit.stats.atk : stat === "DEF" ? unit.stats.def : unit.stats.spd;
  const multiplier = unit.modifiers
    .filter((modifier) => modifier.stat === stat)
    .reduce((total, modifier) => total + modifier.percent, 0);
  return Math.max(0, Math.floor(base * (1 + multiplier / 100)));
}

function alive(units: BattleUnit[]): BattleUnit[] {
  return units.filter((unit) => unit.hp > 0);
}

function hpRatio(unit: BattleUnit): number {
  return unit.hp / unit.stats.hp;
}

function emit(events: BattleReplayEvent[], round: number, type: BattleReplayEvent["type"], payload: Record<string, unknown>) {
  events.push({ index: events.length, round, type, payload });
}

function selectEnemy(actor: BattleUnit, enemies: BattleUnit[], tactic: BattleTactic): BattleUnit {
  const candidates = alive(enemies);
  if (tactic === "WEAKNESS_FOCUS") {
    return candidates.slice().sort((a, b) => {
      const aAdvantage = ATTRIBUTE_ADVANTAGE[actor.alignment] === a.alignment ? 1 : 0;
      const bAdvantage = ATTRIBUTE_ADVANTAGE[actor.alignment] === b.alignment ? 1 : 0;
      return bAdvantage - aAdvantage || hpRatio(a) - hpRatio(b);
    })[0];
  }
  return candidates.slice().sort((a, b) => hpRatio(a) - hpRatio(b))[0];
}

function selectAlly(allies: BattleUnit[]): BattleUnit {
  return alive(allies).slice().sort((a, b) => hpRatio(a) - hpRatio(b))[0];
}

function chooseSkill(actor: BattleUnit, allies: BattleUnit[], enemies: BattleUnit[], tactic: BattleTactic): BattleSkill | undefined {
  if (actor.statuses.SILENCE) return undefined;
  const available = actor.skills.filter((skill) => actor.cooldowns[skill.id] === 0);
  if (available.length === 0) return undefined;
  const attacks = available.filter((skill) => skill.kind === "ATTACK");
  const heals = available.filter((skill) => skill.kind === "HEAL");
  const targetNeedsHeal = hpRatio(selectAlly(allies)) < 0.7;
  if (tactic === "HEAL_PRIORITY" && targetNeedsHeal && heals.length) return heals.sort((a, b) => b.powerPercent - a.powerPercent)[0];
  if (tactic === "SKILL_PRIORITY") return available.sort((a, b) => b.powerPercent - a.powerPercent)[0];
  if ((tactic === "ATTACK_PRIORITY" || tactic === "WEAKNESS_FOCUS") && attacks.length) {
    return attacks.sort((a, b) => b.powerPercent - a.powerPercent)[0];
  }
  if (tactic === "BALANCED" && targetNeedsHeal && heals.length) return heals.sort((a, b) => b.powerPercent - a.powerPercent)[0];
  return attacks.sort((a, b) => b.powerPercent - a.powerPercent)[0] ?? available[0];
}

function damage(actor: BattleUnit, target: BattleUnit, powerPercent: number, rng: SeededRandom): { amount: number; critical: boolean; hit: boolean } {
  const hit = !actor.statuses.BLIND || rng.next() < 0.8;
  if (!hit) return { amount: 0, critical: false, hit: false };
  const targetDef = effectiveStat(target, "DEF");
  const mitigation = targetDef / (targetDef + 27000);
  const attribute = ATTRIBUTE_ADVANTAGE[actor.alignment] === target.alignment ? 1.2 : 1;
  const critical = rng.next() < Math.min(0.35, 0.05 + actor.stats.luk * 0.002);
  const random = 0.95 + rng.next() * 0.1;
  const amount = Math.max(1, Math.floor(effectiveStat(actor, "ATK") * (powerPercent / 100) * (1 - mitigation) * attribute * (critical ? 1.5 : 1) * random));
  return { amount, critical, hit: true };
}

function applyStatus(actor: BattleUnit, target: BattleUnit, status: StatusId, chance: number | undefined, rng: SeededRandom): boolean {
  const baseChance = chance ?? STATUS_BASE_CHANCE[status];
  const actualChance = Math.max(5, Math.min(95, baseChance - (target.stats.statusResistance ?? 0)));
  if (rng.next() * 100 >= actualChance) return false;
  target.statuses[status] = status === "POISON" ? 3 : status === "BLIND" ? 2 : 1;
  return true;
}

function applyDamage(events: BattleReplayEvent[], round: number, actor: BattleUnit, target: BattleUnit, amount: number, critical: boolean, hit: boolean) {
  if (!hit) {
    emit(events, round, "DAMAGE", { actorId: actor.id, targetId: target.id, amount: 0, hit: false });
    return;
  }
  actor.rawDamage += amount;
  target.hp = Math.max(0, target.hp - amount);
  emit(events, round, "DAMAGE", { actorId: actor.id, targetId: target.id, amount, critical, hit: true, remainingHp: target.hp });
  if (target.hp === 0) emit(events, round, "DEFEAT", { targetId: target.id });
}

export function resolveDeterministicBattle(input: DeterministicBattleInput): DeterministicBattleResult {
  const rng = new SeededRandom(input.seed);
  const player = input.player.map(toRuntimeUnit);
  const enemy = input.enemy.map(toRuntimeUnit);
  const events: BattleReplayEvent[] = [];
  let round = 0;

  while (round < input.maxRounds && alive(player).length && alive(enemy).length) {
    round += 1;
    const order = [...alive(player), ...alive(enemy)]
      .map((unit, index) => ({ unit, index }))
      .sort((a, b) => effectiveStat(b.unit, "SPD") - effectiveStat(a.unit, "SPD") || (a.unit.team === b.unit.team ? a.index - b.index : a.unit.team === "PLAYER" ? -1 : 1))
      .map(({ unit }) => unit);
    for (const actor of order) {
      if (actor.hp === 0 || !alive(player).length || !alive(enemy).length) continue;
      for (const skillId of Object.keys(actor.cooldowns)) actor.cooldowns[skillId] = Math.max(0, actor.cooldowns[skillId] - 1);
      if (actor.statuses.POISON) {
        const poisonDamage = Math.max(1, Math.floor(actor.stats.atk * 0.2));
        actor.hp = Math.max(0, actor.hp - poisonDamage);
        emit(events, round, "DAMAGE", { actorId: actor.id, targetId: actor.id, amount: poisonDamage, source: "POISON", remainingHp: actor.hp });
        if (actor.hp === 0) {
          emit(events, round, "DEFEAT", { targetId: actor.id });
          continue;
        }
      }
      if (actor.statuses.STUN) {
        emit(events, round, "ACTION", { actorId: actor.id, action: "STUN_SKIP" });
      } else {
        const allies = actor.team === "PLAYER" ? player : enemy;
        const foes = actor.team === "PLAYER" ? enemy : player;
        const skill = chooseSkill(actor, allies, foes, input.tactic);
        const chosen = skill ?? { id: "BASIC_ATTACK", name: "通常攻撃", kind: "ATTACK" as const, target: "ENEMY_SINGLE" as const, powerPercent: 100, cooldown: 0 };
        emit(events, round, "ACTION", { actorId: actor.id, skillId: chosen.id, target: chosen.target });
        const targets = chosen.target === "ENEMY_ALL" ? alive(foes) : chosen.target === "ALLY_ALL" ? alive(allies) : [chosen.target.startsWith("ALLY") ? selectAlly(allies) : selectEnemy(actor, foes, input.tactic)];
        for (const target of targets) {
          if (chosen.kind === "HEAL") {
            const amount = Math.floor(actor.stats.hp * (chosen.powerPercent / 100));
            target.hp = Math.min(target.stats.hp, target.hp + amount);
            emit(events, round, "HEAL", { actorId: actor.id, targetId: target.id, amount, remainingHp: target.hp });
          } else if (chosen.kind === "ATTACK") {
            const result = damage(actor, target, chosen.powerPercent, rng);
            applyDamage(events, round, actor, target, result.amount, result.critical, result.hit);
            if (result.hit && target.hp > 0 && chosen.status && applyStatus(actor, target, chosen.status, chosen.statusChance, rng)) {
              emit(events, round, "STATUS", { actorId: actor.id, targetId: target.id, status: chosen.status });
            }
          } else if ((chosen.kind === "BUFF" || chosen.kind === "DEBUFF") && chosen.modifier) {
            const percent = chosen.kind === "DEBUFF" ? -Math.abs(chosen.modifier.percent) : Math.abs(chosen.modifier.percent);
            target.modifiers = target.modifiers.filter((modifier) => modifier.stat !== chosen.modifier?.stat);
            target.modifiers.push({ stat: chosen.modifier.stat, percent, remaining: Math.max(1, chosen.modifier.duration) });
            emit(events, round, "EFFECT", { actorId: actor.id, targetId: target.id, kind: chosen.kind, stat: chosen.modifier.stat, percent, duration: chosen.modifier.duration });
          }
        }
        if (skill) actor.cooldowns[skill.id] = skill.cooldown;
      }
      for (const status of Object.keys(actor.statuses) as StatusId[]) {
        actor.statuses[status] = Math.max(0, (actor.statuses[status] ?? 0) - 1);
        if (actor.statuses[status] === 0) delete actor.statuses[status];
      }
      actor.modifiers = actor.modifiers
        .map((modifier) => ({ ...modifier, remaining: modifier.remaining - 1 }))
        .filter((modifier) => modifier.remaining > 0);
    }
  }

  const winner: BattleTeam = alive(enemy).length === 0 ? "PLAYER" : "ENEMY";
  emit(events, round, "RESULT", { winner, rounds: round });
  return {
    winner,
    rounds: round,
    events,
    playerRawDamage: player.reduce((total, unit) => total + unit.rawDamage, 0),
    enemyRawDamage: enemy.reduce((total, unit) => total + unit.rawDamage, 0),
    player,
    enemy,
  };
}
