"use client";

import { useEffect, useMemo, useState } from "react";
import { findCanonicalRaidVariant } from "@/domain/presentation/raidRosterPresentation";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import { preloadAssetManifest } from "@/app/lib/screenAssets";
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
  const members = useMemo(() => variant?.memberCharacterIds.map((characterId, index) => {
    const master = CHARACTERS_MASTER.find((character) => character.id === characterId);
    return {
      key: `${variant.raidVariantId}-${index}`,
      characterId,
      name: master?.jpName || characterId,
      imageSrc: master ? getCharacterTransparentImg(master.name) : undefined,
    };
  }) || [], [variant]);
  const memberAssetKey = members.map((member) => member.imageSrc || "").join("|");
  const [readyAssetKey, setReadyAssetKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void preloadAssetManifest(members.flatMap((member) => member.imageSrc
      ? [{ src: member.imageSrc, required: true }]
      : []), 8000).then(() => {
      if (!cancelled) setReadyAssetKey(memberAssetKey);
    });
    return () => { cancelled = true; };
  }, [memberAssetKey, members]);

  if (!variant) return null;

  return <section
    className={`raid-enemy-roster ${className}`.trim()}
    aria-label="レイドのエネミーメンバー"
    data-raid-variant-id={variant.raidVariantId}
    data-roster-ready={String(readyAssetKey === memberAssetKey)}
  >
    <header><strong>メンバー</strong><span>{members.length}人</span></header>
    <div className="raid-enemy-roster__content" aria-hidden={readyAssetKey !== memberAssetKey}>
      <PvpDeckPresentation ariaLabel="レイドのエネミーメンバー一覧" members={members} />
      <div className="raid-enemy-roster__names" aria-hidden="true">
        {members.map((member) => <span key={`${member.key}-name`}>{member.name}</span>)}
      </div>
    </div>
  </section>;
}
