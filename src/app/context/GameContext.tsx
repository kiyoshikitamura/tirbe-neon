"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import {
  RAID_BOSS_ID,
  TEST_SKILL_ID,
  CHARACTERS_MASTER,
  DISPATCH_COURSES,
  BASE_MAP_MASTER,
  GEAR_SLOTS_MASTER,
  STORY_EPISODES_MASTER,
  MASTER_AVATARS,
  CHARACTER_AWAKENING_MASTER,
  CHARACTER_GROWTH_PATTERNS
} from "@/utils/game_constants";
import {
  LoginBonusMaster,
  UserLoginBonus,
  LoginBonusClaimResult,
  DEFAULT_LOGIN_BONUS_MASTERS,
} from "@/utils/login_bonus_master_data";
import { useBattle } from "@/hooks/useBattle";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import { SHOP_PRODUCTS_MASTER, ShopProductItem } from "@/utils/shop_master_data";
import { ConfirmDialogConfig } from "@/app/components/ui/ConfirmDialog";
import { useNavigation } from "./hooks/useNavigation";
import { useAuth } from "./hooks/useAuth";

const GameContext = createContext<any>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // 1. 認証 ＆ セッション管理ステート
  // ==========================================
  const auth = useAuth(
    (type: string) => playCyberSe(type as any),
    () => stopCyberBgm(),
    (userId: string) => syncBootstrapData(userId),
    (tab: string, subTab?: string) => navigateTab(tab, subTab),
    (userId: string) => checkIfSetupRequired(userId)
  );

  const {
    session, setSession,
    authLoading, setAuthLoading,
    isSetupRequired, setIsSetupRequired,
    setupUsername, setSetupUsername,
    setupCharacterId, setSetupCharacterId,
    setupAreaId, setSetupAreaId,
    setupGiftCode, setSetupGiftCode,
    giftCode, setGiftCode,
    setupLoading, setSetupLoading,
    setupGender, setSetupGender,
    setupHairId, setSetupHairId,
    setupFaceId, setSetupFaceId,
    email, setEmail,
    password, setPassword,
    errorMessage, setErrorMessage,
    handleEmailSignup,
    handleEmailLogin,
    handleGoogleLogin,
    handleGoogleDemoLogin,
    handleInitializeUser,
    handleLogout
  } = auth;
  // --- アバターシステム状態 ---
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [unlockedAvatarParts, setUnlockedAvatarParts] = useState<string[]>([]);
  const [avatarPartsMaster, setAvatarPartsMaster] = useState<any[]>([]);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  // ==========================================
  // 2. ゲーム内状態管理ステート
  // ==========================================
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userXp, setUserXp] = useState<number>(0);
  const [cash, setCash] = useState<number>(10000);
  const [diamonds, setDiamonds] = useState<number>(200);
  const [vitality, setVitality] = useState<number>(100);
  const [pvpTickets, setPvpTickets] = useState<number>(5);

  const nav = useNavigation(
    (type: string) => {}, // Placeholder for playCyberSe
    () => {} // Placeholder for handleFirstUserInteraction
  );

  const {
    activeTab, setActiveTab,
    showInboxPanel, setShowInboxPanel,
    showMissionPanel, setShowMissionPanel,
    showFriendPanel, setShowFriendPanel,
    showSettingsPanel, setShowSettingsPanel,
    showTribeChatPanel, setShowTribeChatPanel,
    showMoveBaseModal, setShowMoveBaseModal,
    showLegalPage, setShowLegalPage,
    showTitleView, setShowTitleView,
    inboxPanelTab, setInboxPanelTab,
    rankingActiveTab, setRankingActiveTab,
    confirmDialogConfig, setConfirmDialogConfig,
    globalInteractionBlocking, setGlobalInteractionBlocking
  } = nav;

  const [username, setUsername] = useState<string>("半グレの首領");
  const [bio, setBio] = useState<string>("歌舞伎町の覇権を握るため立ち上がる。");
  const [avatarUrl, setAvatarUrl] = useState<string>("/reiji_transparent_asset.png");
  const [currentBaseId, setCurrentBaseId] = useState<string>("neon_tower");
  const [lastGuildLeftAt, setLastGuildLeftAt] = useState<string | null>(null);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);
  const [seEnabled, setSeEnabled] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
  const [chatCooldown, setChatCooldown] = useState<number>(0);

  const [userGuild, setUserGuild] = useState<any | null>(null);
  const [userGuildMember, setUserGuildMember] = useState<any | null>(null);
  const [guildMembersList, setGuildMembersList] = useState<any[]>([]);
  const [newGuildName, setNewGuildName] = useState<string>("");
  const [allGuildsDbList, setAllGuildsDbList] = useState<any[]>([]);
  const [guildSubTab, setGuildSubTab] = useState<"members" | "settings" | "join">("members");
  const [guildLevelMaster, setGuildLevelMaster] = useState<any[]>([]);
  const [guildXpActionMaster, setGuildXpActionMaster] = useState<any[]>([]);

  const [selectedLeader, setSelectedLeader] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [upgradeSelectedCharId, setUpgradeSelectedCharId] = useState<string>("11111111-1111-1111-1111-111111111111");
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [characterAwaken, setCharacterAwaken] = useState<number>(0);
  const [userCharactersDbList, setUserCharactersDbList] = useState<any[]>([]);

  const [skillLevel, setSkillLevel] = useState<number>(1);
  const [skillLimitBreakMaster, setSkillLimitBreakMaster] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);
  const [equipmentLevelUpMaster, setEquipmentLevelUpMaster] = useState<any[]>([]);
  const [equipmentLimitBreakMaster, setEquipmentLimitBreakMaster] = useState<any[]>([]);


  const [energyDrinks, setEnergyDrinks] = useState<number>(0);
  const [charExpS, setCharExpS] = useState<number>(0);
  const [charExpM, setCharExpM] = useState<number>(0);
  const [charExpL, setCharExpL] = useState<number>(0);
  const [equipExpS, setEquipExpS] = useState<number>(0);
  const [equipExpM, setEquipExpM] = useState<number>(0);
  const [equipExpL, setEquipExpL] = useState<number>(0);
  const [lawsOfStrife, setLawsOfStrife] = useState<number>(0);
  const [skillLbBooks, setSkillLbBooks] = useState<number>(0);
  const [exclusiveContracts, setExclusiveContracts] = useState<number>(0);
  const [equipLbHammers, setEquipLbHammers] = useState<number>(0);

  // 互換エイリアス
  const healPotions = 0;
  const doctorSprays = 0;
  const pvpVipPasses = 0;
  const trainingManuals = charExpS + charExpM + charExpL;
  const polishingStones = equipExpS + equipExpM + equipExpL;

  const [equippedBackground, setEquippedBackground] = useState<string>("bg_default");
  const [selectedBgMode, setSelectedBgMode] = useState<string>("auto");
  const [equippedFrontEffect, setEquippedFrontEffect] = useState<string>("effect_none");
  const [titleEquipped, setTitleEquipped] = useState<string>("title_none");
  const [interiorItem, setInteriorItem] = useState<string>("none");

  // --- DM (Direct Messages) 機能ステート ---
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [dmRecipientId, setDmRecipientId] = useState<string>("");

  const [userEquipmentsList, setUserEquipmentsList] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [equipmentLevel, setEquipmentLevel] = useState<number>(1);
  const [equipmentLimitBreak, setEquipmentLimitBreak] = useState<number>(0);
  const [subOptions, setSubOptions] = useState<any[]>([
    { name: "クリティカル率", val: "+5%", unlocked: true },
    { name: "命中率", val: "+8%", unlocked: false },
    { name: "回避率", val: "+6%", unlocked: false },
    { name: "防御貫通力", val: "+12%", unlocked: false }
  ]);

  const [userSkillsList, setUserSkillsList] = useState<any[]>([]);
  const [activeGearSlot, setActiveGearSlot] = useState<number | null>(null);
  const [showGearModal, setShowGearModal] = useState<boolean>(false);
  const [activeSkillSlot, setActiveSkillSlot] = useState<number | null>(null);
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);

  const [gachaMasters, setGachaMasters] = useState<any[]>([]);
  const [gachaItemsMaster, setGachaItemsMaster] = useState<any[]>([]);
  const [dailyFreeGachaFlags, setDailyFreeGachaFlags] = useState<{ CHARACTER: boolean; SKILL: boolean; EQUIPMENT: boolean }>({
    CHARACTER: true,
    SKILL: true,
    EQUIPMENT: true
  });
  const [specialPityPoints, setSpecialPityPoints] = useState<number>(0);

  const [scoutAnimationState, setScoutAnimationState] = useState<null | "FLASHING" | "SHOW_RESULTS">(null);
  const [scoutFlashingColor, setScoutFlashingColor] = useState<"BLUE" | "PURPLE" | "GOLD">("BLUE");
  const [scoutResults, setScoutResults] = useState<any[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<string>("e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPatrolMember, setSelectedPatrolMember] = useState<string | null>(null);
  const [dailyCashSkips, setDailyCashSkips] = useState<number>(0);
  const [activePatrols, setActivePatrols] = useState<Array<{
    id: string;
    courseId: string;
    characterId: string;
    secondsTotal: number;
    secondsLeft: number;
    status: "ONGOING" | "CLAIMABLE" | "COMPLETED";
    has_battle_event?: boolean;
    battle_resolved?: boolean;
    battle_result?: "VICTORY" | "DEFEAT" | null;
    rewards_accrued?: any;
    started_at?: string;
    expires_at?: string;
  }>>([]);
  const [patrolLogs, setPatrolLogs] = useState<Array<{ time: string; text: string }>>([]);
  const [patrolCourses, setPatrolCourses] = useState<any[]>([]);
  const [patrolNpcs, setPatrolNpcs] = useState<any[]>([]);
  const [hasActivePatrolBattle, setHasActivePatrolBattle] = useState<boolean>(false);
  const [lastPatrolRewards, setLastPatrolRewards] = useState<any | null>(null);
  const [showPatrolRewardModal, setShowPatrolRewardModal] = useState<boolean>(false);

  const [battleSubTab, setBattleSubTab] = useState<string>("pvp");
  const [pvpOpponents, setPvpOpponents] = useState<any[]>([]);
  const [opponentsLoading, setOpponentsLoading] = useState<boolean>(false);
  const [pvpPoints, setPvpPoints] = useState<number>(1000);
  const [selectedTown, setSelectedTown] = useState<string>("shinjuku");
  
  const [gvgBases, setGvgBases] = useState<any[]>([]);
  const [gvgBaseControls, setGvgBaseControls] = useState<any[]>([]);
  const [gvgResetLoading, setGvgResetLoading] = useState<boolean>(false);
  const [gvgSeasonDay, setGvgSeasonDay] = useState<number>(1);
  const [gvgMatches, setGvgMatches] = useState<any[]>([]);
  const [myGvgMatch, setMyGvgMatch] = useState<any | null>(null);
  const [gvgDefenseDeck, setGvgDefenseDeck] = useState<any | null>(null);
  const [personalGvgPoints, setPersonalGvgPoints] = useState<number>(0);
  const [gvgActiveRound, setGvgActiveRound] = useState<number>(0);

  const [pvpSubView, setPvpSubView] = useState<"opponents" | "daily" | "season" | "defense">("opponents");
  const [myPvpDefenseDeck, setMyPvpDefenseDeck] = useState<any>(null);
  const [pvpRankings, setPvpRankings] = useState<any[]>([]);
  const [powerRankings, setPowerRankings] = useState<any[]>([]);
  const [guildPowerRankings, setGuildPowerRankings] = useState<any[]>([]);
  const [raidDamageLogs, setRaidDamageLogs] = useState<any[]>([]);
  const [raidSeasonRankings, setRaidSeasonRankings] = useState<any[]>([]);
  const [activePlayerDetail, setActivePlayerDetail] = useState<any | null>(null);
  const [activeGuildDetail, setActiveGuildDetail] = useState<any | null>(null);
  const [pvpSeasonLoading, setPvpSeasonLoading] = useState<boolean>(false);
  const [raidDefeatLoading, setRaidDefeatLoading] = useState<boolean>(false);

  const [pvpDefenseLogs, setPvpDefenseLogs] = useState<any[]>([]);
  const [simulatingDefense, setSimulatingDefense] = useState<boolean>(false);

  const [activeStorySession, setActiveStorySession] = useState<{
    stageId: string;
    currentNodeId: number;
    status: "INTRO_TALK" | "BATTLE" | "OUTRO_TALK" | "COMPLETED";
  } | null>(null);
  const [storySending, setStorySending] = useState<boolean>(false);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [lastPaymentSessionId, setLastPaymentSessionId] = useState<string>("");

  const [raidBossHp, setRaidBossHp] = useState<number>(9452100);
  const [raidBossMaxHp, setRaidBossMaxHp] = useState<number>(9999999);
  const [raidBossSecondsLeft, setRaidBossSecondsLeft] = useState<number>(86400);
  const [raidTotalDamage, setRaidTotalDamage] = useState<number>(0);
  const [raidBossBaseId, setRaidBossBaseId] = useState<string>("neon_tower");
  const [raidBossName, setRaidBossName] = useState<string>("極道連合組長");

  const [upgradeSubTab, setUpgradeSubTab] = useState<string>("character");
  const [shopSubTab, setShopSubTab] = useState<string>("LIMITED");
  const [userShopPurchases, setUserShopPurchases] = useState<Record<string, number>>({});
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [boughtResultModal, setBoughtResultModal] = useState<{ productTitle: string; items: ShopProductItem[]; message: string } | null>(null);

  const [missions, setMissions] = useState<any[]>([]);
  const [missionTab, setMissionTab] = useState<"DAILY" | "NORMAL">("DAILY");
  const [presents, setPresents] = useState<any[]>([]);
  const [presentsPrefetched, setPresentsPrefetched] = useState<boolean>(false);
  const [presentsSyncing, setPresentsSyncing] = useState<boolean>(false);
  const [presentClaimLoading, setPresentClaimLoading] = useState<boolean>(false);
  const [missionClaimLoading, setMissionClaimLoading] = useState<boolean>(false);

  // ログインボーナス用ステート
  const [loginBonusMasters, setLoginBonusMasters] = useState<LoginBonusMaster[]>(DEFAULT_LOGIN_BONUS_MASTERS);
  const [userLoginBonus, setUserLoginBonus] = useState<UserLoginBonus | null>(null);
  const [showLoginBonusModal, setShowLoginBonusModal] = useState<boolean>(false);
  const [loginBonusClaimResult, setLoginBonusClaimResult] = useState<LoginBonusClaimResult | null>(null);

  const [newsList, setNewsList] = useState<any[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [showImportantModal, setShowImportantModal] = useState<boolean>(true);

  const [guildChats, setGuildChats] = useState<any[]>([]);
  const [chatChannel, setChatChannel] = useState<"GLOBAL" | "GUILD" | "DM">("GLOBAL");
  const [chatInput, setChatInput] = useState<string>("");
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [totalPower, setTotalPower] = useState<number>(0);

  // 💬 BBS用ステート
  const [bbsThreads, setBbsThreads] = useState<any[]>([]);
  const [bbsActiveThread, setBbsActiveThread] = useState<any | null>(null);
  const [bbsPosts, setBbsPosts] = useState<any[]>([]);
  const [bbsLoading, setBbsLoading] = useState<boolean>(false);

  const [upgradeLoading, setUpgradeLoading] = useState<boolean>(false);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  const [selectedMapAreaId, setSelectedMapAreaId] = useState<string | null>(null);
  const [movingAreaLoading, setMovingAreaLoading] = useState<boolean>(false);

  // ==========================================
  // 🔊 Web Audio API インスタンス参照 (useRef)
  // ==========================================
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmOsc1Ref = useRef<OscillatorNode | null>(null);
  const bgmOsc2Ref = useRef<OscillatorNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  };

  const startCyberBgm = () => {
    return; // 雑音防止のため一時的にサウンド再生機能を完全ミュート化
  };

  const stopCyberBgm = () => {
    const ctx = audioCtxRef.current;
    const osc1 = bgmOsc1Ref.current;
    const osc2 = bgmOsc2Ref.current;
    const gain = bgmGainRef.current;

    if (gain && ctx) {
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); // フェードアウト
    }

    setTimeout(() => {
      try {
        if (osc1) { osc1.stop(); osc1.disconnect(); }
        if (osc2) { osc2.stop(); osc2.disconnect(); }
        if (gain) { gain.disconnect(); }
      } catch (e) {
        // すでに解放されている場合のエラー防止
      }
      bgmOsc1Ref.current = null;
      bgmOsc2Ref.current = null;
      bgmGainRef.current = null;
    }, 300);
  };

  const playCyberSe = (type: "click" | "attack" | "hit" | "gacha") => {
    return; // 雑音防止のため一時的にサウンド再生機能を完全ミュート化
  };

  const handleFirstUserInteraction = () => {
    initAudio();
    if (bgmEnabled) {
      startCyberBgm();
    }
  };

  // アンマウント時の厳格なクリーンアップ
  useEffect(() => {
    return () => {
      stopCyberBgm();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // BGM設定変更の監視
  useEffect(() => {
    if (bgmEnabled) {
      startCyberBgm();
    } else {
      stopCyberBgm();
    }
  }, [bgmEnabled]);

  // ==========================================
  // 3. Supabase Auth セッション監視
  // ==========================================
  // ==========================================
  // ⚡ デバッグ優先: 自動ログインバイパス (リロード時の認証・セットアップ省略)
  // ==========================================
  const DEBUG_DUMMY_SESSION: any = {
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "demo@tribeneon.local"
    }
  };

  useEffect(() => {
    // 既存セッションがある場合はそれを使い、無い場合でも自動でデバッグ用ダミーセッションで即時マイページへ
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeSession = session || DEBUG_DUMMY_SESSION;
      setSession(activeSession);
      setIsSetupRequired(false);
      syncBootstrapData(activeSession.user.id).finally(() => {
        setAuthLoading(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeSession = session || DEBUG_DUMMY_SESSION;
      setSession(activeSession);
      setIsSetupRequired(false);
      syncBootstrapData(activeSession.user.id).finally(() => {
        setAuthLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => {
      syncActiveUsers(session.user.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => {
      syncBootstrapData(session.user.id);
    }, 15 * 60 * 1000); // 15分動的ランキング変動
    return () => clearInterval(interval);
  }, [session]);

  const checkIfSetupRequired = async (userId: string) => {
    setAuthLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setIsSetupRequired(true);
      } else {
        setIsSetupRequired(false);
        await syncBootstrapData(userId);
      }
    } catch (err) {
      console.warn("Check setup required failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const syncActiveUsers = async (userId: string) => {
    try {
      const now = new Date();
      await supabase
        .from("users")
        .update({ last_active_at: now.toISOString() })
        .eq("id", userId);

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("users")
        .select("id")
        .gte("last_active_at", fiveMinutesAgo);

      if (data) {
        setActiveUsersCount(data.length);
      }
    } catch (err) {
      console.warn("Failed to sync active users:", err);
    }
  };

  // ==========================================
  // 3.5 ギルドへのXPおよび貢献度付与の共通処理
  // ==========================================
  const addGuildXpAndContributionByAction = async (actionType: string) => {
    if (!session || !userGuildMember || !userGuild) return;

    const actionMaster = guildXpActionMaster.find(a => a.action_type === actionType) || { xp_gain: 0, contribution_gain: 0 };
    const xpGained = actionMaster.xp_gain;
    const contributionGained = actionMaster.contribution_gain;

    if (xpGained === 0 && contributionGained === 0) return;

    try {
      const nextWeeklyContrib = (userGuildMember.weekly_contribution || 0) + contributionGained;
      const nextTotalContrib = (userGuildMember.total_contribution || 0) + contributionGained;
      await supabase.from("guild_members")
        .update({ 
          weekly_contribution: nextWeeklyContrib,
          total_contribution: nextTotalContrib
        })
        .eq("user_id", session.user.id);

      const nextXp = userGuild.xp + xpGained;
      const currentLevelMaster = guildLevelMaster.find(l => l.level === userGuild.level) || { next_xp: userGuild.level * 1000 };
      const xpNeeded = currentLevelMaster.next_xp;

      let nextLevel = userGuild.level;
      let finalXp = nextXp;

      if (nextXp >= xpNeeded && nextLevel < 30) {
        nextLevel += 1;
        finalXp = nextXp - xpNeeded;
      }

      await supabase.from("guilds")
        .update({ xp: finalXp, level: nextLevel })
        .eq("id", userGuild.id);

      await syncBootstrapData(session.user.id);
      
      if (nextLevel > userGuild.level) {
        alert(`★ギルドレベルが ${nextLevel} に上昇しました！`);
      }
    } catch (err) {
      console.warn("Failed to update guild xp via action:", err);
    }
  };

  // ==========================================
  // ⚡ バトルフックの構築
  // ==========================================
  const battle = useBattle({
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
    syncBootstrapData: async (userId: string) => {
      await syncBootstrapData(userId);
    },
    pvpTickets,
    setPvpTickets,
    pvpPoints,
    setPvpPoints,
    pvpRankings,
    userLevel,
    setUserLevel,
    userXp,
    setUserXp,
    raidBossHp,
    setRaidBossHp,
    raidBossMaxHp,
    setRaidBossMaxHp,
    raidTotalDamage,
    setRaidTotalDamage,
    cash,
    setCash,
    setErrorMessage,
    addGuildXpAndContributionByAction
  });

  const syncUserPower = async (userId: string, charsList: any[], equipsList: any[], selectedMembersList: string[]) => {
    if (!userId || charsList.length === 0) return 0;
    try {
      let powerSum = 0;
      selectedMembersList.forEach(id => {
        const charRec = charsList.find(c => c.id === id || c.character_id === id);
        if (charRec) {
          const stats = getCharacterTotalStats(charRec, equipsList);
          powerSum += stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
        }
      });

      if (powerSum === 0) return 0;

      const { error } = await supabase
        .from("user_power_rankings")
        .upsert({
          user_id: userId,
          current_power: powerSum,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) {
        console.warn("Failed to sync user power:", error);
      }
      return powerSum;
    } catch (err) {
      console.warn("Failed to sync user power:", err);
      return 0;
    }
  };

  // ログインボーナスのチェックと受取処理 (RPC呼び出し)
  const checkAndClaimLoginBonus = async (userId: string) => {
    try {
      const { data: masterData } = await supabase
        .from("login_bonus_master")
        .select("*")
        .order("day_number", { ascending: true });
      if (masterData && masterData.length > 0) {
        setLoginBonusMasters(masterData as LoginBonusMaster[]);
      }

      const { data: result, error } = await supabase.rpc("process_login_bonus");
      if (error) {
        console.warn("Failed to process login bonus RPC:", error);
        return;
      }

      if (result) {
        const claimRes = result as LoginBonusClaimResult;
        setLoginBonusClaimResult(claimRes);
        setUserLoginBonus({
          user_id: userId,
          current_step: claimRes.current_step,
          total_logins: claimRes.total_logins || claimRes.current_step,
          last_claimed_date: claimRes.last_claimed_date || null
        });

        if (claimRes.claimed) {
          setShowLoginBonusModal(true);
          setPresentsPrefetched(false);
        }
      }
    } catch (err: any) {
      console.warn("checkAndClaimLoginBonus error:", err);
    }
  };

  // ==========================================
  // 4. Supabase DB実データ同期ロード
  // ==========================================
  const syncBootstrapData = async (userId: string) => {
    let localGuildRec: any = null;
    let localCharIds: string[] = [];
    let localDeck: string[] = [];
    try {
      // 各種マスタデータのフェッチとメモリキャッシュ (並列 Promise.all 実行)
      Promise.all([
        supabase.from("guild_level_master").select("*"),
        supabase.from("guild_xp_action_master").select("*"),
        supabase.from("skill_limit_break_master").select("*"),
        supabase.from("equipment_level_up_master").select("*"),
        supabase.from("equipment_limit_break_master").select("*"),
        supabase.from("gacha_masters").select("*"),
        supabase.from("gacha_items_master").select("*"),
        supabase.from("login_bonus_master").select("*").order("day_number", { ascending: true })
      ]).then(([lvlRes, xpRes, skillLbrRes, eqLvlRes, eqLbrRes, gachaRes, gachaItemsRes, loginBonusRes]) => {
        if (lvlRes.data) setGuildLevelMaster(lvlRes.data);
        if (xpRes.data) setGuildXpActionMaster(xpRes.data);
        if (skillLbrRes.data) setSkillLimitBreakMaster(skillLbrRes.data);
        if (eqLvlRes.data) setEquipmentLevelUpMaster(eqLvlRes.data);
        if (eqLbrRes.data) setEquipmentLimitBreakMaster(eqLbrRes.data);
        if (gachaRes.data) setGachaMasters(gachaRes.data);
        if (gachaItemsRes.data) setGachaItemsMaster(gachaItemsRes.data);
        if (loginBonusRes.data && loginBonusRes.data.length > 0) setLoginBonusMasters(loginBonusRes.data as LoginBonusMaster[]);
      }).catch(err => {
        console.warn("Failed to fetch master data:", err);
      });

      await syncActiveUsers(userId);
      await checkAndClaimLoginBonus(userId);
      const { data: recovered } = await supabase.rpc("sync_and_recover_vitality_and_tickets", {
        p_user_id: userId
      });
      
      if (recovered && recovered.length > 0) {
        const row = recovered[0];
        setVitality(row.out_vitality);
        setPvpTickets(row.out_tickets);
        setCash(Number(row.out_cash));
        setDiamonds(row.out_diamonds);
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("username, favorite_character_id, bio, avatar_url, sound_settings, current_base_id, daily_cash_skips_count, last_guild_left_at, gift_code, title_equipped, equipped_background, equipped_front_effect, selected_bg_mode, interior_item, level, xp, created_at")
        .eq("id", userId)
        .single();
      
      if (userProfile) {
        setUsername(userProfile.username);
        if (userProfile.favorite_character_id) {
          setSelectedLeader(userProfile.favorite_character_id);
        }
        setBio(userProfile.bio || "歌舞伎町の覇権を握る。");
        setAvatarUrl(userProfile.avatar_url || "/reiji_transparent_asset.png");
        setDailyCashSkips(userProfile.daily_cash_skips_count);
        setCurrentBaseId(userProfile.current_base_id || "neon_tower");
        setLastGuildLeftAt(userProfile.last_guild_left_at);
        setGiftCode(userProfile.gift_code || null);
        setTitleEquipped(userProfile.title_equipped || "title_none");
        setEquippedBackground(userProfile.equipped_background || "bg_default");
        setEquippedFrontEffect(userProfile.equipped_front_effect || "effect_none");
        if ((userProfile as any).selected_bg_mode) setSelectedBgMode((userProfile as any).selected_bg_mode);
        if ((userProfile as any).interior_item) setInteriorItem((userProfile as any).interior_item);
        setUserLevel(userProfile.level || 1);
        setUserXp(userProfile.xp || 0);
        setUserCreatedAt((userProfile as any).created_at || null);

        if (userProfile.sound_settings) {
          const sound = userProfile.sound_settings as any;
          setBgmEnabled(sound.bgm ?? true);
          setSeEnabled(sound.se ?? true);
        }
      }

      // ショップ購入履歴の取得
      try {
        const { data: purchaseData } = await supabase
          .from("user_shop_purchases")
          .select("product_id, purchase_count")
          .eq("user_id", userId);
        
        if (purchaseData) {
          const pMap: Record<string, number> = {};
          purchaseData.forEach((p: any) => {
            pMap[p.product_id] = p.purchase_count;
          });
          setUserShopPurchases(pMap);
        }
      } catch (pErr) {
        console.warn("Failed to fetch user shop purchases:", pErr);
      }

      // 無料ガチャ利用状況 ＆ 天井Ptのフェッチ
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: claimsData } = await supabase
          .from("user_daily_gacha_claims")
          .select("*")
          .eq("user_id", userId);

        if (claimsData) {
          const flags = { CHARACTER: true, SKILL: true, EQUIPMENT: true };
          claimsData.forEach((c: any) => {
            if (c.last_claimed_date === todayStr) {
              if (c.gacha_type === "CHARACTER") flags.CHARACTER = false;
              if (c.gacha_type === "SKILL") flags.SKILL = false;
              if (c.gacha_type === "EQUIPMENT") flags.EQUIPMENT = false;
            }
          });
          setDailyFreeGachaFlags(flags);
        }

        const { data: pityData } = await supabase
          .from("user_gacha_pity_points")
          .select("current_points")
          .eq("user_id", userId)
          .eq("pity_master_id", "pity_special_common")
          .maybeSingle();

        if (pityData) {
          setSpecialPityPoints(pityData.current_points || 0);
        }
      } catch (gachaErr) {
        console.warn("Gacha daily/pity fetch warning:", gachaErr);
      }

      // --- アバターデータの同期 ---
      const { data: userAvatarRec } = await supabase
        .from("user_avatars")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (userAvatarRec) {
        setUserAvatar(userAvatarRec);
        // バックグラウンドでアバターパーツ画像をプリロードする
        if (typeof window !== "undefined") {
          const partsToLoad = [
            userAvatarRec.hair_id,
            userAvatarRec.face_id,
            userAvatarRec.body_id,
            userAvatarRec.shoes_id,
            userAvatarRec.accessory_id,
            userAvatarRec.bg_effect_1_id,
            userAvatarRec.bg_effect_2_id,
            userAvatarRec.gender === "MALE" ? "base_male" : "base_female"
          ].filter(Boolean);

          partsToLoad.forEach(partId => {
            const img = new Image();
            img.src = `/avatar/${partId}.webp`;
          });
        }
      }

      const { data: unlockedPartsList } = await supabase
        .from("user_avatar_parts")
        .select("part_id")
        .eq("user_id", userId);

      if (unlockedPartsList) {
        setUnlockedAvatarParts(unlockedPartsList.map((p: any) => p.part_id));
      }

      const { data: partsMasterList } = await supabase
        .from("avatar_parts")
        .select("*");

      if (partsMasterList) {
        setAvatarPartsMaster(partsMasterList);
      }

      const { data: guildMemberRec } = await supabase
        .from("guild_members")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (guildMemberRec) {
        setUserGuildMember(guildMemberRec);

        const { data: guildRec } = await supabase
          .from("guilds")
          .select("*")
          .eq("id", guildMemberRec.guild_id)
          .single();

        if (guildRec) {
          setUserGuild(guildRec);
          localGuildRec = guildRec;
        }

        const { data: membersList } = await supabase
          .from("guild_members")
          .select("*, users ( username, avatar_url, bio, favorite_character_id )")
          .eq("guild_id", guildMemberRec.guild_id)
          .order("role", { ascending: true });
        
        if (membersList && membersList.length > 0) {
          // 初期プレースホルダー表示用にnullを設定
          setGuildMembersList(membersList.map((m: any) => ({ ...m, userLevel: null, userPower: null, partyCharIds: null })));

          const userIds = membersList.map((m: any) => m.user_id);

          Promise.all([
            supabase.from("user_power_rankings").select("user_id, current_power").in("user_id", userIds),
            supabase.from("user_characters").select("id, user_id, character_id, level").in("user_id", userIds),
            supabase.from("pvp_defense_decks").select("user_id, character_1_id, character_2_id, character_3_id, character_4_id, character_5_id").in("user_id", userIds)
          ]).then(([powersRes, charsRes, decksRes]) => {
            const mappedMembers = membersList.map((m: any) => {
              const userPower = powersRes.data?.find((p: any) => p.user_id === m.user_id)?.current_power ?? 0;
              const favCharId = m.users?.favorite_character_id;
              const userChars = charsRes.data?.filter((c: any) => c.user_id === m.user_id) || [];
              const leaderChar = userChars.find((c: any) => c.character_id === favCharId) || userChars[0];
              const userLevel = leaderChar ? leaderChar.level : 1;

              const userDeck = decksRes.data?.find((d: any) => d.user_id === m.user_id);
              const partyIds = userDeck ? [
                userDeck.character_1_id,
                userDeck.character_2_id,
                userDeck.character_3_id,
                userDeck.character_4_id,
                userDeck.character_5_id
              ].filter(Boolean) : [];

              const partyCharIds = partyIds.map(id => {
                const charRec = userChars.find(c => c.id === id);
                return charRec ? charRec.character_id : null;
              }).filter(Boolean);

              return {
                ...m,
                userLevel,
                userPower,
                partyCharIds
              };
            });
            setGuildMembersList(mappedMembers);
          }).catch(err => {
            console.warn("Failed to load details for guild members:", err);
            setGuildMembersList(membersList.map((m: any) => ({ ...m, userLevel: 1, userPower: 0, partyCharIds: [] })));
          });
        } else {
          setGuildMembersList([]);
        }
      } else {
        setUserGuild(null);
        setUserGuildMember(null);
        setGuildMembersList([]);

        const { data: listAllGuilds } = await supabase
          .from("guilds")
          .select("*")
          .limit(10);
        if (listAllGuilds) {
          setAllGuildsDbList(listAllGuilds);
        }
      }

      // 見回り関連データとマスタデータの同期
      const { data: questsData } = await supabase.from("quests").select("*");
      if (questsData) setPatrolCourses(questsData);

      const { data: npcsData } = await supabase.from("patrol_npcs").select("*");
      if (npcsData) setPatrolNpcs(npcsData);

      const { data: userPatrols } = await supabase.from("user_patrols").select("*").eq("user_id", userId);
      
      if (userPatrols) {
        const active = userPatrols.filter((p: any) => p.status !== "COMPLETED");
        const formattedPatrols = active.map((p: any) => {
          const expiresAt = new Date(p.expires_at).getTime();
          const startedAt = new Date(p.started_at).getTime();
          const now = Date.now();
          const secondsTotal = Math.ceil((expiresAt - startedAt) / 1000);
          const secondsLeft = Math.max(Math.ceil((expiresAt - now) / 1000), 0);

          return {
            id: p.id,
            courseId: p.course_id || p.quest_id,
            characterId: p.character_id,
            secondsTotal,
            secondsLeft,
            status: (secondsLeft <= 0 ? "CLAIMABLE" : "ONGOING") as "ONGOING" | "CLAIMABLE",
            has_battle_event: p.has_battle_event,
            battle_resolved: p.battle_resolved,
            battle_result: p.battle_result,
            rewards_accrued: p.rewards_accrued,
            started_at: p.started_at,
            expires_at: p.expires_at
          };
        });
        setActivePatrols(formattedPatrols);

        const needBadge = formattedPatrols.some((p: any) => p.status === "CLAIMABLE" && p.has_battle_event && !p.battle_resolved);
        setHasActivePatrolBattle(needBadge);
      } else {
        setActivePatrols([]);
        setHasActivePatrolBattle(false);
      }

      const { data: pvpData } = await supabase
        .from("pvp_ranks")
        .select("*, users ( username, avatar_url )")
        .order("rank_points", { ascending: false });
      
      if (pvpData) {
        setPvpRankings(pvpData);
        const me = pvpData.find(r => r.user_id === userId);
        if (me) {
          setPvpPoints(me.rank_points);
          fetchPvpOpponents(userId, me.rank_points);
        }
      }

      const { data: defData } = await supabase
        .from("pvp_defense_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (defData) {
        setPvpDefenseLogs(defData);
      }

      const { data: deckData } = await supabase
        .from("pvp_defense_decks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (deckData) {
        setMyPvpDefenseDeck(deckData);
      }

      const { data: storyData } = await supabase
        .from("story_sessions")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (storyData && (storyData.status === "INTRO_TALK" || storyData.status === "OUTRO_TALK")) {
        setActiveStorySession({
          stageId: storyData.stage_id,
          currentNodeId: storyData.current_node_id,
          status: storyData.status
        });
      } else {
        setActiveStorySession(null);
      }

      const { data: payHistory } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (payHistory) {
        setPaymentHistory(payHistory);
      }

      const { data: gvgData } = await supabase
        .from("guild_base_controls")
        .select("*, guilds( name )")
        .order("daily_points", { ascending: false });
      
      if (gvgData) {
        setGvgBaseControls(gvgData);

        const mappedBases = BASE_MAP_MASTER.map(base => {
          const baseRecords = gvgData.filter(g => g.base_id === base.id);
          if (baseRecords.length > 0) {
            const topRecord = baseRecords[0];
            const isOurGuild = topRecord.guild_id === (guildMemberRec?.guild_id || "");
            return {
              ...base,
              controlledBy: isOurGuild ? `${localGuildRec?.name || "自ギルド"} (自組織)` : (topRecord.guilds as any)?.name || "他組織",
              topPoints: topRecord.daily_points,
              ourPoints: baseRecords.find(g => g.guild_id === (guildMemberRec?.guild_id || ""))?.daily_points || 0
            };
          }
          return { ...base, controlledBy: "無所属", topPoints: 0, ourPoints: 0 };
        });
        setGvgBases(mappedBases);
      }

      // GvG (抗争) 状態の同期
      try {
        const { data: dayRec } = await supabase.from("gvg_season_status").select("current_day").eq("id", 1).maybeSingle();
        const currentDay = dayRec?.current_day || 1;
        setGvgSeasonDay(currentDay);

        const { data: defDeckRec } = await supabase.from("gvg_defense_decks").select("*").eq("user_id", userId).maybeSingle();
        setGvgDefenseDeck(defDeckRec || null);

        const { data: personalRankRec } = await supabase.from("user_gvg_ranks").select("season_points").eq("user_id", userId).maybeSingle();
        setPersonalGvgPoints(personalRankRec?.season_points || 0);

        const isFinalDay = currentDay === 7;
        const { data: matchRecs } = await supabase
          .from("gvg_matches")
          .select("*")
          .eq("status", "ONGOING")
          .eq("is_finals", isFinalDay);

        if (matchRecs) {
          setGvgMatches(matchRecs);
          const myGuildId = guildMemberRec?.guild_id || "";
          const myMatchRec = matchRecs.find((m: any) => m.guild_a_id === myGuildId || m.guild_b_id === myGuildId);
          setMyGvgMatch(myMatchRec || null);
        } else {
          setGvgMatches([]);
          setMyGvgMatch(null);
        }

        const nowTime = new Date();
        const hour = nowTime.getHours();
        const min = nowTime.getMinutes();
        const totalMinutes = hour * 60 + min;

        let activeRound = 0;
        if (totalMinutes >= 12 * 60 && totalMinutes < 12 * 60 + 30) {
          activeRound = 1;
        } else if (totalMinutes >= 20 * 60 && totalMinutes < 20 * 60 + 30) {
          activeRound = 2;
        } else if (totalMinutes >= 23 * 60 && totalMinutes < 23 * 60 + 30) {
          activeRound = 3;
        }
        setGvgActiveRound(activeRound);
      } catch (err: any) {
        console.warn("Failed to sync GvG states:", err.message);
      }

      const { data: timeoutData } = await supabase.rpc("sync_and_evaluate_raid_timeout", {
        p_raid_boss_id: RAID_BOSS_ID
      });
      
      if (timeoutData && timeoutData.length > 0) {
        const r = timeoutData[0];
        console.log("[RAID DEBUG] sync_and_evaluate_raid_timeout response:", { hp: Number(r.out_current_hp), maxHp: Number(r.out_max_hp), secondsLeft: r.out_seconds_left, baseId: r.out_base_id, bossName: r.out_boss_name });
        setRaidBossHp(Number(r.out_current_hp));
        setRaidBossMaxHp(Number(r.out_max_hp));
        setRaidBossSecondsLeft(r.out_seconds_left);
        if (r.out_base_id) setRaidBossBaseId(r.out_base_id);
        if (r.out_boss_name) setRaidBossName(r.out_boss_name);
      }

      const { data: dmgLogsData } = await supabase
        .from("raid_damage_logs")
        .select("*, users ( username ), guilds ( name )")
        .eq("raid_boss_id", RAID_BOSS_ID)
        .order("damage_dealt", { ascending: false });
      
      if (dmgLogsData) {
        setRaidDamageLogs(dmgLogsData);
        const myDmg = dmgLogsData
          .filter(d => d.user_id === userId)
          .reduce((sum, item) => sum + Number(item.damage_dealt), 0);
        setRaidTotalDamage(myDmg);
      }

      const { data: allRaidLogs } = await supabase
        .from("raid_damage_logs")
        .select("*, users ( username ), guilds ( name )");
      if (allRaidLogs) {
        setRaidSeasonRankings(allRaidLogs);
      }

      const { data: charsData } = await supabase
        .from("user_characters")
        .select("*")
        .eq("user_id", userId);
      
      if (charsData && charsData.length > 0) {
        setUserCharactersDbList(charsData);
        const charIds = charsData.map(c => c.character_id);
        localCharIds = charIds;
        
        let targetLeader = selectedLeader;
        if (!targetLeader || !charIds.includes(targetLeader)) {
          targetLeader = charIds[0];
          setSelectedLeader(targetLeader);
        }

        const leaderData = charsData.find(c => c.character_id === targetLeader);
        if (leaderData) {
          setCharacterLevel(leaderData.level);
          setCharacterAwaken(leaderData.awakening_level);
        }

        // 🛡️ PvP防衛デッキ（＝出撃パーティ）の取得
        const { data: deckData } = await supabase
          .from("pvp_defense_decks")
          .select("character_1_id, character_2_id, character_3_id, character_4_id, character_5_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (deckData) {
          const members = [
            deckData.character_1_id, 
            deckData.character_2_id, 
            deckData.character_3_id,
            deckData.character_4_id,
            deckData.character_5_id
          ].filter(Boolean);
          setSelectedMembers(members);
          localDeck = members;
        } else {
          const fallbackDeck = charsData.slice(0, 5).map(c => c.character_id);
          setSelectedMembers(fallbackDeck);
          localDeck = fallbackDeck;
        }
      }

      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("*")
        .eq("user_id", userId);
      
      if (skillsData) {
        setUserSkillsList(skillsData);
        if (selectedSkill) {
          const currentSkill = skillsData.find(s => s.id === selectedSkill.id);
          if (currentSkill) {
            setSelectedSkill(currentSkill);
          }
        }
      }

      const { data: itemsData } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", userId);
      
      if (itemsData) {
        // 既存アカウントへの初期アイテム補填
        const hasCharExpS = itemsData.some(i => i.item_id === "CHAR_EXP_S");
        if (!hasCharExpS) {
          const initialItems = [
            { item_id: "ENERGY_DRINK", quantity: 5 },
            { item_id: "CHAR_EXP_S", quantity: 15 },
            { item_id: "CHAR_EXP_M", quantity: 5 },
            { item_id: "CHAR_EXP_L", quantity: 2 },
            { item_id: "EQUIP_EXP_S", quantity: 20 },
            { item_id: "EQUIP_EXP_M", quantity: 5 },
            { item_id: "EQUIP_EXP_L", quantity: 2 },
            { item_id: "LAW_OF_STRIFE", quantity: 3 },
            { item_id: "SKILL_LB_BOOK", quantity: 3 },
            { item_id: "EXCLUSIVE_CONTRACT", quantity: 2 },
            { item_id: "EQUIP_LB_HAMMER", quantity: 2 }
          ];
          for (const item of initialItems) {
            await supabase.from("user_items").upsert({
              user_id: userId,
              item_id: item.item_id,
              quantity: item.quantity
            });
          }
          const { data: refetched } = await supabase.from("user_items").select("*").eq("user_id", userId);
          if (refetched) {
            itemsData.splice(0, itemsData.length, ...refetched);
          }
        }

        setEnergyDrinks(itemsData.find(i => i.item_id === "ENERGY_DRINK")?.quantity || 0);
        setCharExpS(itemsData.find(i => i.item_id === "CHAR_EXP_S")?.quantity || 0);
        setCharExpM(itemsData.find(i => i.item_id === "CHAR_EXP_M")?.quantity || 0);
        setCharExpL(itemsData.find(i => i.item_id === "CHAR_EXP_L")?.quantity || 0);
        setEquipExpS(itemsData.find(i => i.item_id === "EQUIP_EXP_S")?.quantity || 0);
        setEquipExpM(itemsData.find(i => i.item_id === "EQUIP_EXP_M")?.quantity || 0);
        setEquipExpL(itemsData.find(i => i.item_id === "EQUIP_EXP_L")?.quantity || 0);
        setLawsOfStrife(itemsData.find(i => i.item_id === "LAW_OF_STRIFE")?.quantity || 0);
        setSkillLbBooks(itemsData.find(i => i.item_id === "SKILL_LB_BOOK")?.quantity || 0);
        setExclusiveContracts(itemsData.find(i => i.item_id === "EXCLUSIVE_CONTRACT")?.quantity || 0);
        setEquipLbHammers(itemsData.find(i => i.item_id === "EQUIP_LB_HAMMER")?.quantity || 0);
      }

      const { data: equipsData } = await supabase
        .from("user_equipments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (equipsData) {
        if (equipsData.length === 0) {
          const activeChar = charsData ? charsData[0] : null;
          if (activeChar) {
            const starterGears = [
              { id: `e_weapon_${userId}`, equipment_id: "WEAPON_001", slot_index: 0 },
              { id: `e_head_${userId}`, equipment_id: "HEAD_001", slot_index: 2 },
              { id: `e_body_${userId}`, equipment_id: "BODY_001", slot_index: 3 },
              { id: `e_legs_${userId}`, equipment_id: "LEGS_001", slot_index: 4 },
              { id: `e_acc_${userId}`, equipment_id: "ACCESSORY_001", slot_index: 5 }
            ];
            const seeded: any[] = [];
            for (const g of starterGears) {
              const row = {
                user_id: userId,
                equipment_id: g.equipment_id,
                level: 1,
                plus_val: 0,
                equipped_character_id: activeChar.id,
                slot_index: g.slot_index,
                random_options: [
                  { name: "クリティカル率", val: "+5%", unlocked: true },
                  { name: "命中率", val: "+8%", unlocked: false },
                  { name: "回避率", val: "+6%", unlocked: false },
                  { name: "防御貫通力", val: "+12%", unlocked: false }
                ]
              };
              const { data: inserted } = await supabase.from("user_equipments").insert(row).select().maybeSingle();
              if (inserted) seeded.push(inserted);
              else seeded.push({ id: g.id, ...row });
            }
            setUserEquipmentsList(seeded);
            setSelectedEquipment(seeded[0]);
            setEquipmentLevel(seeded[0].level);
            setEquipmentLimitBreak(seeded[0].plus_val);
            if (seeded[0].random_options) setSubOptions(seeded[0].random_options);
          }
        } else {
          setUserEquipmentsList(equipsData);
          
          if (selectedEquipment) {
            const currentEquip = equipsData.find(e => e.id === selectedEquipment.id);
            if (currentEquip) {
              setSelectedEquipment(currentEquip);
              setEquipmentLevel(currentEquip.level);
              setEquipmentLimitBreak(currentEquip.plus_val);
              if (currentEquip.random_options) setSubOptions(currentEquip.random_options);
            }
          } else {
            setSelectedEquipment(equipsData[0]);
            setEquipmentLevel(equipsData[0].level);
            setEquipmentLimitBreak(equipsData[0].plus_val);
            if (equipsData[0].random_options) setSubOptions(equipsData[0].random_options);
          }
        }
      }

      // 総合力データの同期
      if (charsData && charsData.length > 0) {
        const calculatedPower = await syncUserPower(userId, charsData, equipsData || [], localDeck);
        setTotalPower(calculatedPower);
      }

      // 総合力およびギルド総合力ランキングの取得・集計
      const { data: rawPowerRankings } = await supabase
        .from("user_power_rankings")
        .select(`
          user_id,
          current_power,
          updated_at,
          users (
            username,
            avatar_url,
            guild_members (
              guild_id,
              guilds (
                name
              )
            )
          )
        `);

      if (rawPowerRankings) {
        setPowerRankings(rawPowerRankings);

        // ギルド別の総合力を集計
        const guildMap: { [key: string]: { name: string, members: any[], current_power_sum: number, daily_power_sum: number, updated_at_max: string } } = {};
        
        rawPowerRankings.forEach((r: any) => {
          const gMember = r.users?.guild_members?.[0] || r.users?.guild_members;
          const guild = gMember?.guilds || gMember?.[0]?.guilds;
          const guildId = gMember?.guild_id || gMember?.[0]?.guild_id;
          
          if (guildId && guild) {
            if (!guildMap[guildId]) {
              guildMap[guildId] = {
                name: guild.name,
                members: [],
                current_power_sum: 0,
                daily_power_sum: 0,
                updated_at_max: '1970-01-01'
              };
            }
            guildMap[guildId].members.push(r);
            guildMap[guildId].current_power_sum += r.current_power;
            
            // 本日アクティブ判定（24時間以内）なら、デイリー集計にも加算する
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recordDate = new Date(r.updated_at);
            if (recordDate >= oneDayAgo) {
              guildMap[guildId].daily_power_sum += r.current_power;
            }
            
            if (r.updated_at > guildMap[guildId].updated_at_max) {
              guildMap[guildId].updated_at_max = r.updated_at;
            }
          }
        });
        
        const guildRankList = Object.entries(guildMap).map(([id, val]) => ({
          guild_id: id,
          name: val.name,
          current_power: val.current_power_sum,
          daily_power: val.daily_power_sum,
          updated_at: val.updated_at_max
        }));
        
        setGuildPowerRankings(guildRankList);
      }

      // ==========================================
      // 🛡️ 戦闘セッション復帰 (Resume) ロジック
      // ==========================================
      const { data: activeBattleSession } = await supabase
        .from("battle_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (activeBattleSession) {
        battle.resumeBattleSession(activeBattleSession, localCharIds);
      }

      const { data: newsData } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (newsData) {
        setNewsList(newsData.map(n => ({
          id: n.id.toString(),
          category: n.category.toLowerCase(),
          title: n.title,
          date: new Date(n.start_at).toLocaleDateString(),
          content: n.content
        })));
      }

      const { data: presentsData } = await supabase
        .from("presents")
        .select("*")
        .eq("user_id", userId)
        .order("sent_at", { ascending: false });
      
      if (presentsData) {
        setPresents(presentsData.map(p => {
          const diffMs = new Date(p.expire_at).getTime() - Date.now();
          const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));
          let expireText = `期限: あと${diffHrs}時間`;
          if (diffHrs > 24) expireText = `期限: あと${Math.ceil(diffHrs / 24)}日`;
          else if (diffHrs <= 0) expireText = "期限切れ";

          return {
            id: p.id.toString(),
            title: p.message ? p.message.split(":")[0] : "配布アイテム",
            desc: p.message ? p.message.split(":")[1] || p.message : "",
            reward: `${p.item_id === "CASH" ? "キャッシュ" : "ダイヤ"} +${p.quantity}`,
            itemId: p.item_id,
            qty: p.quantity,
            expireText,
            status: p.status,
            loading: false
          };
        }));
      }

      const { data: missionsData } = await supabase
        .from("user_missions")
        .select("*, missions(*)")
        .eq("user_id", userId);

      if (missionsData) {
        setMissions(missionsData.map(um => {
          const m = (um.missions as any) || {};
          let rewardLabel = `${m.reward_item_id === "CASH" ? "キャッシュ" : m.reward_item_id === "DIAMOND" ? "ダイヤ" : "強化素材"} +${m.reward_quantity || 0}`;
          return {
            id: um.mission_id,
            title: m.title || "不明なミッション",
            desc: m.description || "",
            reward: rewardLabel,
            rewardItemId: m.reward_item_id || "CASH",
            rewardQty: m.reward_quantity || 0,
            progress: um.current_progress,
            target: m.target_value || 1,
            category: m.category || "DAILY",
            status: um.status,
            loading: false
          };
        }));
      }

    } catch (err: any) {
      console.warn("Sync error:", err.message);
    }
  };


  // 🕒 30秒バックグラウンド自動回復タイマー
  useEffect(() => {
    if (!session) return;
    const recoveryTimer = setInterval(async () => {
      try {
        const { data: recovered } = await supabase.rpc("sync_and_recover_vitality_and_tickets", {
          p_user_id: session.user.id
        });
        
        if (recovered && recovered.length > 0) {
          const row = recovered[0];
          setVitality(row.out_vitality);
          setPvpTickets(row.out_tickets);
          setCash(Number(row.out_cash));
          setDiamonds(row.out_diamonds);
        }
      } catch (e) {
        console.warn("Background auto-recovery failed:", e);
      }
    }, 30000);

    return () => clearInterval(recoveryTimer);
  }, [session]);

  // ⏱️ レイドボス出現残り時間カウントダウン
  useEffect(() => {
    if (raidBossSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setRaidBossSecondsLeft(prev => {
        if (prev <= 1) {
          if (session) syncBootstrapData(session.user.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [raidBossSecondsLeft, session]);

  // 💬 チャットフェッチ ＆ Realtime
  useEffect(() => {
    if (!session) return;
    
    const fetchChats = async () => {
      let query = supabase
        .from("board_posts")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(30);

      if (chatChannel === "GLOBAL") {
        query = query.eq("target_type", "GLOBAL");
      } else if (chatChannel === "GUILD") {
        const guildIdFilter = userGuildMember?.guild_id || "";
        query = query.eq("target_type", "GUILD").eq("target_id", guildIdFilter);
      }

      const { data } = await query;
      if (data) {
        setGuildChats(data);
      }
    };

    fetchChats();

    const guildIdFilter = userGuildMember?.guild_id || "";
    const channelName = `realtime_posts_${chatChannel}_${chatChannel === "GUILD" ? guildIdFilter : currentBaseId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "board_posts"
        },
        (payload) => {
          const newPost = payload.new as any;

          let isMatch = false;
          if (chatChannel === "GLOBAL" && newPost.target_type === "GLOBAL") isMatch = true;
          else if (chatChannel === "GUILD" && newPost.target_type === "GUILD" && newPost.target_id === guildIdFilter) isMatch = true;

          if (isMatch) {
            setGuildChats((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev;
              return [...prev, newPost];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatChannel, currentBaseId, userGuildMember, session]);

  const postNpcYajiMessage = async (type: "GLOBAL", baseId: string, triggerReason: string) => {
    if (!session) return;
    const npcs = ["リュウ", "カイ", "シン", "ハヤト", "ユキ"];
    const npc = npcs[Math.floor(Math.random() * npcs.length)];

    let text = "";
    if (triggerReason === "PATROL_CLEAR") {
      text = `${username} が見回りを終えて安全に帰還したぞ。`;
    } else {
      text = `今夜の歓楽街、なんだかネオンが怪しく発光しているな。`;
    }

    try {
      await supabase.from("board_posts").insert({
        user_id: "00000000-0000-0000-0000-000000000099",
        author_name: npc,
        content: text,
        target_type: type,
        target_id: null,
        is_system: false
      });
    } catch (e) {
      console.warn("NPC chat post failed:", e);
    }
  };

  useEffect(() => {
    if (!session) return;
    const chatTimer = setInterval(() => {
      if (Math.random() <= 0.4) {
        postNpcYajiMessage("GLOBAL", currentBaseId, "RANDOM_TALK");
      }
    }, 15000);

    return () => clearInterval(chatTimer);
  }, [currentBaseId, session]);

  // 見回り進行タイマー
  useEffect(() => {
    if (activePatrols.length === 0) return;
    const hasOngoing = activePatrols.some(p => p.secondsLeft > 0);
    if (!hasOngoing) return;

    const timer = setInterval(() => {
      setActivePatrols((prev) => {
        let anyCompletedThisTick = false;
        const nextPatrols = prev.map(p => {
          if (p.secondsLeft <= 0) return p;
          const nextLeft = p.secondsLeft - 1;
          if (nextLeft <= 0) {
            anyCompletedThisTick = true;
            return { ...p, secondsLeft: 0, status: "CLAIMABLE" as const };
          }
          return { ...p, secondsLeft: nextLeft };
        });

        if (anyCompletedThisTick && session) {
          syncBootstrapData(session.user.id);
        }

        return nextPatrols;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePatrols, session]);

  // SWR追加プレゼントフェッチ
  useEffect(() => {
    if (session && showInboxPanel && inboxPanelTab === "presents" && !presentsPrefetched) {
      setPresentsSyncing(true);
      const timer = setTimeout(() => {
        setPresentsSyncing(false);
        setPresentsPrefetched(true);
        setPresents((prev) => {
          if (!prev.some(p => p.id === "p_swr")) {
            return [
              ...prev,
              { id: "p_swr", title: "SWR同期追加: アンケート協力のお礼", desc: "アンケート回答のお礼ダイヤ", reward: "ダイヤ +50", itemId: "DIAMOND", qty: 50, expireText: "期限: あと23時間", status: "UNCLAIMED", loading: false }
            ];
          }
          return prev;
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showInboxPanel, inboxPanelTab, presentsPrefetched, session]);

  // ==========================================
  // 5. 認証 ＆ 初期セットアップハンドラ (useAuthフックへ移譲)
  // ==========================================

  // --- アバターシステムAPI関数 ---
  const handleBuyAvatarPart = async (partId: string, currency: "CASH" | "DIAMOND", price: number) => {
    if (!session?.user?.id) return { success: false, message: "ログインが必要です。" };
    setAvatarLoading(true);
    try {
      // 資金チェック
      if (currency === "CASH" && cash < price) {
        return { success: false, message: "Cashが不足しています。" };
      }
      if (currency === "DIAMOND" && diamonds < price) {
        return { success: false, message: "ダイヤが不足しています。" };
      }

      // 所持パーツに登録
      const { error: insertError } = await supabase
        .from("user_avatar_parts")
        .insert({
          user_id: session.user.id,
          part_id: partId
        });

      if (insertError) {
        throw insertError;
      }

      // 資金の減算
      const nextCash = currency === "CASH" ? cash - price : cash;
      const nextDiamonds = currency === "DIAMOND" ? diamonds - price : diamonds;

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          cash: nextCash,
          neon_diamonds: nextDiamonds
        })
        .eq("id", session.user.id);

      if (userUpdateError) {
        throw userUpdateError;
      }

      setCash(nextCash);
      setDiamonds(nextDiamonds);
      setUnlockedAvatarParts(prev => [...prev, partId]);
      playCyberSe("click");

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: "購入処理中にエラーが発生しました。" };
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveAvatar = async (
    gender: string,
    hairId: string,
    faceId: string,
    bodyId: string,
    shoesId: string | null,
    accessoryId: string | null,
    bgEffect1Id: string | null,
    bgEffect2Id: string | null
  ) => {
    if (!session?.user?.id) return { success: false, message: "ログインが必要です。" };
    setAvatarLoading(true);
    try {
      const nextConfig = {
        user_id: session.user.id,
        gender,
        hair_id: hairId,
        face_id: faceId,
        body_id: bodyId,
        shoes_id: shoesId,
        accessory_id: accessoryId,
        bg_effect_1_id: bgEffect1Id,
        bg_effect_2_id: bgEffect2Id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("user_avatars")
        .upsert(nextConfig);

      if (error) {
        throw error;
      }

      setUserAvatar(nextConfig);
      
      // プリロード
      if (typeof window !== "undefined") {
        const partsToLoad = [
          hairId,
          faceId,
          bodyId,
          shoesId,
          accessoryId,
          bgEffect1Id,
          bgEffect2Id,
          gender === "MALE" ? "base_male" : "base_female"
        ].filter(Boolean);

        partsToLoad.forEach(partId => {
          const img = new Image();
          img.src = `/avatar/${partId}.webp`;
        });
      }

      playCyberSe("click");

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: "アバター設定の保存中にエラーが発生しました。" };
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleGenerateGiftCode = async () => {
    if (!session) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const { data, error } = await supabase.rpc("generate_user_gift_code", {
        p_user_id: session.user.id
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      if (data) {
        setGiftCode(data);
        alert(`ギフトコード【${data}】を新規発行しました。`);
      }
    } catch (e: any) {
      console.warn("Generate gift code failed:", e);
      setErrorMessage("ギフトコードの発行に失敗しました。");
    } finally {
      setUpgradeLoading(false);
    }
  };



  // ==========================================
  // 6. 各種ゲームロジックアクション
  // ==========================================
  const triggerNpcDefenseSimulation = async () => {
    if (!session) return;
    setSimulatingDefense(true);
    playCyberSe("click");

    try {
      const npcs = ["リュウ", "カイ", "シン", "ハヤト", "ユキ"];
      const bTypes = ["PVP", "GVG"];
      const results = ["DEFENSE_SUCCESS", "DEFENSE_FAILURE"];

      const npc = npcs[Math.floor(Math.random() * npcs.length)];
      const bType = bTypes[Math.floor(Math.random() * bTypes.length)];
      const res = results[Math.floor(Math.random() * results.length)];
      const diff = res === "DEFENSE_SUCCESS" ? 5 : -10;

      await supabase.from("pvp_defense_logs").insert({
        user_id: session.user.id,
        attacker_name: npc,
        battle_type: bType,
        result: res,
        points_change: diff
      });

      const nextPoints = Math.max(pvpPoints + diff, 0);
      await supabase.from("pvp_ranks").update({
        rank_points: nextPoints
      }).eq("id", session.user.id);

      await syncBootstrapData(session.user.id);

      alert(
        `【非同期防衛抗争シミュレーション完了】\n\n` +
        `・攻撃者: ${npc}\n` +
        `・防衛結果: ${res === "DEFENSE_SUCCESS" ? "★防衛成功" : "❌防衛失敗"}\n` +
        `・PvPランクポイント: ${diff >= 0 ? "+" : ""}${diff} pt`
      );
    } catch (err: any) {
      console.warn("Defense simulation failed:", err.message);
    } finally {
      setSimulatingDefense(false);
    }
  };

  const fetchPvpOpponents = async (userId: string, myPoints: number) => {
    if (!userId) return;
    setOpponentsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_pvp_opponents", {
        p_user_id: userId,
        p_my_points: myPoints
      });

      if (error) throw error;
      if (data) {
        setPvpOpponents(data);
        
        // 🚀 ロード時間短縮：アセット（NPC立ち絵やギルドエンブレム）のバックグラウンドプリロード
        if (typeof window !== "undefined") {
          data.forEach((op: any) => {
            if (op.defense_character_ids && op.defense_character_ids.length > 0) {
              const charId = op.defense_character_ids[0];
              const cleanId = charId.replace("c_", "");
              const charMaster = CHARACTERS_MASTER.find(c => c.id === cleanId || c.id === charId);
              if (charMaster) {
                const img = new Image();
                img.src = charMaster.img || `/${charMaster.name}_transparent_asset.png`;
              }
            }
          });
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch PvP opponents:", err.message);
    } finally {
      setOpponentsLoading(false);
    }
  };

  const savePvpDefenseDeck = async (members: string[], tactic: string = "OFFENSIVE") => {
    if (!session?.user?.id) return { success: false, message: "ログインが必要です。" };
    setUpgradeLoading(true);
    playCyberSe("click");

    try {
      const { error } = await supabase
        .from("pvp_defense_decks")
        .upsert({
          user_id: session.user.id,
          character_1_id: members[0] || null,
          character_2_id: members[1] || null,
          character_3_id: members[2] || null,
          character_4_id: members[3] || null,
          character_5_id: members[4] || null,
          tactic: tactic,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      
      await syncBootstrapData(session.user.id);
      alert("防衛デッキおよび作戦を保存しました。");
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to save pvp defense deck:", err.message);
      setErrorMessage("防衛デッキの保存に失敗しました。");
      return { success: false, message: err.message };
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!session) return;
    if (!username.trim()) {
      setErrorMessage("ユーザー名は空欄にできません。");
      return;
    }
    setProfileLoading(true);
    playCyberSe("click");

    // 🛡️ チート対策: 未解放の背景・称号・装飾の不正設定をバリデーション遮断
    let safeBg = selectedBgMode;
    let safeTitle = titleEquipped;
    let safeInterior = interiorItem;

    if (safeBg === "bg_kabukicho" && userLevel < 5) safeBg = "auto";
    if (safeBg === "bg_wharf" && !userGuild) safeBg = "auto";
    if (safeBg === "bg_bazar" && cash < 20000) safeBg = "auto";

    if (safeTitle === "title_kabukicho_emperor" && userLevel < 15) safeTitle = "title_none";
    if (safeTitle === "title_neon_overlord" && diamonds < 300) safeTitle = "title_none";
    if (safeTitle === "title_gvg_champion" && !userGuild) safeTitle = "title_none";

    setSelectedBgMode(safeBg);
    setTitleEquipped(safeTitle);
    setInteriorItem(safeInterior);

    try {
      const { error } = await supabase
        .from("users")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          current_base_id: currentBaseId,
          favorite_character_id: selectedLeader,
          title_equipped: safeTitle,
          equipped_background: equippedBackground,
          equipped_front_effect: equippedFrontEffect,
          selected_bg_mode: safeBg,
          interior_item: safeInterior
        })
        .eq("id", session.user.id);
      
      if (error) {
        if (error.code === "23505") {
          setErrorMessage("このユーザー名は既に他のプレイヤーが登録しています。");
          setProfileLoading(false);
          return;
        }
        throw error;
      }

      await syncBootstrapData(session.user.id);
      setShowSettingsPanel(false);
      alert("プロフィールを同期保存しました。");
    } catch (err: any) {
      console.warn("Profile update failed:", err.message);
      setErrorMessage("プロフィールの更新に失敗しました。");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleMoveBase = async (baseId: string) => {
    if (!session) return;
    setMovingAreaLoading(true);
    playCyberSe("click");

    const prevBase = currentBaseId;
    setCurrentBaseId(baseId);

    try {
      const { error } = await supabase
        .from("users")
        .update({ current_base_id: baseId })
        .eq("id", session.user.id);

      if (error) throw error;

      setSelectedMapAreaId(null);
      await syncBootstrapData(session.user.id);
      alert(`瞬間移動完了。現在滞在拠点: ${BASE_MAP_MASTER.find(a => a.id === baseId)?.name}`);
    } catch (err: any) {
      console.warn("Move base failed, rolling back:", err.message);
      setCurrentBaseId(prevBase);
      setErrorMessage("拠点移動の同期に失敗しました。");
    } finally {
      setMovingAreaLoading(false);
    }
  };

  const handleToggleSound = async (type: "bgm" | "se") => {
    if (!session) return;
    initAudio();

    const prevBgm = bgmEnabled;
    const prevSe = seEnabled;

    const nextBgm = type === "bgm" ? !bgmEnabled : bgmEnabled;
    const nextSe = type === "se" ? !seEnabled : seEnabled;

    if (type === "bgm") {
      setBgmEnabled(nextBgm);
      if (nextBgm) {
        setTimeout(() => startCyberBgm(), 50);
      } else {
        stopCyberBgm();
      }
    } else {
      setSeEnabled(nextSe);
    }

    if (type === "se" && nextSe) {
      setTimeout(() => {
        if (audioCtxRef.current) {
          const now = audioCtxRef.current.currentTime;
          const o = audioCtxRef.current.createOscillator();
          const g = audioCtxRef.current.createGain();
          o.connect(g); g.connect(audioCtxRef.current.destination);
          o.frequency.setValueAtTime(1000, now);
          g.gain.setValueAtTime(0.04, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(now); o.stop(now + 0.09);
        }
      }, 50);
    } else if (type === "bgm" && nextSe) {
      playCyberSe("click");
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          sound_settings: { bgm: nextBgm, se: nextSe }
        })
        .eq("id", session.user.id);

      if (error) throw error;
    } catch (err) {
      console.warn("Sound setting sync failed, rolling back:", err);
      if (type === "bgm") {
        setBgmEnabled(prevBgm);
        if (prevBgm) startCyberBgm();
        else stopCyberBgm();
      } else {
        setSeEnabled(prevSe);
      }
      setErrorMessage("音響設定の同期に失敗したため、元の設定に戻しました。");
    }
  };

  const handleStoryNext = async () => {
    if (!session || !activeStorySession) return;
    setStorySending(true);
    playCyberSe("click");

    const episode = STORY_EPISODES_MASTER[activeStorySession.stageId];
    if (!episode) {
      setStorySending(false);
      return;
    }

    const currentList = activeStorySession.status === "INTRO_TALK" ? episode.intro : episode.outro;
    const nextNodeId = activeStorySession.currentNodeId + 1;

    try {
      if (nextNodeId >= currentList.length) {
        if (activeStorySession.status === "INTRO_TALK") {
          if (activeStorySession.stageId === "stage_tutorial_01") {
            await supabase.from("story_sessions").update({ status: "BATTLE" }).eq("user_id", session.user.id);
            setActiveStorySession({ stageId: "stage_tutorial_01", currentNodeId: nextNodeId, status: "BATTLE" });
            setStorySending(false);
            battle.startCardBattle("PVP", "新宿南部連合 (模擬戦)");
          } else {
            await completeStorySession();
          }
        } else {
          await completeStorySession();
        }
      } else {
        await supabase.from("story_sessions").upsert({
          user_id: session.user.id,
          stage_id: activeStorySession.stageId,
          current_node_id: nextNodeId,
          status: activeStorySession.status
        }, { onConflict: "user_id" });

        setActiveStorySession({
          stageId: activeStorySession.stageId,
          currentNodeId: nextNodeId,
          status: activeStorySession.status
        });
      }
    } catch (err) {
      console.warn("ADV save failed:", err);
    } finally {
      setStorySending(false);
    }
  };

  const completeStorySession = async () => {
    if (!session || !activeStorySession) return;

    try {
      await supabase.from("story_sessions").update({ status: "COMPLETED" }).eq("user_id", session.user.id);

      let rewardText = "模擬戦クリア報酬";
      let bonusDiamonds = 150;
      let bonusCash = 5000;

      if (bonusDiamonds > 0 || bonusCash > 0) {
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await supabase.from("presents").insert([
          { user_id: session.user.id, item_id: "DIAMOND", quantity: bonusDiamonds, message: `${rewardText}: ダイヤ獲得`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" },
          { user_id: session.user.id, item_id: "CASH", quantity: bonusCash, message: `${rewardText}: キャッシュ獲得`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" }
        ]);
      }

      setActiveStorySession(null);
      await syncBootstrapData(session.user.id);

      alert("ストーリークリア報酬がプレゼントへ転送されました。");
    } catch (err) {
      console.warn("Complete story session failed:", err);
    }
  };

  const triggerTutorialStory = async () => {
    if (!session) return;
    setStorySending(true);
    playCyberSe("click");
    try {
      await supabase.from("story_sessions").upsert({
        user_id: session.user.id,
        stage_id: "stage_tutorial_01",
        current_node_id: 0,
        status: "INTRO_TALK"
      }, { onConflict: "user_id" });

      setActiveStorySession({
        stageId: "stage_tutorial_01",
        currentNodeId: 0,
        status: "INTRO_TALK"
      });
    } catch (err) {
      console.warn(err);
    } finally {
      setStorySending(false);
    }
  };

  const triggerStripeWebhookSimulation = async (duplicateRequest: boolean) => {
    if (!session) return;
    setProfileLoading(true);
    playCyberSe("click");

    const sessionId = duplicateRequest 
      ? lastPaymentSessionId 
      : `stripe_session_${Math.floor(Math.random() * 899999) + 100000}`;

    if (!sessionId) {
      setErrorMessage("前回のセッションが見つかりません。新規購入を行ってください。");
      setProfileLoading(false);
      return;
    }

    try {
      const { data: existTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .limit(1);

      if (existTx && existTx.length > 0) {
        alert("【Stripe Webhook 冪等性競合検知】 重複トランザクションを安全に無視しました。");
        setProfileLoading(false);
        return;
      }

      await supabase.from("payment_transactions").insert({
        user_id: session.user.id,
        stripe_session_id: sessionId,
        amount: 1200,
        currency: "jpy",
        diamonds_added: 120,
        status: "COMPLETED"
      });

      const nextDiamonds = diamonds + 120;
      await supabase.from("users").update({ neon_diamonds: nextDiamonds }).eq("id", session.user.id);
      
      setDiamonds(nextDiamonds);
      setLastPaymentSessionId(sessionId);
      await syncBootstrapData(session.user.id);

      alert(`Stripe決済シミュレート完了。有償ダイヤ+120。`);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const getGuildPenaltyState = (): { isPenalty: boolean; secondsLeft: number } => {
    if (!lastGuildLeftAt) return { isPenalty: false, secondsLeft: 0 };
    const leftTime = new Date(lastGuildLeftAt).getTime();
    const diffMs = Date.now() - leftTime;
    const penaltyMs = 24 * 60 * 60 * 1000;
    
    if (diffMs < penaltyMs) {
      return { isPenalty: true, secondsLeft: Math.ceil((penaltyMs - diffMs) / 1000) };
    }
    return { isPenalty: false, secondsLeft: 0 };
  };

  const handleCreateGuild = async () => {
    if (!session) return;
    if (userLevel < 8) {
      setErrorMessage("ギルド創設にはプレイヤーレベル8以上が必要です。");
      return;
    }
    if (!newGuildName.trim()) {
      setErrorMessage("ギルド名は空欄にできません。");
      return;
    }
    if (cash < 5000) {
      setErrorMessage("創設にはキャッシュ5,000が必要です。");
      return;
    }

    const penalty = getGuildPenaltyState();
    if (penalty.isPenalty) {
      setErrorMessage("ギルド脱退後のペナルティ制限期間中です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      const { data: newGuild, error: guildErr } = await supabase
        .from("guilds")
        .insert({ name: newGuildName.trim(), leader_id: session.user.id, level: 1, xp: 0 })
        .select()
        .single();

      if (guildErr) {
        if (guildErr.code === "23505") {
          setErrorMessage("このギルド名は既に他のプレイヤーが登録しています。");
          setGvgResetLoading(false);
          return;
        }
        throw guildErr;
      }

      await supabase.from("guild_members").insert({
        guild_id: newGuild.id,
        user_id: session.user.id,
        role: "MASTER",
        weekly_contribution: 0,
        total_contribution: 0
      });

      const nextCash = cash - 5000;
      await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);

      setCash(nextCash);
      setNewGuildName("");
      alert(`ギルド『${newGuild.name}』を創設しました！`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const [updatingAlignment, setUpdatingAlignment] = useState(false);

  const handleUpdateGuildAlignment = async (mainAlign: string, subAlign: string) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER") {
      alert("ギルドマスターのみ属性を変更できます。");
      return;
    }
    setUpdatingAlignment(true);
    playCyberSe("click");

    const alignmentJpToEn: { [key: string]: string } = {
      "正義": "JUSTICE",
      "悪": "EVIL",
      "秩序": "ORDER",
      "混沌": "CHAOS",
      "JUSTICE": "JUSTICE",
      "EVIL": "EVIL",
      "ORDER": "ORDER",
      "CHAOS": "CHAOS"
    };

    const mainEn = alignmentJpToEn[mainAlign] || mainAlign;
    const subEn = alignmentJpToEn[subAlign] || subAlign;

    try {
      const { error } = await supabase
        .from("guilds")
        .update({
          main_alignment: mainEn,
          sub_alignment: subEn
        })
        .eq("id", userGuild.id);

      if (error) throw error;
      
      await syncBootstrapData(session.user.id);
      alert("組織属性を更新しました。");
    } catch (e: any) {
      console.warn("Update alignment failed:", e.message);
      setErrorMessage("属性の更新に失敗しました。");
    } finally {
      setUpdatingAlignment(false);
    }
  };

  const handleLeaveGuild = async () => {
    if (!session || !userGuildMember || !userGuild) return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const isMaster = userGuildMember.role === "MASTER";
      const otherMembers = guildMembersList.filter(m => m.user_id !== session.user.id);

      if (isMaster && otherMembers.length > 0) {
        setErrorMessage("脱退する前に、マスター権限を譲渡してください。");
        setGvgResetLoading(false);
        return;
      }

      const leftTimeIso = new Date().toISOString();

      if (isMaster && otherMembers.length === 0) {
        await supabase.from("guilds").delete().eq("id", userGuild.id);
        await supabase.from("users").update({ last_guild_left_at: leftTimeIso }).eq("id", session.user.id);
        alert("ギルドは自動解散されました。");
      } else {
        await supabase.from("guild_members").delete().eq("user_id", session.user.id);
        await supabase.from("users").update({ last_guild_left_at: leftTimeIso }).eq("id", session.user.id);
        alert("ギルドから正常に脱退しました。");
      }

      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleDemoJoinGuild = async (targetGuildId: string, guildName: string) => {
    if (!session) return;
    if (userLevel < 3) {
      setErrorMessage("ギルド加入にはプレイヤーレベル3以上が必要です。");
      return;
    }
    const penalty = getGuildPenaltyState();
    if (penalty.isPenalty) {
      setErrorMessage("ギルド脱退後のペナルティ制限期間中です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      // メンバー上限チェック (最大10名)
      const { data: mCount, error: mCountErr } = await supabase
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", targetGuildId);

      if (mCount && mCount.length >= 10) {
        alert("対象ギルドは上限人数（10名）に達しています。");
        setGvgResetLoading(false);
        return;
      }

      await supabase.from("guild_members").insert({
        guild_id: targetGuildId,
        user_id: session.user.id,
        role: "MEMBER",
        weekly_contribution: 0,
        total_contribution: 0
      });

      alert(`ギルド『${guildName}』にデモ所属しました！`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, targetName: string, newRole: string) => {
    if (!session || !userGuildMember || userGuildMember.role !== "MASTER") return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      if (newRole === "MASTER") {
        await supabase.from("guild_members").update({ role: "MASTER" }).eq("user_id", targetUserId);
        await supabase.from("guild_members").update({ role: "SUBMASTER" }).eq("user_id", session.user.id);
        await supabase.from("guilds").update({ leader_id: targetUserId }).eq("id", userGuild.id);
        alert(`マスター権限を『${targetName}』へ譲渡しました。`);
      } else {
        await supabase.from("guild_members").update({ role: newRole }).eq("user_id", targetUserId);
        alert(`『${targetName}』の階級を ${newRole} へ変更しました。`);
      }
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleKickMember = async (targetUserId: string, targetName: string) => {
    if (!session || !userGuildMember || (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER")) return;

    // 対象メンバーの階級情報を取得
    const targetMember = guildMembersList.find(m => m.user_id === targetUserId);
    if (!targetMember) return;

    // 権限制御: 追放する側の階級が対象より高くなければならない (MASTER > SUBMASTER > MEMBER)
    const rolePower = (role: string) => role === "MASTER" ? 3 : role === "SUBMASTER" ? 2 : 1;
    if (rolePower(userGuildMember.role) <= rolePower(targetMember.role)) {
      alert("自分と同等以上の階級の構成員を追放することはできません。");
      return;
    }

    if (!confirm(`『${targetName}』を追放しますか？`)) return;

    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("guild_members").delete().eq("user_id", targetUserId);
      await supabase.from("users").update({ last_guild_left_at: new Date().toISOString() }).eq("id", targetUserId);
      alert(`『${targetName}』を追放しました。`);
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  // --- 献金、装飾購入・適用、マスタ駆動XP加算の新機能 ---

  const handleDonateToGuild = async (amount: number) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (cash < amount) {
      alert("所持キャッシュが不足しています。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const actionType = amount === 1000 ? "DONATE_SMALL" : amount === 5000 ? "DONATE_MEDIUM" : "DONATE_LARGE";
      const actionMaster = guildXpActionMaster.find(a => a.action_type === actionType) || { xp_gain: amount === 1000 ? 20 : amount === 5000 ? 120 : 300, contribution_gain: amount === 1000 ? 10 : amount === 5000 ? 60 : 150 };

      // ギルド資金を加算
      const { error: gErr } = await supabase
        .from("guilds")
        .update({
          funds: Number(userGuild.funds || 0) + amount
        })
        .eq("id", userGuild.id);

      if (gErr) throw gErr;

      // 個人キャッシュを減算
      const nextCash = cash - amount;
      await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);
      setCash(nextCash);

      // マスタXP加算を実行
      await addGuildXpAndContributionByAction(actionType);

      alert(`ギルドに ${amount.toLocaleString()} キャッシュを献金しました！\n(ギルド資金 +${amount.toLocaleString()} / ギルドXP +${actionMaster.xp_gain} / 貢献度 +${actionMaster.contribution_gain})`);
    } catch (e: any) {
      console.warn("Donation failed:", e.message);
      alert("献金に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleBuyGuildDecoration = async (itemId: string, cost: number, type: "DECORATION" | "BANNER") => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      alert("装飾アイテムの購入はマスターまたはサブマスターのみ可能です。");
      return;
    }
    if (Number(userGuild.funds || 0) < cost) {
      alert("ギルド資金が不足しています。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[field]) ? userGuild[field] : [];
      if (currentList.includes(itemId)) {
        alert("このアイテムは既に購入済みです。");
        setGvgResetLoading(false);
        return;
      }

      const nextList = [...currentList, itemId];
      const { error } = await supabase
        .from("guilds")
        .update({
          funds: Number(userGuild.funds || 0) - cost,
          [field]: nextList
        })
        .eq("id", userGuild.id);

      if (error) throw error;

      await syncBootstrapData(session.user.id);
      alert("装飾アイテムを購入しました！");
    } catch (e: any) {
      console.warn("Buy decoration failed:", e.message);
      alert("購入に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleEquipGuildDecoration = async (type: "DECORATION" | "BANNER", itemId: string | null) => {
    if (!session || !userGuild || !userGuildMember) return;
    if (userGuildMember.role !== "MASTER" && userGuildMember.role !== "SUBMASTER") {
      alert("装飾の変更はマスターまたはサブマスターのみ可能です。");
      return;
    }

    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const field = type === "DECORATION" ? "equipped_decoration" : "equipped_banner";
      const unlockField = type === "DECORATION" ? "unlocked_decorations" : "unlocked_banners";
      const currentList = Array.isArray(userGuild[unlockField]) ? userGuild[unlockField] : [];

      if (itemId !== null && !currentList.includes(itemId)) {
        alert("このアイテムは未解放です。");
        setGvgResetLoading(false);
        return;
      }

      const { error } = await supabase
        .from("guilds")
        .update({
          [field]: itemId
        })
        .eq("id", userGuild.id);

      if (error) throw error;

      await syncBootstrapData(session.user.id);
      alert("ギルド装飾を適用しました。");
    } catch (e: any) {
      console.warn("Equip decoration failed:", e.message);
      alert("装飾の適用に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };






  const handleStartPatrol = async () => {
    if (!session || !selectedCourse) return;
    const course = patrolCourses.find(c => c.id === selectedCourse);
    if (!course) return;

    if (vitality < course.cost_vitality) {
      setErrorMessage("スタミナが不足しています。");
      return;
    }
    if (!selectedPatrolMember) {
      setErrorMessage("見回りさせるメンバーを選択してください。");
      return;
    }

    if (activePatrols.length >= 5) {
      setErrorMessage("出撃枠が上限（5枠）に達しています。");
      return;
    }

    if (activePatrols.some(p => p.characterId === selectedPatrolMember && p.status !== "COMPLETED")) {
      setErrorMessage("このキャラクターはすでに出撃中です。");
      return;
    }

    setDispatchLoading(true);
    playCyberSe("click");
    try {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + course.duration_seconds * 1000);

      const hasBattle = Math.random() <= (Number(course.battle_trigger_chance) || 0.2);

      const { data, error } = await supabase.from("user_patrols").insert({
        user_id: session.user.id,
        course_id: course.id,
        character_id: selectedPatrolMember,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "ONGOING",
        has_battle_event: hasBattle,
        battle_resolved: false
      }).select().single();

      if (error) throw error;

      await supabase.from("users").update({ vitality: vitality - course.cost_vitality }).eq("id", session.user.id);
      setVitality(prev => prev - course.cost_vitality);

      const newPatrol = {
        id: data.id,
        courseId: course.id,
        characterId: selectedPatrolMember,
        secondsTotal: course.duration_seconds,
        secondsLeft: course.duration_seconds,
        status: "ONGOING" as const,
        has_battle_event: hasBattle,
        battle_resolved: false,
        battle_result: null,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      };

      setActivePatrols(prev => [...prev, newPatrol]);
      setSelectedPatrolMember(null); // クリア
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleInstantComplete = async (currency: "CASH" | "DIAMOND", patrolId: string) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return;
    setDispatchLoading(true);
    playCyberSe("click");

    try {
      const { data, error } = await supabase.rpc("complete_patrol_instantly", {
        p_user_id: session.user.id,
        p_patrol_id: patrolId,
        p_use_currency: currency
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data && data.status === "success") {
        await syncBootstrapData(session.user.id);
      }
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleClaimRewards = async (patrolId: string) => {
    const targetPatrol = activePatrols.find(p => p.id === patrolId);
    if (!session || !targetPatrol) return;
    const course = patrolCourses.find(c => c.id === targetPatrol.courseId);
    if (!course) return;

    setDispatchLoading(true);
    playCyberSe("gacha");
    try {
      const memberId = targetPatrol.characterId;
      const uChar = userCharactersDbList.find((uc: any) => uc.id === memberId);
      let charLevel = 1;
      let isHomeMatch = false;
      let baseLuk = 10;

      if (uChar) {
        charLevel = uChar.level || 1;
        const charMaster = CHARACTERS_MASTER.find((c: any) => c.id === uChar.character_id);
        if (charMaster) {
          if (charMaster.homeTown === course.town_id) {
            isHomeMatch = true;
            const pattern = CHARACTER_GROWTH_PATTERNS.find((p: any) => p.pattern_id === charMaster.growthPatternId) || CHARACTER_GROWTH_PATTERNS[0];
            baseLuk = pattern.base_luk;
          }
        }
      }

      const chanceBonus = isHomeMatch ? baseLuk * 0.001 : 0;
      const cashBonus = isHomeMatch ? baseLuk * 10 : 0;

      // キャラクターレベルボーナスの算出: 1レベルにつき+1%
      const lvlBonusMultiplier = 1.0 + (charLevel - 1) * 0.01;

      // 報酬の計算 (地元一致キャッシュボーナス加算後、レベルボーナス倍率を適用)
      let finalCash = Math.floor((course.reward_cash + cashBonus) * lvlBonusMultiplier);
      let finalXp = Math.floor(course.reward_xp * lvlBonusMultiplier);

      let rewardItemId = "";
      let rewardQuantity = 0;

      const rand = Math.random();
      const finalChance = Number(course.reward_item_chance) + chanceBonus;
      if (course.reward_item_id && rand <= finalChance) {
        rewardItemId = course.reward_item_id;
        rewardQuantity = 1;
      }

      // 上級クエストの追加装備ドロップ (30%の確率で WEAPON_001)
      let gearDropped = false;
      const isHardPatrol = course.id.endsWith("_hard") || course.reward_cash >= 6000;
      if (isHardPatrol && Math.random() <= 0.3) {
        gearDropped = true;
      }

      // バトル勝利時の追加報酬
      let battleCashBonus = 0;
      let battleXpBonus = 0;
      let battleRewardItemId = "";
      let battleRewardItemQty = 0;
      const isBattleVictory = targetPatrol.battle_result === "VICTORY";

      if (targetPatrol.has_battle_event && isBattleVictory && course.battle_npc_id) {
        const npcMaster = patrolNpcs.find(n => n.id === course.battle_npc_id);
        if (npcMaster) {
          battleCashBonus = npcMaster.win_reward_cash_bonus || 0;
          battleXpBonus = npcMaster.win_reward_xp_bonus || 0;
          if (npcMaster.win_reward_item_id && npcMaster.win_reward_item_qty > 0) {
            battleRewardItemId = npcMaster.win_reward_item_id;
            battleRewardItemQty = npcMaster.win_reward_item_qty;
          }
        }
      }

      const totalCash = finalCash + battleCashBonus;
      const totalXp = finalXp + battleXpBonus;

      // DB更新 (完了)
      await supabase.from("user_patrols").update({ status: "COMPLETED" }).eq("id", patrolId);

      const now = new Date();
      const expire = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // presents 登録
      await supabase.from("presents").insert({
        user_id: session.user.id,
        item_id: "CASH",
        quantity: totalCash,
        message: `見回り完了報酬 (${course.name}${isBattleVictory ? '・バトル勝利' : ''})`,
        status: "UNCLAIMED",
        sent_at: now.toISOString(),
        expire_at: expire.toISOString()
      });

      if (rewardItemId && rewardQuantity > 0) {
        await supabase.from("presents").insert({
          user_id: session.user.id,
          item_id: rewardItemId,
          quantity: rewardQuantity,
          message: `見回りドロップ報酬 (${course.name})`,
          status: "UNCLAIMED",
          sent_at: now.toISOString(),
          expire_at: expire.toISOString()
        });
      }

      if (gearDropped) {
        await supabase.from("presents").insert({
          user_id: session.user.id,
          item_id: "WEAPON_001",
          quantity: 1,
          message: `見回り追加ドロップ装備 (${course.name})`,
          status: "UNCLAIMED",
          sent_at: now.toISOString(),
          expire_at: expire.toISOString()
        });
      }

      if (battleRewardItemId && battleRewardItemQty > 0) {
        await supabase.from("presents").insert({
          user_id: session.user.id,
          item_id: battleRewardItemId,
          quantity: battleRewardItemQty,
          message: `見回りバトル勝利追加報酬 (${course.name})`,
          status: "UNCLAIMED",
          sent_at: now.toISOString(),
          expire_at: expire.toISOString()
        });
      }

      await supabase.rpc("evaluate_mission_progress", {
        p_user_id: session.user.id,
        p_trigger_type: "PATROL_CLEAR",
        p_progress_increment: 1
      });

      const { data: xpRes } = await supabase.rpc("add_user_xp", {
        p_user_id: session.user.id,
        p_xp_amount: totalXp
      });

      let levelUpMessage = "";
      if (xpRes && xpRes.leveled_up) {
        levelUpMessage = `\n★プレイヤーレベルが Lv.${xpRes.level} にアップしました！`;
      }

      await addGuildXpAndContributionByAction("QUEST");
      postNpcYajiMessage("GLOBAL", currentBaseId, "PATROL_CLEAR");
      await syncBootstrapData(session.user.id);

      // 完了ポップアップ表示用報酬データのセット
      const rewardSummary = {
        courseName: course.name,
        baseCash: finalCash,
        baseXp: finalXp,
        levelBonusPercent: Math.round((lvlBonusMultiplier - 1) * 100),
        levelBonusCash: Math.floor(finalCash - (course.reward_cash + cashBonus)),
        matchBonusApplied: isHomeMatch,
        matchBonusCash: cashBonus,
        dropItemName: rewardItemId ? (rewardItemId === 'TRAINING_MANUAL' ? '育成読本' : rewardItemId === 'POLISHING_STONE' ? '研磨石' : rewardItemId === 'LAW_OF_STRIFE' ? '闘争の掟' : rewardItemId) : '',
        dropItemQty: rewardQuantity,
        gearDropped,
        hasBattle: targetPatrol.has_battle_event,
        battleVictory: isBattleVictory,
        battleCashBonus,
        battleXpBonus,
        battleRewardItemName: battleRewardItemId ? (battleRewardItemId === 'TRAINING_MANUAL' ? '育成読本' : battleRewardItemId === 'POLISHING_STONE' ? '研磨石' : battleRewardItemId === 'LAW_OF_STRIFE' ? '闘争の掟' : battleRewardItemId) : '',
        battleRewardItemQty,
        totalCash,
        totalXp,
        levelUpMessage
      };

      setLastPatrolRewards(rewardSummary);
      setShowPatrolRewardModal(true);
      setHasActivePatrolBattle(false);

      // Local state clear
      setActivePatrols(prev => prev.filter(p => p.id !== patrolId));
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleDeployGvgDefense = async (charIds: string[]) => {
    if (!session) return;
    const guildIdFilter = userGuildMember?.guild_id || "";
    if (!guildIdFilter) {
      alert("ギルドに所属していないため、守備デッキの登録はできません。");
      return;
    }
    playCyberSe("click");
    setGvgResetLoading(true);

    try {
      if (charIds.length === 0) {
        // 解除
        await supabase.from("gvg_defense_decks").delete().eq("user_id", session.user.id);
        alert("守備デッキの登録を解除しました。");
      } else {
        // 登録・更新
        await supabase.from("gvg_defense_decks").upsert({
          user_id: session.user.id,
          guild_id: guildIdFilter,
          character_1_id: charIds[0] || null,
          character_2_id: charIds[1] || null,
          character_3_id: charIds[2] || null,
          character_4_id: charIds[3] || null,
          character_5_id: charIds[4] || null
        });
        alert("守備デッキを登録しました。");
      }
      await syncBootstrapData(session.user.id);
    } catch (e: any) {
      console.warn("Failed to deploy GvG defense deck:", e.message);
      alert("守備デッキの登録に失敗しました。");
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePowerDailyReset = async () => {
    if (!session) return;
    setGvgResetLoading(true);
    try {
      const { error } = await supabase.rpc("reset_daily_power_rankings");
      if (error) throw error;
      await syncBootstrapData(session.user.id);
      alert("総合力デイリーリセットを実行しました（アクティブ状態の初期化）。");
    } catch (e: any) {
      console.warn("Failed to reset daily power rankings:", e.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePowerSeasonReset = async () => {
    if (!session) return;
    setGvgResetLoading(true);
    try {
      const { error } = await supabase.rpc("reset_seasonal_power_rankings");
      if (error) throw error;
      await syncBootstrapData(session.user.id);
      alert("総合力シーズンリセットを実行しました（全ユーザーの初期化）。");
    } catch (e: any) {
      console.warn("Failed to reset seasonal power rankings:", e.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const fetchPlayerDetail = async (userId: string) => {
    try {
      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("id, username, bio, level")
        .eq("id", userId)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!user) return;

      const { data: deck, error: deckErr } = await supabase
        .from("pvp_defense_decks")
        .select("character_1_id, character_2_id, character_3_id, character_4_id, character_5_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (deckErr) throw deckErr;

      let characterIds: string[] = [];
      if (deck) {
        if (deck.character_1_id) characterIds.push(deck.character_1_id);
        if (deck.character_2_id) characterIds.push(deck.character_2_id);
        if (deck.character_3_id) characterIds.push(deck.character_3_id);
        if (deck.character_4_id) characterIds.push(deck.character_4_id);
        if (deck.character_5_id) characterIds.push(deck.character_5_id);
      }

      const { data: userChars, error: charErr } = await supabase
        .from("user_characters")
        .select("id, character_id, level, plus_val, break_val")
        .eq("user_id", userId);

      if (charErr) throw charErr;

      if (characterIds.length === 0 && userChars && userChars.length > 0) {
        const sorted = [...userChars].sort((a, b) => b.level - a.level || b.plus_val - a.plus_val);
        characterIds = sorted.slice(0, 5).map(c => c.id);
      }

      const partyDetails: any[] = [];
      for (const charId of characterIds) {
        const charData = userChars.find(c => c.id === charId || c.character_id === charId);
        if (!charData) continue;

        const { data: masterChar } = await supabase
          .from("characters")
          .select("name, hp, atk, def, spd, luk")
          .eq("id", charData.character_id)
          .maybeSingle();

        if (!masterChar) continue;

        const { data: equips } = await supabase
          .from("user_equipments")
          .select("id, item_id, hp, atk, def, spd, luk, plus_val, level")
          .eq("equipped_character_id", charId);

        const totalStats = getCharacterTotalStats(charData, equips || []);

        partyDetails.push({
          name: masterChar.name,
          level: charData.level,
          plus_val: charData.plus_val,
          stats: totalStats
        });
      }

      setActivePlayerDetail({
        username: user.username,
        bio: user.bio || "自己紹介が未設定です。",
        level: user.level,
        party: partyDetails
      });
    } catch (e: any) {
      console.warn("Failed to fetch player detail:", e.message);
    }
  };

  const fetchGuildDetail = async (guildId: string) => {
    try {
      const { data: guild, error: guildErr } = await supabase
        .from("guilds")
        .select("id, name, level, xp, member_limit, main_alignment, sub_alignment, emblem_url, leader_id")
        .eq("id", guildId)
        .maybeSingle();

      if (guildErr) throw guildErr;
      if (!guild) return;

      const { count, error: countErr } = await supabase
        .from("guild_members")
        .select("*", { count: "exact", head: true })
        .eq("guild_id", guildId);

      if (countErr) throw countErr;

      let leaderName = "不明";
      if (guild.leader_id) {
        const { data: leader } = await supabase
          .from("users")
          .select("username")
          .eq("id", guild.leader_id)
          .maybeSingle();
        if (leader) leaderName = leader.username;
      }

      const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
      const baseNames: { [key: string]: string } = {
        neon_tower: "ネオンタワー",
        deep_dock: "ディープドック",
        junk_bazar: "ジャンクバザール",
        kitakura_gate: "キタクラゲート"
      };

      const controlledBases: string[] = [];
      bases.forEach(baseId => {
        const records = gvgBaseControls
          .filter((g: any) => g.base_id === baseId)
          .sort((a: any, b: any) => b.daily_points - a.daily_points);
        if (records.length > 0 && records[0].guild_id === guildId) {
          controlledBases.push(baseNames[baseId] || baseId);
        }
      });

      setActiveGuildDetail({
        id: guild.id,
        name: guild.name,
        level: guild.level,
        xp: guild.xp,
        member_limit: guild.member_limit || 15,
        member_count: count || 0,
        main_alignment: guild.main_alignment,
        sub_alignment: guild.sub_alignment,
        emblem_url: guild.emblem_url,
        leaderName,
        controlledBases
      });
    } catch (e: any) {
      console.warn("Failed to fetch guild detail:", e.message);
    }
  };

  const handleGvgDailyReset = async () => {
    if (!session) return;
    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      const guildIdFilter = userGuildMember?.guild_id || "";

      // 1. 各拠点 (neon_tower, deep_dock, junk_bazar, kitakura_gate) ごとに daily_points トップのギルドを支配ギルドに設定
      const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
      let wonAreasCount = 0;

      // ギルドXPマスタが必要なため並列フェッチ
      const { data: lvlMaster } = await supabase.from("guild_level_master").select("*");
      const currentLvlMaster = lvlMaster || guildLevelMaster;

      for (const baseId of bases) {
        // 当該拠点の各ギルドのポイントを取得
        const { data: baseControls } = await supabase
          .from("guild_base_controls")
          .select("*")
          .eq("base_id", baseId)
          .order("daily_points", { ascending: false });

        if (baseControls && baseControls.length > 0) {
          const topControl = baseControls[0];
          const controllingGuildId = topControl.guild_id;

          // 支配フラグの更新 (1位を true, 他を false に)
          await supabase.from("guild_base_controls").update({ is_controlling: true, total_seasonal_days: topControl.total_seasonal_days + 1 }).eq("base_id", baseId).eq("guild_id", controllingGuildId);
          await supabase.from("guild_base_controls").update({ is_controlling: false }).eq("base_id", baseId).neq("guild_id", controllingGuildId);

          if (controllingGuildId === guildIdFilter) {
            wonAreasCount++;
          }

          // 支配ギルドへの恩恵付与: 資金 +50,000, XP +500
          const { data: guildRec } = await supabase.from("guilds").select("*").eq("id", controllingGuildId).maybeSingle();
          if (guildRec) {
            const nextFunds = Number(guildRec.funds || 0) + 50000;
            let nextXp = (guildRec.xp || 0) + 500;
            let nextLvl = guildRec.level || 1;

            while (true) {
              const lvlConfig = currentLvlMaster.find((l: any) => l.level === nextLvl);
              if (lvlConfig && nextXp >= lvlConfig.next_xp) {
                nextXp -= lvlConfig.next_xp;
                nextLvl += 1;
              } else {
                break;
              }
            }

            await supabase.from("guilds").update({ funds: nextFunds, level: nextLvl, xp: nextXp }).eq("id", controllingGuildId);
          }

          // 支配ギルドメンバー全員へのデイリー報酬配布 (ダイヤ+50, Cash+5000)
          const { data: members } = await supabase.from("guild_members").select("user_id").eq("guild_id", controllingGuildId);
          if (members && members.length > 0) {
            const now = new Date();
            const expire = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            for (const member of members) {
              await supabase.from("presents").insert([
                {
                  user_id: member.user_id,
                  item_id: "DIAMOND",
                  quantity: 50,
                  message: `抗争デイリー支配報酬 [拠点: ${baseId}]`,
                  status: "UNCLAIMED",
                  sent_at: now.toISOString(),
                  expire_at: expire.toISOString()
                },
                {
                  user_id: member.user_id,
                  item_id: "CASH",
                  quantity: 5000,
                  message: `抗争デイリー支配報酬 [拠点: ${baseId}]`,
                  status: "UNCLAIMED",
                  sent_at: now.toISOString(),
                  expire_at: expire.toISOString()
                }
              ]);
            }
          }
        }
      }

      // 2. シーズン経過日数の更新
      const { data: dayRec } = await supabase.from("gvg_season_status").select("current_day").eq("id", 1).maybeSingle();
      const currentDay = dayRec?.current_day || 1;
      const nextDay = Math.min(currentDay + 1, 7);
      await supabase.from("gvg_season_status").update({ current_day: nextDay }).eq("id", 1);
      setGvgSeasonDay(nextDay);

      // 3. 対戦終了 & 翌日マッチングの自動生成
      const isFinalDay = currentDay === 7;
      await supabase.from("gvg_matches").update({ status: "FINISHED" }).eq("status", "ONGOING").eq("is_finals", isFinalDay);

      // 翌日のマッチングをシミュレーション構築
      const { data: guildsAll } = await supabase.from("guilds").select("id");
      if (guildsAll && guildsAll.length > 0) {
        const nextIsFinal = nextDay === 7;
        let matchGuilds = [...guildsAll];

        if (nextIsFinal) {
          // 7日目の決戦: 4拠点の支配ギルド（計4ギルド）を抽出
          const { data: finalGuildsCtrl } = await supabase.from("guild_base_controls").select("guild_id").eq("is_controlling", true);
          let finalGuilds = finalGuildsCtrl?.map((c: any) => c.guild_id).filter(Boolean) || [];

          // 4つに満たない場合は支配日数の多い順に補填
          if (finalGuilds.length < 4) {
            const { data: allCtrl } = await supabase.from("guild_base_controls").select("guild_id, total_seasonal_days");
            if (allCtrl) {
              const sorted = allCtrl
                .filter(c => c.guild_id && !finalGuilds.includes(c.guild_id))
                .sort((a, b) => (b.total_seasonal_days || 0) - (a.total_seasonal_days || 0));
              for (const c of sorted) {
                if (finalGuilds.length >= 4) break;
                finalGuilds.push(c.guild_id);
              }
            }
          }

          // 決戦用総当たりマッチングを構築 (1日3ラウンド、4ギルド総当たり＋決勝戦)
          // 予選マッチング (第1部、第2部)
          if (finalGuilds.length >= 2) {
            await supabase.from("gvg_matches").insert([
              { round: 1, guild_a_id: finalGuilds[0], guild_b_id: finalGuilds[1], is_finals: true },
              { round: 1, guild_a_id: finalGuilds[2] || finalGuilds[0], guild_b_id: finalGuilds[3] || finalGuilds[1], is_finals: true },
              { round: 2, guild_a_id: finalGuilds[0], guild_b_id: finalGuilds[2] || finalGuilds[1], is_finals: true },
              { round: 2, guild_a_id: finalGuilds[1], guild_b_id: finalGuilds[3] || finalGuilds[0], is_finals: true }
            ]);
            // 第3部 (23:00) は予選ポイントに応じた 1-2位決定戦 / 3-4位決定戦
            await supabase.from("gvg_matches").insert([
              { round: 3, guild_a_id: finalGuilds[0], guild_b_id: finalGuilds[1], is_finals: true }, // 覇者決定戦
              { round: 3, guild_a_id: finalGuilds[2] || finalGuilds[0], guild_b_id: finalGuilds[3] || finalGuilds[1], is_finals: true }
            ]);
          }
        } else {
          // 通常日のマッチング (ランダムマッチ)
          for (let i = matchGuilds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matchGuilds[i], matchGuilds[j]] = [matchGuilds[j], matchGuilds[i]];
          }

          for (let i = 0; i < matchGuilds.length; i += 2) {
            const ga = matchGuilds[i].id;
            const gb = (i + 1 < matchGuilds.length) ? matchGuilds[i + 1].id : "g_npc_1";
            await supabase.from("gvg_matches").insert([
              { round: 1, guild_a_id: ga, guild_b_id: gb, is_finals: false },
              { round: 2, guild_a_id: ga, guild_b_id: gb, is_finals: false },
              { round: 3, guild_a_id: ga, guild_b_id: gb, is_finals: false }
            ]);
          }
        }
      }

      // 4. デイリー拠点ポイントのリセット
      await supabase.from("guild_base_controls").update({ daily_points: 0 }).neq("base_id", "");

      await syncBootstrapData(session.user.id);
      alert(`GvG日次集計完了。自ギルドの支配権: ${wonAreasCount} 箇所。支配報酬（ダイヤ/Cash）を対象メンバーのプレゼントBOXへ配布しました。経過日数を ${nextDay} 日目に進め、新規マッチングを自動生成しました。`);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleGvgSeasonReset = async () => {
    if (!session) return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      // 1. 個人シーズンランキング報酬の自動配布
      const { data: personalRanks } = await supabase
        .from("user_gvg_ranks")
        .select("*, users ( username )")
        .order("season_points", { ascending: false });

      if (personalRanks && personalRanks.length > 0) {
        const now = new Date();
        const expire = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        for (let i = 0; i < personalRanks.length; i++) {
          const rank = i + 1;
          const uId = personalRanks[i].user_id;
          let rewardQty = 100; // 参加賞
          if (rank === 1) rewardQty = 500;
          else if (rank === 2) rewardQty = 300;
          else if (rank === 3) rewardQty = 200;

          await supabase.from("presents").insert({
            user_id: uId,
            item_id: "DIAMOND",
            quantity: rewardQty,
            message: `GvG個人シーズンポイント最終順位報酬 (${rank}位 / 累計: ${personalRanks[i].season_points} pts)`,
            status: "UNCLAIMED",
            sent_at: now.toISOString(),
            expire_at: expire.toISOString()
          });
        }
      }

      // 2. 7日目の最終決戦ギルド順位に基づく報酬配布 (覇者、準覇者など)
      const { data: finalMatches } = await supabase
        .from("gvg_matches")
        .select("*")
        .eq("is_finals", true)
        .eq("round", 3);

      if (finalMatches && finalMatches.length > 0) {
        const winnerGuildId = finalMatches[0].guild_a_points > finalMatches[0].guild_b_points ? finalMatches[0].guild_a_id : finalMatches[0].guild_b_id;
        const runnerupGuildId = finalMatches[0].guild_a_points > finalMatches[0].guild_b_points ? finalMatches[0].guild_b_id : finalMatches[0].guild_a_id;
        
        const { data: g1 } = await supabase.from("guilds").select("*").eq("id", winnerGuildId).single();
        if (g1) {
          const decs = g1.unlocked_decorations || [];
          if (!decs.includes("bg_finals_winner")) decs.push("bg_finals_winner");
          await supabase.from("guilds").update({
            funds: Number(g1.funds || 0) + 500000,
            unlocked_decorations: decs
          }).eq("id", winnerGuildId);
        }

        const { data: g2 } = await supabase.from("guilds").select("*").eq("id", runnerupGuildId).single();
        if (g2) {
          const decs = g2.unlocked_decorations || [];
          if (!decs.includes("bg_finals_runnerup")) decs.push("bg_finals_runnerup");
          await supabase.from("guilds").update({
            funds: Number(g2.funds || 0) + 300000,
            unlocked_decorations: decs
          }).eq("id", runnerupGuildId);
        }

        if (finalMatches[1]) {
          const thirdGuildId = finalMatches[1].guild_a_points > finalMatches[1].guild_b_points ? finalMatches[1].guild_a_id : finalMatches[1].guild_b_id;
          const fourthGuildId = finalMatches[1].guild_a_points > finalMatches[1].guild_b_points ? finalMatches[1].guild_b_id : finalMatches[1].guild_a_id;

          const { data: g3 } = await supabase.from("guilds").select("*").eq("id", thirdGuildId).single();
          if (g3) await supabase.from("guilds").update({ funds: Number(g3.funds || 0) + 100000 }).eq("id", thirdGuildId);

          const { data: g4 } = await supabase.from("guilds").select("*").eq("id", fourthGuildId).single();
          if (g4) await supabase.from("guilds").update({ funds: Number(g4.funds || 0) + 100000 }).eq("id", fourthGuildId);
        }
      }

      // 3. シーズンリセット処理の実行
      await supabase.from("user_gvg_ranks").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

      await supabase.from("guild_base_controls").update({
        daily_points: 0,
        total_seasonal_days: 0,
        is_controlling: false
      }).neq("base_id", "");

      await supabase.from("gvg_season_status").update({ current_day: 1 }).eq("id", 1);
      setGvgSeasonDay(1);

      await syncBootstrapData(session.user.id);
      alert("【GvG抗争 シーズンリセット完了】\n\nシーズン個人ランキングの最終順位に応じてダイヤ報酬を全員に配布しました。\n決戦進出ギルドへ最終順位報酬（ギルド資金、特別装飾背景）を付与しました。\n全ての累積支配日数・個人ポイントをリセットし、シーズン1日目へ移行しました。");
    } catch (err: any) {
      console.warn("GvG season reset failed:", err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePvpSeasonReset = async () => {
    if (!session) return;
    setPvpSeasonLoading(true);
    playCyberSe("click");
    try {
      // 1. pvp_rewards_master から該当する報酬を取得
      const { data: rewards, error: rewardErr } = await supabase
        .from("pvp_rewards_master")
        .select("*")
        .order("threshold_points", { ascending: false });

      if (rewardErr) throw rewardErr;

      let rewardQuantity = 50; // 最低保障
      let rewardItemId = "DIAMOND";

      if (rewards && rewards.length > 0) {
        const matched = rewards.find((r: any) => pvpPoints >= r.threshold_points);
        if (matched) {
          rewardQuantity = matched.reward_quantity;
          rewardItemId = matched.reward_item_id;
        }
      }

      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await supabase.from("presents").insert({
        user_id: session.user.id,
        item_id: rewardItemId,
        quantity: rewardQuantity,
        message: `PvP最終シーズン報酬 (到達レート: ${pvpPoints} pt)`,
        expire_at: expireAt.toISOString(),
        status: "UNCLAIMED"
      });

      // 2. ランクポイントと勝利数のリセット (NPCは除外)
      await supabase.from("pvp_ranks")
        .update({ rank_points: 1000, daily_wins: 0, season_wins: 0 })
        .neq("user_id", "00000000-0000-0000-0000-000000000099");

      await syncBootstrapData(session.user.id);
      alert("PvPシーズン終了。報酬転送完了。");
    } catch (err: any) {
      console.warn("Failed to reset PvP season:", err.message);
      setErrorMessage("シーズンリセット処理に失敗しました。");
    } finally {
      setPvpSeasonLoading(false);
    }
  };

  const handleRaidBossDefeat = async () => {
    if (!session) return;
    setRaidDefeatLoading(true);
    playCyberSe("click");
    try {
      // 1. ボスマスターと報酬マスターを取得
      const { data: masterData } = await supabase.from("raid_boss_master").select("*").eq("id", "BOSS_001").maybeSingle();
      const maxHp = masterData ? Number(masterData.max_hp) : 9999999;

      // 2. 討伐報酬の配布 (報酬マスタのDEFEATしきい値とダメージログを比較)
      const { data: rewardList } = await supabase.from("raid_rewards_master").select("*").eq("reward_type", "DEFEAT");
      const { data: dmgLogs } = await supabase.from("raid_damage_logs").select("*").eq("raid_boss_id", RAID_BOSS_ID);

      if (rewardList && dmgLogs) {
        // 与ダメのプレイヤー別集計
        const userDmgMap: { [key: string]: number } = {};
        dmgLogs.forEach((log: any) => {
          userDmgMap[log.user_id] = (userDmgMap[log.user_id] || 0) + Number(log.damage_dealt);
        });

        // 報酬配布
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        for (const [userId, totalDmg] of Object.entries(userDmgMap)) {
          for (const reward of rewardList) {
            if (totalDmg >= Number(reward.threshold_val)) {
              await supabase.from("presents").insert({
                user_id: userId,
                item_id: reward.reward_item_id,
                quantity: reward.reward_quantity,
                message: `レイドボス討伐貢献報酬 (累計ダメージ: ${totalDmg.toLocaleString()})`,
                expire_at: expireAt,
                status: "UNCLAIMED"
              });
            }
          }
        }
      }

      // 3. ランダムな出現拠点の選定
      const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
      const randomBase = bases[Math.floor(Math.random() * bases.length)];

      // 4. ボスの全快とランダム再配置、ダメージログの削除
      await supabase.from("raid_bosses").update({
        current_hp: maxHp,
        base_id: randomBase,
        status: "ACTIVE",
        spawned_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }).eq("id", RAID_BOSS_ID);

      await supabase.from("raid_damage_logs").delete().eq("raid_boss_id", RAID_BOSS_ID);
      await supabase.from("user_raid_claimed_rewards").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

      await syncBootstrapData(session.user.id);
      alert("レイドボス撃破完了。報酬配布 ＆ ボスランダム再配置完了。");
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setRaidDefeatLoading(false);
    }
  };

  const handleRaidSeasonReset = async () => {
    if (!session) return;
    setRaidDefeatLoading(true);
    playCyberSe("click");

    try {
      const { data: masterData } = await supabase.from("raid_boss_master").select("*").eq("id", "BOSS_001").maybeSingle();
      const maxHp = masterData ? Number(masterData.max_hp) : 9999999;

      // 1. シーズン報酬（個人/ギルドランキング）の集計・配布
      const { data: rewardList } = await supabase.from("raid_rewards_master").select("*");
      const { data: allLogs } = await supabase.from("raid_damage_logs").select("*, users(username), guilds(name)");

      if (rewardList && allLogs) {
        const personalRewards = rewardList.filter((r: any) => r.reward_type === "RANK_PERSONAL");
        const guildRewards = rewardList.filter((r: any) => r.reward_type === "RANK_GUILD");
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // 個人ランキングの集計
        const userDmgMap: { [key: string]: { name: string; dmg: number } } = {};
        allLogs.forEach((log: any) => {
          const uId = log.user_id;
          if (!userDmgMap[uId]) userDmgMap[uId] = { name: log.users?.username || "プレイヤー名", dmg: 0 };
          userDmgMap[uId].dmg += Number(log.damage_dealt);
        });
        const personalRank = Object.entries(userDmgMap)
          .map(([id, val]) => ({ user_id: id, ...val }))
          .sort((a, b) => b.dmg - a.dmg);

        // 個人ランキング報酬の配布
        for (let idx = 0; idx < personalRank.length; idx++) {
          const rank = idx + 1;
          const record = personalRank[idx];
          const applicable = personalRewards
            .filter((r: any) => rank <= Number(r.threshold_val))
            .sort((a, b) => Number(a.threshold_val) - Number(b.threshold_val))[0];

          if (applicable) {
            await supabase.from("presents").insert({
              user_id: record.user_id,
              item_id: applicable.reward_item_id,
              quantity: applicable.reward_quantity,
              message: `レイド個人ランキング第${rank}位報酬`,
              expire_at: expireAt,
              status: "UNCLAIMED"
            });
          }
        }

        // ギルドランキングの集計
        const guildDmgMap: { [key: string]: { name: string; dmg: number } } = {};
        allLogs.forEach((log: any) => {
          const gId = log.guild_id;
          if (gId && log.guilds?.name) {
            if (!guildDmgMap[gId]) guildDmgMap[gId] = { name: log.guilds.name, dmg: 0 };
            guildDmgMap[gId].dmg += Number(log.damage_dealt);
          }
        });
        const guildRank = Object.entries(guildDmgMap)
          .map(([id, val]) => ({ guild_id: id, ...val }))
          .sort((a, b) => b.dmg - a.dmg);

        // ギルドランキング報酬の配布 (該当ギルドのメンバー全員)
        const { data: allGuildMembers } = await supabase.from("guild_members").select("user_id, guild_id");
        for (let idx = 0; idx < guildRank.length; idx++) {
          const rank = idx + 1;
          const gRecord = guildRank[idx];
          const applicable = guildRewards
            .filter((r: any) => rank <= Number(r.threshold_val))
            .sort((a, b) => Number(a.threshold_val) - Number(b.threshold_val))[0];

          if (applicable && allGuildMembers) {
            const members = allGuildMembers.filter((m: any) => m.guild_id === gRecord.guild_id);
            for (const m of members) {
              await supabase.from("presents").insert({
                user_id: m.user_id,
                item_id: applicable.reward_item_id,
                quantity: applicable.reward_quantity,
                message: `レイド組織ランキング第${rank}位報酬 [${gRecord.name}]`,
                expire_at: expireAt,
                status: "UNCLAIMED"
              });
            }
          }
        }
      }

      // 2. 拠点のランダム再決定
      const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
      const randomBase = bases[Math.floor(Math.random() * bases.length)];

      // 3. ボスHP全快、ログ削除
      await supabase.from("raid_bosses").update({
        current_hp: maxHp,
        base_id: randomBase,
        status: "ACTIVE",
        spawned_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }).eq("id", RAID_BOSS_ID);

      await supabase.from("raid_damage_logs").delete().eq("raid_boss_id", RAID_BOSS_ID);
      await supabase.from("user_raid_claimed_rewards").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

      await syncBootstrapData(session.user.id);
      alert("【レイド シーズンリセット完了】\n\n個人・組織ランキング順位報酬をプレゼントBOXに配布しました。\nボスは全快し、ランダムな拠点へ再出現しました。");
    } catch (err: any) {
      console.warn("Raid season reset failed:", err.message);
    } finally {
      setRaidDefeatLoading(false);
    }
  };

  const handleUseItem = async (itemId: string) => {
    if (!session) return;
    
    if (itemId === "ENERGY_DRINK") {
      if (vitality >= 100) {
        alert("スタミナが100以上の場合はエナジードリンクを使用できません。");
        return;
      }
      
      const prevQuantity = energyDrinks;
      const prevVitality = vitality;
      const nextVitality = prevVitality + 50;
      
      setEnergyDrinks(prev => Math.max(0, prev - 1));
      setVitality(nextVitality);
      
      try {
        await supabase.from("user_items").update({ quantity: prevQuantity - 1 }).eq("user_id", session.user.id).eq("item_id", "ENERGY_DRINK");
        await supabase.from("users").update({ vitality: nextVitality }).eq("id", session.user.id);
        await syncBootstrapData(session.user.id);
        alert(`エナジードリンクを使用しました。スタミナが 50 回復しました！ (${prevVitality} => ${nextVitality})`);
      } catch (err: any) {
        setEnergyDrinks(prevQuantity);
        setVitality(prevVitality);
        alert("使用に失敗しました: " + err.message);
      }
    } else {
      alert("このアイテムは強化・限界突破画面で使用してください。");
    }
  };

  // ==========================================
  // ⚡ 育成アクション
  // ==========================================
  const handleCharacterLevelUp = async (expItemId: string = "CHAR_EXP_S", count: number = 1) => {
    if (!session || characterLevel >= 100) return;
    if (characterLevel >= 50 && characterAwaken === 0) {
      setErrorMessage("「覚醒の書」で覚醒させてレベル上限を解放してください。");
      return;
    }

    const expValues: { [key: string]: number } = {
      CHAR_EXP_S: 500,
      CHAR_EXP_M: 2000,
      CHAR_EXP_L: 10000
    };
    const expGain = (expValues[expItemId] || 500) * count;

    let userItemQty = 0;
    if (expItemId === "CHAR_EXP_S") userItemQty = charExpS;
    else if (expItemId === "CHAR_EXP_M") userItemQty = charExpM;
    else if (expItemId === "CHAR_EXP_L") userItemQty = charExpL;

    if (userItemQty < count) {
      setErrorMessage("該当する経験の書が不足しています。");
      return;
    }

    const cost = count * 100;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      // 経験値計算（簡略レベルアップ計算）
      const nextLevel = Math.min(100, characterLevel + count);
      await supabase.from("user_characters").update({ level: nextLevel }).eq("user_id", session.user.id).eq("character_id", upgradeSelectedCharId);
      await supabase.from("users").update({ cash: cash - cost }).eq("id", session.user.id);
      await supabase.from("user_items").update({ quantity: userItemQty - count }).eq("user_id", session.user.id).eq("item_id", expItemId);
      await supabase.rpc("evaluate_mission_progress", { p_user_id: session.user.id, p_trigger_type: "CHAR_LEVEL_UP", p_progress_increment: count });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCharacterAwaken = async () => {
    if (!session || characterAwaken >= 5) return;
    if (lawsOfStrife < 1) {
      setErrorMessage("覚醒の書が不足しています。");
      return;
    }
    const awakenMaster = CHARACTER_AWAKENING_MASTER.find(a => a.awakening_level === characterAwaken + 1);
    const cost = awakenMaster ? awakenMaster.required_cash : (characterAwaken + 1) * 3000;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("user_characters").update({ awakening_level: characterAwaken + 1 }).eq("user_id", session.user.id).eq("character_id", upgradeSelectedCharId);
      await supabase.from("users").update({ cash: cash - cost }).eq("id", session.user.id);
      await supabase.from("user_items").update({ quantity: lawsOfStrife - 1 }).eq("user_id", session.user.id).eq("item_id", "LAW_OF_STRIFE");
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipGear = async (gearId: string) => {
    if (!session || activeGearSlot === null) return;
    setUpgradeLoading(true);
    playCyberSe("click");

    const activeChar = userCharactersDbList.find(c => c.character_id === upgradeSelectedCharId);
    if (!activeChar) return;

    try {
      await supabase.from("user_equipments").update({ equipped_character_id: null, slot_index: null }).eq("equipped_character_id", activeChar.id).eq("slot_index", activeGearSlot);
      await supabase.from("user_equipments").update({ equipped_character_id: activeChar.id, slot_index: activeGearSlot }).eq("id", gearId);

      setShowGearModal(false);
      setActiveGearSlot(null);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipGear = async (gearId: string) => {
    if (!session) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("user_equipments").update({ equipped_character_id: null, slot_index: null }).eq("id", gearId);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipSkill = async (skillCardUuid: string) => {
    if (!session || activeSkillSlot === null) return;
    setUpgradeLoading(true);
    playCyberSe("click");

    const activeChar = userCharactersDbList.find(c => c.character_id === upgradeSelectedCharId);
    if (!activeChar) return;

    try {
      await supabase.from("user_skills").update({ equipped_character_id: null, slot_index: null }).eq("equipped_character_id", activeChar.id).eq("slot_index", activeSkillSlot);
      await supabase.from("user_skills").update({ equipped_character_id: activeChar.id, slot_index: activeSkillSlot }).eq("id", skillCardUuid);

      setShowSkillModal(false);
      setActiveSkillSlot(null);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleUnequipSkill = async (skillCardUuid: string) => {
    if (!session) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.from("user_skills").update({ equipped_character_id: null, slot_index: null }).eq("id", skillCardUuid);
      setSelectedSkill((prev: any) => {
        if (prev && prev.id === skillCardUuid) {
          return { ...prev, equipped_character_id: null, slot_index: null };
        }
        return prev;
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // 装備一括外し（全身解除）
  const handleUnequipGearBulk = async (characterDbId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.rpc("unequip_gear_bulk", {
        p_user_id: session.user.id,
        p_character_id: characterDbId
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn("Failed unequip_gear_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // おすすめ装備一括装着
  const handleEquipGearBulkRecommended = async (characterDbId: string, masterCharId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const availableGears = userEquipmentsList.filter((e: any) => {
        if (e.equipped_character_id && e.equipped_character_id !== characterDbId) return false;
        const master = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === e.equipment_id);
        if (!master) return false;
        if (master.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== masterCharId) return false;
        return true;
      });

      const slotTypes: ("WEAPON" | "HEAD" | "BODY" | "LEGS" | "ACCESSORY")[] = ["WEAPON", "HEAD", "BODY", "LEGS", "ACCESSORY"];
      const slotIndexesMap: { [key: string]: number[] } = {
        WEAPON: [0],
        HEAD: [1],
        BODY: [2],
        LEGS: [3],
        ACCESSORY: [4, 5, 6]
      };

      const selectedGearUuids: string[] = [];
      const selectedSlotIndexes: number[] = [];

      for (const st of slotTypes) {
        const slots = slotIndexesMap[st];
        const candidates = availableGears.filter((e: any) => {
          const m = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === e.equipment_id);
          return m?.slot_type === st;
        }).sort((a: any, b: any) => {
          const mA = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === a.equipment_id);
          const mB = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === b.equipment_id);
          const rarityScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
          const rDiff = (rarityScore[mB?.rarity || "N"] || 0) - (rarityScore[mA?.rarity || "N"] || 0);
          if (rDiff !== 0) return rDiff;
          const statA = (mA?.atk || 0) + (mA?.def || 0) + (mA?.hp || 0) + (a.plus_val || 0) * 10;
          const statB = (mB?.atk || 0) + (mB?.def || 0) + (mB?.hp || 0) + (b.plus_val || 0) * 10;
          return statB - statA;
        });

        for (let i = 0; i < slots.length; i++) {
          const item = candidates[i];
          if (item) {
            selectedGearUuids.push(item.id);
            selectedSlotIndexes.push(slots[i]);
          }
        }
      }

      if (selectedGearUuids.length > 0) {
        await supabase.rpc("equip_gear_bulk", {
          p_user_id: session.user.id,
          p_character_id: characterDbId,
          p_equipment_uuids: selectedGearUuids,
          p_slot_indexes: selectedSlotIndexes
        });
        await syncBootstrapData(session.user.id);
      }
    } catch (err) {
      console.warn("Failed equip_gear_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // スキル一括外し（全身解除）
  const handleUnequipSkillBulk = async (characterDbId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      await supabase.rpc("unequip_skill_bulk", {
        p_user_id: session.user.id,
        p_character_id: characterDbId
      });
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn("Failed unequip_skill_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // おすすめスキル一括装着
  const handleEquipSkillBulkRecommended = async (characterDbId: string, masterCharId: string) => {
    if (!session || !characterDbId) return;
    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const availableSkills = userSkillsList.filter((s: any) => {
        if (s.equipped_character_id && s.equipped_character_id !== characterDbId) return false;
        const master = SKILLS_MASTER_DATA.find((m: any) => m.id === s.skill_card_id);
        if (!master) return false;
        if (master.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== masterCharId) return false;
        return true;
      }).sort((a: any, b: any) => {
        const mA = SKILLS_MASTER_DATA.find((m: any) => m.id === a.skill_card_id);
        const mB = SKILLS_MASTER_DATA.find((m: any) => m.id === b.skill_card_id);
        const isSynergyA = mA?.exclusive_character_id === masterCharId ? 1 : 0;
        const isSynergyB = mB?.exclusive_character_id === masterCharId ? 1 : 0;
        if (isSynergyB !== isSynergyA) return isSynergyB - isSynergyA;
        const lbDiff = (b.plus_val || 0) - (a.plus_val || 0);
        if (lbDiff !== 0) return lbDiff;
        const rarityScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
        return (rarityScore[mB?.rarity || "N"] || 0) - (rarityScore[mA?.rarity || "N"] || 0);
      });

      const selectedSkillUuids: string[] = [];
      const selectedSlotIndexes: number[] = [];

      const maxSlots = 6;
      for (let i = 0; i < Math.min(availableSkills.length, maxSlots); i++) {
        selectedSkillUuids.push(availableSkills[i].id);
        selectedSlotIndexes.push(i);
      }

      if (selectedSkillUuids.length > 0) {
        await supabase.rpc("equip_skill_bulk", {
          p_user_id: session.user.id,
          p_character_id: characterDbId,
          p_skill_uuids: selectedSkillUuids,
          p_slot_indexes: selectedSlotIndexes
        });
        await syncBootstrapData(session.user.id);
      }
    } catch (err) {
      console.warn("Failed equip_skill_bulk:", err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // 装備一括売却
  const handleSellGearBulk = async (equipmentUuids: string[]) => {
    if (!session || !equipmentUuids || equipmentUuids.length === 0) return;
    setUpgradeLoading(true);
    playCyberSe("gacha");
    try {
      const { error } = await supabase.rpc("sell_gear_bulk", {
        p_user_id: session.user.id,
        p_equipment_ids: equipmentUuids
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        await syncBootstrapData(session.user.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "売却処理に失敗しました。");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipmentLevelUp = async (expItemId: string = "EQUIP_EXP_S", count: number = 1) => {
    if (!session || !selectedEquipment) return;
    if (equipmentLevel >= 50) return;

    let userItemQty = 0;
    if (expItemId === "EQUIP_EXP_S") userItemQty = equipExpS;
    else if (expItemId === "EQUIP_EXP_M") userItemQty = equipExpM;
    else if (expItemId === "EQUIP_EXP_L") userItemQty = equipExpL;

    if (userItemQty < count) {
      setErrorMessage("該当するカスタムオイルが不足しています。");
      return;
    }

    const cost = count * 50;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    setUpgradeLoading(true);
    playCyberSe("click");
    try {
      const nextLevel = Math.min(50, equipmentLevel + count);
      await supabase.from("user_equipments").update({ level: nextLevel }).eq("id", selectedEquipment.id);
      await supabase.from("users").update({ cash: cash - cost }).eq("id", session.user.id);
      await supabase.from("user_items").update({ quantity: userItemQty - count }).eq("user_id", session.user.id).eq("item_id", expItemId);
      await syncBootstrapData(session.user.id);
    } catch (err) {
      console.warn(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleEquipmentLimitBreak = async (useWildcard: boolean = false) => {
    if (!session || !selectedEquipment) return;
    if (equipmentLimitBreak >= 10) return;

    const cost = (equipmentLimitBreak + 1) * 1000;
    if (cash < cost) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    if (useWildcard) {
      if (equipLbHammers < 1) {
        setErrorMessage("代用素材「万能カスタムツール [装備]」が不足しています。");
        return;
      }
    } else {
      const dupes = userEquipmentsList.filter(e => e.id !== selectedEquipment.id && e.equipment_id === selectedEquipment.equipment_id && e.equipped_character_id === null);
      if (dupes.length < 1) {
        setErrorMessage("同名の予備装備品が見つかりません。「万能カスタムツール [装備]」を代用してください。");
        return;
      }
    }

    setUpgradeLoading(true);
    playCyberSe("gacha");
    const nextLb = equipmentLimitBreak + 1;
    const updatedOptions = subOptions.map((opt, idx) => {
      if (nextLb >= 3 && idx === 1) return { ...opt, unlocked: true };
      if (nextLb >= 5 && idx === 2) return { ...opt, unlocked: true };
      if (nextLb >= 10 && idx === 3) return { ...opt, unlocked: true };
      return opt;
    });

    try {
      if (useWildcard) {
        await supabase.from("user_items").update({ quantity: equipLbHammers - 1 }).eq("user_id", session.user.id).eq("item_id", "EQUIP_LB_HAMMER");
      } else {
        const dupes = userEquipmentsList.filter(e => e.id !== selectedEquipment.id && e.equipment_id === selectedEquipment.equipment_id && e.equipped_character_id === null);
        const targetDupe = dupes[0];
        if (targetDupe) {
          await supabase.from("user_equipments").delete().eq("id", targetDupe.id);
        }
      }

      await supabase.from("user_equipments").update({ plus_val: nextLb, random_options: updatedOptions }).eq("id", selectedEquipment.id);
      await supabase.from("users").update({ cash: cash - cost }).eq("id", session.user.id);
      await syncBootstrapData(session.user.id);
      alert(`限界突破完了！ (+${nextLb})`);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSkillUpgrade = async (useWildcard: boolean = false) => {
    if (!session || !selectedSkill) return;
    if (selectedSkill.plus_val >= 10) {
      setErrorMessage("これ以上限界突破できません。");
      return;
    }

    const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === selectedSkill.skill_card_id);
    if (!skillMaster) return;

    const isExclusive = !!skillMaster.is_exclusive;
    const required_item_id = isExclusive ? "EXCLUSIVE_CONTRACT" : "SKILL_LB_BOOK";
    const required_cash = (selectedSkill.plus_val + 1) * 1000;

    if (cash < required_cash) {
      setErrorMessage("キャッシュ不足です。");
      return;
    }

    if (useWildcard) {
      let wildcardQty = isExclusive ? exclusiveContracts : skillLbBooks;
      if (wildcardQty < 1) {
        setErrorMessage(`代用素材「${isExclusive ? "限界突破の書 [専用スキル]" : "限界突破の書 [スキル]"}」が不足しています。`);
        return;
      }
    } else {
      const dupes = userSkillsList.filter(s => s.id !== selectedSkill.id && s.skill_card_id === selectedSkill.skill_card_id && s.equipped_character_id === null);
      if (dupes.length < 1) {
        setErrorMessage(`同名の予備スキルカードが見つかりません。「${isExclusive ? "限界突破の書 [専用スキル]" : "限界突破の書 [スキル]"}」を代用してください。`);
        return;
      }
    }

    setUpgradeLoading(true);
    playCyberSe("click");

    try {
      if (useWildcard) {
        let currentQty = isExclusive ? exclusiveContracts : skillLbBooks;
        await supabase
          .from("user_items")
          .upsert({ user_id: session.user.id, item_id: required_item_id, quantity: Math.max(0, currentQty - 1) });
      } else {
        const dupes = userSkillsList.filter(s => s.id !== selectedSkill.id && s.skill_card_id === selectedSkill.skill_card_id && s.equipped_character_id === null);
        const targetDupe = dupes[0];
        if (targetDupe) {
          await supabase.from("user_skills").delete().eq("id", targetDupe.id);
        }
      }

      // キャッシュの消費
      const nextCash = cash - required_cash;
      await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);
      setCash(nextCash);

      // 限界突破
      const nextLb = selectedSkill.plus_val + 1;
      await supabase
        .from("user_skills")
        .update({ plus_val: nextLb })
        .eq("id", selectedSkill.id);

      await syncBootstrapData(session.user.id);
      setSelectedSkill((prev: any) => prev ? { ...prev, plus_val: nextLb } : null);
      alert(`スキルカードの限界突破完了！ (+${nextLb})`);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleScout = async (
    scoutType: string,
    scoutCount: number,
    useCurrency: "CASH" | "DIAMOND" | "FREE"
  ) => {
    if (!session) return;

    setUpgradeLoading(true);
    playCyberSe("click");

    let category: "CHARACTER" | "SKILL" | "EQUIPMENT" = "CHARACTER";
    if (scoutType.includes("SKILL")) category = "SKILL";
    else if (scoutType.includes("EQUIP")) category = "EQUIPMENT";

    const isNormal = scoutType.endsWith("_NORMAL");
    const isSpecial = scoutType.endsWith("_SPECIAL");
    const isLimit = scoutType.startsWith("LIMIT_");

    try {
      // 1. コスト判定 ＆ 残高/無料フラグチェック
      if (useCurrency === "FREE") {
        if (!dailyFreeGachaFlags[category]) {
          setErrorMessage("本日の無料10連ガチャは使用済みです。");
          setUpgradeLoading(false);
          return;
        }
      } else if (useCurrency === "DIAMOND") {
        let reqDia = 100;
        if (isNormal) reqDia = scoutCount === 10 ? 1000 : 100;
        else if (isSpecial) reqDia = scoutCount === 10 ? 3000 : 300;
        else if (isLimit) reqDia = scoutCount === 10 ? 400 : 40;

        if (diamonds < reqDia) {
          setErrorMessage("ダイヤが不足しています。ショップに遷移します。");
          setActiveTab("shop");
          setUpgradeLoading(false);
          return;
        }
        const nextDiamonds = diamonds - reqDia;
        await supabase.from("users").update({ neon_diamonds: nextDiamonds }).eq("id", session.user.id);
        setDiamonds(nextDiamonds);
      } else {
        // CASH
        let reqCash = 1000;
        if (isNormal) reqCash = scoutCount === 10 ? 10000 : 1000;
        else if (isSpecial) reqCash = scoutCount === 10 ? 30000 : 3000;
        else if (isLimit) reqCash = scoutCount === 10 ? 120000 : 12000;

        if (cash < reqCash) {
          setErrorMessage("キャッシュが不足しています。ショップに遷移します。");
          setActiveTab("shop");
          setUpgradeLoading(false);
          return;
        }
        const nextCash = cash - reqCash;
        await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);
        setCash(nextCash);
      }

      // 無料利用の更新
      if (useCurrency === "FREE") {
        const todayStr = new Date().toISOString().split("T")[0];
        await supabase.from("user_daily_gacha_claims").upsert({
          user_id: session.user.id,
          gacha_type: category,
          last_claimed_date: todayStr,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,gacha_type" });
        setDailyFreeGachaFlags(prev => ({ ...prev, [category]: false }));
      }

      // スペシャルガチャ天井Pt加算
      if (isSpecial) {
        const nextPts = specialPityPoints + scoutCount;
        setSpecialPityPoints(nextPts);
        await supabase.from("user_gacha_pity_points").upsert({
          user_id: session.user.id,
          pity_master_id: "pity_special_common",
          current_points: nextPts,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,pity_master_id" });
      }

      // 2. 抽選・排出処理
      const results: any[] = [];
      let highestRarity: "BLUE" | "PURPLE" | "GOLD" = "BLUE";

      if (category === "CHARACTER") {
        const localUserCharList = [...userCharactersDbList];
        let isFirstCharAllocated = localUserCharList.length > 0;

        let pool = gachaItemsMaster.filter((item: any) => item.gacha_id === scoutType);
        if (pool.length === 0) {
          pool = gachaItemsMaster.filter((item: any) => item.gacha_id === "CHAR_SPECIAL");
        }
        const totalWeight = pool.reduce((sum: number, item: any) => sum + item.weight, 0) || 100;

        for (let i = 0; i < scoutCount; i++) {
          let randVal = Math.random() * totalWeight;
          let selectedItem = pool[0];
          for (const item of pool) {
            randVal -= item.weight;
            if (randVal <= 0) {
              selectedItem = item;
              break;
            }
          }

          const selectedChar = CHARACTERS_MASTER.find(c => c.id === selectedItem?.item_id) || CHARACTERS_MASTER[0];
          const existCharIdx = localUserCharList.findIndex(c => c.character_id === selectedChar.id);

          if (existCharIdx !== -1) {
            const existChar = localUserCharList[existCharIdx];
            if (existChar.awakening_level >= 5) {
              const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "LAW_OF_STRIFE").maybeSingle();
              await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "LAW_OF_STRIFE", quantity: (itemData?.quantity || 0) + 1 });
              results.push({ type: "CHARACTER", name: selectedChar.jpName, rarity: selectedChar.rarity || "SSR", converted: true, convertReward: "抗争の掟 x1" });
            } else {
              const newAwake = (existChar.awakening_level || 0) + 1;
              await supabase.from("user_characters").update({ awakening_level: newAwake }).eq("id", existChar.id);
              localUserCharList[existCharIdx].awakening_level = newAwake;
              results.push({ type: "CHARACTER", name: selectedChar.jpName, rarity: selectedChar.rarity || "SSR", converted: false, convertReward: "覚醒段階+1" });
            }
          } else {
            const { data: insertData } = await supabase.from("user_characters").insert({
              user_id: session.user.id,
              character_id: selectedChar.id,
              level: 1,
              awakening_level: 0
            }).select().single();

            const newCharRec = insertData || { id: `c_${selectedChar.id}`, user_id: session.user.id, character_id: selectedChar.id, level: 1, awakening_level: 0 };
            localUserCharList.push(newCharRec);
            results.push({ type: "CHARACTER", name: selectedChar.jpName, rarity: selectedChar.rarity || "SSR", converted: false, convertReward: "新規獲得" });

            if (!isFirstCharAllocated) {
              await supabase.from("users").update({ favorite_character_id: selectedChar.id }).eq("id", session.user.id);
              const skillId = selectedChar.id === "11111111-1111-1111-1111-111111111111" ? "SKILL_037" : selectedChar.id === "33333333-3333-3333-3333-333333333333" ? "SKILL_039" : "SKILL_038";
              await supabase.from("user_skills").insert({
                user_id: session.user.id,
                skill_card_id: skillId,
                plus_val: 0,
                slot_index: 0,
                equipped_character_id: newCharRec.id
              });

              const starterGears = [
                { equipment_id: "WEAPON_001", slot_index: 0 },
                { equipment_id: "HEAD_001", slot_index: 2 },
                { equipment_id: "BODY_001", slot_index: 3 },
                { equipment_id: "LEGS_001", slot_index: 4 },
                { equipment_id: "ACCESSORY_001", slot_index: 5 }
              ];
              for (const gear of starterGears) {
                await supabase.from("user_equipments").insert({
                  user_id: session.user.id,
                  equipment_id: gear.equipment_id,
                  level: 1,
                  plus_val: 0,
                  equipped_character_id: newCharRec.id,
                  slot_index: gear.slot_index,
                  random_options: [
                    { name: "クリティカル率", val: "+5%", unlocked: true },
                    { name: "命中率", val: "+8%", unlocked: false },
                    { name: "回避率", val: "+6%", unlocked: false },
                    { name: "防御貫通力", val: "+12%", unlocked: false }
                  ]
                });
              }
              isFirstCharAllocated = true;
            }
          }
          if (selectedChar.rarity === "SSR") highestRarity = "GOLD";
          else if (selectedChar.rarity === "SR" && highestRarity !== "GOLD") highestRarity = "PURPLE";
        }
      } else if (category === "SKILL") {
        for (let i = 0; i < scoutCount; i++) {
          const rand = Math.random();
          let targetRarity = "R";
          if (isNormal) {
            if (rand < 0.10) targetRarity = "SR";
            else if (rand < 0.50) targetRarity = "R";
            else targetRarity = "N";
          } else {
            if (rand < 0.05) targetRarity = "SSR";
            else if (rand < 0.40) targetRarity = "SR";
            else targetRarity = "R";
          }

          let pool = SKILLS_MASTER_DATA.filter(s => s.rarity === targetRarity);
          if (pool.length === 0) pool = SKILLS_MASTER_DATA;
          const selected = pool[Math.floor(Math.random() * pool.length)];

          const existSkill = userSkillsList.find(s => s.skill_card_id === selected.id);
          if (existSkill) {
            if (existSkill.plus_val >= 10) {
              const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "TRAINING_MANUAL").maybeSingle();
              await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "TRAINING_MANUAL", quantity: (itemData?.quantity || 0) + 2 });
              results.push({ type: "SKILL", name: selected.name, rarity: selected.rarity, converted: true, convertReward: "指南書 x2" });
            } else {
              await supabase.from("user_skills").update({ plus_val: existSkill.plus_val + 1 }).eq("id", existSkill.id);
              results.push({ type: "SKILL", name: selected.name, rarity: selected.rarity, converted: false, convertReward: "限界突破+1" });
            }
          } else {
            await supabase.from("user_skills").insert({ user_id: session.user.id, skill_card_id: selected.id, plus_val: 0 });
            results.push({ type: "SKILL", name: selected.name, rarity: selected.rarity, converted: false, convertReward: "新規獲得" });
          }

          if (selected.rarity === "SSR") highestRarity = "GOLD";
          else if (selected.rarity === "SR" && highestRarity !== "GOLD") highestRarity = "PURPLE";
        }
      } else {
        // EQUIPMENT
        for (let i = 0; i < scoutCount; i++) {
          const rand = Math.random();
          let targetRarity = "R";
          if (isNormal) {
            if (rand < 0.10) targetRarity = "SR";
            else if (rand < 0.50) targetRarity = "R";
            else targetRarity = "N";
          } else {
            if (rand < 0.05) targetRarity = "SSR";
            else if (rand < 0.40) targetRarity = "SR";
            else targetRarity = "R";
          }

          let pool = EQUIPMENTS_MASTER_DATA.filter(e => e.rarity === targetRarity);
          if (pool.length === 0) pool = EQUIPMENTS_MASTER_DATA;
          const selected = pool[Math.floor(Math.random() * pool.length)];

          await supabase.from("user_equipments").insert({
            user_id: session.user.id,
            equipment_id: selected.id,
            level: 1,
            plus_val: 0,
            random_options: [
              { name: "クリティカル率", val: "+5%", unlocked: true },
              { name: "命中率", val: "+8%", unlocked: false },
              { name: "回避率", val: "+6%", unlocked: false },
              { name: "防御貫通力", val: "+12%", unlocked: false }
            ]
          });

          results.push({ type: "EQUIPMENT", name: selected.name, rarity: selected.rarity, converted: false, convertReward: "新規獲得" });

          if (selected.rarity === "SSR") highestRarity = "GOLD";
          else if (selected.rarity === "SR" && highestRarity !== "GOLD") highestRarity = "PURPLE";
        }
      }

      await syncBootstrapData(session.user.id);

      setScoutResults(results);
      setScoutFlashingColor(highestRarity);
      setScoutAnimationState("FLASHING");
      playCyberSe("gacha");

      setTimeout(() => {
        setScoutAnimationState("SHOW_RESULTS");
      }, 1800);

    } catch (err: any) {
      console.warn("Gacha execution error:", err.message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleExchangePityReward = async (rewardType: "CHARACTER" | "SKILL" | "EQUIPMENT", rewardId: string) => {
    if (!session) return;
    if (specialPityPoints < 200) {
      setErrorMessage("天井Ptが不足しています（200Pt必要）。");
      return;
    }

    setUpgradeLoading(true);
    try {
      const nextPts = specialPityPoints - 200;
      await supabase.from("user_gacha_pity_points").upsert({
        user_id: session.user.id,
        pity_master_id: "pity_special_common",
        current_points: nextPts,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,pity_master_id" });
      setSpecialPityPoints(nextPts);

      if (rewardType === "CHARACTER") {
        const charMaster = CHARACTERS_MASTER.find(c => c.id === rewardId) || CHARACTERS_MASTER[0];
        const existChar = userCharactersDbList.find(c => c.character_id === rewardId);
        if (existChar) {
          if (existChar.awakening_level >= 5) {
            const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "LAW_OF_STRIFE").maybeSingle();
            await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "LAW_OF_STRIFE", quantity: (itemData?.quantity || 0) + 1 });
            setErrorMessage(`【天井交換】${charMaster.jpName}を交換！（所持上限につき「抗争の掟 x1」へ変換）`);
          } else {
            const newAwake = (existChar.awakening_level || 0) + 1;
            await supabase.from("user_characters").update({ awakening_level: newAwake }).eq("id", existChar.id);
            setErrorMessage(`【天井交換】${charMaster.jpName}を覚醒段階+${newAwake}に強化しました！`);
          }
        } else {
          await supabase.from("user_characters").insert({
            user_id: session.user.id,
            character_id: rewardId,
            level: 1,
            awakening_level: 0
          });
          setErrorMessage(`【天井交換】${charMaster.jpName}を獲得しました！`);
        }
      } else if (rewardType === "SKILL") {
        const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === rewardId) || SKILLS_MASTER_DATA[0];
        const existSkill = userSkillsList.find(s => s.skill_card_id === rewardId);
        if (existSkill) {
          if (existSkill.plus_val >= 10) {
            const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "TRAINING_MANUAL").maybeSingle();
            await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "TRAINING_MANUAL", quantity: (itemData?.quantity || 0) + 2 });
            setErrorMessage(`【天井交換】${skillMaster.name}を交換！（「指南書 x2」へ変換）`);
          } else {
            await supabase.from("user_skills").update({ plus_val: existSkill.plus_val + 1 }).eq("id", existSkill.id);
            setErrorMessage(`【天井交換】${skillMaster.name}を限界突破+${existSkill.plus_val + 1}に強化しました！`);
          }
        } else {
          await supabase.from("user_skills").insert({ user_id: session.user.id, skill_card_id: rewardId, plus_val: 0 });
          setErrorMessage(`【天井交換】${skillMaster.name}を獲得しました！`);
        }
      } else {
        const equipMaster = EQUIPMENTS_MASTER_DATA.find(e => e.id === rewardId) || EQUIPMENTS_MASTER_DATA[0];
        await supabase.from("user_equipments").insert({
          user_id: session.user.id,
          equipment_id: rewardId,
          level: 1,
          plus_val: 0,
          random_options: [
            { name: "クリティカル率", val: "+5%", unlocked: true },
            { name: "命中率", val: "+8%", unlocked: false },
            { name: "回避率", val: "+6%", unlocked: false },
            { name: "防御貫通力", val: "+12%", unlocked: false }
          ]
        });
        setErrorMessage(`【天井交換】${equipMaster.name}を獲得しました！`);
      }

      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.error("Exchange pity error:", err);
      setErrorMessage("天井交換に失敗しました。");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleBuyNormalProduct = async (productId: string, currencyType: "CASH" | "DIAMOND"): Promise<boolean> => {
    if (!session) return false;
    const product = SHOP_PRODUCTS_MASTER.find(p => p.id === productId);
    if (!product) return false;

    setUpgradeLoading(true);
    playCyberSe("click");

    const price = currencyType === "CASH" ? (product.priceCash || 0) : (product.priceDiamond || 0);

    if (currencyType === "CASH" && cash < price) {
      setErrorMessage("キャッシュが不足しています。");
      setUpgradeLoading(false);
      return false;
    }
    if (currencyType === "DIAMOND" && diamonds < price) {
      setErrorMessage("ダイヤが不足しています。");
      setUpgradeLoading(false);
      return false;
    }

    try {
      const { data: rpcRes, error } = await supabase.rpc("buy_normal_shop_product", {
        p_user_id: session.user.id,
        p_product_id: product.id,
        p_currency_type: currencyType,
        p_price: price,
        p_items: product.items,
        p_product_title: product.title
      });

      if (error) {
        console.warn("buy_normal_shop_product rpc error, fallback execution:", error);
        if (currencyType === "CASH") {
          const nextCash = cash - price;
          await supabase.from("users").update({ cash: nextCash }).eq("id", session.user.id);
          setCash(nextCash);
        } else {
          const nextDia = diamonds - price;
          await supabase.from("users").update({ neon_diamonds: nextDia }).eq("id", session.user.id);
          setDiamonds(nextDia);
        }

        const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const insertPresents = product.items.map(it => ({
          user_id: session.user.id,
          item_id: it.itemId,
          quantity: it.quantity,
          message: `ショップ購入: ${product.title}`,
          status: "UNCLAIMED",
          expire_at: expireAt
        }));
        await supabase.from("presents").insert(insertPresents);

        await supabase.from("user_shop_purchases").upsert({
          user_id: session.user.id,
          product_id: product.id,
          purchase_count: (userShopPurchases[product.id] || 0) + 1,
          last_purchased_at: new Date().toISOString()
        });
      }

      setBoughtResultModal({
        productTitle: product.title,
        items: product.items,
        message: `${product.title} を購入しました！獲得アイテムはプレゼントBOXに送られました。`
      });

      playCyberSe("gacha");
      await syncBootstrapData(session.user.id);
      return true;
    } catch (err: any) {
      console.error("handleBuyNormalProduct error:", err);
      setErrorMessage("購入処理中にエラーが発生しました。");
      return false;
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleBuyStripeProduct = async (productId: string, isSimulatedDuplicate: boolean = false): Promise<boolean> => {
    if (!session) return false;
    const product = SHOP_PRODUCTS_MASTER.find(p => p.id === productId);
    if (!product) return false;

    setProfileLoading(true);
    playCyberSe("click");

    const sessionId = isSimulatedDuplicate
      ? lastPaymentSessionId
      : `stripe_session_${Math.floor(Math.random() * 899999) + 100000}`;

    if (!sessionId) {
      setErrorMessage("前回のセッションが見つかりません。新規購入を行ってください。");
      setProfileLoading(false);
      return false;
    }

    try {
      const isBeginner = product.category === "BEGINNER";
      const purchaseLimit = product.purchaseLimit || 0;

      const { data: rpcRes, error } = await supabase.rpc("process_stripe_shop_purchase", {
        p_user_id: session.user.id,
        p_stripe_session_id: sessionId,
        p_product_id: product.id,
        p_amount_jpy: product.priceJpy || 0,
        p_items: product.items,
        p_product_title: product.title,
        p_is_beginner: isBeginner,
        p_purchase_limit: purchaseLimit
      });

      if (error) {
        console.warn("process_stripe_shop_purchase RPC error, fallback execution:", error);
        const { data: existTx } = await supabase
          .from("payment_transactions")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .limit(1);

        if (existTx && existTx.length > 0) {
          alert("【Stripe Webhook 冪等性競合検知】 重複トランザクションを安全に無視しました。");
          setProfileLoading(false);
          return false;
        }

        await supabase.from("payment_transactions").insert({
          user_id: session.user.id,
          stripe_session_id: sessionId,
          amount: product.priceJpy || 0,
          currency: "jpy",
          diamonds_added: 0,
          status: "COMPLETED"
        });

        const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const insertPresents = product.items.map(it => ({
          user_id: session.user.id,
          item_id: it.itemId,
          quantity: it.quantity,
          message: `購入特典: ${product.title}`,
          status: "UNCLAIMED",
          expire_at: expireAt
        }));
        await supabase.from("presents").insert(insertPresents);

        await supabase.from("user_shop_purchases").upsert({
          user_id: session.user.id,
          product_id: product.id,
          purchase_count: (userShopPurchases[product.id] || 0) + 1,
          last_purchased_at: new Date().toISOString()
        });
      } else if (rpcRes && rpcRes.duplicate) {
        alert("【Stripe Webhook 冪等性競合検知】 重複トランザクションを安全に無視しました。");
        setProfileLoading(false);
        return false;
      }

      setLastPaymentSessionId(sessionId);

      setBoughtResultModal({
        productTitle: product.title,
        items: product.items,
        message: `${product.title} の購入が完了しました！獲得アイテムはプレゼントBOXに送付されました。`
      });

      playCyberSe("gacha");
      await syncBootstrapData(session.user.id);
      return true;
    } catch (err: any) {
      console.error("handleBuyStripeProduct error:", err);
      setErrorMessage("決済処理中にエラーが発生しました。");
      return false;
    } finally {
      setProfileLoading(false);
    }
  };

  const handleBuyPack = async (packId: string) => {
    if (!session) return;
    playCyberSe("gacha");
    
    let cost = 0;
    let success = false;
    let message = "";

    if (packId === "stamina") {
      cost = 20;
      if (diamonds >= cost) {
        setVitality(prev => Math.min(prev + 100, 200));
        await supabase.from("users").update({ vitality: Math.min(vitality + 100, 200) }).eq("id", session.user.id);
        success = true;
        message = "スタミナパックを購入しました！スタミナが100回復しました。";
      }
    } else if (packId === "strife") {
      cost = 50;
      if (diamonds >= cost) {
        setLawsOfStrife(prev => prev + 1);
        const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "LAW_OF_STRIFE").single();
        await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "LAW_OF_STRIFE", quantity: (itemData?.quantity || 0) + 1 });
        success = true;
        message = "抗争覚醒パックを購入しました！抗争の掟+1を獲得しました。";
      }
    } else if (packId === "polish") {
      cost = 15;
      if (diamonds >= cost) {
        setEquipExpM(prev => prev + 5);
        const { data: itemData } = await supabase.from("user_items").select("quantity").eq("user_id", session.user.id).eq("item_id", "EQUIP_EXP_M").single();
        await supabase.from("user_items").upsert({ user_id: session.user.id, item_id: "EQUIP_EXP_M", quantity: (itemData?.quantity || 0) + 5 });
        success = true;
        message = "カスタムオイルパックを購入しました！カスタムオイル[中] +5を獲得しました。";
      }
    } else if (packId === "cash") {
      cost = 30;
      if (diamonds >= cost) {
        setCash(prev => prev + 10000);
        await supabase.from("users").update({ cash: cash + 10000 }).eq("id", session.user.id);
        success = true;
        message = "資金調達パックを購入しました！キャッシュ+10,000を獲得しました。";
      }
    }

    if (success) {
      const nextDiamonds = diamonds - cost;
      await supabase.from("users").update({ neon_diamonds: nextDiamonds }).eq("id", session.user.id);
      setDiamonds(nextDiamonds);
      alert(message);
      await syncBootstrapData(session.user.id);
    } else {
      setErrorMessage("ダイヤが不足しています。");
    }
  };

  const handleSendChat = async () => {
    if (!session || !chatInput.trim() || chatCooldown > 0) return;
    setChatSending(true);
    playCyberSe("click");

    try {
      const targetId = chatChannel === "GUILD" 
        ? (userGuildMember?.guild_id || null) 
        : null;

      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const newPost = {
        id: "temp_" + Date.now(),
        user_id: session.user.id,
        author_name: username,
        author_avatar_url: avatarUrlToSend,
        content: chatInput,
        target_type: chatChannel,
        target_id: targetId,
        is_system: false,
        created_at: new Date().toISOString()
      };
      setGuildChats(prev => [...prev, newPost]);

      await supabase.from("board_posts").insert({
        user_id: session.user.id,
        author_name: username,
        author_avatar_url: avatarUrlToSend,
        content: chatInput,
        target_type: chatChannel,
        target_id: targetId,
        is_system: false
      });
      setChatInput("");
      setChatCooldown(chatChannel === "GUILD" ? 3 : 10);
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setChatSending(false);
    }
  };

  // ✉️ 個人チャット(DM) 送信処理
  const handleSendDirectMessage = async (recipientId: string, text: string) => {
    if (!text.trim()) return;
    playCyberSe("click");
    const newMsg = {
      id: "dm_" + Date.now(),
      sender_id: session?.user?.id || "my_id",
      sender_name: username,
      recipient_id: recipientId,
      message: text,
      created_at: new Date().toISOString(),
    };
    try {
      if (session?.user?.id) {
        await supabase.from("direct_messages").insert({
          sender_id: session.user.id,
          recipient_id: recipientId,
          message: text,
        });
      }
    } catch (err: any) {
      console.warn("direct_messages insert error:", err.message);
    }
    setDirectMessages((prev) => [...prev, newMsg]);
  };

  // 💬 BBS用関数
  const fetchBbsThreads = async (category: "RECRUIT" | "STRATEGY_CHAT") => {
    setBbsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bbs_threads")
        .select("*")
        .eq("category", category)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setBbsThreads(data || []);
    } catch (err: any) {
      console.warn("fetchBbsThreads error:", err.message);
    } finally {
      setBbsLoading(false);
    }
  };

  const createBbsThread = async (category: "RECRUIT" | "STRATEGY_CHAT", title: string, content: string) => {
    if (!session) return;
    try {
      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const { data, error } = await supabase
        .from("bbs_threads")
        .insert({
          category,
          title,
          content,
          user_id: session.user.id,
          author_name: username,
          author_avatar_url: avatarUrlToSend
        })
        .select()
        .single();
      if (error) throw error;

      if (data) {
        setBbsThreads(prev => [data, ...prev]);
        setBbsActiveThread(data);
        await fetchBbsPosts(data.id);
      }
    } catch (err: any) {
      console.warn("createBbsThread error:", err.message);
      throw err;
    }
  };

  const fetchBbsPosts = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from("bbs_posts")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setBbsPosts(data || []);
    } catch (err: any) {
      console.warn("fetchBbsPosts error:", err.message);
    }
  };

  const createBbsPost = async (threadId: string, content: string) => {
    if (!session) return;
    try {
      const leaderChar = CHARACTERS_MASTER.find(c => c.id === selectedLeader) || CHARACTERS_MASTER[0];
      const avatarUrlToSend = leaderChar.img;

      const { data, error } = await supabase
        .from("bbs_posts")
        .insert({
          thread_id: threadId,
          user_id: session.user.id,
          author_name: username,
          author_avatar_url: avatarUrlToSend,
          content
        })
        .select()
        .single();
      if (error) throw error;

      if (data) {
        setBbsPosts(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.warn("createBbsPost error:", err.message);
      throw err;
    }
  };


  const handleClaimPresent = async (id: string) => {
    if (!session) return;
    setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: true } : p));
    playCyberSe("click");

    try {
      if (id === "p_swr") {
        setDiamonds(d => d + 50);
        await supabase.from("users").update({ neon_diamonds: diamonds + 50 }).eq("id", session.user.id);
        setPresents(prev => prev.filter(p => p.id !== id));
        return;
      }

      const targetGift = presents.find(p => p.id === id);
      if (!targetGift) return;

      const nextCash = targetGift.itemId === "CASH" ? cash + targetGift.qty : cash;
      const nextDiamonds = targetGift.itemId === "DIAMOND" ? diamonds + targetGift.qty : diamonds;

      await supabase.from("presents").update({ status: "CLAIMED", claimed_at: new Date().toISOString() }).eq("id", Number(id));

      if (targetGift.itemId === "CASH" || targetGift.itemId === "DIAMOND") {
        await supabase.from("users").update({ cash: nextCash, neon_diamonds: nextDiamonds }).eq("id", session.user.id);
      } else if (targetGift.itemId.startsWith("WEAPON_") || targetGift.itemId.startsWith("HEAD_") || targetGift.itemId.startsWith("BODY_") || targetGift.itemId.startsWith("LEGS_") || targetGift.itemId.startsWith("ACCESSORY_")) {
        for (let i = 0; i < targetGift.qty; i++) {
          await supabase.from("user_equipments").insert({
            user_id: session.user.id,
            equipment_id: targetGift.itemId,
            level: 1,
            plus_val: 0,
            random_options: [
              { name: "クリティカル率", val: "+5%", unlocked: true },
              { name: "命中率", val: "+8%", unlocked: false },
              { name: "回避率", val: "+6%", unlocked: false },
              { name: "防御貫通力", val: "+12%", unlocked: false }
            ]
          });
        }
      } else {
        const { data: itemData } = await supabase
          .from("user_items")
          .select("quantity")
          .eq("user_id", session.user.id)
          .eq("item_id", targetGift.itemId)
          .maybeSingle();

        await supabase.from("user_items").upsert({
          user_id: session.user.id,
          item_id: targetGift.itemId,
          quantity: (itemData?.quantity || 0) + targetGift.qty
        });
      }

      setPresents(prev => prev.filter(p => p.id !== id));
      await syncBootstrapData(session.user.id);
    } catch (err: any) {
      console.warn(err.message);
      setPresents(prev => prev.map(p => p.id === id ? { ...p, loading: false } : p));
    }
  };

  const handleClaimAllPresents = async () => {
    if (!session) return;
    const unclaimed = presents.filter(p => p.status === "UNCLAIMED");
    if (unclaimed.length === 0) return;

    setPresentClaimLoading(true);
    setPresents(prev => prev.map(p => p.status === "UNCLAIMED" ? { ...p, loading: true } : p));
    playCyberSe("gacha");

    try {
      let addCash = 0;
      let addDiamonds = 0;
      const itemGains: { [itemId: string]: number } = {};
      const equipmentGains: string[] = [];
      const idsToClaim: number[] = [];

      unclaimed.forEach(p => {
        if (p.id === "p_swr") addDiamonds += 50;
        else {
          idsToClaim.push(Number(p.id));
          if (p.itemId === "CASH") addCash += p.qty;
          else if (p.itemId === "DIAMOND") addDiamonds += p.qty;
          else if (p.itemId.startsWith("WEAPON_") || p.itemId.startsWith("HEAD_") || p.itemId.startsWith("BODY_") || p.itemId.startsWith("LEGS_") || p.itemId.startsWith("ACCESSORY_")) {
            for (let i = 0; i < p.qty; i++) {
              equipmentGains.push(p.itemId);
            }
          } else {
            itemGains[p.itemId] = (itemGains[p.itemId] || 0) + p.qty;
          }
        }
      });

      if (idsToClaim.length > 0) {
        await supabase.from("presents").update({ status: "CLAIMED", claimed_at: new Date().toISOString() }).in("id", idsToClaim);
      }

      if (addCash > 0 || addDiamonds > 0) {
        await supabase.from("users").update({ cash: cash + addCash, neon_diamonds: diamonds + addDiamonds }).eq("id", session.user.id);
      }

      for (const eqId of equipmentGains) {
        await supabase.from("user_equipments").insert({
          user_id: session.user.id,
          equipment_id: eqId,
          level: 1,
          plus_val: 0,
          random_options: [
            { name: "クリティカル率", val: "+5%", unlocked: true },
            { name: "命中率", val: "+8%", unlocked: false },
            { name: "回避率", val: "+6%", unlocked: false },
            { name: "防御貫通力", val: "+12%", unlocked: false }
          ]
        });
      }

      for (const [itemId, qty] of Object.entries(itemGains)) {
        const { data: itemData } = await supabase
          .from("user_items")
          .select("quantity")
          .eq("user_id", session.user.id)
          .eq("item_id", itemId)
          .maybeSingle();

        await supabase.from("user_items").upsert({
          user_id: session.user.id,
          item_id: itemId,
          quantity: (itemData?.quantity || 0) + qty
        });
      }

      setPresents(prev => prev.filter(p => p.status !== "UNCLAIMED"));
      await syncBootstrapData(session.user.id);
      alert("プレゼント一括受取完了。");
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setPresentClaimLoading(false);
    }
  };

  const handleClaimMission = async (id: string) => {
    if (!session) return;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: true } : m));
    playCyberSe("click");

    try {
      const targetMission = missions.find(m => m.id === id);
      if (!targetMission) return;

      await supabase.from("user_missions").update({ status: "CLAIMED", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).eq("mission_id", id);
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await supabase.from("presents").insert({ user_id: session.user.id, item_id: targetMission.rewardItemId, quantity: targetMission.rewardQty, message: `ミッション報酬: ${targetMission.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" });

      let nextStepId: string | null = null;
      if (id === "m_pvp_01") nextStepId = "m_pvp_02";
      else if (id === "m_exp_01") nextStepId = "m_exp_02";
      else if (id === "m_lvl_01") nextStepId = "m_lvl_02";

      if (nextStepId) {
        await supabase.from("user_missions").upsert({ user_id: session.user.id, mission_id: nextStepId, current_progress: 0, status: "PROGRESS" }, { onConflict: "user_id,mission_id" });
      }

      setMissions(prev => prev.filter(m => m.id !== id));
      await syncBootstrapData(session.user.id);
      alert("報酬がプレゼントへ転送されました。");
    } catch (err) {
      console.warn(err);
      setMissions(prev => prev.map(m => m.id === id ? { ...m, loading: false } : m));
    }
  };

  const handleClaimAllMissions = async () => {
    if (!session) return;
    const clearMissions = missions.filter(m => m.status === "CLEAR" && m.category === missionTab);
    if (clearMissions.length === 0) return;

    setMissionClaimLoading(true);
    setMissions(prev => prev.map(m => m.status === "CLEAR" && m.category === missionTab ? { ...m, loading: true } : m));
    playCyberSe("gacha");

    try {
      const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const insertPresents: any[] = [];
      const missionIds: string[] = [];
      const nextStepInserts: any[] = [];

      clearMissions.forEach(m => {
        missionIds.push(m.id);
        insertPresents.push({ user_id: session.user.id, item_id: m.rewardItemId, quantity: m.rewardQty, message: `ミッション報酬: ${m.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" });

        let nextId: string | null = null;
        if (m.id === "m_pvp_01") nextId = "m_pvp_02";
        else if (m.id === "m_exp_01") nextId = "m_exp_02";
        else if (m.id === "m_lvl_01") nextId = "m_lvl_02";

        if (nextId) {
          nextStepInserts.push({ user_id: session.user.id, mission_id: nextId, current_progress: 0, status: "PROGRESS" });
        }
      });

      await supabase.from("user_missions").update({ status: "CLAIMED", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).in("mission_id", missionIds);
      await supabase.from("presents").insert(insertPresents);

      if (nextStepInserts.length > 0) {
        await supabase.from("user_missions").upsert(nextStepInserts, { onConflict: "user_id,mission_id" });
      }

      setMissions(prev => prev.filter(m => !(m.status === "CLEAR" && m.category === missionTab)));
      await syncBootstrapData(session.user.id);
      alert("全クリア報酬をプレゼントへ転送しました。");
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setMissionClaimLoading(false);
    }
  };

  const handleDailyMissionReset = async () => {
    if (!session) return;
    setMissionClaimLoading(true);
    playCyberSe("click");

    try {
      const unrecoveredDailies = missions.filter(m => m.status === "CLEAR" && m.category === "DAILY");
      if (unrecoveredDailies.length > 0) {
        const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const insertPresents = unrecoveredDailies.map(m => ({ user_id: session.user.id, item_id: m.rewardItemId, quantity: m.rewardQty, message: `ミッション自動救済: ${m.title}`, expire_at: expireAt.toISOString(), status: "UNCLAIMED" }));
        await supabase.from("presents").insert(insertPresents);
      }

      const dailyIds = ["m_exp_01", "m_exp_02", "m_pvp_01", "m_pvp_02", "m_gvg_01"];
      await supabase.from("user_missions").update({ current_progress: 0, status: "PROGRESS", updated_at: new Date().toISOString() }).eq("user_id", session.user.id).in("mission_id", dailyIds);
      await syncBootstrapData(session.user.id);
      alert("AM 4:00 デイリーミッションリセット完了。");
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setMissionClaimLoading(false);
    }
  };

  const selectUpgradeEquipment = (equip: any) => {
    setSelectedEquipment(equip);
    setEquipmentLevel(equip.level);
    setEquipmentLimitBreak(equip.plus_val);
    if (equip.random_options) setSubOptions(equip.random_options);
  };

  const togglePatrolMemberSelection = (charId: string) => {
    playCyberSe("click");
    if (selectedPatrolMember === charId) {
      setSelectedPatrolMember(null);
    } else {
      setSelectedPatrolMember(charId);
    }
  };

  const handleTogglePartyMember = async (charId: string) => {
    playCyberSe("click");
    let nextParty = [...selectedMembers];
    if (nextParty.includes(charId)) {
      nextParty = nextParty.filter(id => id !== charId);
    } else {
      if (nextParty.length >= 5) {
        alert("出撃パーティは最大5名までです。");
        return;
      }
      nextParty.push(charId);
    }
    
    if (session) {
      try {
        const row = {
          user_id: session.user.id,
          character_1_id: nextParty[0] || null,
          character_2_id: nextParty[1] || null,
          character_3_id: nextParty[2] || null,
          character_4_id: nextParty[3] || null,
          character_5_id: nextParty[4] || null,
          updated_at: new Date().toISOString()
        };
        await supabase.from("pvp_defense_decks").upsert(row, { onConflict: "user_id" });
        setSelectedMembers(nextParty);
      } catch (err) {
        console.warn("Failed to update party deck:", err);
      }
    } else {
      setSelectedMembers(nextParty);
    }
  };

  const unreadMissionsCount = missions.filter(m => m.status === "CLEAR").length;
  const unclaimedPresentsCount = presents.filter(p => p.status === "UNCLAIMED").length;

  const navigateTab = (tabName: string, subTab?: string) => {
    setSelectedNews(null);
    nav.navigateTab(tabName, subTab);
  };

  useEffect(() => {
    if (chatCooldown <= 0) return;
    const timer = setTimeout(() => {
      setChatCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatCooldown]);

  const value = {
    // 状態
    session, setSession,
    authLoading, setAuthLoading,
    isSetupRequired, setIsSetupRequired,
    setupUsername, setSetupUsername,
    setupCharacterId, setSetupCharacterId,
    setupAreaId, setSetupAreaId,
    setupLoading, setSetupLoading,
    email, setEmail,
    password, setPassword,
    cash, setCash,
    diamonds, setDiamonds,
    vitality, setVitality,
    pvpTickets, setPvpTickets,
    activeTab, setActiveTab,
    showInboxPanel, setShowInboxPanel,
    showMissionPanel, setShowMissionPanel,
    showFriendPanel, setShowFriendPanel,
    showSettingsPanel, setShowSettingsPanel,
    showTribeChatPanel, setShowTribeChatPanel,
    showMoveBaseModal, setShowMoveBaseModal,
    showLegalPage, setShowLegalPage,
    showTitleView, setShowTitleView,
    bbsThreads, setBbsThreads,
    bbsActiveThread, setBbsActiveThread,
    bbsPosts, setBbsPosts,
    bbsLoading,
    fetchBbsThreads,
    createBbsThread,
    fetchBbsPosts,
    createBbsPost,
    username, setUsername,
    bio, setBio,
    avatarUrl, setAvatarUrl,
    currentBaseId, setCurrentBaseId,
    lastGuildLeftAt, setLastGuildLeftAt,
    bgmEnabled, setBgmEnabled,
    seEnabled, setSeEnabled,
    profileLoading, setProfileLoading,
    activeUsersCount, setActiveUsersCount,
    chatCooldown, setChatCooldown,
    inboxPanelTab, setInboxPanelTab,
    userGuild, setUserGuild,
    userGuildMember, setUserGuildMember,
    guildMembersList, setGuildMembersList,
    newGuildName, setNewGuildName,
    allGuildsDbList, setAllGuildsDbList,
    guildSubTab, setGuildSubTab,
    selectedLeader, setSelectedLeader,
    upgradeSelectedCharId, setUpgradeSelectedCharId,
    characterLevel, setCharacterLevel,
    characterAwaken, setCharacterAwaken,
    userCharactersDbList, setUserCharactersDbList,
    trainingManuals,
    polishingStones,
    lawsOfStrife, setLawsOfStrife,
    userEquipmentsList, setUserEquipmentsList,
    selectedEquipment, setSelectedEquipment,
    equipmentLevel, setEquipmentLevel,
    equipmentLimitBreak, setEquipmentLimitBreak,
    subOptions, setSubOptions,
    userSkillsList, setUserSkillsList,
    activeGearSlot, setActiveGearSlot,
    showGearModal, setShowGearModal,
    activeSkillSlot, setActiveSkillSlot,
    showSkillModal, setShowSkillModal,
    scoutAnimationState, setScoutAnimationState,
    scoutFlashingColor, setScoutFlashingColor,
    scoutResults, setScoutResults,
    selectedCourse, setSelectedCourse,
    selectedMembers, setSelectedMembers,
    selectedPatrolMember, setSelectedPatrolMember,
    dailyCashSkips, setDailyCashSkips,
    activePatrols, setActivePatrols,
    patrolLogs, setPatrolLogs,
    patrolCourses,
    patrolNpcs,
    hasActivePatrolBattle,
    lastPatrolRewards, setLastPatrolRewards,
    showPatrolRewardModal, setShowPatrolRewardModal,
    battleSubTab, setBattleSubTab,
    pvpOpponents,
    pvpPoints, setPvpPoints,
    selectedTown, setSelectedTown,
    gvgBases, setGvgBases,
    gvgBaseControls, setGvgBaseControls,
    gvgResetLoading, setGvgResetLoading,
    gvgSeasonDay, setGvgSeasonDay,
    gvgMatches, setGvgMatches,
    myGvgMatch, setMyGvgMatch,
    gvgDefenseDeck, setGvgDefenseDeck,
    personalGvgPoints, setPersonalGvgPoints,
    gvgActiveRound, setGvgActiveRound,
    pvpSubView, setPvpSubView,
    pvpRankings, setPvpRankings,
    raidDamageLogs, setRaidDamageLogs,
    pvpSeasonLoading, setPvpSeasonLoading,
    raidDefeatLoading, setRaidDefeatLoading,
    pvpDefenseLogs, setPvpDefenseLogs,
    simulatingDefense, setSimulatingDefense,
    activeStorySession, setActiveStorySession,
    storySending, setStorySending,
    paymentHistory, setPaymentHistory,
    lastPaymentSessionId, setLastPaymentSessionId,
    raidBossHp, setRaidBossHp,
    raidBossMaxHp, setRaidBossMaxHp,
    raidBossSecondsLeft, setRaidBossSecondsLeft,
    raidTotalDamage, setRaidTotalDamage,
    rankingActiveTab, setRankingActiveTab,
    raidBossBaseId, setRaidBossBaseId,
    raidBossName, setRaidBossName,
    upgradeSubTab, setUpgradeSubTab,
    shopSubTab, setShopSubTab,
    missions, setMissions,
    missionTab, setMissionTab,
    presents, setPresents,
    presentsPrefetched, setPresentsPrefetched,
    presentsSyncing, setPresentsSyncing,
    presentClaimLoading, setPresentClaimLoading,
    missionClaimLoading, setMissionClaimLoading,

    // ログインボーナス
    loginBonusMasters, setLoginBonusMasters,
    userLoginBonus, setUserLoginBonus,
    showLoginBonusModal, setShowLoginBonusModal,
    loginBonusClaimResult, setLoginBonusClaimResult,
    checkAndClaimLoginBonus,

    newsList, setNewsList,
    selectedNews, setSelectedNews,
    showImportantModal, setShowImportantModal,
    guildChats, setGuildChats,
    chatChannel, setChatChannel,
    chatInput, setChatInput,
    chatSending, setChatSending,
    errorMessage, setErrorMessage,
    upgradeLoading, setUpgradeLoading,
    dispatchLoading, setDispatchLoading,
    selectedMapAreaId, setSelectedMapAreaId,
    movingAreaLoading, setMovingAreaLoading,
    unreadMissionsCount,
    unclaimedPresentsCount,
    giftCode, setGiftCode,
    setupGiftCode, setSetupGiftCode,
    powerRankings,
    guildPowerRankings,
    raidSeasonRankings,
    equippedBackground, setEquippedBackground,
    equippedFrontEffect, setEquippedFrontEffect,
    titleEquipped, setTitleEquipped,
    userTitle: titleEquipped || "半グレの首領",
    totalPower,
    isRaidActive: raidBossHp > 0 && raidBossSecondsLeft > 0,

    // アバターシステム状態
    setupGender, setSetupGender,
    setupHairId, setSetupHairId,
    setupFaceId, setSetupFaceId,
    userAvatar, setUserAvatar,
    unlockedAvatarParts, setUnlockedAvatarParts,
    avatarPartsMaster, setAvatarPartsMaster,
    avatarLoading, setAvatarLoading,
    handleBuyAvatarPart,
    handleSaveAvatar,

    // バトルステート＆関数分配 (useBattle フックより公開)
    battleSessionId: battle.battleSessionId,
    setBattleSessionId: battle.setBattleSessionId,
    battleMode: battle.battleMode,
    setBattleMode: battle.setBattleMode,
    battleOpponentName: battle.battleOpponentName,
    setBattleOpponentName: battle.setBattleOpponentName,
    battleState: battle.battleState,
    setBattleState: battle.setBattleState,
    battleLog: battle.battleLog,
    setBattleLog: battle.setBattleLog,
    ap: battle.ap,
    setAp: battle.setAp,
    maxAp: battle.maxAp,
    setMaxAp: battle.setMaxAp,
    tactic: battle.tactic,
    setTactic: battle.setTactic,
    battleSpeed: battle.battleSpeed,
    setBattleSpeed: battle.setBattleSpeed,
    isAutoPaused: battle.isAutoPaused,
    setIsAutoPaused: battle.setIsAutoPaused,
    playerPartyStates: battle.playerPartyStates,
    setPlayerPartyStates: battle.setPlayerPartyStates,
    enemyPartyStates: battle.enemyPartyStates,
    setEnemyPartyStates: battle.setEnemyPartyStates,
    timeline: battle.timeline,
    setTimeline: battle.setTimeline,
    timelineIndex: battle.timelineIndex,
    setTimelineIndex: battle.setTimelineIndex,
    activeSkillCutIn: battle.activeSkillCutIn,
    targetLine: battle.targetLine,
    activeShakingCharId: battle.activeShakingCharId,
    damagePopup: battle.damagePopup,
    setDamagePopup: battle.setDamagePopup,
    gvgTargetBaseId: battle.gvgTargetBaseId,
    setGvgTargetBaseId: battle.setGvgTargetBaseId,
    battleLoading: battle.battleLoading,
    setBattleLoading: battle.setBattleLoading,

    // ハンドラ
    startCardBattle: battle.startCardBattle,
    launchBattlePlaying: battle.launchBattlePlaying,
    handleEndTurn: battle.handleEndTurn,
    endBattleSession: battle.endBattleSession,

    // 共通ハンドラ
    playCyberSe,
    handleFirstUserInteraction,
    syncBootstrapData,
    handleEmailSignup,
    handleEmailLogin,
    handleGoogleLogin,
    handleGoogleDemoLogin,
    handleInitializeUser,
    handleGenerateGiftCode,
    handleLogout,
    triggerNpcDefenseSimulation,
    handleUpdateProfile,
    handleMoveBase,
    handleToggleSound,
    handleStoryNext,
    completeStorySession,
    triggerTutorialStory,
    triggerStripeWebhookSimulation,
    handleCreateGuild,
    handleUpdateGuildAlignment,
    handleLeaveGuild,
    handleDemoJoinGuild,
    handleUpdateMemberRole,
    handleKickMember,
    handleDonateToGuild,
    handleBuyGuildDecoration,
    handleEquipGuildDecoration,
    addGuildXpAndContributionByAction,
    guildLevelMaster,
    guildXpActionMaster,
    handleStartPatrol,
    handleInstantComplete,
    handleClaimRewards,
    handleDeployGvgDefense,
    handleGvgDailyReset,
    handleGvgSeasonReset,
    handlePvpSeasonReset,
    handleRaidBossDefeat,
    handleRaidSeasonReset,
    handleCharacterLevelUp,
    handleCharacterAwaken,
    handleEquipGear,
    handleUnequipGear,
    handleUnequipGearBulk,
    handleEquipGearBulkRecommended,
    handleEquipSkill,
    handleUnequipSkill,
    handleUnequipSkillBulk,
    handleEquipSkillBulkRecommended,
    handleSellGearBulk,
    handleEquipmentLevelUp,
    handleEquipmentLimitBreak,
    handleSkillUpgrade,
    selectedSkill,
    setSelectedSkill,
    skillLimitBreakMaster,
    exclusiveContracts,
    handleScout,
    dailyFreeGachaFlags,
    specialPityPoints,
    handleExchangePityReward,
    handleBuyPack,
    gachaMasters,
    gachaItemsMaster,
    handleSendChat,
    handleClaimPresent,
    handleClaimAllPresents,
    handleClaimMission,
    handleClaimAllMissions,
    handleDailyMissionReset,
    selectUpgradeEquipment,
    togglePatrolMemberSelection,
    handleTogglePartyMember,
    navigateTab,
    getGuildPenaltyState,
    handlePowerDailyReset,
    handlePowerSeasonReset,
    activePlayerDetail,
    setActivePlayerDetail,
    activeGuildDetail,
    setActiveGuildDetail,
    fetchPlayerDetail,
    fetchGuildDetail,
    fetchPvpOpponents,
    savePvpDefenseDeck,
    opponentsLoading,
    myPvpDefenseDeck,
    setMyPvpDefenseDeck,
    userLevel,
    setUserLevel,
    userXp,
    setUserXp,
    equipmentLevelUpMaster,
    equipmentLimitBreakMaster,
    healPotions,
    doctorSprays,
    energyDrinks,
    setEnergyDrinks,
    pvpVipPasses,
    setExclusiveContracts,
    charExpS,
    charExpM,
    charExpL,
    equipExpS,
    equipExpM,
    equipExpL,
    skillLbBooks,
    equipLbHammers,
    handleUseItem,
    userShopPurchases,
    userCreatedAt,
    boughtResultModal,
    setBoughtResultModal,
    handleBuyNormalProduct,
    handleBuyStripeProduct,
    selectedBgMode,
    setSelectedBgMode,
    interiorItem,
    setInteriorItem,
    directMessages,
    setDirectMessages,
    dmRecipientId,
    setDmRecipientId,
    handleSendDirectMessage,
    confirmDialogConfig,
    setConfirmDialogConfig,
    globalInteractionBlocking,
    setGlobalInteractionBlocking
  };


  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
