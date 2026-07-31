"use client";

export interface UseBattleOptions {
  session: any;
  userCharactersDbList: any[];
  skillLimitBreakMaster: any[];
  userEquipmentsList: any[];
  userSkillsList: any[];
  selectedMembers: string[];
  selectedLeader: string;
  userGuild: any;
  userGuildMember: any;
  gvgBaseControls: any[];
  currentBaseId: string;
  username: string;
  playCyberSe: (type: "click" | "attack" | "hit" | "gacha") => void;
  syncBootstrapData: (userId: string) => Promise<void>;
  pvpTickets: number;
  setPvpTickets: React.Dispatch<React.SetStateAction<number>>;
  userLevel: number;
  setUserLevel: React.Dispatch<React.SetStateAction<number>>;
  userXp: number;
  setUserXp: React.Dispatch<React.SetStateAction<number>>;
  pvpPoints: number;
  setPvpPoints: React.Dispatch<React.SetStateAction<number>>;
  pvpRankings: any[];
  raidBossHp: number;
  setRaidBossHp: React.Dispatch<React.SetStateAction<number>>;
  raidBossMaxHp: number;
  setRaidBossMaxHp: React.Dispatch<React.SetStateAction<number>>;
  raidTotalDamage: number;
  setRaidTotalDamage: React.Dispatch<React.SetStateAction<number>>;
  cash: number;
  setCash: React.Dispatch<React.SetStateAction<number>>;
  setErrorMessage: (msg: string | null) => void;
  addGuildXpAndContributionByAction: (actionType: string) => Promise<void>;
  setConfirmDialogConfig?: (config: any) => void;
  patrolNpcs?: any[];
  patrol?: any;
}

export interface ParticipantState {
  id: string; // "char_xxx" or "ENEMY_xxx" or "ENEMY"
  name: string;
  characterId: string; // Master Character ID
  alignment?: string; // アライメント (JUSTICE, EVIL, ORDER, CHAOS)
  level: number;
  hp: number;
  maxHp: number;
  shield: number;
  isDead: boolean;
  isEnemy: boolean;
  tauntTurns: number;
  stunTurns: number; // スタン手番スキップ用ターン数
  stats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    luk: number;
  };
  skills: any[]; // List of master skills equipped
}

export interface CardState {
  id: string; // Unique instance ID in hand
  skillId: string; // Skill Master ID
  name: string;
  apCost: number;
  description: string;
  targetType: "ENEMY_SINGLE" | "ENEMY_ALL" | "ALLY_SINGLE" | "ALLY_ALL" | "SELF";
  rarity: "N" | "R" | "SR" | "SSR";
  effectType: "ATTACK" | "HEAL" | "BUFF" | "DEBUFF" | "SHIELD" | "SPECIAL";
  ownerId?: string; // キャラクター得意スキルID
}

export interface SkillLogItem {
  actorName: string;
  skillName: string;
  targetName: string;
  value: number;
  isCritical: boolean;
  type: "DAMAGE" | "HEAL" | "SHIELD" | "BUFF" | "DEBUFF" | "SPECIAL";
}
