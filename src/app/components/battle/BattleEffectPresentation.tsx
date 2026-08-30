"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CharacterPresentation from "../character/CharacterPresentation";
import type { BattleParticipantView } from "./BattleUnitPortrait";
import type { BattleTargetResolutionGroup } from "@/domain/presentation/battlePresentationUnit";
import "./BattleEffectPresentation.css";
import { isInternalBattleLabel, safeBattleCharacterName } from "@/domain/presentation/battleSkillLabels";

export const BATTLE_EFFECT_ASSETS = {
  heavyImpact: "/effects/fx_heavy_impact.png",
  heavySlash: "/effects/fx_heavy_slash.png",
  muzzleFlash: "/effects/fx_muzzle_flash.png",
  cutInSr: "/effects/cutin_bg_sr.png",
  cutInSsr: "/effects/cutin_bg_ssr.png",
  screenDarken: "/effects/fx_screen_darken.png",
  speedLines: "/effects/fx_speed_lines.png",
} as const;

export type BattleImpactKind = "impact" | "slash" | "muzzle";
type BattleCutInTier = "STANDARD" | "SR" | "SSR";

export type BattleSkillPresentation = {
  charName: string;
  skillName: string;
  tier: BattleCutInTier | null;
  impact: BattleImpactKind;
};

const effectAsset: Record<BattleImpactKind, string> = {
  impact: BATTLE_EFFECT_ASSETS.heavyImpact,
  slash: BATTLE_EFFECT_ASSETS.heavySlash,
  muzzle: BATTLE_EFFECT_ASSETS.muzzleFlash,
};

const stringValue = (value: unknown) => typeof value === "string" ? value.trim().toUpperCase() : "";

const STATUS_LABELS: Record<string, string> = {
  ATK_UP: "攻撃UP", ATTACK_UP: "攻撃UP", ATK_DOWN: "攻撃DOWN", ATTACK_DOWN: "攻撃DOWN",
  DEF_UP: "防御UP", DEFENSE_UP: "防御UP", DEF_DOWN: "防御DOWN", DEFENSE_DOWN: "防御DOWN",
  SPD_UP: "速度UP", SPEED_UP: "速度UP", SPD_DOWN: "速度DOWN", SPEED_DOWN: "速度DOWN",
  STUN: "スタン", POISON: "毒", BLEED: "出血", BLIND: "暗闇", SILENCE: "沈黙", TAUNT: "挑発",
  SHIELD: "シールド", REGEN: "継続回復", BUFF: "強化", DEBUFF: "弱体化",
};

export function battleStatusLabel(payload: Record<string, unknown>): string {
  const stat = String(payload.stat ?? "").toUpperCase();
  const kind = String(payload.kind ?? "").toUpperCase();
  const statLabel = { ATK: "攻撃", DEF: "防御", SPD: "速度", LUK: "運" }[stat];
  if (statLabel && (kind === "BUFF" || kind === "DEBUFF")) return `${statLabel}${kind === "BUFF" ? "UP" : "DOWN"}`;
  const raw = String(payload.label ?? payload.statusName ?? payload.status ?? payload.effectId ?? payload.kind ?? "STATUS");
  const normalized = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  const match = Object.entries(STATUS_LABELS).find(([key]) => normalized.includes(key));
  return match?.[1] ?? (raw === normalized && /^[A-Z0-9_]+$/.test(raw) ? "状態変化" : raw);
}

export function BattleTargetReaction({ group, side }: { group: BattleTargetResolutionGroup; side: "player" | "enemy" }) {
  const damageEvents = group.events.filter((event) => event.type === "DAMAGE");
  const healEvents = group.events.filter((event) => event.type === "HEAL");
  const damage = damageEvents.reduce((sum, event) => sum + Math.max(0, Number(event.payload.amount ?? 0)), 0);
  const heal = healEvents.reduce((sum, event) => sum + Math.max(0, Number(event.payload.effectiveAmount ?? event.payload.amount ?? 0)), 0);
  const status = group.events.find((event) => event.type === "STATUS" || (event.type === "EFFECT" && event.payload.kind !== "ACTIVE_EFFECT_SYNC"));
  const defeated = group.events.some((event) => event.type === "DEFEAT");
  const missed = damageEvents.length > 0 && damageEvents.every((event) => event.payload.hit === false);
  const statusKey = String(status?.payload.status ?? status?.payload.kind ?? "").toUpperCase();
  const tone = statusKey.includes("SHIELD") ? "shield"
    : statusKey.includes("BUFF") || statusKey.includes("UP") || statusKey.includes("REGEN") ? "buff"
      : status ? "debuff" : "none";

  return <div className={`battle-target-reaction is-${side} is-${tone}`} role="status">
    {damage > 0 && !missed && <i className="battle-target-impact" aria-hidden="true" />}
    {heal > 0 && <i className="battle-target-recovery" aria-hidden="true" />}
    {status && <i className="battle-target-status-wash" aria-hidden="true" />}
    <span className="battle-target-reaction-copy">
      {missed ? <strong className="is-miss">MISS</strong> : damage > 0 ? <strong>−{damage.toLocaleString()}</strong> : null}
      {heal > 0 && <strong className="is-heal">+{heal.toLocaleString()}</strong>}
      {status && <small>{battleStatusLabel(status.payload)}</small>}
      {defeated && <b>戦闘不能</b>}
    </span>
  </div>;
}

const isBasicAttackPresentation = (skillId: string, skillName: string) => {
  const normalizedId = stringValue(skillId).replace(/[\s-]+/g, "_");
  const normalizedName = stringValue(skillName).replace(/[\s-]+/g, "_");
  return /(^|_)BASIC_ATTACK($|_)/.test(normalizedId)
    || /(^|_)NORMAL_ATTACK($|_)/.test(normalizedId)
    || /^(BASIC_ATTACK|NORMAL_ATTACK|ATTACK)$/.test(normalizedName)
    || skillName.trim() === "通常攻撃";
};

function resolveImpactKind(skill: Record<string, unknown> | undefined): BattleImpactKind {
  const explicitType = stringValue(
    skill?.battle_effect
      ?? skill?.effect_asset
      ?? skill?.attack_type
      ?? skill?.weapon_type,
  );
  if (["SLASH", "BLADE", "HEAVY_SLASH", "FX_HEAVY_SLASH"].includes(explicitType)) return "slash";
  if (["GUN", "FIREARM", "PROJECTILE", "MUZZLE", "MUZZLE_FLASH", "FX_MUZZLE_FLASH"].includes(explicitType)) return "muzzle";
  return "impact";
}

export function resolveBattleSkillPresentation(
  cutIn: { charName: string; skillName: string } | null,
  participant?: BattleParticipantView,
): BattleSkillPresentation | null {
  if (!cutIn) return null;
  const safeSkillName = isInternalBattleLabel(cutIn.skillName) ? "スキル発動" : cutIn.skillName;
  const skill = participant?.skills?.find((entry) => String(entry.name ?? "") === safeSkillName);
  const skillId = String(skill?.id ?? skill?.skill_card_id ?? skill?.skill_id ?? "");
  const actorRarity = stringValue(participant?.rarity);
  const isBasicAttack = isBasicAttackPresentation(skillId, safeSkillName);

  return {
    charName: safeBattleCharacterName(cutIn.charName),
    skillName: safeSkillName,
    tier: isBasicAttack ? null : actorRarity === "SSR" ? "SSR" : actorRarity === "SR" ? "SR" : "STANDARD",
    impact: resolveImpactKind(skill),
  };
}

export function preloadBattleEffects() {
  if (typeof window === "undefined") return;
  Object.values(BATTLE_EFFECT_ASSETS).forEach((src) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    void image.decode().catch(() => undefined);
  });
}

type CutInProps = {
  presentation: BattleSkillPresentation | null;
  participant?: BattleParticipantView;
  imageSrc?: string;
  speed: number;
};

export function BattleSkillCutIn({ presentation, participant, imageSrc, speed }: CutInProps) {
  const [visible, setVisible] = useState<BattleSkillPresentation | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPresentationKeyRef = useRef("");

  useLayoutEffect(() => {
    if (!presentation?.tier) {
      lastPresentationKeyRef.current = "";
      setVisible(null);
      return;
    }
    const presentationKey = `${presentation.charName}:${presentation.skillName}:${presentation.tier}`;
    if (lastPresentationKeyRef.current === presentationKey) return;
    lastPresentationKeyRef.current = presentationKey;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(presentation);
    const minimumDuration = speed > 1 ? 720 : presentation.tier === "SSR" ? 1100 : 960;
    hideTimerRef.current = setTimeout(() => setVisible(null), minimumDuration);
  }, [presentation, speed]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  if (!visible?.tier || visible.tier === "STANDARD") return null;
  const tier = visible.tier.toLowerCase();
  return (
    <div className={`battle-skill-cutin is-${tier} is-speed-${speed > 1 ? "fast" : "normal"}`} aria-label={`${visible.charName} ${visible.skillName}`}>
      <img className="battle-cutin-darken" src={BATTLE_EFFECT_ASSETS.screenDarken} alt="" aria-hidden="true" />
      <img
        className="battle-cutin-frame"
        src={visible.tier === "SSR" ? BATTLE_EFFECT_ASSETS.cutInSsr : BATTLE_EFFECT_ASSETS.cutInSr}
        alt=""
        aria-hidden="true"
      />
      <img className="battle-cutin-speed-lines" src={BATTLE_EFFECT_ASSETS.speedLines} alt="" aria-hidden="true" />
      <div className="battle-cutin-character">
        <CharacterPresentation src={imageSrc} alt={participant?.name || visible.charName} variant="battle" className="character-presentation-battle-cutin" />
      </div>
      <div className="battle-cutin-copy">
        <small>{visible.tier} SKILL</small>
        <strong>{visible.skillName}</strong>
        <span>{visible.charName}</span>
      </div>
    </div>
  );
}

export function BattleImpactEffect({ kind, speed }: { kind: BattleImpactKind; speed: number }) {
  return (
    <div className={`battle-asset-impact is-${kind} is-speed-${speed > 1 ? "fast" : "normal"}`} aria-hidden="true">
      <img src={effectAsset[kind]} alt="" />
    </div>
  );
}

export function BattleSkillResolutionVfx({
  presentation,
  phase,
  actorSide,
}: {
  presentation: BattleSkillPresentation | null;
  phase: "TARGET_FOCUS" | "ATTACK_MOTION";
  actorSide: "player" | "enemy";
}) {
  if (!presentation?.tier) return null;
  return (
    <div className={`battle-skill-resolution-vfx is-${phase.toLowerCase().replaceAll("_", "-")} is-${actorSide}`} role="status" aria-label={`${presentation.skillName} 攻撃演出`}>
      <img src={BATTLE_EFFECT_ASSETS.speedLines} alt="" aria-hidden="true" />
      <i aria-hidden="true" />
      <strong>{presentation.skillName}</strong>
    </div>
  );
}
