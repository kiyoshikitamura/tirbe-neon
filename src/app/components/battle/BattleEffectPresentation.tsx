"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CharacterPresentation from "../character/CharacterPresentation";
import type { BattleParticipantView } from "./BattleUnitPortrait";
import "./BattleEffectPresentation.css";

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
  const skill = participant?.skills?.find((entry) => String(entry.name ?? "") === cutIn.skillName);
  const skillId = String(skill?.id ?? skill?.skill_card_id ?? skill?.skill_id ?? "");
  const actorRarity = stringValue(participant?.rarity);
  const isBasicAttack = isBasicAttackPresentation(skillId, cutIn.skillName);

  return {
    charName: cutIn.charName,
    skillName: cutIn.skillName,
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

  if (!visible?.tier) return null;
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
        <small>{visible.tier === "STANDARD" ? "SKILL" : `${visible.tier} SKILL`}</small>
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
