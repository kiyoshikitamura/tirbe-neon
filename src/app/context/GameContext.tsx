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
import { useFriends } from "./hooks/useFriends";
import { useChat } from "./hooks/useChat";
import { useInventory } from "./hooks/useInventory";
import { useUserProfile } from "./hooks/useUserProfile";
import { useGuild } from "./hooks/useGuild";
import { usePvp } from "./hooks/usePvp";
import { useGvg } from "./hooks/useGvg";
import { useRaid } from "./hooks/useRaid";
import { usePatrol } from "./hooks/usePatrol";
import { useGacha } from "./hooks/useGacha";
import { useShop } from "./hooks/useShop";
import { useStory } from "./hooks/useStory";
import { useCharacterProgression } from "./hooks/useCharacterProgression";

const GameContext = createContext<any>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // 0. ナビゲーション ＆ UI状態管理
  // ==========================================
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

  // ==========================================
  // 1. 認証 ＆ セッション管理ステート
  // ==========================================
  const friends = useFriends();
  
  const auth = useAuth(
    (type: string) => playCyberSe(type as any),
    () => stopCyberBgm(),
    (userId: string) => syncBootstrapData(userId),
    (tab: string, subTab?: string) => navigateTab(tab, subTab),
    (userId: string) => checkIfSetupRequired(userId),
    setConfirmDialogConfig
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
  const [hasShownGuildDialog, setHasShownGuildDialog] = useState<boolean>(false);
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [userXp, setUserXp] = useState<number>(0);
  const [raidAttemptsToday, setRaidAttemptsToday] = useState<number>(0);
  const [cash, setCash] = useState<number>(10000);
  const [diamonds, setDiamonds] = useState<number>(200);
  const [vitality, setVitality] = useState<number>(100);
  const [monthlyPassActive, setMonthlyPassActive] = useState<boolean>(false);
  const [monthlyPassClaimedToday, setMonthlyPassClaimedToday] = useState<boolean>(false);

  const inventory = useInventory(
    session,
    cash, setCash,
    diamonds, setDiamonds,
    vitality, setVitality,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    setConfirmDialogConfig
  );

  const {
    userItems, setUserItems,
    energyDrinks, setEnergyDrinks,
    charExpS, setCharExpS,
    charExpM, setCharExpM,
    charExpL, setCharExpL,
    equipExpS, setEquipExpS,
    equipExpM, setEquipExpM,
    equipExpL, setEquipExpL,
    lawsOfStrife, setLawsOfStrife,
    skillLbBooks, setSkillLbBooks,
    exclusiveContracts, setExclusiveContracts,
    equipLbHammers, setEquipLbHammers,
    healPotions,
    doctorSprays,
    pvpVipPasses,
    trainingManuals,
    polishingStones,
    missions, setMissions,
    missionTab, setMissionTab,
    presents, setPresents,
    presentsPrefetched, setPresentsPrefetched,
    presentsSyncing, setPresentsSyncing,
    presentClaimLoading, setPresentClaimLoading,
    missionClaimLoading, setMissionClaimLoading,
    handleUseItem,
    handleClaimPresent,
    handleClaimAllPresents,
    handleClaimMission,
    handleClaimAllMissions,
    handleDailyMissionReset
  } = inventory;




  const guild = useGuild(
    session,
    userLevel,
    cash, setCash,
    (loading: boolean) => setGvgResetLoading(loading),
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    (actionType: string) => addGuildXpAndContributionByAction(actionType),
    setConfirmDialogConfig
  );

  const {
    userGuild, setUserGuild,
    userGuildMember, setUserGuildMember,
    guildMembersList, setGuildMembersList,
    newGuildName, setNewGuildName,
    allGuildsDbList, setAllGuildsDbList,
    guildSubTab, setGuildSubTab,
    guildLevelMaster, setGuildLevelMaster,
    guildXpActionMaster, setGuildXpActionMaster,
    updatingAlignment, setUpdatingAlignment,
    getGuildPenaltyState,
    handleCreateGuild,
    handleUpdateGuildAlignment,
    handleLeaveGuild,
    handleDemoJoinGuild,
    handleUpdateMemberRole,
    handleKickMember,
    handleDonateToGuild,
    handleBuyGuildDecoration,
    handleEquipGuildDecoration
  } = guild;

  const profile = useUserProfile(
    session,
    userLevel,
    diamonds,
    cash,
    userGuild,
    (type: string) => playCyberSe(type as any),
    () => startCyberBgm(),
    () => stopCyberBgm(),
    () => initAudio(),
    () => audioCtxRef.current,
    (userId: string) => syncBootstrapData(userId),
    setShowSettingsPanel,
    setErrorMessage,
    setConfirmDialogConfig
  );

  const {
    username, setUsername,
    bio, setBio,
    avatarUrl, setAvatarUrl,
    currentBaseId, setCurrentBaseId,
    lastGuildLeftAt, setLastGuildLeftAt,
    bgmEnabled, setBgmEnabled,
    seEnabled, setSeEnabled,
    profileLoading, setProfileLoading,
    equippedBackground, setEquippedBackground,
    selectedBgMode, setSelectedBgMode,
    equippedFrontEffect, setEquippedFrontEffect,
    titleEquipped, setTitleEquipped,
    ownedTitles,
    ownedHomeCosmeticIds,
    interiorItem, setInteriorItem,
    selectedLeader, setSelectedLeader,
    upgradeSelectedCharId, setUpgradeSelectedCharId,
    handleUpdateProfile,
    handleToggleSound
  } = profile;

  const pvp = usePvp(
    session,
    (loading: boolean) => setUpgradeLoading(loading),
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    setConfirmDialogConfig
  );

  const {
    pvpPoints, setPvpPoints,
    battleSubTab, setBattleSubTab,
    pvpOpponents, setPvpOpponents,
    opponentsLoading, setOpponentsLoading,
    pvpRate, setPvpRate,
    pvpSubView, setPvpSubView,
    myPvpDefenseDeck, setMyPvpDefenseDeck,
    pvpRankings, setPvpRankings,
    powerRankings, setPowerRankings,
    guildPowerRankings, setGuildPowerRankings,
    pvpSeasonLoading, setPvpSeasonLoading,
    pvpDefenseLogs, setPvpDefenseLogs,
    simulatingDefense, setSimulatingDefense,
    fetchPvpOpponents,
    savePvpDefenseDeck,
    syncUserPower
  } = pvp;

  const gvg = useGvg(
    session,
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId)
  );

  const {
    gvgBases, setGvgBases,
    gvgBaseControls, setGvgBaseControls,
    gvgResetLoading, setGvgResetLoading,
    gvgSeasonDay, setGvgSeasonDay,
    gvgMatches, setGvgMatches,
    myGvgMatch, setMyGvgMatch,
    gvgDefenseDeck, setGvgDefenseDeck,
    personalGvgPoints, setPersonalGvgPoints,
    gvgActiveRound, setGvgActiveRound
  } = gvg;

  const raid = useRaid(
    session,
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId)
  );

  const {
    raidBossHp, setRaidBossHp,
    raidBossMaxHp, setRaidBossMaxHp,
    raidBossSecondsLeft, setRaidBossSecondsLeft,
    raidTotalDamage, setRaidTotalDamage,
    raidBossBaseId, setRaidBossBaseId,
    raidBossName, setRaidBossName,
    raidDamageLogs, setRaidDamageLogs,
    raidSeasonRankings, setRaidSeasonRankings,
    raidDefeatLoading, setRaidDefeatLoading,
    isRaidActive
  } = raid;

  const patrol = usePatrol(
    session,
    vitality, setVitality,
    () => userCharactersDbList,
    currentBaseId,
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    (actionType: string) => addGuildXpAndContributionByAction(actionType),
    (channel: string, baseId: string, trigger: string) => postNpcYajiMessage(channel as any, baseId, trigger as any)
  );

  const {
    selectedCourse, setSelectedCourse,
    selectedMembers, setSelectedMembers,
    selectedPatrolMember, setSelectedPatrolMember,
    dailyCashSkips, setDailyCashSkips,
    activePatrols, setActivePatrols,
    patrolLogs, setPatrolLogs,
    patrolCourses, setPatrolCourses,
    patrolNpcs, setPatrolNpcs,
    hasActivePatrolBattle, setHasActivePatrolBattle,
    lastPatrolRewards, setLastPatrolRewards,
    showPatrolRewardModal, setShowPatrolRewardModal,
    dispatchLoading, setDispatchLoading,
    handleStartPatrol,
    handleInstantComplete,
    handleClaimRewards
  } = patrol;

  const gacha = useGacha();

  const {
    gachaMasters, setGachaMasters,
    gachaItemsMaster, setGachaItemsMaster,
    dailyFreeGachaFlags, setDailyFreeGachaFlags,
    specialPityPoints, setSpecialPityPoints,
    scoutAnimationState, setScoutAnimationState,
    scoutFlashingColor, setScoutFlashingColor,
    scoutResults, setScoutResults
  } = gacha;

  const shop = useShop();

  const {
    shopSubTab, setShopSubTab,
    userShopPurchases, setUserShopPurchases,
    userCreatedAt, setUserCreatedAt,
    boughtResultModal, setBoughtResultModal
  } = shop;

  const story = useStory(
    session,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    (mode: string, enemyName: string) => battle.startCardBattle(mode as any, enemyName),
    setConfirmDialogConfig
  );

  const {
    activeStorySession, setActiveStorySession,
    storySending, setStorySending,
    handleStoryNext,
    completeStorySession,
    triggerTutorialStory
  } = story;

  const characterProgression = useCharacterProgression(
    session,
    cash, setCash,
    charExpS, charExpM, charExpL,
    equipExpS, equipExpM, equipExpL,
    lawsOfStrife, equipLbHammers, skillLbBooks, exclusiveContracts,
    upgradeSelectedCharId,
    setErrorMessage,
    (type: string) => playCyberSe(type as any),
    (userId: string) => syncBootstrapData(userId),
    setConfirmDialogConfig
  );

  const {
    characterLevel, setCharacterLevel,
    characterAwaken, setCharacterAwaken,
    userCharactersDbList, setUserCharactersDbList,
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
    skillLevel, setSkillLevel,
    skillLimitBreakMaster, setSkillLimitBreakMaster,
    selectedSkill, setSelectedSkill,
    equipmentLevelUpMaster, setEquipmentLevelUpMaster,
    equipmentLimitBreakMaster, setEquipmentLimitBreakMaster,
    upgradeSubTab, setUpgradeSubTab,
    upgradeLoading, setUpgradeLoading,
    handleCharacterLevelUp,
    handleCharacterAwaken,
    handleEquipGear,
    handleUnequipGear,
    handleEquipSkill,
    handleUnequipSkill,
    handleUnequipGearBulk,
    handleEquipGearBulkRecommended,
    handleUnequipSkillBulk,
    handleEquipSkillBulkRecommended,
    handleSellGearBulk,
    handleEquipmentLevelUp,
    handleEquipmentLimitBreak,
    handleSkillUpgrade
  } = characterProgression;


  const chat = useChat(
    session,
    username,
    selectedLeader,
    userGuildMember,
    (type: string) => playCyberSe(type as any),
    setErrorMessage
  );

  const {
    guildChats, setGuildChats,
    chatChannel, setChatChannel,
    chatInput, setChatInput,
    chatSending, setChatSending,
    chatCooldown, setChatCooldown,
    activeUsersCount, setActiveUsersCount,
    directMessages, setDirectMessages,
    dmRecipientId, setDmRecipientId,
    bbsThreads, setBbsThreads,
    bbsActiveThread, setBbsActiveThread,
    bbsPosts, setBbsPosts,
    bbsLoading, setBbsLoading,
    handleSendChat,
    handleSendDirectMessage,
    fetchBbsThreads,
    fetchBbsPosts,
    createBbsThread,
    createBbsPost
  } = chat;







  const [selectedTown, setSelectedTown] = useState<string>("shinjuku");

  const [activePlayerDetail, setActivePlayerDetail] = useState<any | null>(null);
  const [activeGuildDetail, setActiveGuildDetail] = useState<any | null>(null);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [lastPaymentSessionId, setLastPaymentSessionId] = useState<string>("");

  // ログインボーナス用ステート
  const [loginBonusMasters, setLoginBonusMasters] = useState<LoginBonusMaster[]>(DEFAULT_LOGIN_BONUS_MASTERS);
  const [userLoginBonus, setUserLoginBonus] = useState<UserLoginBonus | null>(null);
  const [showLoginBonusModal, setShowLoginBonusModal] = useState<boolean>(false);
  const [loginBonusClaimResult, setLoginBonusClaimResult] = useState<LoginBonusClaimResult | null>(null);

  const [newsList, setNewsList] = useState<any[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [showImportantModal, setShowImportantModal] = useState<boolean>(true);

  const [totalPower, setTotalPower] = useState<number>(0);
  // A displayed zero is valid only after the character and deck data has loaded.
  const [totalPowerLoading, setTotalPowerLoading] = useState<boolean>(true);




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
  useEffect(() => {
    // 既存セッションがある場合はそれを使い、無い場合でも自動でデバッグ用ダミーセッションで即時マイページへ
    const startAnonymousSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        await checkIfSetupRequired(session.user.id);
        return;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) {
        console.warn("Anonymous game session could not be created", error);
        setSession(null);
        setAuthLoading(false);
        return;
      }
      setSession(data.session);
      await checkIfSetupRequired(data.session.user.id);
    };
    void startAnonymousSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      setSession(session);
      void checkIfSetupRequired(session.user.id);
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
      const { data, error } = await supabase.rpc("get_user_setup_status");
      if (error) throw error;
      if (!data) {
        setIsSetupRequired(true);
      } else {
        setIsSetupRequired(false);
        await syncBootstrapData(userId);
      }
    } catch (err) {
      console.warn("Check setup required failed:", err);
      setTotalPowerLoading(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const syncActiveUsers = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("sync_active_users");
      if (error) throw error;
      if (typeof data === "number") setActiveUsersCount(data);
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

      await supabase.rpc("admin_update_guild", { p_guild_id: userGuild.id, p_funds: userGuild.funds, p_level: nextLevel, p_xp: finalXp });

      await syncBootstrapData(session.user.id);
      
      if (nextLevel > userGuild.level) {
        setConfirmDialogConfig({ isOpen: true, title: "ギルドレベルアップ", message: `★ギルドレベルが ${nextLevel} に上昇しました！`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
    pvpPoints,
    setPvpPoints,
    pvpRate,
    setPvpRate,
    pvpRankings,
    userLevel,
    setUserLevel,
    userXp,
    setUserXp,
    raidAttemptsToday,
    setRaidAttemptsToday,
    vitality,
    setVitality,
    selectedBattleHelper: friends.selectedBattleHelper,
    raidBossHp,
    setRaidBossHp,
    raidBossMaxHp,
    setRaidBossMaxHp,
    raidTotalDamage,
    setRaidTotalDamage,
    cash,
    setCash,
    diamonds,
    setDiamonds,
    setErrorMessage,
    addGuildXpAndContributionByAction,
    setConfirmDialogConfig
  });


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
    setTotalPowerLoading(true);

    // The Home HUD must not wait for the complete bootstrap (rankings, chat,
    // raids, etc.). Fetch the three inputs it needs independently so the
    // total-power value becomes available as soon as the player data is.
    const primeHomePower = async () => {
      try {
        const [charactersResult, equipmentsResult, deckResult] = await Promise.all([
          supabase.from("user_characters").select("*").eq("user_id", userId),
          supabase.from("user_equipments").select("*").eq("user_id", userId),
          supabase.from("pvp_defense_decks").select("character_1_id, character_2_id, character_3_id, character_4_id, character_5_id").eq("user_id", userId).maybeSingle(),
        ]);
        const characters = charactersResult.data || [];
        const equipments = equipmentsResult.data || [];
        const deck = deckResult.data;
        const memberIds = deck
          ? [deck.character_1_id, deck.character_2_id, deck.character_3_id, deck.character_4_id, deck.character_5_id].filter(Boolean)
          : characters.slice(0, 5).map((character: any) => character.character_id);
        const power = memberIds.reduce((sum: number, memberId: string) => {
          const character = characters.find((entry: any) => entry.id === memberId || entry.character_id === memberId);
          if (!character) return sum;
          const stats = getCharacterTotalStats(character, equipments);
          return sum + stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
        }, 0);
        setTotalPower(power);
      } catch (err) {
        console.warn("Failed to prime home power:", err);
      } finally {
        setTotalPowerLoading(false);
      }
    };
    void primeHomePower();
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
      await friends.fetchFriends(userId);
      await friends.fetchFriendRequests(userId);
      
      // デイリーリセット機構 (Phase 3)
      try {
        await supabase.rpc("process_daily_reset", { p_user_id: userId });
      } catch (err) {
        console.warn("Failed to process daily reset:", err);
      }

      await checkAndClaimLoginBonus(userId);
      const { data: recovered } = await supabase.rpc("sync_and_recover_vitality_and_pvp_points", {
        p_user_id: userId
      });
      
      // 月額パス状態フェッチ
      try {
        const { data: mpData } = await supabase
          .from("user_monthly_passes")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString());

        if (mpData && mpData.length > 0) {
          setMonthlyPassActive(true);
          const today = new Date().toISOString().split("T")[0];
          setMonthlyPassClaimedToday(mpData[0].daily_claimed_at === today);
        } else {
          setMonthlyPassActive(false);
          setMonthlyPassClaimedToday(false);
        }
      } catch (err) {
        console.warn("Failed to fetch monthly pass:", err);
      }
      
      if (recovered) {
        const row = Array.isArray(recovered) ? recovered[0] : recovered;
        setVitality(row.out_vitality);
        setPvpPoints(row.out_pvp_points);
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
        setCurrentBaseId(userProfile.current_base_id || "shinjuku");
        setLastGuildLeftAt(userProfile.last_guild_left_at);
        setGiftCode(userProfile.gift_code || null);
        setTitleEquipped(userProfile.title_equipped || "title_none");
        setEquippedBackground(userProfile.equipped_background || "bg_default");
        setEquippedFrontEffect(userProfile.equipped_front_effect || "effect_none");
        if ((userProfile as any).selected_bg_mode) setSelectedBgMode((userProfile as any).selected_bg_mode);
        if ((userProfile as any).interior_item) setInteriorItem((userProfile as any).interior_item);
        setUserLevel(userProfile.level || 1);
        setHasShownGuildDialog((userProfile as any).has_shown_guild_dialog || false);
        setUserXp(userProfile.xp || 0);
        
        // Reset raid attempts if the date changed
        const today = new Date().toISOString().split("T")[0];
        const resetAt = (userProfile as any).raid_attempts_reset_at ? new Date((userProfile as any).raid_attempts_reset_at).toISOString().split("T")[0] : null;
        if (resetAt !== today) {
          setRaidAttemptsToday(0);
          // Optional: we can do an async update to DB here or let RPC handle it on first attempt
        } else {
          setRaidAttemptsToday((userProfile as any).raid_attempts_today || 0);
        }
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
          .select("*")
          .eq("guild_id", guildMemberRec.guild_id)
          .order("role", { ascending: true });
        
        if (membersList && membersList.length > 0) {
          const memberUserIds = membersList.map((m: any) => m.user_id);
          const { data: publicProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: memberUserIds });
          const profileByUserId = new Map((publicProfiles || []).map((p: any) => [p.user_id, p]));
          const membersWithProfiles = membersList.map((m: any) => ({ ...m, users: profileByUserId.get(m.user_id) || null }));
          // 初期プレースホルダー表示用にnullを設定
          setGuildMembersList(membersWithProfiles.map((m: any) => ({ ...m, userLevel: null, userPower: null, partyCharIds: null })));

          const userIds = membersWithProfiles.map((m: any) => m.user_id);

          Promise.all([
            supabase.from("user_power_rankings").select("user_id, total_power").in("user_id", userIds),
            supabase.rpc("get_public_leader_characters", { p_user_ids: userIds }),
            supabase.from("pvp_defense_decks").select("user_id, character_1_id, character_2_id, character_3_id, character_4_id, character_5_id").in("user_id", userIds)
          ]).then(([powersRes, charsRes, decksRes]) => {
            const mappedMembers = membersWithProfiles.map((m: any) => {
              const userPower = powersRes.data?.find((p: any) => p.user_id === m.user_id)?.total_power ?? 0;
              const favCharId = m.users?.favorite_character_id;
              const userChars = (charsRes.data || []).filter((c: any) => c.user_id === m.user_id);
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
                const charRec = userChars.find((c: any) => c.id === id);
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

      const { data: pvpRanks } = await supabase
        .from("pvp_ranks")
        .select("*")
        .order("rank_points", { ascending: false });
      const { data: pvpProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: (pvpRanks || []).map((r: any) => r.user_id) });
      const pvpProfileById = new Map((pvpProfiles || []).map((p: any) => [p.user_id, p]));
      const pvpData = (pvpRanks || []).map((r: any) => ({ ...r, users: pvpProfileById.get(r.user_id) || null }));
      if (pvpData.length > 0) {
        setPvpRankings(pvpData);
        const me = pvpData.find((r: any) => r.user_id === userId);
        if (me) {
          setPvpRate(me.rank_points);
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

      const { data: rawDmgLogsData } = await supabase
        .from("raid_damage_logs")
        .select("*, guilds ( name )")
        .eq("raid_boss_id", RAID_BOSS_ID)
        .order("damage_dealt", { ascending: false });
      const { data: dmgProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: (rawDmgLogsData || []).map((d: any) => d.user_id) });
      const dmgProfileById = new Map((dmgProfiles || []).map((p: any) => [p.user_id, p]));
      const dmgLogsData = (rawDmgLogsData || []).map((d: any) => ({ ...d, users: dmgProfileById.get(d.user_id) || null }));
      
      if (dmgLogsData) {
        setRaidDamageLogs(dmgLogsData);
        const myDmg = dmgLogsData
          .filter(d => d.user_id === userId)
          .reduce((sum, item) => sum + Number(item.damage_dealt), 0);
        setRaidTotalDamage(myDmg);
      }

      const { data: rawAllRaidLogs } = await supabase
        .from("raid_damage_logs")
        .select("*, guilds ( name )");
      const { data: allRaidProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: (rawAllRaidLogs || []).map((d: any) => d.user_id) });
      const allRaidProfileById = new Map((allRaidProfiles || []).map((p: any) => [p.user_id, p]));
      const allRaidLogs = (rawAllRaidLogs || []).map((d: any) => ({ ...d, users: allRaidProfileById.get(d.user_id) || null }));
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
      const { data: publicPowerRankings } = await supabase.rpc("get_public_power_rankings");
      const rawPowerRankings = (publicPowerRankings || []).map((r: any) => ({
        user_id: r.user_id,
        current_power: r.current_power,
        updated_at: r.updated_at,
        users: {
          username: r.username,
          avatar_url: r.avatar_url,
          guild_members: r.guild_id ? [{ guild_id: r.guild_id, guilds: r.guild_name ? { name: r.guild_name } : null }] : []
        }
      }));

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
          const rewardLabel = `${m.reward_item_id === "CASH" ? "キャッシュ" : m.reward_item_id === "DIAMOND" ? "ダイヤ" : "強化素材"} +${m.reward_quantity || 0}`;
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
    } finally {
      setTotalPowerLoading(false);
    }
  };


  // 🕒 30秒バックグラウンド自動回復タイマー
  useEffect(() => {
    if (!session) return;
    const recoveryTimer = setInterval(async () => {
      try {
        const { data: recovered } = await supabase.rpc("sync_and_recover_vitality_and_pvp_points", {
          p_user_id: session.user.id
        });
        
        if (recovered) {
          const row = Array.isArray(recovered) ? recovered[0] : recovered;
          setVitality(row.out_vitality);
          setPvpPoints(row.out_pvp_points);
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
    if (chatChannel === "DM") {
      setGuildChats([]);
      return;
    }
    
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

      const { error: userUpdateError } = await supabase.rpc("buy_avatar_part", {
        p_user_id: session.user.id,
        p_part_id: partId,
        p_currency_type: currency,
        p_price: price
      });

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
        setConfirmDialogConfig({ isOpen: true, title: "ギフトコード", message: `ギフトコード【${data}】を新規発行しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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

      await supabase.rpc("process_pvp_match_result", {
        p_user_id: session.user.id,
        p_target_user_id: session.user.id,
        p_is_win: res === "DEFENSE_SUCCESS",
        p_point_diff: diff,
        p_cash_reward: 0
      });

      await syncBootstrapData(session.user.id);

      setConfirmDialogConfig({
        isOpen: true,
        title: "シミュレーション完了",
        message: `【非同期防衛抗争シミュレーション完了】\n\n・攻撃者: ${npc}\n・防衛結果: ${res === "DEFENSE_SUCCESS" ? "★防衛成功" : "❌防衛失敗"}\n・PvPランクポイント: ${diff >= 0 ? "+" : ""}${diff} pt`,
        onConfirm: () => setConfirmDialogConfig(null),
        onCancel: () => setConfirmDialogConfig(null)
      });
    } catch (err: any) {
      console.warn("Defense simulation failed:", err.message);
    } finally {
      setSimulatingDefense(false);
    }
  };



  const handleMoveBase = async (baseId: string) => {
    if (!session) return;
    playCyberSe("click");

    const prevBase = currentBaseId;
    // Switch the scene before persisting it. A failed request is the only case
    // in which the player needs to wait for a rollback.
    setCurrentBaseId(baseId);
    setSelectedMapAreaId(null);

    try {
      const { error } = await supabase
        .from("users")
        .update({ current_base_id: baseId })
        .eq("id", session.user.id);

      if (error) throw error;

    } catch (err: any) {
      console.warn("Move base failed, rolling back:", err.message);
      setCurrentBaseId(prevBase);
      setErrorMessage("拠点移動の同期に失敗しました。");
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
        setConfirmDialogConfig({ isOpen: true, title: "決済シミュレーション", message: "【Stripe Webhook 冪等性競合検知】 重複トランザクションを安全に無視しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
      await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id, p_amount: 120 });
      
      setDiamonds(nextDiamonds);
      setLastPaymentSessionId(sessionId);
      await syncBootstrapData(session.user.id);

      setConfirmDialogConfig({ isOpen: true, title: "決済完了", message: `Stripe決済シミュレート完了。有償ダイヤ+120。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setProfileLoading(false);
    }
  };








  const handleDeployGvgDefense = async (charIds: string[]) => {
    if (!session) return;
    const guildIdFilter = userGuildMember?.guild_id || "";
    if (!guildIdFilter) {
      setConfirmDialogConfig({ isOpen: true, title: "GvG防衛", message: "ギルドに所属していないため、守備デッキの登録はできません。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return;
    }
    playCyberSe("click");
    setGvgResetLoading(true);

    try {
      if (charIds.length === 0) {
        // 解除
        await supabase.from("gvg_defense_decks").delete().eq("user_id", session.user.id);
        setConfirmDialogConfig({ isOpen: true, title: "GvG防衛", message: "守備デッキの登録を解除しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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
        setConfirmDialogConfig({ isOpen: true, title: "GvG防衛", message: "守備デッキを登録しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      }
      await syncBootstrapData(session.user.id);
    } catch (e: any) {
      console.warn("Failed to deploy GvG defense deck:", e.message);
      setConfirmDialogConfig({ isOpen: true, title: "GvG防衛", message: "守備デッキの登録に失敗しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePowerDailyReset = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setGvgResetLoading(true);
    try {
      const { error } = await supabase.rpc("reset_daily_power_rankings");
      if (error) throw error;
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: "総合力デイリーリセットを実行しました（アクティブ状態の初期化）。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      console.warn("Failed to reset daily power rankings:", e.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePowerSeasonReset = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setGvgResetLoading(true);
    try {
      const { error } = await supabase.rpc("reset_seasonal_power_rankings");
      if (error) throw error;
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: "総合力シーズンリセットを実行しました（全ユーザーの初期化）。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (e: any) {
      console.warn("Failed to reset seasonal power rankings:", e.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const fetchPlayerDetail = async (userId: string) => {
    try {
      const { data: profiles, error: userErr } = await supabase.rpc("get_public_profiles", { p_user_ids: [userId] });
      if (userErr) throw userErr;
      const user = profiles?.[0];
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
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url || "/reiji_transparent_asset.png",
        bio: user.bio || "自己紹介が未設定です。",
        level: user.level,
        xp: user.xp || 0,
        titleName: user.title_name || user.title_equipped || "称号なし",
        guildName: user.guild_name || null,
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
        const { data: leaderProfiles } = await supabase.rpc("get_public_profiles", { p_user_ids: [guild.leader_id] });
        const leader = leaderProfiles?.[0];
        if (leader) leaderName = leader.username;
      }

      const bases = ["shinjuku", "shibuya", "ikebukuro", "roppongi", "akihabara"];
      const baseNames: { [key: string]: string } = {
        shinjuku: "新宿",
        shibuya: "渋谷",
        ikebukuro: "池袋", roppongi: "六本木", akihabara: "秋葉原",
        
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
        member_limit: guild.member_limit || (guild.level <= 1 ? 10 : guild.level === 2 ? 12 : guild.level === 3 ? 15 : guild.level === 4 ? 18 : 20),
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
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setGvgResetLoading(true);
    playCyberSe("click");
    try {
      const guildIdFilter = userGuildMember?.guild_id || "";

      // 1. 各拠点 (shinjuku, deep_dock, junk_bazar, kitakura_gate) ごとに daily_points トップのギルドを支配ギルドに設定
      const bases = ["shinjuku", "shibuya", "ikebukuro", "roppongi", "akihabara"];
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

            await supabase.rpc("admin_update_guild", { p_guild_id: controllingGuildId, p_funds: nextFunds, p_level: nextLvl, p_xp: nextXp });
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
        const matchGuilds = [...guildsAll];

        if (nextIsFinal) {
          // 7日目の決戦: 4拠点の支配ギルド（計4ギルド）を抽出
          const { data: finalGuildsCtrl } = await supabase.from("guild_base_controls").select("guild_id").eq("is_controlling", true);
          const finalGuilds = finalGuildsCtrl?.map((c: any) => c.guild_id).filter(Boolean) || [];

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
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: `GvG日次集計完了。自ギルドの支配権: ${wonAreasCount} 箇所。支配報酬（ダイヤ/Cash）を対象メンバーのプレゼントBOXへ配布しました。経過日数を ${nextDay} 日目に進め、新規マッチングを自動生成しました。`, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handleGvgSeasonReset = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setGvgResetLoading(true);
    playCyberSe("click");

    try {
      const { error } = await supabase.rpc("gvg_season_reset");
      if (error) throw error;
      setGvgSeasonDay(1);

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: "【GvG抗争 シーズンリセット完了】\n\nシーズン個人ランキングの最終順位に応じてダイヤ報酬を全員に配布しました。\n決戦進出ギルドへ最終順位報酬（ギルド資金、特別装飾背景）を付与しました。\n全ての累積支配日数・個人ポイントをリセットし、シーズン1日目へ移行しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn("GvG season reset failed:", err.message);
    } finally {
      setGvgResetLoading(false);
    }
  };

  const handlePvpSeasonReset = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setPvpSeasonLoading(true);
    playCyberSe("click");
    try {
      const { error } = await supabase.rpc("pvp_season_reset", {
        p_user_id: session.user.id,
        p_current_rate: pvpRate
      });
      if (error) throw error;

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: "PvPシーズン終了。報酬転送完了。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn("Failed to reset PvP season:", err.message);
      setErrorMessage("シーズンリセット処理に失敗しました。");
    } finally {
      setPvpSeasonLoading(false);
    }
  };

  const handleRaidBossDefeat = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setRaidDefeatLoading(true);
    playCyberSe("click");
    try {
      const { error } = await supabase.rpc("raid_boss_defeat");
      if (error) throw error;

      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "レイドボス撃破", message: "レイドボス撃破完了。報酬配布 ＆ ボスランダム再配置完了。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn(err.message);
    } finally {
      setRaidDefeatLoading(false);
    }
  };

  const handleRaidSeasonReset = async () => {
    // ADMIN_ONLY: 管理者デバッグ専用。RLSで一般ユーザーからのUPDATEを制限すること。中長期でServer Actions/Edge Functionsに移行予定。
    if (!session) return;
    setRaidDefeatLoading(true);
    playCyberSe("click");

    try {
      const { error } = await supabase.rpc("raid_season_reset");
      if (error) throw error;
      
      await syncBootstrapData(session.user.id);
      setConfirmDialogConfig({ isOpen: true, title: "リセット完了", message: "【レイド シーズンリセット完了】\n\n個人・組織ランキング順位報酬をプレゼントBOXに配布しました。\nボスは全快し、ランダムな拠点へ再出現しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
    } catch (err: any) {
      console.warn("Raid season reset failed:", err.message);
    } finally {
      setRaidDefeatLoading(false);
    }
  };


  // ==========================================
  // ⚡ 育成アクション
  // ==========================================


  const handleScout = async (
    scoutType: string,
    scoutCount: number,
    useCurrency: "CASH" | "DIAMOND" | "FREE" | "TICKET"
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
      if ((category as string) === "CHARACTER") {
        const serverCurrency = useCurrency === "FREE" ? "free" : useCurrency === "DIAMOND" ? "diamonds" : useCurrency === "TICKET" ? "ticket" : "cash";
        const drawResult = await supabase.rpc("execute_character_gacha", {
          p_user_id: session.user.id,
          p_gacha_id: scoutType === "CHAR_NORMAL" || scoutType === "CHAR_SPECIAL" ? scoutType : "CHAR_SPECIAL",
          p_pull_count: scoutCount,
          p_currency_type: serverCurrency
        });
        if (drawResult.error || drawResult.data?.error) {
          throw drawResult.error || new Error(drawResult.data.error);
        }

        const serverResults = drawResult.data?.results || [];
        const results = serverResults.map((result: { character_id: string; outcome: string }) => {
          const character = CHARACTERS_MASTER.find(c => c.id === result.character_id);
          return {
            type: "CHARACTER",
            name: character?.jpName || result.character_id,
            rarity: character?.rarity || "SSR",
            converted: result.outcome === "converted",
            convertReward: result.outcome === "awakening" ? "覚醒段階+1" : result.outcome === "converted" ? "抗争の掟 x1" : "新規獲得"
          };
        });
        if (typeof drawResult.data?.cash === "number") setCash(drawResult.data.cash);
        if (typeof drawResult.data?.diamonds === "number") setDiamonds(drawResult.data.diamonds);
        if (useCurrency === "FREE") setDailyFreeGachaFlags(prev => ({ ...prev, CHARACTER: false }));
        await syncBootstrapData(session.user.id);
        if (useCurrency === "FREE" && scoutType === "CHAR_NORMAL" && scoutCount === 10) {
          await supabase.rpc("advance_tutorial_progress", {
            p_expected_step: "FREE_GACHA",
            p_next_step: "AUTO_FORMATION"
          });
        }
        setScoutResults(results);
        setScoutFlashingColor(results.some((r: { rarity: string }) => r.rarity === "SSR") ? "GOLD" : results.some((r: { rarity: string }) => r.rarity === "SR") ? "PURPLE" : "BLUE");
        setScoutAnimationState("FLASHING");
        playCyberSe("gacha");
        setTimeout(() => setScoutAnimationState("SHOW_RESULTS"), 1800);
        return;
      }

      // 1. コスト判定 ＆ 残高/無料フラグチェック
      const assetGachaId = category === "SKILL"
        ? (scoutType === "SKILL_NORMAL" || scoutType === "SKILL_SPECIAL" ? scoutType : "SKILL_SPECIAL")
        : (scoutType === "EQUIP_NORMAL" || scoutType === "EQUIP_SPECIAL" ? scoutType : "EQUIP_SPECIAL");
      const serverCurrency = useCurrency === "FREE" ? "free" : useCurrency === "DIAMOND" ? "diamonds" : useCurrency === "TICKET" ? "ticket" : "cash";
      const drawResult = await supabase.rpc("execute_asset_gacha", { p_user_id: session.user.id, p_gacha_id: assetGachaId, p_pull_count: scoutCount, p_currency_type: serverCurrency });
      if (drawResult.error || drawResult.data?.error) throw drawResult.error || new Error(drawResult.data.error);
      const serverResults = drawResult.data?.results || [];
      const assetResults = serverResults.map((result: { type: string; item_id: string; outcome: string }) => {
        const master = result.type === "SKILL" ? SKILLS_MASTER_DATA.find(s => s.id === result.item_id) : EQUIPMENTS_MASTER_DATA.find(e => e.id === result.item_id);
        return { type: result.type, name: master?.name || result.item_id, rarity: master?.rarity || "R", converted: result.outcome === "converted", convertReward: result.outcome === "converted" ? "TRAINING_MANUAL x2" : result.outcome === "limit_break" ? "限界突破 +1" : "新規獲得" };
      });
      if (typeof drawResult.data?.cash === "number") setCash(drawResult.data.cash);
      if (typeof drawResult.data?.diamonds === "number") setDiamonds(drawResult.data.diamonds);
      if (useCurrency === "FREE") setDailyFreeGachaFlags(prev => ({ ...prev, [category]: false }));
      await syncBootstrapData(session.user.id);
      setScoutResults(assetResults);
      setScoutFlashingColor(assetResults.some((r: { rarity: string }) => r.rarity === "SSR") ? "GOLD" : assetResults.some((r: { rarity: string }) => r.rarity === "SR") ? "PURPLE" : "BLUE");
      setScoutAnimationState("FLASHING");
      playCyberSe("gacha");
      setTimeout(() => setScoutAnimationState("SHOW_RESULTS"), 1800);
      return;

      if (useCurrency === "FREE") {
        if (!dailyFreeGachaFlags[category]) {
          setErrorMessage("本日の無料10連ガチャは使用済みです。");
          setUpgradeLoading(false);
          return;
        }
      } else if (useCurrency === "TICKET") {
        const ticketCount = scoutCount;
        const chargeResult = await supabase.rpc("execute_gacha", { p_user_id: session.user.id, p_currency_type: "ticket", p_currency_cost: ticketCount, p_results: [] });
        if (chargeResult.error || chargeResult.data?.error) {
          throw chargeResult.error || new Error(chargeResult.data.error);
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
        const chargeResult = await supabase.rpc("execute_gacha", { p_user_id: session.user.id, p_currency_type: "diamonds", p_currency_cost: reqDia, p_results: [] });
        if (chargeResult.error || chargeResult.data?.error) {
          throw chargeResult.error || new Error(chargeResult.data.error);
        }
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
        const chargeResult = await supabase.rpc("execute_gacha", { p_user_id: session.user.id, p_currency_type: "cash", p_currency_cost: reqCash, p_results: [] });
        if (chargeResult.error || chargeResult.data?.error) {
          throw chargeResult.error || new Error(chargeResult.data.error);
        }
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

      if ((category as string) === "CHARACTER") {
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
              await supabase.rpc("update_favorite_character", { p_user_id: session.user.id, p_character_id: selectedChar.id });
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

    } catch (err: unknown) {
      console.warn("Gacha execution error:", err instanceof Error ? err.message : err);
    } finally {
      try {
        await supabase.rpc("evaluate_mission_progress", {
          p_user_id: session.user.id,
          p_trigger_type: "GACHA_PULL",
          p_progress_increment: scoutCount
        });
      } catch (e) { /* mission update failure is non-critical */ }
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
      const { data: pityResult, error: pityError } = await supabase.rpc("exchange_pity_reward", {
        p_user_id: session.user.id,
        p_reward_type: rewardType,
        p_reward_id: rewardId
      });
      if (pityError || pityResult?.error) throw pityError || new Error(pityResult.error);
      setSpecialPityPoints((pityResult?.current_points ?? Math.max(0, specialPityPoints - 200)) as number);
      await syncBootstrapData(session.user.id);
      return;

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
    } catch (err: unknown) {
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
      setGlobalInteractionBlocking(true);
      const { data: rpcRes, error } = await supabase.rpc("buy_normal_shop_product", {
        p_user_id: session.user.id,
        p_product_id: product.id,
        p_currency_type: currencyType,
        p_price: price,
        p_items: product.items,
        p_product_title: product.title
      });
      setGlobalInteractionBlocking(false);

      if (error || !rpcRes) {
        console.error("buy_normal_shop_product rpc error:", error);
        setErrorMessage("購入処理中にエラーが発生しました。");
        setUpgradeLoading(false);
        return false;
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
    if (product.id === "vip_pass_01") {
      const result = await handlePurchaseMonthlyPass();
      return !!result?.success;
    }

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

      setGlobalInteractionBlocking(true);
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
      setGlobalInteractionBlocking(false);

      if (error) {
        console.error("process_stripe_shop_purchase RPC error:", error);
        setErrorMessage("決済処理中にエラーが発生しました。");
        setProfileLoading(false);
        return false;
      } else if (rpcRes && rpcRes.duplicate) {
        setConfirmDialogConfig({
          isOpen: true,
          title: "重複トランザクション",
          message: "【Stripe Webhook 冪等性競合検知】 重複トランザクションを安全に無視しました。",
          onConfirm: () => setConfirmDialogConfig(null),
          onCancel: () => setConfirmDialogConfig(null)
        });
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
        await supabase.rpc("add_user_vitality", { p_user_id: session.user.id, p_amount: 100 });
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
        await supabase.rpc("add_test_cash", { p_user_id: session.user.id, p_amount: 10000 });
        success = true;
        message = "資金調達パックを購入しました！キャッシュ+10,000を獲得しました。";
      }
    }

    if (success) {
      const nextDiamonds = diamonds - cost;
      await supabase.rpc("add_test_diamonds", { p_user_id: session.user.id, p_amount: 5000 });
      setDiamonds(nextDiamonds);
      setConfirmDialogConfig({ isOpen: true, title: "パック購入", message: message, onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      await syncBootstrapData(session.user.id);
    } else {
      setErrorMessage("ダイヤが不足しています。");
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
        setConfirmDialogConfig({ isOpen: true, title: "パーティ編成", message: "出撃パーティは最大5名までです。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
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

  const handleAutoFormation = async ({ navigateAfter = true }: { navigateAfter?: boolean } = {}) => {
    const nextParty = [...userCharactersDbList]
      .sort((left: any, right: any) => {
        const leftStats = getCharacterTotalStats(left, userEquipmentsList);
        const rightStats = getCharacterTotalStats(right, userEquipmentsList);
        const leftPower = leftStats.hp + leftStats.atk + leftStats.def;
        const rightPower = rightStats.hp + rightStats.atk + rightStats.def;
        return rightPower - leftPower;
      })
      .slice(0, 5)
      .map((character: any) => character.character_id);

    if (nextParty.length === 0) {
      setErrorMessage("No characters are available for formation.");
      return false;
    }

    playCyberSe("click");
    if (session?.user?.id) {
      const { error } = await supabase.from("pvp_defense_decks").upsert({
        user_id: session.user.id,
        character_1_id: nextParty[0] || null,
        character_2_id: nextParty[1] || null,
        character_3_id: nextParty[2] || null,
        character_4_id: nextParty[3] || null,
        character_5_id: nextParty[4] || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) {
        setErrorMessage("Failed to save the formation.");
        return false;
      }
      await supabase.rpc("advance_tutorial_progress", {
        p_expected_step: "AUTO_FORMATION",
        p_next_step: "DISPATCH"
      });
    }
    setSelectedMembers(nextParty);
    setUpgradeSelectedCharId(nextParty[0]);
    if (navigateAfter) {
      navigateTab("patrol");
    }
    return true;
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

  const handlePurchaseMonthlyPass = async () => {
    if (!session?.user?.id) return { success: false, message: "Not logged in" };
    try {
      const res = await supabase.rpc("purchase_monthly_pass", { p_user_id: session.user.id });
      if (res.error) throw res.error;
      
      setMonthlyPassActive(true);
      setMonthlyPassClaimedToday(false);
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to purchase monthly pass:", err);
      return { success: false, message: err.message };
    }
  };

  const handleClaimDailyPassReward = async () => {
    if (!session?.user?.id || monthlyPassClaimedToday) return { success: false, message: "Already claimed" };
    try {
      const res = await supabase.rpc("claim_daily_pass_reward", { p_user_id: session.user.id });
      if (res.error) throw res.error;
      
      setMonthlyPassClaimedToday(true);
      setDiamonds(prev => prev + 100);
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to claim daily pass reward:", err);
      return { success: false, message: err.message };
    }
  };

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
    pvpPoints, setPvpPoints,
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
    pvpRate, setPvpRate,
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
    ownedTitles,
    ownedHomeCosmeticIds,
    userTitle: ownedTitles.find((title) => title.id === titleEquipped)?.name || titleEquipped || "称号なし",
    totalPower,
    totalPowerLoading,
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
    battleRound: battle.battleRound,
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
    handleAutoFormation,
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
    setGlobalInteractionBlocking,
    activeBanners, setActiveBanners,
    userItems, setUserItems,
    raidAttemptsToday, setRaidAttemptsToday,
    monthlyPassActive, setMonthlyPassActive,
    monthlyPassClaimedToday, setMonthlyPassClaimedToday,
    handlePurchaseMonthlyPass, handleClaimDailyPassReward,
    ...friends
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
