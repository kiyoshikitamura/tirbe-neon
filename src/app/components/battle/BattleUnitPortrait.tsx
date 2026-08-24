"use client";

import CharacterPresentation from "../character/CharacterPresentation";
import { getAttributeBadgeAsset, getAttributeLabel } from "@/utils/attributeAssets";
import { getRarityBadgeAsset } from "@/utils/rarityAssets";
import "./BattleUnitPortrait.css";

export type BattleParticipantView = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  level?: number;
  awakeningLevel?: number;
  rarity?: string;
  shield?: number;
  isDead?: boolean;
  tauntTurns?: number;
  stunTurns?: number;
  alignment?: string;
  skills?: Array<Record<string, unknown>>;
  activeEffects?: Array<{ id: string; kind: string; remainingDuration: number | null; stat?: string; amount?: number }>;
};

export type BattleDamagePopup = {
  val: number;
  type: "dmg" | "heal" | "shield";
  isCritical?: boolean;
};

type Props = {
  participant: BattleParticipantView;
  imageSrc?: string;
  side: "player" | "enemy";
  frame?: "party" | "action";
  domId?: string;
  actor?: boolean;
  target?: boolean;
  placeholderAsset?: boolean;
  advantage?: boolean;
  popup?: BattleDamagePopup | null;
  rarity?: string;
  attribute?: string;
};

export default function BattleUnitPortrait({
  participant,
  imageSrc,
  side,
  frame = "party",
  domId,
  actor = false,
  target = false,
  placeholderAsset = false,
  advantage = false,
  popup,
  rarity,
  attribute,
}: Props) {
  const maxHp = Math.max(1, Number(participant.maxHp) || 1);
  const hp = Math.max(0, Number(participant.hp) || 0);
  const hpPercent = Math.min(100, (hp / maxHp) * 100);
  const legacyStatuses = [
    Number(participant.stunTurns || 0) > 0 ? { id: "STUN", kind: "STATUS", remainingDuration: participant.stunTurns || 0 } : null,
    Number(participant.tauntTurns || 0) > 0 ? { id: "TAUNT", kind: "STATUS", remainingDuration: participant.tauntTurns || 0 } : null,
    Number(participant.shield || 0) > 0 ? { id: "SHIELD", kind: "SHIELD", remainingDuration: null } : null,
  ].filter(Boolean) as NonNullable<BattleParticipantView["activeEffects"]>;
  const statuses = participant.activeEffects?.length ? participant.activeEffects : legacyStatuses;
  const visibleStatuses = statuses.slice(0, 3);
  const statusShortLabel = (status: { id: string; kind: string }) => ({
    STUN: "ST", TAUNT: "TA", BLIND: "BL", SILENCE: "SI", POISON: "PS", BLEED: "BD",
    SHIELD: "SH", REGEN: "RG", COUNTER: "CT", BUFF: "UP", DEBUFF: "DN",
  }[status.id] || ({ BUFF: "UP", DEBUFF: "DN", DOT: "DT" }[status.kind] ?? status.id.slice(0, 2)));

  const popupSign = popup?.type === "dmg" ? "−" : "+";

  return (
    <article
      id={domId}
      className={`battle-unit battle-unit-${frame} battle-unit-${side} is-rarity-${String(rarity || participant.rarity || "N").toLowerCase()} ${placeholderAsset ? "has-placeholder-art" : ""} ${actor ? "is-actor" : ""} ${target ? "is-target" : ""} ${participant.isDead ? "is-defeated" : ""}`.trim()}
      aria-label={`${participant.name} HP ${hp} / ${maxHp}${actor ? " 行動中" : ""}${target ? " 対象" : ""}`}
    >
      <div className="battle-unit-art">
        <CharacterPresentation src={imageSrc} alt={participant.name} variant="battle" className={`character-presentation-battle-${frame}`} />
        {actor && <span className="battle-unit-role is-actor-label">ACTOR</span>}
        {target && <span className="battle-unit-role is-target-label">TARGET</span>}
        {participant.isDead && <span className="battle-unit-defeated">戦闘不能</span>}
        {popup && (
          <div className={`battle-unit-popup is-${popup.type} ${popup.isCritical ? "is-critical" : ""}`}>
            {popup.isCritical && <small>CRITICAL</small>}
            {advantage && popup.type === "dmg" && <small>WEAK</small>}
            <strong>{popupSign}{Math.max(0, Number(popup.val) || 0).toLocaleString()}</strong>
          </div>
        )}
      </div>

      <div className={`battle-unit-meta ${frame === "action" ? "is-action-identity" : ""}`}>
        <strong>{participant.name}</strong>
        <span className="battle-unit-identity-badges">
          {(rarity || participant.rarity) && <img src={getRarityBadgeAsset(rarity || participant.rarity)} alt={String(rarity || participant.rarity).toUpperCase()} />}
          {getAttributeBadgeAsset(attribute) && <img src={getAttributeBadgeAsset(attribute) || ""} alt={getAttributeLabel(attribute)} />}
        </span>
      </div>
      {frame === "party" && <div className="battle-unit-growth"><span>Lv.{Math.max(1, Number(participant.level || 1))}</span>{Number(participant.awakeningLevel || 0) > 0 && <b>+{Number(participant.awakeningLevel)}</b>}</div>}
      <div className="battle-unit-hp" aria-hidden="true"><i style={{ width: `${hpPercent}%` }} /></div>
      <div className="battle-unit-hp-copy"><span>HP</span><b>{Math.round(hpPercent)}%</b></div>
      {statuses.length > 0 && <div className="battle-unit-statuses" aria-label={statuses.map((status) => status.id).join("、")}>
        {visibleStatuses.map((status) => <span key={`${status.id}-${status.kind}`} title={`${status.id}${status.remainingDuration == null ? "" : ` ${status.remainingDuration}`}`}>{statusShortLabel(status)}</span>)}
        {statuses.length > visibleStatuses.length && <span title={statuses.slice(visibleStatuses.length).map((status) => status.id).join("、")}>+{statuses.length - visibleStatuses.length}</span>}
      </div>}
    </article>
  );
}
