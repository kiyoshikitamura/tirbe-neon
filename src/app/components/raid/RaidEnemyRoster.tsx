"use client";

import { findCanonicalRaidVariant } from "@/domain/presentation/raidRosterPresentation";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import PvpDeckPresentation from "../pvp/PvpDeckPresentation";
import "./RaidEnemyRoster.css";

export default function RaidEnemyRoster({
  bossMasterId,
  raidName,
  className = "",
}: {
  bossMasterId?: string;
  raidName?: string;
  className?: string;
}) {
  const variant = findCanonicalRaidVariant(bossMasterId, raidName);
  if (!variant) return null;

  const members = variant.memberCharacterIds.map((characterId, index) => {
    const master = CHARACTERS_MASTER.find((character) => character.id === characterId);
    return {
      key: `${variant.raidVariantId}-${index}`,
      characterId,
      name: master?.jpName || characterId,
    };
  });

  return <section
    className={`raid-enemy-roster ${className}`.trim()}
    aria-label="レイドのエネミーメンバー"
    data-raid-variant-id={variant.raidVariantId}
  >
    <header><strong>メンバー</strong><span>{members.length}人</span></header>
    <PvpDeckPresentation ariaLabel="レイドのエネミーメンバー一覧" members={members} />
    <div className="raid-enemy-roster__names" aria-hidden="true">
      {members.map((member) => <span key={`${member.key}-name`}>{member.name}</span>)}
    </div>
  </section>;
}
