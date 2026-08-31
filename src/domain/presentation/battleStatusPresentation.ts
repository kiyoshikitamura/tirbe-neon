export type BattleStatusPresentationTone = "buff" | "debuff" | "blind" | "taunt" | "shield" | "poison" | "bleed" | "stun" | "status";

const APPLY_LABELS: Readonly<Record<string, string>> = {
  ATK_UP: "攻撃UP", ATTACK_UP: "攻撃UP", BUFF_ATK: "攻撃UP",
  DEF_UP: "防御UP", DEFENSE_UP: "防御UP", BUFF_DEF: "防御UP",
  SPD_UP: "速度UP", SPEED_UP: "速度UP", BUFF_SPD: "速度UP",
  LUK_UP: "運UP", BUFF_LUK: "運UP",
  ATK_DOWN: "攻撃DOWN", ATTACK_DOWN: "攻撃DOWN", DEBUFF_ATK: "攻撃DOWN",
  DEF_DOWN: "防御DOWN", DEFENSE_DOWN: "防御DOWN", DEBUFF_DEF: "防御DOWN",
  SPD_DOWN: "速度DOWN", SPEED_DOWN: "速度DOWN", DEBUFF_SPD: "速度DOWN",
  LUK_DOWN: "運DOWN", DEBUFF_LUK: "運DOWN",
  STUN: "スタン", POISON: "毒", BLEED: "出血", BLIND: "暗闇", DARKNESS: "暗闇",
  SILENCE: "沈黙", TAUNT: "挑発", SHIELD: "シールド", REGEN: "継続回復",
  COUNTER: "反撃", REMOVE_STATUS: "弱体解除", BUFF: "強化", DEBUFF: "弱体化",
};

const normalize = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

export function battleStatusApplyLabel(payload: Record<string, unknown>): string {
  const stat = normalize(payload.stat);
  const kind = normalize(payload.kind);
  const statLabel = { ATK: "攻撃", DEF: "防御", SPD: "速度", LUK: "運" }[stat];
  if (statLabel && (kind === "BUFF" || kind === "DEBUFF")) return `${statLabel}${kind === "BUFF" ? "UP" : "DOWN"}`;
  const raw = String(payload.label ?? payload.statusName ?? payload.status ?? payload.effectId ?? payload.kind ?? "STATUS");
  const key = normalize(raw);
  if (APPLY_LABELS[key]) return APPLY_LABELS[key];
  if (key.startsWith("COUNTER_")) return "反撃";
  const match = Object.entries(APPLY_LABELS).find(([candidate]) => key.includes(candidate));
  return match?.[1] ?? (raw === key && /^[A-Z0-9_]+$/.test(raw) ? "状態変化" : raw);
}

export function battleStatusPersistentLabel(status: { id: string; kind: string; stat?: string }): string {
  const id = normalize(status.id);
  const stat = normalize(status.stat);
  const arrow = status.kind === "BUFF" ? "↑" : status.kind === "DEBUFF" ? "↓" : "";
  if (id === "STUN") return "気絶";
  if (id === "TAUNT") return "挑";
  if (id === "BLIND" || id === "DARKNESS") return "闇";
  if (id === "SILENCE") return "黙";
  if (id === "POISON") return "毒";
  if (id === "BLEED") return "血";
  if (id === "SHIELD") return "盾";
  if (id === "REGEN") return "回復";
  if (id === "COUNTER" || id.startsWith("COUNTER_")) return "反";
  if (stat === "ATK" || id.includes("ATK")) return `攻${arrow}`;
  if (stat === "DEF" || id.includes("DEF")) return `防${arrow}`;
  if (stat === "SPD" || id.includes("SPD")) return `速${arrow}`;
  if (stat === "LUK" || id.includes("LUK")) return `運${arrow}`;
  return status.kind === "BUFF" ? "強化" : status.kind === "DEBUFF" ? "弱体" : "状態";
}

export function battleStatusPresentationTone(payload: Record<string, unknown>): BattleStatusPresentationTone {
  const key = normalize(payload.status ?? payload.effectId ?? payload.kind);
  if (key.includes("BLIND") || key.includes("DARKNESS")) return "blind";
  if (key.includes("TAUNT")) return "taunt";
  if (key.includes("SILENCE")) return "debuff";
  if (key.includes("POISON")) return "poison";
  if (key.includes("BLEED")) return "bleed";
  if (key.includes("STUN")) return "stun";
  if (key.includes("SHIELD")) return "shield";
  if (key.includes("DEBUFF") || key.includes("_DOWN")) return "debuff";
  if (key.includes("BUFF") || key.includes("_UP") || key.includes("REGEN") || key.includes("COUNTER") || key.includes("REMOVE_STATUS")) return "buff";
  return "status";
}
