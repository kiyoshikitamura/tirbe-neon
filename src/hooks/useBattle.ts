"use client";

import { createElement, useRef, useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import {
  CHARACTERS_MASTER,
  ENEMIES_MASTER
} from "@/utils/game_constants";
import { getCharacterTotalStats, getCharacterApBonus } from "@/utils/stats_calculator";

import { CompatibleBattleTacticId, UseBattleOptions, ParticipantState, CardState, SkillLogItem } from "./battle/battleTypes";
import { selectCharacterSkillByTactic } from "./battle/battleAI";
import { postNpcYajiMessage, saveBattleSessionState } from "./battle/battleUtils";
import { RAID_COST_TABLE, RAID_MAX_DAILY } from "../utils/game_constants";
import { participantsToBattleUnits, toDeterministicTactic } from "./battle/deterministicBattleAdapter";
import { gvgDefenseSnapshotToParticipants } from "./battle/gvgSnapshotAdapter";
import { patrolSnapshotToParticipants, serverBattleEvents, type ServerBattleEvent } from "./battle/patrolReplayAdapter";
import { beginActionPerformance } from "@/utils/actionPerformance";
import ModeBattleResultCard from "@/app/components/battle/ModeBattleResultCard";

export type { UseBattleOptions, ParticipantState, CardState, SkillLogItem };

const patrolReplayCursorKey = (replayId: string) => `tribe_neon_patrol_replay_cursor_${replayId}`;
type BattleMode = "PVP" | "PVP_PRACTICE" | "RAID" | "GVG" | "PATROL";

function savedPatrolReplayCursor(replayId: unknown, fallback: unknown): number {
  const fallbackIndex = Math.max(0, Number(fallback || 0));
  if (typeof window === "undefined" || typeof replayId !== "string" || !replayId) return fallbackIndex;
  const saved = Number(window.localStorage.getItem(patrolReplayCursorKey(replayId)));
  return Number.isFinite(saved) && saved >= 0 ? saved : fallbackIndex;
}

export function useBattle(options: UseBattleOptions) {
  const {
    session,
    userCharactersDbList,
    userEquipmentsList,
    userSkillsList,
    skillLimitBreakMaster,
    selectedMembers,
    selectedLeader,
    userGuild,
    userGuildMember,
    gvgBaseControls,
    currentBaseId,
    username,
    playCyberSe,
    syncBootstrapData,
    pvpPoints,
    setPvpPoints,
    userLevel,
    setUserLevel,
    userXp,
    setUserXp,
    vitality,
    setVitality,
    pvpRate,
    setPvpRate,
    pvpRankings,
    raidAttemptsToday,
    setRaidAttemptsToday,
    cash,
    setCash,
    diamonds,
    setDiamonds,
    raidBossHp,
    raidBossMaxHp,
    raidTotalDamage,
    setRaidTotalDamage,
    setErrorMessage,
    addGuildXpAndContributionByAction,
    setConfirmDialogConfig,
    patrolNpcs = [],
    patrol,
    setTutorialStep,
    navigateTab,
  } = options;

  const [battleSessionId, setBattleSessionId] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<BattleMode | null>(null);
  const [hasRaidControlBonus, setHasRaidControlBonus] = useState<boolean>(false);
  const [battleOpponentName, setBattleOpponentName] = useState<string>("");
  const [battleState, setBattleState] = useState<"SETUP" | "PLAYING" | "OUTRO" | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [ap, setAp] = useState<number>(3);
  const [maxAp, setMaxAp] = useState<number>(10);
  const [tactic, setTactic] = useState<CompatibleBattleTacticId>("ATTACK_PRIORITY");
  const [battleSpeed, setBattleSpeed] = useState<number>(1); // 1 = 1x, 2 = 2x
  const [isAutoPaused, setIsAutoPaused] = useState<boolean>(false);
  const [gvgTargetBaseId, setGvgTargetBaseId] = useState<string | null>(null);
  const [battleLoading, setBattleLoading] = useState<boolean>(false);
  const battleStartInFlightRef = useRef(false);
  const [enemyTactic, setEnemyTactic] = useState<string>("OFFENSIVE");
  const [opponentPoints, setOpponentPoints] = useState<number>(1000);
  const [officialGvgAttackId, setOfficialGvgAttackId] = useState<string | null>(null);
  const [officialGvgReplayId, setOfficialGvgReplayId] = useState<string | null>(null);
  const [officialGvgWinner, setOfficialGvgWinner] = useState<"PLAYER" | "ENEMY" | null>(null);
  const [officialPatrolReplayId, setOfficialPatrolReplayId] = useState<string | null>(null);
  const [officialPatrolWinner, setOfficialPatrolWinner] = useState<"PLAYER" | "ENEMY" | null>(null);
  const [officialPatrolEvents, setOfficialPatrolEvents] = useState<ServerBattleEvent[]>([]);
  const [officialPatrolEventIndex, setOfficialPatrolEventIndex] = useState(0);
  const [officialPvpReplayId, setOfficialPvpReplayId] = useState<string | null>(null);
  const [officialPvpWinner, setOfficialPvpWinner] = useState<"PLAYER" | "ENEMY" | null>(null);
  const [officialPvpEvents, setOfficialPvpEvents] = useState<ServerBattleEvent[]>([]);
  const [officialPvpEventIndex, setOfficialPvpEventIndex] = useState(0);
  const [officialPvpResult, setOfficialPvpResult] = useState<any | null>(null);
  const [officialRaidReplayId, setOfficialRaidReplayId] = useState<string | null>(null);
  const [officialRaidWinner, setOfficialRaidWinner] = useState<"PLAYER" | "ENEMY" | null>(null);
  const [officialRaidEvents, setOfficialRaidEvents] = useState<ServerBattleEvent[]>([]);
  const [officialRaidEventIndex, setOfficialRaidEventIndex] = useState(0);
  const [officialRaidResult, setOfficialRaidResult] = useState<any | null>(null);

  // 5v5 状態管理
  const [playerPartyStates, setPlayerPartyStates] = useState<ParticipantState[]>([]);
  const [enemyPartyStates, setEnemyPartyStates] = useState<ParticipantState[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [battleRound, setBattleRound] = useState<number>(1);

  // 演出・ポップアップ
  const [activeSkillCutIn, setActiveSkillCutIn] = useState<{ charName: string; skillName: string } | null>(null);
  const [targetLine, setTargetLine] = useState<{ fromId: string; toId: string } | null>(null);
  const [activeShakingCharId, setActiveShakingCharId] = useState<string | null>(null);
  const [damagePopup, setDamagePopup] = useState<{ val: number; type: "dmg" | "heal" | "shield"; isCritical?: boolean; x: number; y: number; charId: string } | null>(null);



  // 進行中のバトルセッションを復元 (Resume) する関数
  const resumeActiveBattleSession = async () => {
    if (!session?.user?.id) return false;
    try {
      const { data: activeSessions, error } = await supabase
        .from("battle_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "ACTIVE")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error || !activeSessions || activeSessions.length === 0) {
        return false;
      }

      const activeSession = activeSessions[0];
      const playerStateData = activeSession.player_state;
      const enemyStateData = activeSession.enemy_state;

      if (playerStateData && enemyStateData) {
        setBattleSessionId(activeSession.id);
        const mappedMode = activeSession.battle_type === "ARENA" ? "PVP" : activeSession.battle_type;
        setBattleMode(mappedMode);
        setPlayerPartyStates(playerStateData.playerStates || []);
        setEnemyPartyStates(enemyStateData.enemyStates || []);
        setAp(playerStateData.ap || 3);
        setMaxAp(playerStateData.maxAp || 5);
        if (playerStateData.tactic) setTactic(playerStateData.tactic);
        if (playerStateData.log) setBattleLog(playerStateData.log);
        if (playerStateData.timelineIndex !== undefined) setTimelineIndex(playerStateData.timelineIndex);
        setBattleRound(1);
        if (playerStateData.gvgAreaId) setGvgTargetBaseId(playerStateData.gvgAreaId);
        setOfficialGvgAttackId(playerStateData.officialGvgAttackId || null);
        setOfficialGvgReplayId(playerStateData.officialGvgReplayId || null);
        setOfficialGvgWinner(playerStateData.officialGvgWinner === "PLAYER" ? "PLAYER" : playerStateData.officialGvgWinner === "ENEMY" ? "ENEMY" : null);
        setOfficialPatrolReplayId(playerStateData.officialPatrolReplayId || null);
        setOfficialPatrolWinner(playerStateData.officialPatrolWinner === "PLAYER" ? "PLAYER" : playerStateData.officialPatrolWinner === "ENEMY" ? "ENEMY" : null);
        setOfficialPatrolEvents(serverBattleEvents(playerStateData.officialPatrolEvents));
        setOfficialPatrolEventIndex(savedPatrolReplayCursor(playerStateData.officialPatrolReplayId, playerStateData.officialPatrolEventIndex));
        setOfficialPvpReplayId(playerStateData.officialPvpReplayId || null);
        setOfficialPvpWinner(playerStateData.officialPvpWinner === "PLAYER" ? "PLAYER" : playerStateData.officialPvpWinner === "ENEMY" ? "ENEMY" : null);
        setOfficialPvpEvents(serverBattleEvents(playerStateData.officialPvpEvents));
        setOfficialPvpEventIndex(savedPatrolReplayCursor(playerStateData.officialPvpReplayId, playerStateData.officialPvpEventIndex));
        setOfficialPvpResult(playerStateData.officialPvpResult || null);
        setOfficialRaidReplayId(playerStateData.officialRaidReplayId || null);
        setOfficialRaidWinner(playerStateData.officialRaidWinner === "PLAYER" ? "PLAYER" : playerStateData.officialRaidWinner === "ENEMY" ? "ENEMY" : null);
        setOfficialRaidEvents(serverBattleEvents(playerStateData.officialRaidEvents));
        setOfficialRaidEventIndex(savedPatrolReplayCursor(playerStateData.officialRaidReplayId, playerStateData.officialRaidEventIndex));
        setOfficialRaidResult(playerStateData.officialRaidResult || null);

        setBattleState("PLAYING");
        return true;
      }
    } catch (err) {
      console.warn("Failed to resume active battle session:", err);
    }
    return false;
  };

  // バトルの初期設定フェーズへ移行
  const startCardBattleInternal = async (
    mode: BattleMode,
    targetName: string,
    areaIdOrOpponentUserId?: string,
    oppPoints?: number,
    oppTactic?: string,
    opponentMainAlign?: string,
    opponentSubAlign?: string,
    opponentDefenseCharIds?: string[],
    supportCharacter?: any,
    patrolNpcOverride?: any,
    patrolIdOverride?: string
  ) => {
    if (!session) return;
    if (mode === "GVG" && !areaIdOrOpponentUserId?.startsWith("gvg_match:")) {
      setErrorMessage("GvGは公式マッチが開催中の場合のみ開始できます。");
      return;
    }
    if (mode === "RAID" && userLevel < 5) {
      setErrorMessage("レイドへの参加にはプレイヤーレベル5以上が必要です。");
      return;
    }
    setBattleLoading(true);
    playCyberSe("click");
    setOfficialGvgAttackId(null);
    setOfficialGvgReplayId(null);
    setOfficialGvgWinner(null);
    setOfficialPatrolReplayId(null);
    setOfficialPatrolWinner(null);
    setOfficialPatrolEvents([]);
    setOfficialPatrolEventIndex(0);
    setOfficialPvpReplayId(null);
    setOfficialPvpWinner(null);
    setOfficialPvpEvents([]);
    setOfficialPvpEventIndex(0);
    setOfficialPvpResult(null);
    setOfficialRaidReplayId(null); setOfficialRaidWinner(null); setOfficialRaidEvents([]); setOfficialRaidEventIndex(0); setOfficialRaidResult(null);
    let officialGvgDefenseDeck: unknown = null;
    let officialGvgAttackIdForBattle: string | null = null;
    let officialGvgReplayIdForBattle: string | null = null;
    let officialGvgWinnerForBattle: "PLAYER" | "ENEMY" | null = null;
    let officialPatrolReplayIdForBattle: string | null = null;
    let officialPatrolWinnerForBattle: "PLAYER" | "ENEMY" | null = null;
    let officialPatrolEventsForBattle: ServerBattleEvent[] = [];
    let officialPvpReplayIdForBattle: string | null = null;
    let officialPvpWinnerForBattle: "PLAYER" | "ENEMY" | null = null;
    let officialPvpEventsForBattle: ServerBattleEvent[] = [];
    let officialPvpResultForBattle: any | null = null;
    let officialRaidReplayIdForBattle: string | null = null;
    let officialRaidWinnerForBattle: "PLAYER" | "ENEMY" | null = null;
    let officialRaidEventsForBattle: ServerBattleEvent[] = [];
    let officialRaidResultForBattle: any | null = null;

    // レイドボスマスターデータの取得
    let bossMaster = {
      id: "BOSS_001",
      boss_name: targetName,
      level: 99,
      max_hp: raidBossMaxHp,
      atk: 250,
      def: 150,
      spd: 100,
      luk: 5,
      skills: [
        { id: "e_boss_atk", name: "新宿壊滅撃", ap_cost: 2, power: 180, effect_type: "ATTACK" },
        { id: "e_boss_def", name: "防弾プロテクト", ap_cost: 1, power: 80, effect_type: "DEFENSE" }
      ]
    };

    if (mode === "PATROL") {
      const npcMaster = patrolNpcOverride || patrolNpcs.find(n => n.id === areaIdOrOpponentUserId);
      if (npcMaster) {
        const enemyData = npcMaster.enemy_data || {};
        bossMaster = {
          id: npcMaster.id,
          boss_name: npcMaster.npc_name,
          level: npcMaster.npc_level || npcMaster.level || 1,
          max_hp: enemyData.hp || npcMaster.hp || 1000,
          atk: enemyData.atk || npcMaster.atk || 100,
          def: enemyData.def || npcMaster.def || 100,
          spd: enemyData.spd || npcMaster.spd || 100,
          luk: enemyData.luk || npcMaster.luk || 10,
          skills: enemyData.skills || (typeof npcMaster.skills === "string" ? JSON.parse(npcMaster.skills) : npcMaster.skills) || [
            { id: "npc_attack", name: "攻撃", ap_cost: 1, power: 50, effect_type: "ATTACK" }
          ]
        };
      }
    }

    if (mode === "RAID") {
      try {
        const { data: dbMaster } = await supabase.from("raid_boss_master").select("*").eq("id", "BOSS_001").maybeSingle();
        if (dbMaster) {
          bossMaster = {
            id: dbMaster.id,
            boss_name: dbMaster.boss_name,
            level: dbMaster.level || 99,
            max_hp: Number(dbMaster.max_hp),
            atk: dbMaster.atk || 250,
            def: dbMaster.def || 150,
            spd: dbMaster.spd || 100,
            luk: dbMaster.luk || 5,
            skills: typeof dbMaster.skills === "string" ? JSON.parse(dbMaster.skills) : dbMaster.skills
          };
        }
      } catch (err) {
        console.warn("Failed to load raid boss master:", err);
      }

      // 支配ギルドボーナスの判定
      let isControlledByUs = false;
      if (areaIdOrOpponentUserId) {
        try {
          const { data: publicBaseControls } = await supabase.rpc("get_public_guild_base_controls");
          const baseControls = (publicBaseControls || []).filter(
            (control: any) => control.base_id === areaIdOrOpponentUserId,
          );
          if (baseControls && baseControls.length > 0) {
            const controllingRecord = baseControls.find((control: any) => control.is_controlling);
            const topGuildId = controllingRecord?.guild_id;
            const myGuildId = userGuildMember?.guild_id;
            if (myGuildId && topGuildId === myGuildId) {
              isControlledByUs = true;
            }
          }
        } catch (err) {
          console.warn("Failed to evaluate control bonus:", err);
        }
      }
      setHasRaidControlBonus(isControlledByUs);
    }

    if (mode === "PVP" || mode === "PVP_PRACTICE") {
      // Cost consumption, canonical rosters and the random seed are committed
      // together by start_pvp_battle below.
      setOpponentPoints(oppPoints || 1000);
      setEnemyTactic(oppTactic || "OFFENSIVE");
    }

    setBattleMode(mode);
    setBattleOpponentName(targetName);
    
    if (mode === "RAID") {
      // Attempt count and currency are committed atomically by start_raid_battle.
    }
    
    if (mode === "GVG") {
      if (areaIdOrOpponentUserId?.startsWith("gvg_match:")) {
        const { data, error } = await supabase.rpc("begin_gvg_attack", {
          p_match_session_id: areaIdOrOpponentUserId.slice("gvg_match:".length),
        });
        if (error || !data?.attack_id) {
          setErrorMessage(error?.message || "公式GvG攻撃を開始できませんでした。");
          setBattleLoading(false);
          return;
        }
        officialGvgDefenseDeck = data.defense_deck;
        officialGvgAttackIdForBattle = data.attack_id;
        setOfficialGvgAttackId(data.attack_id);
        setVitality(Number(data.remaining_ap ?? Math.max(0, vitality - 20)));
      }
      if (areaIdOrOpponentUserId && !areaIdOrOpponentUserId.startsWith("npc_dummy")) {
        setGvgTargetBaseId(areaIdOrOpponentUserId);
      } else {
        setGvgTargetBaseId(null);
      }
      
      // 本番侵攻の行動力消費
      if (!officialGvgAttackIdForBattle && !areaIdOrOpponentUserId?.startsWith("npc_dummy")) {
        if (vitality < 20) {
          setErrorMessage("行動力が不足しています。");
          setBattleLoading(false);
          return;
        }
        try {
          const res = await supabase.rpc("consume_vitality_for_gvg", { p_user_id: session.user.id, p_cost: 20 });
          if (res.error) {
            setErrorMessage("行動力が不足しています。");
            setBattleLoading(false);
            return;
          }
          setVitality(prev => prev - 20);
        } catch (err) {
          console.warn("GVG consume vitality error", err);
          setBattleLoading(false);
          return;
        }
      }
    } else {
      setGvgTargetBaseId(null);
    }

    // 自部隊5名のロード
    const party = selectedMembers.length > 0 ? selectedMembers : userCharactersDbList.slice(0, 5).map(c => c.character_id);
    const userCharRecords = party.map(charId => userCharactersDbList.find(c => c.character_id === charId)).filter(Boolean);

    // 最大AP上限の計算式
    let totalLevels = 0;
    let totalApBonus = 0;
    userCharRecords.forEach(c => {
      totalLevels += c.level || 1;
      totalApBonus += getCharacterApBonus(c.id, userEquipmentsList);
    });
    const calculatedMaxAp = Math.min(Math.max(5 + Math.floor(totalLevels / 100) + totalApBonus, 5), 15);
    setMaxAp(calculatedMaxAp);
    setAp(3);

    // 味方部隊の個別ステータス構築
    let initialPlayerParty: ParticipantState[] = userCharRecords.map((charRecord, idx) => {
      const stats = getCharacterTotalStats(charRecord, userEquipmentsList);
      const master = CHARACTERS_MASTER.find(c => c.id === charRecord.character_id);

      let finalHp = stats.hp;
      let finalAtk = stats.atk;
      let hasBonus = false;
      let bonusLabel = "";

      if (mode === "GVG" && userGuild && master && master.alignment) {
        if (userGuild.main_alignment && master.alignment === userGuild.main_alignment) {
          finalHp = Math.floor(stats.hp * 1.20);
          finalAtk = Math.floor(stats.atk * 1.20);
          hasBonus = true;
          bonusLabel = " (主属性一致 +20%)";
        } else if (userGuild.sub_alignment && master.alignment === userGuild.sub_alignment) {
          finalHp = Math.floor(stats.hp * 1.10);
          finalAtk = Math.floor(stats.atk * 1.10);
          hasBonus = true;
          bonusLabel = " (副属性一致 +10%)";
        }
      }

      // キャラクターごとの装備スキルを取得
      const charSkills = userSkillsList
        .filter(us => us.equipped_character_id === charRecord.id && us.slot_index !== null)
        .map(us => {
          const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === us.skill_card_id);
          const isExclusive = !!skillMaster?.is_exclusive;
          const masterRec = skillLimitBreakMaster ? skillLimitBreakMaster.find(m => m.plus_val === us.plus_val && m.is_exclusive === isExclusive) : null;
          const multiplier = masterRec ? Number(masterRec.power_multiplier) : (1.0 + us.plus_val * 0.20);
          const basePower = skillMaster?.power ?? 100;
          return {
            id: us.id,
            skill_card_id: us.skill_card_id,
            name: skillMaster?.name || "必殺攻撃",
            ap_cost: skillMaster?.ap_cost ?? 2,
            power: Math.floor(basePower * multiplier),
            effect_type: skillMaster?.effect_type || "ATTACK",
            plus_val: us.plus_val,
            ownerId: skillMaster?.exclusive_character_id || null
          };
        });

      // Every combatant needs a damage action. Tutorial gacha can award a
      // support-only skill, and an empty/support-only loadout otherwise stalls
      // until the round limit and incorrectly defeats a new player.
      if (!charSkills.some(skill => skill.effect_type === "ATTACK")) {
        charSkills.push({
          id: `basic_attack_${charRecord.id}`,
          skill_card_id: "basic_attack",
          name: "通常攻撃",
          ap_cost: 0,
          power: 50,
          effect_type: "ATTACK",
          plus_val: 0,
          ownerId: charRecord.character_id
        });
      }

      return {
        id: `ally_${charRecord.character_id}`,
        name: (master?.jpName || "味方") + bonusLabel,
        characterId: charRecord.character_id,
        alignment: master?.alignment || "ORDER",
        level: charRecord.level,
        hp: finalHp,
        maxHp: finalHp,
        shield: 0,
        isDead: false,
        isEnemy: false,
        tauntTurns: 0,
        stunTurns: 0,
        stats: {
          ...stats,
          hp: finalHp,
          atk: finalAtk
        },
        skills: charSkills
      };
    });

    if (supportCharacter) {
      initialPlayerParty.push({
        id: `support_${supportCharacter.id || supportCharacter.characterId || "0"}`,
        name: `[助っ人] ${supportCharacter.jpName || supportCharacter.name || "助っ人"}`,
        characterId: supportCharacter.characterId || supportCharacter.id || "11111111-1111-1111-1111-111111111111",
        alignment: supportCharacter.alignment || "ORDER",
        level: supportCharacter.level || 50,
        hp: supportCharacter.hp || 1500,
        maxHp: supportCharacter.hp || 1500,
        shield: 0,
        isDead: false,
        isEnemy: false,
        tauntTurns: 0,
        stunTurns: 0,
        stats: supportCharacter.stats || { hp: 1500, atk: 120, def: 90, spd: 100, luk: 10 },
        skills: supportCharacter.skills || [
          { id: "sk_sup_1", name: "助っ人必殺撃", ap_cost: 2, power: 130, effect_type: "ATTACK", ownerId: supportCharacter.characterId }
        ]
      });
    }

    if (options.selectedBattleHelper && !supportCharacter) {
      try {
        const { data: loadout, error: loadoutError } = await supabase.rpc("get_friend_helper_loadout", { p_friend_user_id: options.selectedBattleHelper });
        const hUser = loadout?.username ? { username: loadout.username } : null;
        const hChar = loadout?.character;
        const hEquips = loadout?.equipments || [];
        const hSkills = loadout?.skills || [];
        if (!loadoutError && hUser && hChar) {
          const hMaster = CHARACTERS_MASTER.find(c => c.id === hChar.character_id);
          
          const baseStats = getCharacterTotalStats(hChar, hEquips);
          
          const hSkillsList = hSkills.map((us: any) => {
            const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === us.skill_card_id);
            const isExclusive = !!skillMaster?.is_exclusive;
            const masterRec = skillLimitBreakMaster ? skillLimitBreakMaster.find(m => m.plus_val === us.plus_val && m.is_exclusive === isExclusive) : null;
            const multiplier = masterRec ? Number(masterRec.power_multiplier) : (1.0 + us.plus_val * 0.20);
            return {
              id: us.id,
              skill_card_id: us.skill_card_id,
              name: skillMaster?.name || "助っ人攻撃",
              ap_cost: skillMaster?.ap_cost ?? 2,
              power: Math.floor((skillMaster?.power ?? 100) * multiplier),
              effect_type: skillMaster?.effect_type || "ATTACK",
              plus_val: us.plus_val,
              ownerId: null // §1: 助っ人は得意スキルボーナス（AP軽減）適用外とする
            };
          });

          if (hSkillsList.length === 0) {
            hSkillsList.push({ id: "sk_sup_1", skill_card_id: "sk_sup_1", name: "通常攻撃", ap_cost: 1, power: 100, effect_type: "ATTACK", plus_val: 0, ownerId: null });
          }

          initialPlayerParty.push({
            id: `support_${hChar.character_id}`,
            name: `[助っ人] ${hUser.username || "フレンド"}`,
            characterId: hChar.character_id,
            alignment: hMaster?.alignment || "ORDER",
            level: hChar.level,
            hp: baseStats.hp,
            maxHp: baseStats.hp,
            shield: 0,
            isDead: false,
            isEnemy: false,
            tauntTurns: 0,
            stunTurns: 0,
            stats: baseStats,
            skills: hSkillsList
          });
        }
      } catch (err) {
        console.warn("Failed to fetch helper:", err);
      }
    }

    setPlayerPartyStates(initialPlayerParty);

    // 敵（エネミー）部隊の構築
    let initialEnemyParty: ParticipantState[] = [];
    let loadedRealEnemy = false;

    if (mode === "PATROL") {
      initialEnemyParty = [{
        id: "ENEMY",
        name: bossMaster.boss_name,
        characterId: bossMaster.id,
        alignment: "CHAOS",
        level: bossMaster.level,
        hp: bossMaster.max_hp,
        maxHp: bossMaster.max_hp,
        shield: 0,
        isDead: false,
        isEnemy: true,
        tauntTurns: 0,
        stunTurns: 0,
        stats: {
          hp: bossMaster.max_hp,
          atk: bossMaster.atk,
          def: bossMaster.def,
          spd: bossMaster.spd,
          luk: bossMaster.luk
        },
        skills: bossMaster.skills.map((s: any, idx: number) => ({
          id: s.id || `e_patrol_skill_${idx}`,
          name: s.name || "攻撃",
          ap_cost: s.ap_cost || 1,
          power: s.power || 50,
          effect_type: s.effect_type || "ATTACK",
          ownerId: bossMaster.id
        }))
      }];
      loadedRealEnemy = true;
    } else if (mode === "PVP" && areaIdOrOpponentUserId && !areaIdOrOpponentUserId.startsWith("npc_dummy_")) {
      try {
        const { data: publicRoster, error: rosterError } = await supabase.rpc("get_public_battle_roster", { p_target_user_id: areaIdOrOpponentUserId });
        const dbChars = (publicRoster?.characters || []).map((character: any) => ({
          ...character,
          id: character.id,
          user_id: areaIdOrOpponentUserId
        }));

        if (!rosterError && dbChars.length > 0) {
          const charIds = dbChars.map((c: any) => c.id);
          const enemyEquips = dbChars.flatMap((character: any) => (character.equipments || []).map((equipment: any) => ({ ...equipment, equipped_character_id: character.id })));
          const enemySkills = dbChars.flatMap((character: any) => (character.skills || []).map((skill: any) => ({ ...skill, id: `${character.id}_${skill.skill_card_id}`, equipped_character_id: character.id })));

          // 対戦相手の防衛デッキのキャラクター順序を再現
          let sortedEnemyChars = [...dbChars];
          if (opponentDefenseCharIds && opponentDefenseCharIds.length > 0) {
            sortedEnemyChars = opponentDefenseCharIds.map(id => {
              return dbChars.find((c: any) => c.id === id || c.character_id === id || c.character_id === id.replace("c_", ""));
            }).filter(Boolean);
          }
          if (sortedEnemyChars.length === 0) {
            sortedEnemyChars = dbChars.slice(0, 5);
          }

          initialEnemyParty = sortedEnemyChars.map((charRecord, idx) => {
            const stats = getCharacterTotalStats(charRecord, enemyEquips);
            const master = CHARACTERS_MASTER.find(c => c.id === charRecord.character_id);

            let finalHp = stats.hp;
            let finalAtk = stats.atk;
            let bonusLabel = "";

            // 敵ギルドメイン・サブアライメント一致防衛ボーナス適用
            if (opponentMainAlign && master && master.alignment === opponentMainAlign) {
              finalHp = Math.floor(stats.hp * 1.20);
              finalAtk = Math.floor(stats.atk * 1.20);
              bonusLabel = " (主属性一致 +20%)";
            } else if (opponentSubAlign && master && master.alignment === opponentSubAlign) {
              finalHp = Math.floor(stats.hp * 1.10);
              finalAtk = Math.floor(stats.atk * 1.10);
              bonusLabel = " (副属性一致 +10%)";
            }

            const charSkills = enemySkills
              .filter((us: any) => us.equipped_character_id === charRecord.id && us.slot_index !== null)
              .map((us: any) => {
                const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === us.skill_card_id);
                const isExclusive = !!skillMaster?.is_exclusive;
                const masterRec = skillLimitBreakMaster ? skillLimitBreakMaster.find(m => m.plus_val === us.plus_val && m.is_exclusive === isExclusive) : null;
                const multiplier = masterRec ? Number(masterRec.power_multiplier) : (1.0 + us.plus_val * 0.20);
                const basePower = skillMaster?.power ?? 100;
                return {
                  id: us.id,
                  skill_card_id: us.skill_card_id,
                  name: skillMaster?.name || "必殺攻撃",
                  ap_cost: skillMaster?.ap_cost ?? 2,
                  power: Math.floor(basePower * multiplier),
                  effect_type: skillMaster?.effect_type || "ATTACK",
                  plus_val: us.plus_val,
                  ownerId: skillMaster?.exclusive_character_id || null
                };
              });

            if (charSkills.length === 0) {
              charSkills.push({ id: `e_skill_${idx}_1`, skill_card_id: `e_skill_${idx}_1`, name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK", plus_val: 0, ownerId: charRecord.character_id });
            }

            return {
              id: `enemy_${charRecord.character_id}`,
              name: (master?.jpName || "敵キャラクター") + bonusLabel,
              characterId: charRecord.character_id,
              alignment: master?.alignment || "ORDER",
              level: charRecord.level,
              hp: finalHp,
              maxHp: finalHp,
              shield: 0,
              isDead: false,
              isEnemy: true,
              tauntTurns: 0,
              stunTurns: 0,
              stats: {
                ...stats,
                hp: finalHp,
                atk: finalAtk
              },
              skills: charSkills
            };
          });
          loadedRealEnemy = true;
        }
      } catch (err: any) {
        console.warn("Failed to load real opponent team, falling back to dummy NPC:", err.message);
      }
    }

    // 抗争 (GvG) リアル対戦相手（または演習相手）のロード
    if (mode === "GVG" && officialGvgDefenseDeck) {
      initialEnemyParty = gvgDefenseSnapshotToParticipants(officialGvgDefenseDeck);
      loadedRealEnemy = initialEnemyParty.length > 0;
    }
    if (mode === "GVG" && areaIdOrOpponentUserId && !officialGvgDefenseDeck) {
      try {
        const myGuildId = userGuildMember?.guild_id || "";
        const isPractice = areaIdOrOpponentUserId === myGuildId;

        if (myGuildId) {
          let oppGuildId = myGuildId;

          if (!isPractice) {
            // シーズン経過日数の取得
            const { data: dayRec } = await supabase.from("gvg_season_status").select("current_day").eq("id", 1).maybeSingle();
            const currentDay = dayRec?.current_day || 1;
            const isFinalDay = currentDay === 7;

            // マッチング情報の取得
            const { data: matchRecs } = await supabase
              .from("gvg_matches")
              .select("*")
              .eq("status", "ONGOING")
              .eq("is_finals", isFinalDay);
            
            let myMatch = null;
            if (matchRecs) {
              myMatch = matchRecs.find((m: any) => m.guild_a_id === myGuildId || m.guild_b_id === myGuildId);
            }

            if (myMatch) {
              oppGuildId = myMatch.guild_a_id === myGuildId ? myMatch.guild_b_id : myMatch.guild_a_id;
            }
          }

          // 相手（または自ギルド）の守備デッキを取得
          const { data: oppDecks } = await supabase
            .from("gvg_defense_decks")
            .select("*")
            .eq("guild_id", oppGuildId);

          if (oppDecks && oppDecks.length > 0) {
            // ランダムに1件選択
            const randomDeck = oppDecks[Math.floor(Math.random() * oppDecks.length)];
            const opponentUserId = randomDeck.user_id;

            // 相手ユーザー情報を取得
            const { data: oppProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: [opponentUserId] });
            const oppUser = oppProfiles?.[0];

            const oppUsername = oppUser?.username || "対戦相手";

            // キャラクターID配列を抽出 (character_1_id 〜 character_5_id)
            const charIds = [
              randomDeck.character_1_id,
              randomDeck.character_2_id,
              randomDeck.character_3_id,
              randomDeck.character_4_id,
              randomDeck.character_5_id
            ].filter(Boolean);

            if (charIds.length > 0) {
              // キャラクター・装備・スキルのロード
              const { data: publicRoster, error: rosterError } = await supabase.rpc("get_public_battle_roster_by_character_ids", { p_character_ids: charIds });
              const dbChars = (publicRoster || []).map((character: any) => ({ ...character, user_id: "public" }));

              if (!rosterError && dbChars.length > 0) {
                // ソート順の維持
                const sortedChars = charIds.map(cid => dbChars.find((c: any) => c.id === cid)).filter(Boolean);

                const enemyEquips = dbChars.flatMap((character: any) => (character.equipments || []).map((equipment: any) => ({ ...equipment, equipped_character_id: character.id })));
                const enemySkills = dbChars.flatMap((character: any) => (character.skills || []).map((skill: any) => ({ ...skill, id: `${character.id}_${skill.skill_card_id}`, equipped_character_id: character.id })));

                // 支配ギルド判定 (防衛バフ +10% 適用)
                let isOpponentControlling = false;
                if (!isPractice) {
                  const { data: publicBaseControls } = await supabase.rpc("get_public_guild_base_controls");
                  const baseControl = (publicBaseControls || []).find(
                    (control: any) =>
                      control.base_id === areaIdOrOpponentUserId && control.guild_id === oppGuildId,
                  );
                  isOpponentControlling = Boolean(baseControl?.is_controlling);
                }

                const baseNames: { [key: string]: string } = {
                  neon_tower: "ネオンタワー",
                  deep_dock: "ディープドック",
                  junk_bazar: "ジャンクバザール",
                  kitakura_gate: "キタクラゲート"
                };
                const baseName = baseNames[areaIdOrOpponentUserId] || "抗争地区";
                const teamLabel = isPractice ? "防衛演習" : `${baseName}防衛チーム`;

                initialEnemyParty = sortedChars.map((charRecord: any, idx) => {
                  const stats = getCharacterTotalStats(charRecord, enemyEquips);
                  const master = CHARACTERS_MASTER.find(c => c.id === charRecord.character_id);

                  let finalHp = stats.hp;
                  let finalAtk = stats.atk;
                  let buffLabel = "";

                  if (isOpponentControlling) {
                    finalHp = Math.floor(stats.hp * 1.10);
                    finalAtk = Math.floor(stats.atk * 1.10);
                    buffLabel = " (支配バフ +10%)";
                  }

                  const charSkills = enemySkills
                    .filter((us: any) => us.equipped_character_id === charRecord.id && us.slot_index !== null)
                    .map((us: any) => {
                      const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === us.skill_card_id);
                      const isExclusive = !!skillMaster?.is_exclusive;
                      const masterRec = skillLimitBreakMaster ? skillLimitBreakMaster.find(m => m.plus_val === us.plus_val && m.is_exclusive === isExclusive) : null;
                      const multiplier = masterRec ? Number(masterRec.power_multiplier) : (1.0 + us.plus_val * 0.20);
                      const basePower = skillMaster?.power ?? 100;
                      return {
                        id: us.id,
                        skill_card_id: us.skill_card_id,
                        name: skillMaster?.name || "必殺攻撃",
                        ap_cost: skillMaster?.ap_cost ?? 2,
                        power: Math.floor(basePower * multiplier),
                        effect_type: skillMaster?.effect_type || "ATTACK",
                        plus_val: us.plus_val,
                        ownerId: skillMaster?.exclusive_character_id || null
                      };
                    });

                  if (charSkills.length === 0) {
                    charSkills.push({ id: `e_skill_${idx}_1`, skill_card_id: `e_skill_${idx}_1`, name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK", plus_val: 0, ownerId: charRecord.character_id });
                  }

                  return {
                    id: `enemy_${charRecord.character_id}`,
                    name: `${master?.jpName || "敵キャラクター"}${buffLabel} (${teamLabel})`,
                    characterId: charRecord.character_id,
                    alignment: master?.alignment || "ORDER",
                    level: charRecord.level,
                    hp: finalHp,
                    maxHp: finalHp,
                    shield: 0,
                    isDead: false,
                    isEnemy: true,
                    tauntTurns: 0,
                    stunTurns: 0,
                    stats: {
                      ...stats,
                      hp: finalHp,
                      atk: finalAtk
                    },
                    skills: charSkills
                  };
                });

                loadedRealEnemy = true;

                // 実戦時のみ、相手ギルドチャットへシステム警告を投稿
                if (!isPractice) {
                  const myUser = session.user.user_metadata?.username || "他ギルドのプレイヤー";
                  await supabase.from("board_posts").insert({
                    user_id: session.user.id,
                    author_name: "抗争警報",
                    content: `【抗争警告】他ギルドの ${myUser} から、我がギルドの守備メンバー ${oppUsername} への侵攻攻撃を受けました！`,
                    target_type: "GUILD",
                    target_id: oppGuildId,
                    is_system: true
                  });
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("Failed to load GvG opponent, falling back to official NPC:", err.message);
      }
    }

    if (!loadedRealEnemy) {
      if (mode === "PVP" || mode === "PVP_PRACTICE" || mode === "GVG") {
        const baseHp = mode === "GVG" ? 1400 : 1200;
        const myGuildId = userGuildMember?.guild_id || "";
        const isPractice = areaIdOrOpponentUserId === myGuildId;

        const baseNames: { [key: string]: string } = {
          neon_tower: "ネオンタワー",
          deep_dock: "ディープドック",
          junk_bazar: "ジャンクバザール",
          kitakura_gate: "キタクラゲート"
        };
        const baseName = (mode === "GVG" && areaIdOrOpponentUserId) ? baseNames[areaIdOrOpponentUserId] || "抗争地区" : "抗争地区";
        const teamLabel = isPractice ? "防衛演習" : `${baseName}防衛チーム`;

        if (mode === "GVG") {
          const gvgNpcs = ENEMIES_MASTER.filter(e => e.enemy_type === "GVG_NPC_DEFENSE");
          initialEnemyParty = gvgNpcs.map((npc, idx) => {
            return {
              id: `enemy_${npc.id}`,
              name: `${npc.name} (${teamLabel})`,
              characterId: npc.id,
              alignment: "CHAOS",
              level: npc.level,
              hp: npc.hp,
              maxHp: npc.hp,
              shield: 0,
              isDead: false,
              isEnemy: true,
              tauntTurns: 0,
              stunTurns: 0,
              stats: { hp: npc.hp, atk: npc.atk, def: npc.def, spd: npc.spd, luk: npc.luk },
              skills: npc.skills.map(s => ({ ...s, ownerId: npc.id }))
            };
          });
        } else {
          // PVP
          const pvpDummies = ENEMIES_MASTER.filter(e => e.enemy_type === "PVP_DUMMY");
          initialEnemyParty = pvpDummies.map((npc, idx) => {
            return {
              id: `enemy_${npc.id}`,
              name: npc.name,
              characterId: npc.id,
              alignment: "CHAOS",
              level: npc.level,
              hp: npc.hp,
              maxHp: npc.hp,
              shield: 0,
              isDead: false,
              isEnemy: true,
              tauntTurns: 0,
              stunTurns: 0,
              stats: { hp: npc.hp, atk: npc.atk, def: npc.def, spd: npc.spd, luk: npc.luk },
              skills: npc.skills.map(s => ({ ...s, ownerId: npc.id }))
            };
          });
        }
      } else {
        // レイド戦の場合は巨大ボス1体 (マスタ値に基づく動的構築)
        initialEnemyParty = [{
          id: "ENEMY",
          name: bossMaster.boss_name,
          characterId: "BOSS",
          alignment: "CHAOS",
          level: bossMaster.level,
          hp: raidBossHp,
          maxHp: bossMaster.max_hp,
          shield: 0,
          isDead: false,
          isEnemy: true,
          tauntTurns: 0,
          stunTurns: 0,
          stats: {
            hp: bossMaster.max_hp,
            atk: bossMaster.atk,
            def: bossMaster.def,
            spd: bossMaster.spd,
            luk: bossMaster.luk
          },
          skills: bossMaster.skills.map((s: any, idx: number) => ({
            id: s.id || `e_boss_skill_${idx}`,
            name: s.name || "攻撃",
            ap_cost: s.ap_cost || 1,
            power: s.power || 50,
            effect_type: s.effect_type || "ATTACK",
            ownerId: "BOSS"
          }))
        }];
      }
    }

    setEnemyPartyStates(initialEnemyParty);

    // タイムラインの構築（SPD順で完全ソート）
    const timelineQueue = [
      ...initialPlayerParty.map(p => ({ id: p.id, name: p.name, isEnemy: false, spd: p.stats.spd })),
      ...initialEnemyParty.map(e => ({ id: e.id, name: e.name, isEnemy: true, spd: e.stats.spd }))
    ];
    timelineQueue.sort((a, b) => b.spd - a.spd);

    setTimeline(timelineQueue);
    setTimelineIndex(0);
    setBattleRound(1);

    const startLogs = [`出撃準備完了: VS ${targetName} (${mode}戦)`];
    setBattleLog(startLogs);

    const abortOfficialGvgStart = async (message: string) => {
      if (officialGvgAttackIdForBattle) {
        const { error: cancelError } = await supabase.rpc("cancel_unresolved_gvg_attack", {
          p_attack_id: officialGvgAttackIdForBattle,
        });
        if (cancelError) console.warn("Failed to cancel unresolved official GvG attack:", cancelError.message);
      }
      setOfficialGvgAttackId(null);
      setOfficialGvgReplayId(null);
      setOfficialGvgWinner(null);
      setBattleLoading(false);
      setErrorMessage(message);
    };

    // Practice is deliberately client-local: it reuses the viewer and turn
    // presentation without creating an official replay, consuming PvP Point,
    // or entering any result/reward/ranking contract.
    if (mode !== "PVP_PRACTICE") try {
      const playerSnapshot = participantsToBattleUnits(initialPlayerParty);
      const enemySnapshot = participantsToBattleUnits(initialEnemyParty);
      const replayMode = mode === "PATROL" ? "QUEST" : mode;
      const patrolIdForBattle = patrolIdOverride || patrol?.id || null;
      const replayCreation = replayMode === "QUEST"
        ? await supabase.rpc("create_patrol_battle_replay", {
            p_patrol_id: patrolIdForBattle,
            p_tactic_id: toDeterministicTactic(tactic),
          })
        : replayMode === "PVP"
          ? await supabase.rpc("start_pvp_battle", {
              p_opponent_user_id: areaIdOrOpponentUserId,
              p_character_ids: party,
              p_tactic: toDeterministicTactic(tactic),
            })
        : replayMode === "RAID"
          ? await supabase.rpc("start_raid_battle", {
              p_instance_id: areaIdOrOpponentUserId,
              p_character_ids: party,
              p_tactic: toDeterministicTactic(tactic),
            })
        : await supabase.rpc("create_battle_replay_pending", {
            p_battle_mode: replayMode,
            p_tactic_id: toDeterministicTactic(tactic),
            p_random_seed: Math.floor(Math.random() * 2_000_000_000),
            p_player_snapshot: playerSnapshot,
            p_enemy_snapshot: enemySnapshot,
            p_source_reference_id: officialGvgAttackIdForBattle,
          });
      const error = replayCreation.error;
      const replaySessionId = replayMode === "QUEST"
        ? replayCreation.data?.replay_session_id
        : replayMode === "PVP"
          ? replayCreation.data?.replay_session_id
          : replayMode === "RAID"
            ? replayCreation.data?.replay_session_id
          : replayCreation.data;
      if (error) console.warn("Failed to create replay snapshot:", error.message);
      if (replayMode === "QUEST" && (!replaySessionId || error)) {
        setBattleLoading(false);
        setErrorMessage("NPCバトルの開始をサーバーで確定できませんでした。もう一度お試しください。");
        return;
      }
      if (replayMode === "PVP" && (!replaySessionId || error)) {
        setBattleLoading(false);
        setErrorMessage(error?.message || "PvPバトルの開始をサーバーで確定できませんでした。もう一度お試しください。");
        return;
      }
      if (replayMode === "RAID" && (!replaySessionId || error)) {
        setBattleLoading(false); setErrorMessage(error?.message || "レイド開始をサーバーで確定できませんでした。"); return;
      }
      if (officialGvgAttackIdForBattle && (!replaySessionId || error)) {
        await abortOfficialGvgStart("公式GvGのサーバー確定に失敗しました。もう一度お試しください。");
        return;
      }
      // 公式GvGは begin_gvg_attack が発行した攻撃IDと防衛スナップショットに
      // 必ず紐付けてから解決する。旧拠点制の導線から孤立したGvG結果を作らない。
      if (replaySessionId && replayMode === "GVG" && officialGvgAttackIdForBattle) {
        let { data: resolvedReplay, error: resolveError } = await supabase.functions.invoke("resolve-battle", {
          body: { replaySessionId },
        });
        if (resolveError) {
          // The function may have persisted the result before a transient
          // response failure. Its idempotent read path returns that result.
          const retry = await supabase.functions.invoke("resolve-battle", {
            body: { replaySessionId },
          });
          resolvedReplay = retry.data;
          resolveError = retry.error;
        }
        if (resolveError) {
          console.warn("Failed to resolve replay on the server:", resolveError.message);
          await abortOfficialGvgStart("公式GvGのサーバー解決に失敗しました。もう一度お試しください。");
          return;
        }
        else if (officialGvgAttackIdForBattle) {
          if (resolvedReplay?.winner !== "PLAYER" && resolvedReplay?.winner !== "ENEMY") {
            console.warn("Server returned an invalid official GvG replay result");
            await abortOfficialGvgStart("公式GvGのサーバー確定に失敗しました。もう一度お試しください。");
            return;
          }
          officialGvgReplayIdForBattle = replaySessionId;
          setOfficialGvgReplayId(replaySessionId);
          officialGvgWinnerForBattle = resolvedReplay.winner;
          setOfficialGvgWinner(officialGvgWinnerForBattle);
        }
      }
      if (replaySessionId && replayMode === "QUEST") {
        const canonicalPlayers = patrolSnapshotToParticipants(replayCreation.data?.player_snapshot, false);
        const canonicalEnemies = patrolSnapshotToParticipants(replayCreation.data?.enemy_snapshot, true);
        if (canonicalPlayers.length === 0 || canonicalEnemies.length === 0) {
          setBattleLoading(false);
          setErrorMessage("NPCバトルの正規編成を取得できませんでした。もう一度お試しください。");
          return;
        }
        initialPlayerParty = canonicalPlayers;
        initialEnemyParty = canonicalEnemies;
        setPlayerPartyStates(canonicalPlayers);
        setEnemyPartyStates(canonicalEnemies);
        const canonicalTimeline = [
          ...canonicalPlayers.map((participant) => ({ id: participant.id, name: participant.name, isEnemy: false, spd: participant.stats.spd })),
          ...canonicalEnemies.map((participant) => ({ id: participant.id, name: participant.name, isEnemy: true, spd: participant.stats.spd })),
        ].sort((a, b) => b.spd - a.spd || (a.isEnemy === b.isEnemy ? a.id.localeCompare(b.id) : a.isEnemy ? 1 : -1));
        setTimeline(canonicalTimeline);
        setTimelineIndex(0);

        let { data: resolvedReplay, error: resolveError } = await supabase.functions.invoke("resolve-battle", {
          body: { replaySessionId },
        });
        if (resolveError) {
          const retry = await supabase.functions.invoke("resolve-battle", { body: { replaySessionId } });
          resolvedReplay = retry.data;
          resolveError = retry.error;
        }
        if (resolveError || (resolvedReplay?.winner !== "PLAYER" && resolvedReplay?.winner !== "ENEMY")) {
          console.warn("Failed to resolve patrol replay on the server:", resolveError?.message);
          setBattleLoading(false);
          setErrorMessage("NPCバトルの勝敗をサーバーで確定できませんでした。もう一度お試しください。");
          return;
        }
        officialPatrolReplayIdForBattle = replaySessionId;
        officialPatrolWinnerForBattle = resolvedReplay.winner;
        officialPatrolEventsForBattle = serverBattleEvents(resolvedReplay.events);
        if (officialPatrolEventsForBattle.length === 0) {
          setBattleLoading(false);
          setErrorMessage("NPCバトルの確定記録を取得できませんでした。もう一度お試しください。");
          return;
        }
        setOfficialPatrolReplayId(replaySessionId);
        setOfficialPatrolWinner(resolvedReplay.winner);
        setOfficialPatrolEvents(officialPatrolEventsForBattle);
        setOfficialPatrolEventIndex(0);
      }
      if (replaySessionId && replayMode === "PVP") {
        const canonicalPlayers = patrolSnapshotToParticipants(replayCreation.data?.player_snapshot, false);
        const canonicalEnemies = patrolSnapshotToParticipants(replayCreation.data?.enemy_snapshot, true);
        if (canonicalPlayers.length === 0 || canonicalEnemies.length === 0) {
          setBattleLoading(false);
          setErrorMessage("PvPバトルの正規編成を取得できませんでした。もう一度お試しください。");
          return;
        }
        initialPlayerParty = canonicalPlayers;
        initialEnemyParty = canonicalEnemies;
        setPlayerPartyStates(canonicalPlayers);
        setEnemyPartyStates(canonicalEnemies);
        const canonicalTimeline = [
          ...canonicalPlayers.map((participant) => ({ id: participant.id, name: participant.name, isEnemy: false, spd: participant.stats.spd })),
          ...canonicalEnemies.map((participant) => ({ id: participant.id, name: participant.name, isEnemy: true, spd: participant.stats.spd })),
        ].sort((a, b) => b.spd - a.spd || (a.isEnemy === b.isEnemy ? a.id.localeCompare(b.id) : a.isEnemy ? 1 : -1));
        setTimeline(canonicalTimeline);
        setTimelineIndex(0);

        let { data: resolvedReplay, error: resolveError } = await supabase.functions.invoke("resolve-battle", {
          body: { replaySessionId },
        });
        if (resolveError) {
          const retry = await supabase.functions.invoke("resolve-battle", { body: { replaySessionId } });
          resolvedReplay = retry.data;
          resolveError = retry.error;
        }
        const events = serverBattleEvents(resolvedReplay?.events);
        if (resolveError || (resolvedReplay?.winner !== "PLAYER" && resolvedReplay?.winner !== "ENEMY") || events.length === 0) {
          console.warn("Failed to resolve PvP replay on the server:", resolveError?.message);
          setBattleLoading(false);
          setErrorMessage("PvPバトルの勝敗をサーバーで確定できませんでした。もう一度お試しください。");
          return;
        }
        officialPvpReplayIdForBattle = replaySessionId;
        officialPvpWinnerForBattle = resolvedReplay.winner;
        officialPvpEventsForBattle = events;
        officialPvpResultForBattle = resolvedReplay;
        setOfficialPvpReplayId(replaySessionId);
        setOfficialPvpWinner(resolvedReplay.winner);
        setOfficialPvpEvents(events);
        setOfficialPvpEventIndex(0);
        setOfficialPvpResult(resolvedReplay);
        setPvpPoints(Number(resolvedReplay.remainingPvpPoints ?? replayCreation.data?.remaining_pvp_points ?? Math.max(0, pvpPoints - 1)));
      }
      if (replaySessionId && replayMode === "RAID") {
        const canonicalPlayers = patrolSnapshotToParticipants(replayCreation.data?.player_snapshot, false);
        const canonicalEnemies = patrolSnapshotToParticipants(replayCreation.data?.enemy_snapshot, true);
        let { data: resolvedReplay, error: resolveError } = await supabase.functions.invoke("resolve-battle", { body: { replaySessionId } });
        if (resolveError) { const retry = await supabase.functions.invoke("resolve-battle", { body: { replaySessionId } }); resolvedReplay=retry.data; resolveError=retry.error; }
        const events=serverBattleEvents(resolvedReplay?.events);
        if(resolveError||!resolvedReplay?.winner||!events.length){setBattleLoading(false);setErrorMessage("レイド結果をサーバーで確定できませんでした。");return;}
        initialPlayerParty=canonicalPlayers; initialEnemyParty=canonicalEnemies;
        setPlayerPartyStates(canonicalPlayers); setEnemyPartyStates(canonicalEnemies);
        setTimeline([...canonicalPlayers.map(p=>({id:p.id,name:p.name,isEnemy:false,spd:p.stats.spd})),...canonicalEnemies.map(p=>({id:p.id,name:p.name,isEnemy:true,spd:p.stats.spd}))].sort((a,b)=>b.spd-a.spd));
        officialRaidReplayIdForBattle=replaySessionId; officialRaidWinnerForBattle=resolvedReplay.winner; officialRaidEventsForBattle=events; officialRaidResultForBattle=resolvedReplay;
        setOfficialRaidReplayId(replaySessionId);setOfficialRaidWinner(resolvedReplay.winner);setOfficialRaidEvents(events);setOfficialRaidEventIndex(0);setOfficialRaidResult(resolvedReplay);
        setRaidAttemptsToday?.(Number(replayCreation.data?.attempt_number ?? (raidAttemptsToday ?? 0) + 1));
      }
    } catch (err) {
      console.warn("Failed to create replay snapshot:", err);
      if (officialGvgAttackIdForBattle) {
        await abortOfficialGvgStart("公式GvGのサーバー確定に失敗しました。もう一度お試しください。");
        return;
      }
    }

    // 旧セッションは中断再開の互換用。再生UI移行後に廃止する。
    if (mode !== "PVP_PRACTICE") try {
      const { data: sessionData } = await supabase.from("battle_sessions").insert({
        user_id: session.user.id,
        battle_type: mode,
        target_id: targetName,
        player_state: {
          playerStates: initialPlayerParty, ap: 3, maxAp: calculatedMaxAp, tactic: "OFFENSIVE", log: startLogs, timelineIndex: 0,
          gvgAreaId: (mode === "GVG" ? areaIdOrOpponentUserId : null),
          officialGvgAttackId: officialGvgAttackIdForBattle,
          officialGvgReplayId: officialGvgReplayIdForBattle,
          officialGvgWinner: officialGvgWinnerForBattle,
          officialPatrolReplayId: officialPatrolReplayIdForBattle,
          officialPatrolWinner: officialPatrolWinnerForBattle,
          officialPatrolEvents: officialPatrolEventsForBattle,
          officialPatrolEventIndex: 0,
          officialPvpReplayId: officialPvpReplayIdForBattle,
          officialPvpWinner: officialPvpWinnerForBattle,
          officialPvpEvents: officialPvpEventsForBattle,
          officialPvpEventIndex: 0,
          officialPvpResult: officialPvpResultForBattle,
          officialRaidReplayId: officialRaidReplayIdForBattle, officialRaidWinner: officialRaidWinnerForBattle,
          officialRaidEvents: officialRaidEventsForBattle, officialRaidEventIndex: 0, officialRaidResult: officialRaidResultForBattle,
        },
        enemy_state: { enemyStates: initialEnemyParty },
        status: "ACTIVE"
      }).select().single();

      if (sessionData) setBattleSessionId(sessionData.id);
    } catch (err) {
      console.warn(err);
    }

    setBattleState("SETUP");
    setBattleLoading(false);
  };

  const startCardBattle = async (...args: Parameters<typeof startCardBattleInternal>) => {
    if (battleStartInFlightRef.current) return;
    battleStartInFlightRef.current = true;
    const actionPerformance = beginActionPerformance("battle_start");
    try {
      actionPerformance.mark("request_start");
      await startCardBattleInternal(...args);
      actionPerformance.mark("response");
      actionPerformance.mark("state_update");
      actionPerformance.markVisualReady();
    } finally {
      battleStartInFlightRef.current = false;
    }
  };

  // 割合防御減算モデル ＋ 乱数±5% ＋ LUK連動クリティカル ＋ アライメント相性計算
  const calcDynamicDamage = (
    attacker: ParticipantState,
    defender: ParticipantState,
    skillPower: number,
    hasRaidBonus: boolean = false
  ): { damage: number; isCritical: boolean } => {
    // 基礎火力 = ATK * (1 + power / 100)
    const basePower = attacker.stats.atk * (skillPower / 100);
    
    // 割合防御カット率 = DEF / (DEF + 2000)
    const cutRate = defender.stats.def / (defender.stats.def + 27000);
    const basicDmg = basePower * (1 - cutRate);

    // アライメント（属性）相性補正: JUSTICE > EVIL > CHAOS > ORDER > JUSTICE
    const alignMap: Record<string, string> = {
      JUSTICE: "EVIL",
      EVIL: "ORDER",
      CHAOS: "JUSTICE",
      ORDER: "CHAOS"
    };
    let alignMultiplier = 1.0;
    if (attacker.alignment && defender.alignment) {
      if (alignMap[attacker.alignment] === defender.alignment) {
        alignMultiplier = 1.20; // 有利 +20%
      } else if (alignMap[defender.alignment] === attacker.alignment) {
        alignMultiplier = 0.85; // 不利 -15%
      }
    }

    // 乱数揺らぎ (0.95 〜 1.05: ±5%)
    alignMultiplier = alignMap[attacker.alignment || "ORDER"] === defender.alignment ? 1.2 : 1;
    const variance = 0.95 + (Math.random() * 0.10);

    // LUK連動クリティカル判定
    const critChance = Math.min(0.35, 0.05 + attacker.stats.luk * 0.002);
    const isCritical = Math.random() < critChance;
    const critMultiplier = isCritical ? 1.5 : 1.0;

    // レイド支配ボーナス (+20%)
    const finalDmg = Math.max(Math.floor(basicDmg * alignMultiplier * variance * critMultiplier), 1);
    return { damage: finalDmg, isCritical };
  };

  // 戦闘オート進行を開始
  const launchBattlePlaying = () => {
    playCyberSe("click");
    setBattleState("PLAYING");

    // バトル開始時発動スキル (START_OF_BATTLE) の評価
    const nextLogs = [...battleLog, "戦闘開始！初期バフ適用。"];
    const updatedPlayers = playerPartyStates.map(p => {
      // QUEST is a replay of the already-resolved server record. Client-only
      // opening passives must not mutate its authoritative HP/shield state.
      if ((battleMode === "PATROL" && officialPatrolEvents.length > 0)
        || (battleMode === "PVP" && officialPvpEvents.length > 0)
        || (battleMode === "RAID" && officialRaidEvents.length > 0)) return p;
      // 例: ストリートシールドなどの開始時アビリティ持ちのシミュレート
      if (p.characterId === "11111111-1111-1111-1111-111111111111") {
        nextLogs.push(`[${p.name}] のパッシブ: 開幕シールド展開！`);
        return { ...p, shield: Math.floor(p.maxHp * 0.15) };
      }
      return p;
    });

    setPlayerPartyStates(updatedPlayers);
    setBattleLog(nextLogs);
  };

  const handleEndTurn = (overrideIndex?: number) => {
    if (timeline.length === 0) return;
    const nextIndex = overrideIndex !== undefined ? overrideIndex : (timelineIndex + 1) % timeline.length;
    if (nextIndex === 0) {
      const roundLimit = battleMode === "RAID" ? 30 : battleMode === "PVP" || battleMode === "PVP_PRACTICE" || battleMode === "GVG" ? 20 : 15;
      if (battleRound >= roundLimit) {
        void endBattleSession("DEFEAT");
        return;
      }
      setBattleRound((previous) => previous + 1);
    }
    setTimelineIndex(nextIndex);
  };

  // 敵のターン自動AI
  const executeEnemyTurn = (enemyId: string, curTlIdx: number) => {
    const enemy = enemyPartyStates.find(e => e.id === enemyId);
    if (!enemy || enemy.isDead) {
      handleEndTurn((curTlIdx + 1) % timeline.length);
      return;
    }

    // スタン (STUN) 手番スキップ判定
    if ((enemy.stunTurns || 0) > 0) {
      const skipLog = `[${enemy.name}] はスタンにより行動不能！`;
      setBattleLog(prev => [...prev, skipLog]);
      setEnemyPartyStates(prev => prev.map(e => e.id === enemyId ? { ...e, stunTurns: Math.max((e.stunTurns || 0) - 1, 0) } : e));
      setTimeout(() => {
        handleEndTurn((curTlIdx + 1) % timeline.length);
      }, 500 / battleSpeed);
      return;
    }

    // 攻撃対象（味方）の決定
    const alivePlayers = playerPartyStates.filter(p => !p.isDead);
    if (alivePlayers.length === 0) return;

    // 挑発中の生存者を最優先、いなければ最もHP割合の低い生存者をターゲット
    let defaultPlayerTarget = alivePlayers.find(p => p.tauntTurns > 0);
    if (!defaultPlayerTarget) {
      defaultPlayerTarget = alivePlayers.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    }

    // 作戦AIに基づいたスキル＆ターゲットの選定
    let chosenSkill = enemy.skills[0];
    let target = defaultPlayerTarget;

    const attackSkills = enemy.skills.filter(s => s.effect_type === "ATTACK");
    const defenseSkills = enemy.skills.filter(s => s.effect_type === "DEFENSE" || s.effect_type === "SUPPORT");
    const healSkills = enemy.skills.filter(s => s.effect_type === "HEAL");

    if (enemyTactic === "OFFENSIVE") {
      if (attackSkills.length > 0) {
        chosenSkill = attackSkills.sort((a, b) => b.power - a.power)[0];
      }
      target = defaultPlayerTarget;
    } else if (enemyTactic === "DEFENSIVE") {
      if (defenseSkills.length > 0) {
        chosenSkill = defenseSkills[0];
      } else if (attackSkills.length > 0) {
        chosenSkill = attackSkills[0];
      }
      target = enemy; // 自分自身（シールドバリア等）
    } else if (enemyTactic === "HEALING") {
      const aliveEnemies = enemyPartyStates.filter(e => !e.isDead);
      const damagedEnemy = aliveEnemies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      const enemyNeedsHeal = damagedEnemy && (damagedEnemy.hp / damagedEnemy.maxHp) < 0.7;

      if (enemyNeedsHeal && healSkills.length > 0) {
        chosenSkill = healSkills.sort((a, b) => b.power - a.power)[0];
        target = damagedEnemy;
      } else {
        if (attackSkills.length > 0) chosenSkill = attackSkills[0];
        target = defaultPlayerTarget;
      }
    } else if (enemyTactic === "BALANCED") {
      const aliveEnemies = enemyPartyStates.filter(e => !e.isDead);
      const damagedEnemy = aliveEnemies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      const enemyNeedsHeal = damagedEnemy && (damagedEnemy.hp / damagedEnemy.maxHp) < 0.5;

      if (enemyNeedsHeal && healSkills.length > 0) {
        chosenSkill = healSkills[0];
        target = damagedEnemy;
      } else if (attackSkills.length > 0) {
        chosenSkill = attackSkills.sort((a, b) => b.power - a.power)[0];
        target = defaultPlayerTarget;
      } else {
        target = enemy;
      }
    } else {
      chosenSkill = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
      target = defaultPlayerTarget;
    }

    if (!target) target = defaultPlayerTarget;

    // 演出表示
    setActiveSkillCutIn({ charName: enemy.name, skillName: chosenSkill.name });
    setTargetLine({ fromId: enemy.id, toId: target.id });

    setTimeout(() => {
      playCyberSe(chosenSkill.effect_type === "HEAL" ? "click" : chosenSkill.effect_type === "DEFENSE" ? "click" : "hit");
      
      let val = 0;
      let logText = "";
      let type: "dmg" | "heal" | "shield" = "dmg";
      let isCrit = false;

      if (chosenSkill.effect_type === "ATTACK") {
        const { damage, isCritical } = calcDynamicDamage(enemy, target, chosenSkill.power);
        val = damage;
        isCrit = isCritical;
        type = "dmg";
        logText = `[${enemy.name}] が [${chosenSkill.name}] ➔ [${target.name}] に ${val.toLocaleString()}${isCrit ? " 【CRITICAL!】" : ""} ダメージ！`;
        setActiveShakingCharId(target.id);
      } else if (chosenSkill.effect_type === "HEAL") {
        val = Math.max(chosenSkill.power + Math.floor(enemy.stats.def * 0.5), 20);
        type = "heal";
        logText = `[${enemy.name}] が [${chosenSkill.name}] ➔ [${target.name}] のHPを ${val.toLocaleString()} 回復！`;
      } else if (chosenSkill.effect_type === "DEFENSE" || chosenSkill.effect_type === "SUPPORT") {
        val = chosenSkill.power > 0 ? chosenSkill.power : 50;
        type = "shield";
        logText = `[${enemy.name}] が [${chosenSkill.name}] ➔ 自身にシールドバリア(${val.toLocaleString()})を展開！`;
      }

      setPlayerPartyStates(prev => {
        const next = prev.map(p => {
          if (p.id === target.id) {
            if (type === "dmg") {
              let nextShield = p.shield;
              let nextHp = p.hp;
              if (nextShield > 0) {
                if (nextShield >= val) {
                  nextShield -= val;
                } else {
                  nextHp = Math.max(nextHp - (val - nextShield), 0);
                  nextShield = 0;
                }
              } else {
                nextHp = Math.max(nextHp - val, 0);
              }
              return { ...p, hp: nextHp, shield: nextShield, isDead: nextHp <= 0 };
            } else if (type === "heal") {
              return { ...p, hp: Math.min(p.hp + val, p.maxHp) };
            }
            return p;
          }
          return p;
        });

        setEnemyPartyStates(prevEnemies => {
          const nextEnemies = prevEnemies.map(e => {
            if (type === "heal" && e.id === target.id) {
              return { ...e, hp: Math.min(e.hp + val, e.maxHp) };
            }
            if (type === "shield" && e.id === enemy.id) {
              return { ...e, shield: e.shield + val, tauntTurns: 2 };
            }
            return e;
          });

          // ログの追加
          const updatedLogs = [...battleLog, logText];
          setBattleLog(updatedLogs);

          // ダメージポップアップ
          setDamagePopup({ val, type, x: 120, y: 40, charId: target.id });

          setTimeout(() => {
            setActiveSkillCutIn(null);
            setTargetLine(null);
            setActiveShakingCharId(null);
            setDamagePopup(null);

            // 勝敗チェック
            const isPlayerDead = next.every(p => p.isDead);
            if (isPlayerDead) {
              endBattleSession("DEFEAT");
            } else {
              // 挑発ターンの減少
              const nextPlayers = next.map(p => p.id === enemy.id && p.tauntTurns > 0 ? { ...p, tauntTurns: p.tauntTurns - 1 } : p);
              setPlayerPartyStates(nextPlayers);

              const nextIndex = (curTlIdx + 1) % timeline.length;
              handleEndTurn(nextIndex);

              if (session && battleSessionId) {
                saveBattleSessionState(battleSessionId, nextPlayers, nextEnemies, ap, maxAp, tactic, updatedLogs, nextIndex, gvgTargetBaseId);
              }
            }
          }, 800 / battleSpeed);

          return nextEnemies;
        });

        return next;
      });
    }, 800 / battleSpeed);
  };

  // 味方の自動ターン実行
  const executeAutoPlayerTurn = (charId: string, curTlIdx: number) => {
    const actor = playerPartyStates.find(p => p.id === charId);
    if (!actor || actor.isDead) {
      handleEndTurn((curTlIdx + 1) % timeline.length);
      return;
    }

    // スタン (STUN) 手番スキップ判定
    if ((actor.stunTurns || 0) > 0) {
      const skipLog = `[${actor.name}] はスタンにより行動不能！`;
      setBattleLog(prev => [...prev, skipLog]);
      setPlayerPartyStates(prev => prev.map(p => p.id === charId ? { ...p, stunTurns: Math.max((p.stunTurns || 0) - 1, 0) } : p));
      setTimeout(() => {
        handleEndTurn((curTlIdx + 1) % timeline.length);
      }, 500 / battleSpeed);
      return;
    }

    // 1. スキル候補の選定
    const aiResult = selectCharacterSkillByTactic(actor, tactic, playerPartyStates, enemyPartyStates);
    if (!aiResult) return;
    const { chosenSkill, target } = aiResult;

    const nextAp = 0;

    // 演出設定
    setActiveSkillCutIn({ charName: actor.name, skillName: chosenSkill.name });
    setTargetLine({ fromId: actor.id, toId: target.id });

    setTimeout(() => {
      playCyberSe("attack");

      let val = 0;
      let logText = "";
      let type: "dmg" | "heal" | "shield" = "dmg";
      let isCrit = false;

      if (chosenSkill.effect_type === "ATTACK") {
        const { damage, isCritical } = calcDynamicDamage(actor, target, chosenSkill.power, battleMode === "RAID" && hasRaidControlBonus);
        val = damage;
        isCrit = isCritical;
        type = "dmg";
        if (battleMode === "RAID" && hasRaidControlBonus) {
          logText = `【支配ボーナス発動】[${actor.name}] が [${chosenSkill.name}] ➔ [${target.name}] に ${val.toLocaleString()}${isCrit ? " 【CRITICAL!】" : ""} ダメージ！`;
        } else {
          logText = `[${actor.name}] が [${chosenSkill.name}] ➔ [${target.name}] に ${val.toLocaleString()}${isCrit ? " 【CRITICAL!】" : ""} ダメージ！`;
        }
        setActiveShakingCharId(target.id);
      } else if (chosenSkill.effect_type === "HEAL") {
        val = Math.max(chosenSkill.power + Math.floor(actor.stats.def * 0.5), 20);
        type = "heal";
        logText = `[${actor.name}] が [${chosenSkill.name}] ➔ [${target.name}] のHPを ${val.toLocaleString()} 回復！`;
      } else if (chosenSkill.effect_type === "DEFENSE" || chosenSkill.effect_type === "SUPPORT") {
        val = chosenSkill.power > 0 ? chosenSkill.power : 50;
        type = "shield";
        logText = `[${actor.name}] が [${chosenSkill.name}] ➔ 自身にシールドバリア(${val.toLocaleString()})を展開！`;
      }

      setEnemyPartyStates(prevEnemies => {
        let updatedEnemies = prevEnemies;
        if (type === "dmg") {
          updatedEnemies = prevEnemies.map(e => {
            if (e.id === target.id) {
              const nextHp = Math.max(e.hp - val, 0);
              return { ...e, hp: nextHp, isDead: nextHp <= 0 };
            }
            return e;
          });
        }

        setPlayerPartyStates(prevPlayers => {
          let updatedPlayers = prevPlayers;
          if (type === "heal") {
            updatedPlayers = prevPlayers.map(p => {
              if (p.id === target.id) {
                return { ...p, hp: Math.min(p.hp + val, p.maxHp) };
              }
              return p;
            });
          } else if (type === "shield") {
            updatedPlayers = prevPlayers.map(p => {
              if (p.id === actor.id) {
                return { ...p, shield: p.shield + val, tauntTurns: 2 };
              }
              return p;
            });
          }

          const updatedLogs = [...battleLog, logText];
          setBattleLog(updatedLogs);
          setDamagePopup({ val, type, isCritical: isCrit, x: 120, y: 40, charId: target.id });

          setTimeout(() => {
            setActiveSkillCutIn(null);
            setTargetLine(null);
            setActiveShakingCharId(null);
            setDamagePopup(null);

            // 勝敗チェック
            const isEnemyDead = updatedEnemies.every(e => e.isDead);
            if (isEnemyDead) {
              endBattleSession("VICTORY");
            } else {
              const nextIndex = (curTlIdx + 1) % timeline.length;
              handleEndTurn(nextIndex);

              if (session && battleSessionId) {
                saveBattleSessionState(battleSessionId, updatedPlayers, updatedEnemies, nextAp, maxAp, tactic, updatedLogs, nextIndex, gvgTargetBaseId);
              }
            }
          }, 800 / battleSpeed);

          return updatedPlayers;
        });

        return updatedEnemies;
      });
    }, 800 / battleSpeed);
  };

  // オート戦闘進行タイマー
  useEffect(() => {
    if (battleState !== "PLAYING" || isAutoPaused) return;

    const authoritativeEvents = battleMode === "PATROL" ? officialPatrolEvents
      : battleMode === "PVP" ? officialPvpEvents
      : battleMode === "RAID" ? officialRaidEvents
      : [];
    const authoritativeEventIndex = battleMode === "PATROL" ? officialPatrolEventIndex
      : battleMode === "PVP" ? officialPvpEventIndex
      : battleMode === "RAID" ? officialRaidEventIndex
      : 0;
    const authoritativeReplayId = battleMode === "PATROL" ? officialPatrolReplayId
      : battleMode === "PVP" ? officialPvpReplayId
      : battleMode === "RAID" ? officialRaidReplayId
      : null;
    if (authoritativeEvents.length > 0) {
      const replayEvent = authoritativeEvents[authoritativeEventIndex];
      if (!replayEvent) return;
      const delay = replayEvent.type === "ACTION" ? 450 : replayEvent.type === "RESULT" ? 700 : 600;
      const timer = setTimeout(() => {
        const payload = replayEvent.payload;
        const actorId = String(payload.actorId ?? "");
        const targetId = String(payload.targetId ?? "");
        const allParticipants = [...playerPartyStates, ...enemyPartyStates];
        const actor = allParticipants.find((participant) => participant.id === actorId);
        const target = allParticipants.find((participant) => participant.id === targetId);
        setBattleRound(replayEvent.round);

        if (replayEvent.type === "ACTION") {
          const skillId = String(payload.skillId ?? "BASIC_ATTACK");
          const skill = actor?.skills.find((entry: any) => String(entry.id ?? entry.skill_card_id) === skillId);
          const nextImpact = authoritativeEvents.slice(authoritativeEventIndex + 1)
            .find((entry) => entry.type === "DAMAGE" || entry.type === "HEAL");
          const nextTargetId = String(nextImpact?.payload.targetId ?? "");
          setActiveSkillCutIn({ charName: actor?.name ?? actorId, skillName: skill?.name ?? (skillId === "BASIC_ATTACK" ? "通常攻撃" : skillId) });
          const actorTimelineIndex = timeline.findIndex((entry) => entry.id === actorId);
          if (actorTimelineIndex >= 0) setTimelineIndex(actorTimelineIndex);
          if (nextTargetId) setTargetLine({ fromId: actorId, toId: nextTargetId });
          setBattleLog((previous) => [...previous, `[ROUND ${replayEvent.round}] ${actor?.name ?? actorId}：${skill?.name ?? "通常攻撃"}`]);
        } else if (replayEvent.type === "DAMAGE") {
          const amount = Math.max(0, Number(payload.amount ?? 0));
          const remainingHp = Math.max(0, Number(payload.remainingHp ?? target?.hp ?? 0));
          const critical = payload.critical === true;
          const missed = payload.hit === false;
          const updateTarget = (participant: ParticipantState) => participant.id === targetId
            ? { ...participant, hp: remainingHp, isDead: remainingHp <= 0 }
            : participant;
          setPlayerPartyStates((previous) => previous.map(updateTarget));
          setEnemyPartyStates((previous) => previous.map(updateTarget));
          setTargetLine(actorId && targetId ? { fromId: actorId, toId: targetId } : null);
          setActiveShakingCharId(missed ? null : targetId);
          setDamagePopup({ val: amount, type: "dmg", isCritical: critical, x: 120, y: 40, charId: targetId });
          playCyberSe(missed ? "click" : "hit");
          setBattleLog((previous) => [...previous, missed
            ? `${actor?.name ?? actorId}の攻撃は外れた。`
            : `${target?.name ?? targetId}に ${amount.toLocaleString()}${critical ? " 【CRITICAL!】" : ""} ダメージ。`]);
        } else if (replayEvent.type === "HEAL") {
          const amount = Math.max(0, Number(payload.amount ?? 0));
          const remainingHp = Math.max(0, Number(payload.remainingHp ?? target?.hp ?? 0));
          const updateTarget = (participant: ParticipantState) => participant.id === targetId
            ? { ...participant, hp: remainingHp, isDead: false }
            : participant;
          setPlayerPartyStates((previous) => previous.map(updateTarget));
          setEnemyPartyStates((previous) => previous.map(updateTarget));
          setDamagePopup({ val: amount, type: "heal", x: 120, y: 40, charId: targetId });
          playCyberSe("click");
          setBattleLog((previous) => [...previous, `${target?.name ?? targetId}のHPが ${amount.toLocaleString()} 回復。`]);
        } else if (replayEvent.type === "STATUS") {
          const status = String(payload.status ?? "STATUS");
          if (status === "STUN") {
            const updateTarget = (participant: ParticipantState) => participant.id === targetId ? { ...participant, stunTurns: 1 } : participant;
            setPlayerPartyStates((previous) => previous.map(updateTarget));
            setEnemyPartyStates((previous) => previous.map(updateTarget));
          }
          setBattleLog((previous) => [...previous, `${target?.name ?? targetId}に ${status} が付与された。`]);
        } else if (replayEvent.type === "DEFEAT") {
          const updateTarget = (participant: ParticipantState) => participant.id === targetId
            ? { ...participant, hp: 0, isDead: true }
            : participant;
          setPlayerPartyStates((previous) => previous.map(updateTarget));
          setEnemyPartyStates((previous) => previous.map(updateTarget));
          setBattleLog((previous) => [...previous, `${target?.name ?? targetId}は戦闘不能。`]);
        } else if (replayEvent.type === "RESULT") {
          setActiveSkillCutIn(null);
          setTargetLine(null);
          setActiveShakingCharId(null);
          setDamagePopup(null);
          const winner = payload.winner === "PLAYER" ? "VICTORY" : "DEFEAT";
          void endBattleSession(winner);
          return;
        }

        if (replayEvent.type !== "ACTION") {
          setActiveSkillCutIn(null);
          setTargetLine(null);
          setActiveShakingCharId(null);
        }
        const advanceReplay = (previous: number) => {
          const next = previous + 1;
          if (authoritativeReplayId && typeof window !== "undefined") {
            window.localStorage.setItem(patrolReplayCursorKey(authoritativeReplayId), String(next));
          }
          return next;
        };
        if (battleMode === "PATROL") setOfficialPatrolEventIndex(advanceReplay);
        else if (battleMode === "PVP") setOfficialPvpEventIndex(advanceReplay);
        else if (battleMode === "RAID") setOfficialRaidEventIndex(advanceReplay);
      }, delay / battleSpeed);

      return () => clearTimeout(timer);
    }

    const activeNode = timeline[timelineIndex];
    if (!activeNode) return;

    const timer = setTimeout(() => {
      if (activeNode.isEnemy) {
        executeEnemyTurn(activeNode.id, timelineIndex);
      } else {
        executeAutoPlayerTurn(activeNode.id, timelineIndex);
      }
    }, 1500 / battleSpeed);

    return () => clearTimeout(timer);
  }, [battleState, battleMode, timelineIndex, isAutoPaused, battleSpeed, officialPatrolEvents, officialPatrolEventIndex, officialPatrolReplayId, officialPvpEvents, officialPvpEventIndex, officialPvpReplayId, officialRaidEvents, officialRaidEventIndex, officialRaidReplayId]);

  const endBattleSession = async (result: "VICTORY" | "DEFEAT") => {
    if (!session) return;
    setBattleState(null);
    setBattleMode(null);
    const modeTemp = battleMode;
    const opponentNameTemp = battleOpponentName;
    const gvgAreaTemp = gvgTargetBaseId;
    const gvgAttackIdTemp = officialGvgAttackId;
    const gvgReplayIdTemp = officialGvgReplayId;
    const gvgWinnerTemp = officialGvgWinner;
    const hasOfficialGvgResult = modeTemp === "GVG" && gvgAttackIdTemp && gvgReplayIdTemp
      && (gvgWinnerTemp === "PLAYER" || gvgWinnerTemp === "ENEMY");
    const patrolWinnerTemp = officialPatrolWinner;
    const patrolReplayIdTemp = officialPatrolReplayId;
    const hasOfficialPatrolResult = modeTemp === "PATROL" && officialPatrolReplayId
      && (patrolWinnerTemp === "PLAYER" || patrolWinnerTemp === "ENEMY");
    const pvpWinnerTemp = officialPvpWinner;
    const pvpReplayIdTemp = officialPvpReplayId;
    const pvpResultTemp = officialPvpResult;
    const hasOfficialPvpResult = modeTemp === "PVP" && officialPvpReplayId
      && (pvpWinnerTemp === "PLAYER" || pvpWinnerTemp === "ENEMY");
    const raidWinnerTemp = officialRaidWinner;
    const raidReplayIdTemp = officialRaidReplayId;
    const raidResultTemp = officialRaidResult;
    const hasOfficialRaidResult = modeTemp === "RAID" && officialRaidReplayId
      && officialRaidResult
      && (raidWinnerTemp === "PLAYER" || raidWinnerTemp === "ENEMY");
    const finalResult = hasOfficialGvgResult
      ? (gvgWinnerTemp === "PLAYER" ? "VICTORY" : "DEFEAT")
      : hasOfficialPatrolResult
        ? (patrolWinnerTemp === "PLAYER" ? "VICTORY" : "DEFEAT")
        : hasOfficialPvpResult
          ? (pvpWinnerTemp === "PLAYER" ? "VICTORY" : "DEFEAT")
      : result;
    setOfficialGvgAttackId(null);
    setOfficialGvgReplayId(null);
    setOfficialGvgWinner(null);
    setOfficialPatrolReplayId(null);
    setOfficialPatrolWinner(null);
    setOfficialPatrolEvents([]);
    setOfficialPatrolEventIndex(0);
    setOfficialPvpReplayId(null);
    setOfficialPvpWinner(null);
    setOfficialPvpEvents([]);
    setOfficialPvpEventIndex(0);
    setOfficialPvpResult(null);
    setOfficialRaidReplayId(null);
    setOfficialRaidWinner(null);
    setOfficialRaidEvents([]);
    setOfficialRaidEventIndex(0);
    setOfficialRaidResult(null);
    if (patrolReplayIdTemp && typeof window !== "undefined") {
      window.localStorage.removeItem(patrolReplayCursorKey(patrolReplayIdTemp));
    }
    if (pvpReplayIdTemp && typeof window !== "undefined") {
      window.localStorage.removeItem(patrolReplayCursorKey(pvpReplayIdTemp));
    }
    if (raidReplayIdTemp && typeof window !== "undefined") {
      window.localStorage.removeItem(patrolReplayCursorKey(raidReplayIdTemp));
    }
    setGvgTargetBaseId(null);
    const isWin = finalResult === "VICTORY";

    if (modeTemp === "PVP_PRACTICE") {
      setBattleSessionId(null);
      if (setConfirmDialogConfig) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "NPC模擬戦結果",
          message: createElement(ModeBattleResultCard, {
            mode: "PVP",
            victory: isWin,
            opponent: opponentNameTemp,
            stats: [
              { label: "MODE", value: "PRACTICE" },
              { label: "PVP POINT", value: "消費なし" },
              { label: "RANK", value: "変動なし" },
            ],
            reward: "報酬なし",
            note: "模擬戦は戦績・ランキング・報酬へ反映されません。",
          }),
          confirmText: "防衛設定へ戻る",
          onConfirm: () => { setConfirmDialogConfig(null); navigateTab?.("pvp"); },
          onCancel: () => { setConfirmDialogConfig(null); navigateTab?.("pvp"); },
        });
      }
      return;
    }

    if (battleSessionId) {
      await supabase.from("battle_sessions").update({ status: finalResult }).eq("id", battleSessionId);
    }

    const { data: tutorialSession } = await supabase
      .from("story_sessions")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (tutorialSession && tutorialSession.stage_id === "stage_tutorial_01" && tutorialSession.status === "BATTLE") {
      if (isWin) {
        await supabase.from("story_sessions").update({ status: "OUTRO_TALK", current_node_id: 0 }).eq("user_id", session.user.id);
      } else {
        await supabase.from("story_sessions").update({ status: "INTRO_TALK", current_node_id: 0 }).eq("user_id", session.user.id);
      }
      await syncBootstrapData(session.user.id);
      return;
    }

    if (modeTemp === "PATROL") {
      // Patrol resolution is committed by resolve-battle. The browser only
      // plays the animation and reflects the already-authoritative result.
      await syncBootstrapData(session.user.id);
      if (setConfirmDialogConfig) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "バトル結果",
          message: `見回りバトル終了: ${finalResult === "VICTORY" ? "勝利！追加報酬が確定しました。" : "敗北：追加報酬はありません。"}`,
          onConfirm: () => setConfirmDialogConfig(null),
          onCancel: () => setConfirmDialogConfig(null)
        });
      }
    } else if (modeTemp === "PVP") {
      if (!hasOfficialPvpResult || !pvpResultTemp) {
        setErrorMessage("PvPのサーバー確定結果を確認できませんでした。");
        return;
      }
      const pointsDiff = Number(pvpResultTemp.rankDelta ?? 0);
      const rewardCash = Number(pvpResultTemp.rewards?.cash ?? 0);
      setPvpRate?.(Number(pvpResultTemp.newRankPoints ?? pvpRate));
      setPvpPoints(Number(pvpResultTemp.remainingPvpPoints ?? pvpPoints));
      postNpcYajiMessage(session, username, "GLOBAL", currentBaseId, "PVP_WIN");
      await syncBootstrapData(session.user.id);
      const { data: firstPvpMilestone } = await supabase.from("user_funnel_milestones")
        .select("occurrence_count").eq("user_id", session.user.id).eq("milestone", "first_pvp").maybeSingle();
      const isFirstOfficialPvp = Number(firstPvpMilestone?.occurrence_count || 0) === 1;
      if (setConfirmDialogConfig) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "PvP結果",
          message: createElement(ModeBattleResultCard, { mode: "PVP", victory: finalResult === "VICTORY", opponent: opponentNameTemp, stats: [{ label: "RANK CHANGE", value: `${pointsDiff >= 0 ? "+" : ""}${pointsDiff} pt` }, { label: "PVP POINT", value: `${Number(pvpResultTemp.remainingPvpPoints ?? 0)}/5` }], reward: `CASH +${rewardCash.toLocaleString()}`, note: isFirstOfficialPvp ? "初戦の順位を確認して、次のレイドへ進もう。" : "PvPへ戻って次の対戦相手を選べます。" }),
          confirmText: isFirstOfficialPvp ? "ランキングを確認" : "PvPへ戻る", cancelText: "Homeへ",
          onConfirm: () => { setConfirmDialogConfig(null); navigateTab?.(isFirstOfficialPvp ? "ranking" : "pvp"); },
          onCancel: () => { setConfirmDialogConfig(null); navigateTab?.("home"); }
        });
      }
    } else if (modeTemp === "RAID") {
      if (hasOfficialRaidResult && raidResultTemp) {
        await syncBootstrapData(session.user.id);
        if (setConfirmDialogConfig) setConfirmDialogConfig({
          isOpen:true,title:"レイド結果",
          message:createElement(ModeBattleResultCard, { mode: "RAID", victory: finalResult === "VICTORY", opponent: opponentNameTemp, stats: [{ label: "今回 DAMAGE", value: Number(raidResultTemp.rawDamage||0).toLocaleString() }, { label: "BOSS HP反映", value: Number(raidResultTemp.appliedDamage||0).toLocaleString() }, { label: "個人 CONTRIBUTION", value: Number(raidResultTemp.personalContribution||0).toLocaleString() }, { label: "BOSS 残りHP", value: Number(raidResultTemp.remainingBossHp||0).toLocaleString() }], reward: "サーバー確定報酬を反映済み", note: userGuildMember ? "TRIBE Contributionにも所属Snapshotで反映されます。" : "TRIBE加入でGuild RankingとContributionへ参加できます。" }),
          confirmText:userGuildMember ? "レイドへ戻る" : "おすすめTRIBEを見る",cancelText:"Homeへ",
          onConfirm:()=>{setConfirmDialogConfig(null);if(userGuildMember){navigateTab?.("raid");}else{void supabase.rpc("record_client_funnel_event",{p_event_name:"raid_to_guild_cta",p_source_screen:"raid_result",p_source_cta:"guild",p_object_id:null,p_metadata:{}});navigateTab?.("guild");}},onCancel:()=>{setConfirmDialogConfig(null);navigateTab?.("home");}
        });
        return;
      }
      setErrorMessage("Raidのサーバー確定結果を確認できませんでした。再度Raidを開始してください。");
      return;
    } else if (modeTemp === "GVG") {
      const guildIdFilter = userGuildMember?.guild_id || "";
      if (gvgAttackIdTemp && gvgReplayIdTemp) {
        try {
          const { data, error } = await supabase.rpc("resolve_gvg_attack", {
            p_attack_id: gvgAttackIdTemp,
            p_battle_replay_session_id: gvgReplayIdTemp,
            // migration 00068 ignores these client values and reads the server replay result.
            p_is_victory: false,
            p_raw_damage: 0,
          });
          if (error) throw error;
          if (setConfirmDialogConfig) {
            setConfirmDialogConfig({
              isOpen: true,
              title: "公式GvG結果",
              message: `サーバー確定結果: ${gvgWinnerTemp === "PLAYER" ? "勝利" : "敗北"}\n確定ダメージ ${Number(data?.raw_damage ?? 0).toLocaleString()}\n共通HP反映 ${Number(data?.applied_damage ?? 0).toLocaleString()}`,
              onConfirm: () => setConfirmDialogConfig(null),
              onCancel: () => setConfirmDialogConfig(null),
            });
          }
        } catch (error: any) {
          console.warn("Failed to resolve official GvG result:", error.message);
          setErrorMessage("公式GvG結果を反映できませんでした。");
        }
      // Legacy client-side GvG scoring is retired. Official attacks always
      // obtain an attack ID and are resolved through the server replay path.
      } else if (!gvgAttackIdTemp && guildIdFilter && gvgAreaTemp) {
        setErrorMessage("Official GvG attacks must be started again before their result can be resolved.");
      } else if (false) { /*
        try {
          const isPractice = gvgAreaTemp === guildIdFilter;

          if (isPractice) {
            // 防衛演習
            if (isWin) {
              // 演習勝利: 自ギルドポイントに +100
              const existRec = gvgBaseControls.find(g => g.base_id === "neon_tower" && g.guild_id === guildIdFilter);
              const nextPoints = (existRec?.daily_points || 0) + 100;
              await supabase.from("guild_base_controls").upsert({ base_id: "neon_tower", guild_id: guildIdFilter, daily_points: nextPoints });

              // ギルド進行マッチングポイント（gvg_matches）がある場合も +100 加算
              const { data: dayRec } = await supabase.from("gvg_season_status").select("current_day").eq("id", 1).maybeSingle();
              const currentDay = dayRec?.current_day || 1;
              const isFinalDay = currentDay === 7;

              const { data: matchRecs } = await supabase
                .from("gvg_matches")
                .select("*")
                .eq("status", "ONGOING")
                .eq("is_finals", isFinalDay);
              
              let myMatch: any = null;
              if (matchRecs) {
                myMatch = matchRecs?.find((m: any) => m.guild_a_id === guildIdFilter || m.guild_b_id === guildIdFilter);
              }

              if (myMatch) {
                const isGuildA = myMatch!.guild_a_id === guildIdFilter;
                const nextGuildPts = isGuildA ? (myMatch.guild_a_points || 0) + 100 : (myMatch.guild_b_points || 0) + 100;
                await supabase
                  .from("gvg_matches")
                  .update(isGuildA ? { guild_a_points: nextGuildPts } : { guild_b_points: nextGuildPts })
                  .eq("id", myMatch.id);
              }

              await addGuildXpAndContributionByAction("GVG");
              if (setConfirmDialogConfig) {
                setConfirmDialogConfig!({
                  isOpen: true,
                  title: "防衛演習結果",
                  message: "防衛演習 勝利！ 自組織に100ポイント付与。",
                  onConfirm: () => setConfirmDialogConfig!(null),
                  onCancel: () => setConfirmDialogConfig!(null)
                });
              }
            } else {
              if (setConfirmDialogConfig) {
                setConfirmDialogConfig!({
                  isOpen: true,
                  title: "防衛演習結果",
                  message: "防衛演習 敗北... (ポイント変動なし)",
                  onConfirm: () => setConfirmDialogConfig!(null),
                  onCancel: () => setConfirmDialogConfig!(null)
                });
              }
            }
          } else {
            // 本番侵攻
            const res = await supabase.rpc("process_gvg_battle_result_v2", {
              p_user_id: session.user.id,
              p_guild_id: guildIdFilter,
              p_base_id: gvgAreaTemp,
              p_is_practice: false,
              p_is_win: isWin
            });
            if (res.error) throw res.error;
            if (res.data?.error) throw new Error(res.data.error);

            if (isWin) {
              await addGuildXpAndContributionByAction("GVG");
              postNpcYajiMessage(session, username, "BASE", gvgAreaTemp!, "GVG_WIN");
              if (setConfirmDialogConfig) {
                setConfirmDialogConfig!({
                  isOpen: true,
                  title: "抗争結果",
                  message: "侵攻勝利！ 自組織の抗争ポイント +250。個人抗争ポイント +250。",
                  onConfirm: () => setConfirmDialogConfig!(null),
                  onCancel: () => setConfirmDialogConfig!(null)
                });
              }
            } else {
              if (setConfirmDialogConfig) {
                setConfirmDialogConfig!({
                  isOpen: true,
                  title: "抗争結果",
                  message: "侵攻失敗... 自組織の抗争ポイント -100。個人抗争ポイント -100。相手ギルド防衛ポイント +100。",
                  onConfirm: () => setConfirmDialogConfig!(null),
                  onCancel: () => setConfirmDialogConfig!(null)
                });
              }
            }
          }
        } catch (err: any) {
          console.warn("Failed to update GvG match score:", err.message);
        }
      */
      }
    }
    await syncBootstrapData(session.user.id);
  };

  const resumeBattleSession = (activeBattleSession: any, localCharIds: string[]) => {
    const pState = activeBattleSession.player_state as any;
    const eState = activeBattleSession.enemy_state as any;

    if (pState && eState) {
      setBattleSessionId(activeBattleSession.id);
      setBattleMode(activeBattleSession.battle_type as any);
      setBattleOpponentName(activeBattleSession.target_id);
      setGvgTargetBaseId(pState.gvgAreaId || null);
      setOfficialGvgAttackId(pState.officialGvgAttackId || null);
      setOfficialGvgReplayId(pState.officialGvgReplayId || null);
      setOfficialGvgWinner(pState.officialGvgWinner === "PLAYER" ? "PLAYER" : pState.officialGvgWinner === "ENEMY" ? "ENEMY" : null);
      setOfficialPatrolReplayId(pState.officialPatrolReplayId || null);
      setOfficialPatrolWinner(pState.officialPatrolWinner === "PLAYER" ? "PLAYER" : pState.officialPatrolWinner === "ENEMY" ? "ENEMY" : null);
      setOfficialPatrolEvents(serverBattleEvents(pState.officialPatrolEvents));
      setOfficialPatrolEventIndex(savedPatrolReplayCursor(pState.officialPatrolReplayId, pState.officialPatrolEventIndex));
      setOfficialPvpReplayId(pState.officialPvpReplayId || null);
      setOfficialPvpWinner(pState.officialPvpWinner === "PLAYER" ? "PLAYER" : pState.officialPvpWinner === "ENEMY" ? "ENEMY" : null);
      setOfficialPvpEvents(serverBattleEvents(pState.officialPvpEvents));
      setOfficialPvpEventIndex(savedPatrolReplayCursor(pState.officialPvpReplayId, pState.officialPvpEventIndex));
      setOfficialPvpResult(pState.officialPvpResult || null);
      setOfficialRaidReplayId(pState.officialRaidReplayId || null);
      setOfficialRaidWinner(pState.officialRaidWinner === "PLAYER" ? "PLAYER" : pState.officialRaidWinner === "ENEMY" ? "ENEMY" : null);
      setOfficialRaidEvents(serverBattleEvents(pState.officialRaidEvents));
      setOfficialRaidEventIndex(savedPatrolReplayCursor(pState.officialRaidReplayId, pState.officialRaidEventIndex));
      setOfficialRaidResult(pState.officialRaidResult || null);

      setPlayerPartyStates(pState.playerStates || []);
      setEnemyPartyStates(eState.enemyStates || []);
      setAp(pState.ap || 3);
      setMaxAp(pState.maxAp || 10);
      setTactic(pState.tactic || "ATTACK_PRIORITY");
      setBattleLog(pState.log || ["戦闘セッションを安全に復元しました。"]);

      // タイムラインの再ソート
      const timelineQueue = [
        ...(pState.playerStates || []).map((p: any) => ({ id: p.id, name: p.name, isEnemy: false, spd: p.stats.spd })),
        ...(eState.enemyStates || []).map((e: any) => ({ id: e.id, name: e.name, isEnemy: true, spd: e.stats.spd }))
      ];
      timelineQueue.sort((a: any, b: any) => b.spd - a.spd);

      setTimeline(timelineQueue);
      setTimelineIndex(pState.timelineIndex || 0);
      setBattleRound(1);

      setBattleState("PLAYING");
    }
  };

  return {
    battleSessionId, setBattleSessionId,
    battleMode, setBattleMode,
    hasRaidControlBonus, setHasRaidControlBonus,
    battleOpponentName, setBattleOpponentName,
    battleState, setBattleState,
    battleLog, setBattleLog,
    ap, setAp,
    maxAp, setMaxAp,
    tactic, setTactic,
    battleSpeed, setBattleSpeed,
    isAutoPaused, setIsAutoPaused,
    playerPartyStates, setPlayerPartyStates,
    enemyPartyStates, setEnemyPartyStates,
    timeline, setTimeline,
    timelineIndex, setTimelineIndex,
    battleRound, setBattleRound,
    activeSkillCutIn,
    targetLine,
    activeShakingCharId,
    damagePopup, setDamagePopup,
    gvgTargetBaseId, setGvgTargetBaseId,
    battleLoading, setBattleLoading,
    startCardBattle,
    launchBattlePlaying,
    handleEndTurn,
    endBattleSession,
    resumeBattleSession,
    resumeActiveBattleSession
  };
}
