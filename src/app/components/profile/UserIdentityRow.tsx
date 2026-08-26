"use client";

import CharacterPresentation from "../character/CharacterPresentation";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import "./UserIdentityRow.css";

export default function UserIdentityRow({ userName, guildName, title, leaderCharacterId, leaderImageSrc, onOpen, variant = "standard" }: {
  userName: string;
  guildName?: string | null;
  title?: string | null;
  leaderCharacterId?: string | null;
  leaderImageSrc?: string;
  onOpen?: () => void;
  variant?: "compact" | "standard";
}) {
  const master = CHARACTERS_MASTER.find((entry) => entry.id === leaderCharacterId);
  const content = <>
    <CharacterPresentation src={leaderImageSrc || (master ? getCharacterTransparentImg(master.name) : undefined)} alt={`${userName}のリーダー`} variant="icon" rarity={master?.rarity} frameKind="character" metadata={false} />
    <span><strong>{userName}</strong>{guildName ? <small>TRIBE {guildName}</small> : <small>未所属</small>}{title ? <small>{title}</small> : null}</span>
  </>;
  return onOpen
    ? <button type="button" className={`user-identity-row is-${variant}`} onClick={onOpen} aria-label={`${userName}のプロフィールを開く`}>{content}</button>
    : <div className={`user-identity-row is-${variant}`}>{content}</div>;
}
