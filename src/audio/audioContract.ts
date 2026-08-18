export type BgmScene = "TITLE" | "HOME" | "BATTLE" | "GUILD" | "QUEST" | "PVP" | "RAID" | "GVG";

export type SeEvent =
  | "UI_TAP"
  | "UI_BACK"
  | "UI_MODAL_OPEN"
  | "UI_MODAL_CLOSE"
  | "GACHA_START"
  | "GACHA_REVEAL"
  | "GACHA_SR"
  | "GACHA_SSR"
  | "FORMATION_CONFIRM"
  | "GROWTH_START"
  | "LEVEL_UP"
  | "QUEST_START"
  | "QUEST_INSTANT"
  | "BATTLE_START"
  | "BATTLE_ATTACK"
  | "BATTLE_SLASH"
  | "BATTLE_GUN"
  | "BATTLE_SKILL"
  | "BATTLE_DAMAGE"
  | "BATTLE_CRITICAL"
  | "BATTLE_WEAK"
  | "VICTORY"
  | "DEFEAT"
  | "REWARD"
  | "MISSION_COMPLETE"
  | "MISSION_REWARD"
  | "GUILD_JOIN";

export const AUDIO_DEFAULTS = {
  bgmEnabled: true,
  seEnabled: true,
  bgmVolume: 0.45,
  seVolume: 0.7,
} as const;

export const AUDIO_STORAGE_KEY = "tribe_neon_audio_settings_v1";

export const BGM_ASSETS: Record<BgmScene, string> = {
  TITLE: "/audio/bgm/title.mp3",
  HOME: "/audio/bgm/home.mp3",
  BATTLE: "/audio/bgm/battle.mp3",
  GUILD: "/audio/bgm/guild.mp3",
  QUEST: "/audio/bgm/home.mp3",
  PVP: "/audio/bgm/battle.mp3",
  RAID: "/audio/bgm/battle.mp3",
  GVG: "/audio/bgm/battle.mp3",
};

export const SE_ASSETS: Record<SeEvent, string> = {
  UI_TAP: "/audio/se/ui-tap.mp3",
  UI_BACK: "/audio/se/ui-back.mp3",
  UI_MODAL_OPEN: "/audio/se/ui-modal-open.mp3",
  UI_MODAL_CLOSE: "/audio/se/ui-modal-close.mp3",
  GACHA_START: "/audio/se/gacha-start.mp3",
  GACHA_REVEAL: "/audio/se/gacha-reveal.mp3",
  GACHA_SR: "/audio/se/gacha-sr.mp3",
  GACHA_SSR: "/audio/se/gacha-ssr.mp3",
  FORMATION_CONFIRM: "/audio/se/formation-confirm.mp3",
  GROWTH_START: "/audio/se/growth-start.mp3",
  LEVEL_UP: "/audio/se/level-up.mp3",
  QUEST_START: "/audio/se/quest-start.mp3",
  QUEST_INSTANT: "/audio/se/quest-instant.mp3",
  BATTLE_START: "/audio/se/battle-start.mp3",
  BATTLE_ATTACK: "/audio/se/battle-attack.mp3",
  BATTLE_SLASH: "/audio/se/battle-slash.mp3",
  BATTLE_GUN: "/audio/se/battle-gun.mp3",
  BATTLE_SKILL: "/audio/se/battle-skill.mp3",
  BATTLE_DAMAGE: "/audio/se/battle-damage.mp3",
  BATTLE_CRITICAL: "/audio/se/battle-critical.mp3",
  BATTLE_WEAK: "/audio/se/battle-weak.mp3",
  VICTORY: "/audio/se/victory.mp3",
  DEFEAT: "/audio/se/defeat.mp3",
  REWARD: "/audio/se/reward.mp3",
  MISSION_COMPLETE: "/audio/se/mission-complete.mp3",
  MISSION_REWARD: "/audio/se/mission-reward.mp3",
  GUILD_JOIN: "/audio/se/guild-join.mp3",
};

export const LEGACY_SE_EVENT_MAP: Record<string, SeEvent> = {
  click: "UI_TAP",
  error: "UI_MODAL_OPEN",
  attack: "BATTLE_ATTACK",
  hit: "BATTLE_DAMAGE",
  gacha: "GACHA_START",
};

export const SE_PRIORITY: Record<SeEvent, number> = {
  VICTORY: 4,
  DEFEAT: 4,
  GACHA_SSR: 4,
  BATTLE_SKILL: 4,
  GACHA_SR: 3,
  BATTLE_CRITICAL: 3,
  BATTLE_WEAK: 3,
  LEVEL_UP: 3,
  REWARD: 3,
  MISSION_COMPLETE: 3,
  MISSION_REWARD: 3,
  GUILD_JOIN: 3,
  GACHA_START: 2,
  GACHA_REVEAL: 2,
  FORMATION_CONFIRM: 2,
  GROWTH_START: 2,
  QUEST_START: 2,
  QUEST_INSTANT: 2,
  BATTLE_START: 2,
  BATTLE_ATTACK: 2,
  BATTLE_SLASH: 2,
  BATTLE_GUN: 2,
  BATTLE_DAMAGE: 1,
  UI_TAP: 0,
  UI_BACK: 0,
  UI_MODAL_OPEN: 0,
  UI_MODAL_CLOSE: 0,
};

export const SE_COOLDOWN_MS: Partial<Record<SeEvent, number>> = {
  UI_TAP: 70,
  BATTLE_ATTACK: 90,
  BATTLE_DAMAGE: 110,
  BATTLE_CRITICAL: 160,
  BATTLE_WEAK: 160,
};
