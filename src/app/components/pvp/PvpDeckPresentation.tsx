"use client";

import CharacterPresentation from "../character/CharacterPresentation";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import { SkillIconGrid } from "../skill/SkillPresentation";
import type { SkillCardMaster } from "@/utils/skills_master_data";
import "./PvpDeckPresentation.css";

export type PvpDeckMember = {
  key: string;
  characterId?: string;
  name?: string;
  level?: number;
  skillId?: string;
  skillIds?: string[];
  imageSrc?: string;
};

export function canonicalPvpCharacter(characterId?: string) {
  return CHARACTERS_MASTER.find((entry: any) => entry.id === characterId || entry.name === characterId);
}

export function PvpPowerSummary({ totalPower, atk, def, spd, className = "" }: { totalPower: number; atk?: number; def?: number; spd?: number; className?: string }) {
  const hasSecondary = [atk, def, spd].some((value) => typeof value === "number");
  return <div className={`pvp-power-summary ${className}`.trim()}>
    <strong><span>総合力</span><b>{Math.max(0, Number(totalPower || 0)).toLocaleString()}</b></strong>
    {hasSecondary && <div>
      <span>ATK <b>{Math.max(0, Number(atk || 0)).toLocaleString()}</b></span>
      <span>DEF <b>{Math.max(0, Number(def || 0)).toLocaleString()}</b></span>
      <span>SPD <b>{Math.max(0, Number(spd || 0)).toLocaleString()}</b></span>
    </div>}
  </div>;
}

export default function PvpDeckPresentation({ members, showSkills = false, onSkillSelect, onMemberSelect, className = "", ariaLabel }: { members: PvpDeckMember[]; showSkills?: boolean; onSkillSelect?: (skill: SkillCardMaster) => void; onMemberSelect?: (member: PvpDeckMember) => void; className?: string; ariaLabel: string }) {
  return <div className={`pvp-deck-presentation ${showSkills ? "has-skills" : ""} ${className}`.trim()} aria-label={ariaLabel}>
    {members.map((member) => {
      const master = canonicalPvpCharacter(member.characterId);
      const characterId = master?.id || member.characterId || "";
      const skillIds = showSkills ? (member.skillIds || [member.skillId]).filter(Boolean).slice(0, 6) as string[] : [];
      const portrait = <CharacterPresentation
          src={member.imageSrc || (master ? getCharacterTransparentImg(master.name) : undefined)}
          alt={master?.jpName || member.name || "キャラクター"}
          variant="thumbnail"
          rarity={master?.rarity || undefined}
          frameKind="character"
          metadata={false}
        />;
      return <div className="pvp-deck-member" key={member.key} data-character-id={characterId}>
        {onMemberSelect ? <button type="button" className="pvp-deck-character-button" onClick={() => onMemberSelect(member)} aria-label={`${master?.jpName || member.name || "プレイヤー"}のプロフィール`}>{portrait}</button> : portrait}
        {showSkills && <SkillIconGrid skills={skillIds} onSelect={onSkillSelect} />}
      </div>;
    })}
  </div>;
}
