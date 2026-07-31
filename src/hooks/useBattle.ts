"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import {
  RAID_BOSS_ID,
  CHARACTERS_MASTER,
  ENEMIES_MASTER
} from "@/utils/game_constants";
import { getCharacterTotalStats, getCharacterApBonus } from "@/utils/stats_calculator";

import { UseBattleOptions, ParticipantState, CardState, SkillLogItem } from "./battle/battleTypes";
import { selectCharacterSkillByTactic } from "./battle/battleAI";
import { postNpcYajiMessage, saveBattleSessionState } from "./battle/battleUtils";

export type { UseBattleOptions, ParticipantState, CardState, SkillLogItem };

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
    pvpTickets,
    setPvpTickets,
    userLevel,
    setUserLevel,
    userXp,
    setUserXp,
    pvpPoints,
    pvpRankings,
    raidBossHp,
    raidBossMaxHp,
    raidTotalDamage,
    setRaidTotalDamage,
    cash,
    setCash,
    setErrorMessage,
    addGuildXpAndContributionByAction,
    patrolNpcs = [],
    patrol
  } = options;

  const [battleSessionId, setBattleSessionId] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<"PVP" | "RAID" | "GVG" | "PATROL" | null>(null);
  const [hasRaidControlBonus, setHasRaidControlBonus] = useState<boolean>(false);
  const [battleOpponentName, setBattleOpponentName] = useState<string>("");
  const [battleState, setBattleState] = useState<"SETUP" | "PLAYING" | "OUTRO" | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [ap, setAp] = useState<number>(3);
  const [maxAp, setMaxAp] = useState<number>(10);
  const [tactic, setTactic] = useState<"OFFENSIVE" | "DEFENSIVE" | "HEALING" | "BALANCED" | "AP_CONSERVING" | "TACTICAL">("OFFENSIVE");
  const [battleSpeed, setBattleSpeed] = useState<number>(1); // 1 = 1x, 2 = 2x
  const [isAutoPaused, setIsAutoPaused] = useState<boolean>(false);
  const [gvgTargetBaseId, setGvgTargetBaseId] = useState<string | null>(null);
  const [battleLoading, setBattleLoading] = useState<boolean>(false);
  const [enemyTactic, setEnemyTactic] = useState<string>("OFFENSIVE");
  const [opponentPoints, setOpponentPoints] = useState<number>(1000);

  // 5v5 状態管理
  const [playerPartyStates, setPlayerPartyStates] = useState<ParticipantState[]>([]);
  const [enemyPartyStates, setEnemyPartyStates] = useState<ParticipantState[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);

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
        if (playerStateData.gvgAreaId) setGvgTargetBaseId(playerStateData.gvgAreaId);

        setBattleState("PLAYING");
        return true;
      }
    } catch (err) {
      console.warn("Failed to resume active battle session:", err);
    }
    return false;
  };

  // バトルの初期設定フェーズへ移行
  const startCardBattle = async (
    mode: "PVP" | "RAID" | "GVG" | "PATROL",
    targetName: string,
    areaIdOrOpponentUserId?: string,
    oppPoints?: number,
    oppTactic?: string,
    opponentMainAlign?: string,
    opponentSubAlign?: string,
    opponentDefenseCharIds?: string[],
    supportCharacter?: any
  ) => {
    if (!session) return;
    if (mode === "RAID" && userLevel < 5) {
      setErrorMessage("レイドへの参加にはプレイヤーレベル5以上が必要です。");
      return;
    }
    setBattleLoading(true);
    playCyberSe("click");

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
      const npcMaster = patrolNpcs.find(n => n.id === areaIdOrOpponentUserId);
      if (npcMaster) {
        bossMaster = {
          id: npcMaster.id,
          boss_name: npcMaster.npc_name,
          level: npcMaster.level || 1,
          max_hp: npcMaster.hp || 1000,
          atk: npcMaster.atk || 100,
          def: npcMaster.def || 100,
          spd: npcMaster.spd || 100,
          luk: npcMaster.luk || 10,
          skills: typeof npcMaster.skills === "string" ? JSON.parse(npcMaster.skills) : npcMaster.skills
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
          const { data: baseControls } = await supabase.from("guild_base_controls").select("*").eq("base_id", areaIdOrOpponentUserId);
          if (baseControls && baseControls.length > 0) {
            const sortedControls = [...baseControls].sort((a, b) => b.daily_points - a.daily_points);
            const topGuildId = sortedControls[0].guild_id;
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

    if (mode === "PVP") {
      try {
        const { data: payLoad, error: pvpErr } = await supabase
          .from("users")
          .update({
            pvp_tickets: pvpTickets - 1,
            pvp_tickets_last_recovered_at: pvpTickets === 5 ? new Date().toISOString() : undefined
          })
          .eq("id", session.user.id)
          .gte("pvp_tickets", 1)
          .select("pvp_tickets");

        if (pvpErr || !payLoad || payLoad.length === 0) {
          setErrorMessage("PvP入場券が不足しています。");
          setBattleLoading(false);
          return;
        }
        setPvpTickets(payLoad[0].pvp_tickets);
        
        // 対戦相手のレートと作戦を設定
        setOpponentPoints(oppPoints || 1000);
        setEnemyTactic(oppTactic || "OFFENSIVE");
      } catch (err) {
        console.warn(err);
        setBattleLoading(false);
        return;
      }
    }

    setBattleMode(mode);
    setBattleOpponentName(targetName);
    if (mode === "GVG" && areaIdOrOpponentUserId) setGvgTargetBaseId(areaIdOrOpponentUserId);
    else setGvgTargetBaseId(null);

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
    const initialPlayerParty: ParticipantState[] = userCharRecords.map((charRecord, idx) => {
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
        const { data: dbChars } = await supabase
          .from("user_characters")
          .select("*")
          .eq("user_id", areaIdOrOpponentUserId);

        if (dbChars && dbChars.length > 0) {
          const charIds = dbChars.map(c => c.id);
          const [equipsRes, skillsRes] = await Promise.all([
            supabase.from("user_equipments").select("*").in("equipped_character_id", charIds),
            supabase.from("user_skills").select("*").in("equipped_character_id", charIds)
          ]);

          const enemyEquips = equipsRes.data || [];
          const enemySkills = skillsRes.data || [];

          // 対戦相手の防衛デッキのキャラクター順序を再現
          let sortedEnemyChars = [...dbChars];
          if (opponentDefenseCharIds && opponentDefenseCharIds.length > 0) {
            sortedEnemyChars = opponentDefenseCharIds.map(id => {
              return dbChars.find(c => c.id === id || c.character_id === id || c.character_id === id.replace("c_", ""));
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

            if (charSkills.length === 0) {
              charSkills.push({ id: `e_skill_${idx}_1`, skill_card_id: `e_skill_${idx}_1`, name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK", plus_val: 0, ownerId: charRecord.character_id });
            }

            return {
              id: `enemy_${charRecord.character_id}`,
              name: (master?.jpName || "敵構成員") + bonusLabel,
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
    if (mode === "GVG" && areaIdOrOpponentUserId) {
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
            const { data: oppUser } = await supabase
              .from("users")
              .select("username")
              .eq("id", opponentUserId)
              .maybeSingle();

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
              const { data: dbChars } = await supabase
                .from("user_characters")
                .select("*")
                .in("id", charIds);

              if (dbChars && dbChars.length > 0) {
                // ソート順の維持
                const sortedChars = charIds.map(cid => dbChars.find((c: any) => c.id === cid)).filter(Boolean);

                const [equipsRes, skillsRes] = await Promise.all([
                  supabase.from("user_equipments").select("*").in("equipped_character_id", charIds),
                  supabase.from("user_skills").select("*").in("equipped_character_id", charIds)
                ]);

                const enemyEquips = equipsRes.data || [];
                const enemySkills = skillsRes.data || [];

                // 支配ギルド判定 (防衛バフ +10% 適用)
                let isOpponentControlling = false;
                if (!isPractice) {
                  const { data: baseControls } = await supabase
                    .from("guild_base_controls")
                    .select("*")
                    .eq("base_id", areaIdOrOpponentUserId)
                    .eq("guild_id", oppGuildId)
                    .maybeSingle();
                  isOpponentControlling = baseControls?.is_controlling || false;
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

                  if (charSkills.length === 0) {
                    charSkills.push({ id: `e_skill_${idx}_1`, skill_card_id: `e_skill_${idx}_1`, name: "通常攻撃", ap_cost: 1, power: 45, effect_type: "ATTACK", plus_val: 0, ownerId: charRecord.character_id });
                  }

                  return {
                    id: `enemy_${charRecord.character_id}`,
                    name: `${master?.jpName || "敵構成員"}${buffLabel} (${teamLabel})`,
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
      if (mode === "PVP" || mode === "GVG") {
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

    const startLogs = [`出撃準備完了: VS ${targetName} (${mode}戦)`];
    setBattleLog(startLogs);

    // セッションの保存
    try {
      const { data: sessionData } = await supabase.from("battle_sessions").insert({
        user_id: session.user.id,
        battle_type: mode,
        target_id: targetName,
        player_state: { playerStates: initialPlayerParty, ap: 3, maxAp: calculatedMaxAp, tactic: "OFFENSIVE", log: startLogs, timelineIndex: 0, gvgAreaId: (mode === "GVG" ? areaIdOrOpponentUserId : null) },
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

  // 割合防御減算モデル ＋ 乱数±5% ＋ LUK連動クリティカル ＋ アライメント相性計算
  const calcDynamicDamage = (
    attacker: ParticipantState,
    defender: ParticipantState,
    skillPower: number,
    hasRaidBonus: boolean = false
  ): { damage: number; isCritical: boolean } => {
    // 基礎火力 = ATK * (1 + power / 100)
    const basePower = attacker.stats.atk * (1 + (skillPower / 100));
    
    // 割合防御カット率 = DEF / (DEF + 2000)
    const cutRate = defender.stats.def / (defender.stats.def + 2000);
    const basicDmg = basePower * (1 - cutRate);

    // アライメント（属性）相性補正: JUSTICE > EVIL > CHAOS > ORDER > JUSTICE
    const alignMap: Record<string, string> = {
      JUSTICE: "EVIL",
      EVIL: "CHAOS",
      CHAOS: "ORDER",
      ORDER: "JUSTICE"
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
    const variance = 0.95 + (Math.random() * 0.10);

    // LUK連動クリティカル判定
    const critChance = attacker.stats.luk / (attacker.stats.luk + 500);
    const isCritical = Math.random() < critChance;
    const critMultiplier = isCritical ? 1.5 : 1.0;

    // レイド支配ボーナス (+20%)
    const raidMultiplier = hasRaidBonus ? 1.2 : 1.0;

    const finalDmg = Math.max(Math.floor(basicDmg * alignMultiplier * variance * critMultiplier * raidMultiplier), 10);
    return { damage: finalDmg, isCritical };
  };

  // 戦闘オート進行を開始
  const launchBattlePlaying = () => {
    playCyberSe("click");
    setBattleState("PLAYING");

    // バトル開始時発動スキル (START_OF_BATTLE) の評価
    let nextLogs = [...battleLog, "戦闘開始！初期バフ適用。"];
    const updatedPlayers = playerPartyStates.map(p => {
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
    const nextIndex = overrideIndex !== undefined ? overrideIndex : (timelineIndex + 1) % timeline.length;
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
    const aiResult = selectCharacterSkillByTactic(actor, ap, tactic, playerPartyStates, enemyPartyStates);
    if (!aiResult) return;
    const { chosenSkill, target } = aiResult;

    // AP消費
    const nextAp = Math.max(ap - (chosenSkill.actualCost || 0), 0);
    setAp(nextAp);

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

    const activeNode = timeline[timelineIndex];
    if (!activeNode) return;

    const timer = setTimeout(() => {
      if (activeNode.isEnemy) {
        executeEnemyTurn(activeNode.id, timelineIndex);
      } else {
        // 味方ターン開始時にAP回復 (+3, 最大 maxAp)
        setAp(prevAp => {
          const nextAp = Math.min(prevAp + 3, maxAp);
          executeAutoPlayerTurn(activeNode.id, timelineIndex);
          return nextAp;
        });
      }
    }, 1500 / battleSpeed);

    return () => clearTimeout(timer);
  }, [battleState, timelineIndex, isAutoPaused, battleSpeed]);

  const endBattleSession = async (result: "VICTORY" | "DEFEAT") => {
    if (!session) return;
    setBattleState(null);
    setBattleMode(null);
    const modeTemp = battleMode;
    const gvgAreaTemp = gvgTargetBaseId;
    setGvgTargetBaseId(null);
    const isWin = result === "VICTORY";

    if (battleSessionId) {
      await supabase.from("battle_sessions").update({ status: result }).eq("id", battleSessionId);
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
      if (patrol && patrol.id) {
        await supabase.from("user_patrols").update({
          battle_resolved: true,
          battle_result: result
        }).eq("id", patrol.id);
      }
      await syncBootstrapData(session.user.id);
      alert(`見回りバトル終了: ${result === "VICTORY" ? "勝利！追加報酬が確定しました。" : "敗北：追加報酬はありません。"}`);
    } else if (modeTemp === "PVP") {
      const diff = opponentPoints - pvpPoints;
      let pointsDiff = 0;
      let rewardCash = 0;
      let xpAmount = 0;
      let levelUpMessage = "";

      try {
        const { data: matchReward } = await supabase
          .from("pvp_match_rewards_master")
          .select("reward_xp, reward_cash_base")
          .eq("status", isWin ? "VICTORY" : "DEFEAT")
          .single();
        
        if (matchReward) {
          xpAmount = matchReward.reward_xp;
          if (isWin) {
            pointsDiff = Math.min(30, Math.max(5, 15 + Math.floor(diff / 50)));
            rewardCash = Math.min(1000, Math.max(100, matchReward.reward_cash_base + Math.floor(diff * 1.5)));
          } else {
            pointsDiff = Math.min(-2, Math.max(-15, -5 + Math.floor(diff / 50)));
            rewardCash = 0;
          }
        } else {
          // フォールバック
          if (isWin) {
            xpAmount = 150;
            pointsDiff = Math.min(30, Math.max(5, 15 + Math.floor(diff / 50)));
            rewardCash = Math.min(1000, Math.max(100, 400 + Math.floor(diff * 1.5)));
          } else {
            xpAmount = 0;
            pointsDiff = Math.min(-2, Math.max(-15, -5 + Math.floor(diff / 50)));
            rewardCash = 0;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch pvp_match_rewards_master", e);
        if (isWin) {
          xpAmount = 150;
          pointsDiff = Math.min(30, Math.max(5, 15 + Math.floor(diff / 50)));
          rewardCash = Math.min(1000, Math.max(100, 400 + Math.floor(diff * 1.5)));
        } else {
          xpAmount = 0;
          pointsDiff = Math.min(-2, Math.max(-15, -5 + Math.floor(diff / 50)));
          rewardCash = 0;
        }
      }

      const nextPoints = Math.max(pvpPoints + pointsDiff, 0);

      const existMe = pvpRankings.find(r => r.user_id === session.user.id);
      const nextDaily = (existMe?.daily_wins || 0) + (isWin ? 1 : 0);
      const nextSeason = (existMe?.season_wins || 0) + (isWin ? 1 : 0);

      await supabase.from("pvp_ranks").upsert({
        user_id: session.user.id,
        rank_points: nextPoints,
        daily_wins: nextDaily,
        season_wins: nextSeason
      });
      await supabase.from("users").update({ cash: cash + rewardCash }).eq("id", session.user.id);

      if (isWin) {
        await supabase.rpc("evaluate_mission_progress", { p_user_id: session.user.id, p_trigger_type: "PVP_WIN", p_progress_increment: 1 });
        await addGuildXpAndContributionByAction("PVP");
      }

      if (xpAmount > 0) {
        const { data: xpRes } = await supabase.rpc("add_user_xp", {
          p_user_id: session.user.id,
          p_xp_amount: xpAmount
        });
        if (xpRes && xpRes.leveled_up) {
          levelUpMessage = "\n★プレイヤーレベルが Lv." + xpRes.level + " にアップしました！";
        }
      }

      postNpcYajiMessage(session, username, "GLOBAL", currentBaseId, "PVP_WIN");
      await syncBootstrapData(session.user.id);
      alert(`PvPバトル終了: ${result === "VICTORY" ? "勝利" : "敗北"}\n獲得ポイント: ${pointsDiff >= 0 ? "+" : ""}${pointsDiff}\n獲得キャッシュ: +${rewardCash}\n獲得経験値: +${xpAmount} XP${levelUpMessage}`);
    } else if (modeTemp === "RAID") {
      const enemyBoss = enemyPartyStates.find(e => e.id === "ENEMY");
      const finalBossHp = enemyBoss ? enemyBoss.hp : 0;
      const totalDmg = Math.max(raidBossHp - finalBossHp, 0);

      // 1. ダメージログの記録
      await supabase.from("raid_damage_logs").insert({
        raid_boss_id: RAID_BOSS_ID,
        user_id: session.user.id,
        guild_id: userGuildMember?.guild_id || null,
        damage_dealt: totalDmg
      });

      // 2. ボスHPの更新
      const nextHp = Math.max(raidBossHp - totalDmg, 0);
      const isBossDefeated = nextHp <= 0;

      // 3. 累積ダメージ報酬の判定と配布
      try {
        const newTotalDmg = raidTotalDamage + totalDmg;
        const { data: accumRewards } = await supabase.from("raid_rewards_master").select("*").eq("reward_type", "DAMAGE_ACCUM");
        const { data: claimed } = await supabase.from("user_raid_claimed_rewards").select("*").eq("user_id", session.user.id);
        
        if (accumRewards) {
          const claimedIds = claimed ? claimed.map((c: any) => c.reward_id) : [];
          const eligibleRewards = accumRewards.filter((r: any) => newTotalDmg >= Number(r.threshold_val) && !claimedIds.includes(r.id));
          
          const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          for (const reward of eligibleRewards) {
            await supabase.from("presents").insert({
              user_id: session.user.id,
              item_id: reward.reward_item_id,
              quantity: reward.reward_quantity,
              message: `レイド累積与ダメ到達報酬 (${Number(reward.threshold_val).toLocaleString()} Dmg)`,
              expire_at: expireAt,
              status: "UNCLAIMED"
            });
            await supabase.from("user_raid_claimed_rewards").insert({
              user_id: session.user.id,
              reward_id: reward.id
            });
          }
        }
      } catch (err) {
        console.warn("Failed to process accumulative raid rewards:", err);
      }

      // 4. ボス討伐判定と復活・報酬配布
      if (isBossDefeated) {
        try {
          // 討伐報酬の配布
          const { data: defeatRewards } = await supabase.from("raid_rewards_master").select("*").eq("reward_type", "DEFEAT");
          const { data: dmgLogs } = await supabase.from("raid_damage_logs").select("*").eq("raid_boss_id", RAID_BOSS_ID);

          if (defeatRewards && dmgLogs) {
            const userDmgMap: { [key: string]: number } = {};
            dmgLogs.forEach((log: any) => {
              userDmgMap[log.user_id] = (userDmgMap[log.user_id] || 0) + Number(log.damage_dealt);
            });
            userDmgMap[session.user.id] = (userDmgMap[session.user.id] || 0) + totalDmg;

            const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            for (const [uId, sumDmg] of Object.entries(userDmgMap)) {
              for (const reward of defeatRewards) {
                if (sumDmg >= Number(reward.threshold_val)) {
                  await supabase.from("presents").insert({
                    user_id: uId,
                    item_id: reward.reward_item_id,
                    quantity: reward.reward_quantity,
                    message: `レイドボス討伐貢献報酬 (累計ダメージ: ${sumDmg.toLocaleString()})`,
                    expire_at: expireAt,
                    status: "UNCLAIMED"
                  });
                }
              }
            }
          }

          // 拠点のランダム再決定とボスの全快復活
          const { data: masterData } = await supabase.from("raid_boss_master").select("*").eq("id", "BOSS_001").maybeSingle();
          const maxHp = masterData ? Number(masterData.max_hp) : 9999999;
          const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
          const randomBase = bases[Math.floor(Math.random() * bases.length)];

          await supabase.from("raid_bosses").update({
            current_hp: maxHp,
            base_id: randomBase,
            status: "ACTIVE",
            spawned_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }).eq("id", RAID_BOSS_ID);

          await supabase.from("raid_damage_logs").delete().eq("raid_boss_id", RAID_BOSS_ID);
          await supabase.from("user_raid_claimed_rewards").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

          alert(`💥 レイドボス討伐成功！\n\n討伐貢献報酬が参加者全員のプレゼントBOXへ届きました。\n次のボスが新しい拠点に出現しました！`);
        } catch (err) {
          console.warn("Failed to process boss defeat rewards/reset:", err);
        }
      } else {
        // 通常のHP減算
        await supabase.from("raid_bosses").update({ current_hp: nextHp }).eq("id", RAID_BOSS_ID);
        alert(`レイド攻撃完了。今回の与ダメ: ${totalDmg.toLocaleString()}`);
      }

      postNpcYajiMessage(session, username, "GLOBAL", currentBaseId, "RAID_DAMAGE");
    } else if (modeTemp === "GVG") {
      const guildIdFilter = userGuildMember?.guild_id || "";
      if (guildIdFilter && gvgAreaTemp) {
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
              
              let myMatch = null;
              if (matchRecs) {
                myMatch = matchRecs.find((m: any) => m.guild_a_id === guildIdFilter || m.guild_b_id === guildIdFilter);
              }

              if (myMatch) {
                const isGuildA = myMatch.guild_a_id === guildIdFilter;
                const nextGuildPts = isGuildA ? (myMatch.guild_a_points || 0) + 100 : (myMatch.guild_b_points || 0) + 100;
                await supabase
                  .from("gvg_matches")
                  .update(isGuildA ? { guild_a_points: nextGuildPts } : { guild_b_points: nextGuildPts })
                  .eq("id", myMatch.id);
              }

              await addGuildXpAndContributionByAction("GVG");
              alert("防衛演習 勝利！ 自組織に100ポイント付与。");
            } else {
              alert("防衛演習 敗北... (ポイント変動なし)");
            }
          } else {
            // 本番侵攻
            const { data: dayRec } = await supabase.from("gvg_season_status").select("current_day").eq("id", 1).maybeSingle();
            const currentDay = dayRec?.current_day || 1;
            const isFinalDay = currentDay === 7;

            const { data: matchRecs } = await supabase
              .from("gvg_matches")
              .select("*")
              .eq("status", "ONGOING")
              .eq("is_finals", isFinalDay);
            
            let myMatch = null;
            if (matchRecs) {
              myMatch = matchRecs.find((m: any) => m.guild_a_id === guildIdFilter || m.guild_b_id === guildIdFilter);
            }

            if (isWin) {
              // 自ギルドポイントに +250
              if (myMatch) {
                const isGuildA = myMatch.guild_a_id === guildIdFilter;
                const nextGuildPts = isGuildA ? (myMatch.guild_a_points || 0) + 250 : (myMatch.guild_b_points || 0) + 250;
                await supabase
                  .from("gvg_matches")
                  .update(isGuildA ? { guild_a_points: nextGuildPts } : { guild_b_points: nextGuildPts })
                  .eq("id", myMatch.id);
              }

              // 個人シーズンポイントに +250
              const { data: rankRec } = await supabase.from("user_gvg_ranks").select("*").eq("user_id", session.user.id).maybeSingle();
              const nextPersonalPts = (rankRec?.season_points || 0) + 250;
              await supabase.from("user_gvg_ranks").upsert({ user_id: session.user.id, season_points: nextPersonalPts });

              // デイリー拠点ランキングポイントに +250
              const existRec = gvgBaseControls.find(g => g.base_id === gvgAreaTemp && g.guild_id === guildIdFilter);
              const nextPoints = (existRec?.daily_points || 0) + 250;
              await supabase.from("guild_base_controls").upsert({ base_id: gvgAreaTemp, guild_id: guildIdFilter, daily_points: nextPoints });

              await supabase.rpc("evaluate_mission_progress", { p_user_id: session.user.id, p_trigger_type: "GVG_WIN", p_progress_increment: 1 });
              await addGuildXpAndContributionByAction("GVG");
              postNpcYajiMessage(session, username, "BASE", gvgAreaTemp, "GVG_WIN");
              alert("侵攻勝利！ 自組織の抗争ポイント +250。個人抗争ポイント +250。");
            } else {
              // 自ギルド -100、相手 +100
              if (myMatch) {
                const isGuildA = myMatch.guild_a_id === guildIdFilter;
                const myNextPts = Math.max((isGuildA ? myMatch.guild_a_points : myMatch.guild_b_points) - 100, 0);
                const oppNextPts = (isGuildA ? myMatch.guild_b_points : myMatch.guild_a_points) + 100;
                await supabase
                  .from("gvg_matches")
                  .update(isGuildA 
                    ? { guild_a_points: myNextPts, guild_b_points: oppNextPts } 
                    : { guild_b_points: myNextPts, guild_a_points: oppNextPts }
                  )
                  .eq("id", myMatch.id);
              }

              // 個人シーズンポイント -100 (最低0)
              const { data: rankRec } = await supabase.from("user_gvg_ranks").select("*").eq("user_id", session.user.id).maybeSingle();
              const nextPersonalPts = Math.max((rankRec?.season_points || 0) - 100, 0);
              await supabase.from("user_gvg_ranks").upsert({ user_id: session.user.id, season_points: nextPersonalPts });

              // デイリー拠点ランキングポイント -100 (最低0)
              const existRec = gvgBaseControls.find(g => g.base_id === gvgAreaTemp && g.guild_id === guildIdFilter);
              const nextPoints = Math.max((existRec?.daily_points || 0) - 100, 0);
              await supabase.from("guild_base_controls").upsert({ base_id: gvgAreaTemp, guild_id: guildIdFilter, daily_points: nextPoints });

              alert("侵攻失敗... 自組織の抗争ポイント -100。個人抗争ポイント -100。相手ギルド防衛ポイント +100。");
            }
          }
        } catch (err: any) {
          console.warn("Failed to update GvG match score:", err.message);
        }
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

      setPlayerPartyStates(pState.playerStates || []);
      setEnemyPartyStates(eState.enemyStates || []);
      setAp(pState.ap || 3);
      setMaxAp(pState.maxAp || 10);
      setTactic(pState.tactic || "OFFENSIVE");
      setBattleLog(pState.log || ["戦闘セッションを安全に復元しました。"]);

      // タイムラインの再ソート
      const timelineQueue = [
        ...(pState.playerStates || []).map((p: any) => ({ id: p.id, name: p.name, isEnemy: false, spd: p.stats.spd })),
        ...(eState.enemyStates || []).map((e: any) => ({ id: e.id, name: e.name, isEnemy: true, spd: e.stats.spd }))
      ];
      timelineQueue.sort((a: any, b: any) => b.spd - a.spd);

      setTimeline(timelineQueue);
      setTimelineIndex(pState.timelineIndex || 0);

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
