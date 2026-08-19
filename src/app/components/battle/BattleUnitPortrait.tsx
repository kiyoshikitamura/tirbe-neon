"use client";

import CharacterPresentation from "../character/CharacterPresentation";
import "./BattleUnitPortrait.css";

export type BattleParticipantView = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shield?: number;
  isDead?: boolean;
  tauntTurns?: number;
  stunTurns?: number;
  alignment?: string;
  skills?: Array<Record<string, unknown>>;
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
};

const alignmentLabel: Record<string, string> = {
  JUSTICE: "正義",
  EVIL: "悪",
  ORDER: "秩序",
  CHAOS: "混沌",
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
}: Props) {
  const maxHp = Math.max(1, Number(participant.maxHp) || 1);
  const hp = Math.max(0, Number(participant.hp) || 0);
  const hpPercent = Math.min(100, (hp / maxHp) * 100);
  const statuses = [
    Number(participant.stunTurns || 0) > 0 ? "STUN" : null,
    Number(participant.tauntTurns || 0) > 0 ? "挑発" : null,
    Number(participant.shield || 0) > 0 ? "SHIELD" : null,
  ].filter(Boolean) as string[];

  const popupSign = popup?.type === "dmg" ? "−" : "+";

  return (
    <article
      id={domId}
      className={`battle-unit battle-unit-${frame} battle-unit-${side} ${placeholderAsset ? "has-placeholder-art" : ""} ${actor ? "is-actor" : ""} ${target ? "is-target" : ""} ${participant.isDead ? "is-defeated" : ""}`.trim()}
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

      <div className="battle-unit-meta">
        <strong>{participant.name}</strong>
        <span>{alignmentLabel[String(participant.alignment || "")] || String(participant.alignment || "")}</span>
      </div>
      <div className="battle-unit-hp" aria-hidden="true"><i style={{ width: `${hpPercent}%` }} /></div>
      <div className="battle-unit-hp-copy"><span>HP</span><b>{Math.round(hpPercent)}%</b></div>
      {statuses.length > 0 && <div className="battle-unit-statuses">{statuses.map((status) => <span key={status}>{status}</span>)}</div>}
    </article>
  );
}
