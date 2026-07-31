import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CHARACTERS_MASTER, CHARACTER_GROWTH_PATTERNS, CHARACTER_AWAKENING_MASTER, ENEMIES_MASTER } from "./game_constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ktpolnkyyfkowxdmijww.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// アプリケーションがダミーのキーで実行されているか、または強制モックモードか判定
const isDummy = true; // 強制的にローカルモックDBを使用 (未作成のテーブルによるVercel環境での404エラーを防止)

// ローカルストレージを利用した完全整合のモックデータベースクライアント
class MockSupabaseClient {
  private getStorage(key: string, defaultVal: any = []) {
    if (typeof window === "undefined") return defaultVal;
    const data = localStorage.getItem(`mock_db_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  }

  private setStorage(key: string, val: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(val));
  }

  // リアルタイム通信 (Realtime Channels) モック
  channel(name: string) {
    console.log(`[Mock DB Realtime] Creating channel: ${name}`);
    class MockChannelBuilder {
      on(event: string, filter: any, callback: any) {
        return this;
      }
      subscribe() {
        console.log(`[Mock DB Realtime] Subscribed to channel: ${name}`);
        return this;
      }
    }
    return new MockChannelBuilder();
  }

  removeChannel(channel: any) {
    console.log("[Mock DB Realtime] Removing channel");
    return { error: null };
  }

  // 🔐 1. Auth モジュール
  auth = {
    getSession: async () => {
      if (typeof window === "undefined") return { data: { session: null } };
      const demoId = localStorage.getItem("tribe_demo_uuid");
      if (demoId) {
        return {
          data: {
            session: {
              user: { id: demoId, email: `demo-${demoId.substring(0, 8)}@example.com` }
            }
          }
        };
      }
      return { data: { session: null } };
    },
    onAuthStateChange: (callback: any) => {
      // リスナー初期化用
      setTimeout(async () => {
        const { data } = await this.auth.getSession();
        callback("INITIAL_SESSION", data.session);
      }, 50);
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tribe_demo_uuid");
      }
      return { error: null };
    },
    signInWithPassword: async ({ email }: any) => {
      if (typeof window !== "undefined") {
        let demoId = localStorage.getItem("tribe_demo_uuid");
        if (!demoId) {
          demoId = "00000000-0000-4000-8000-" + Math.floor(100000000000 + Math.random() * 900000000000).toString();
          localStorage.setItem("tribe_demo_uuid", demoId);
        }
      }
      return { data: { user: {} }, error: null };
    },
    signUp: async () => {
      return { data: { user: {} }, error: null };
    }
  };

  // ⚙️ 2. RPC (Stored Functions) モック
  async rpc(funcName: string, params: any) {
    console.log(`[Mock DB RPC] Calling ${funcName} with:`, params);
    
    if (funcName === "generate_user_gift_code") {
      const { p_user_id } = params;
      const users = this.getStorage("users");
      const user = users.find((u: any) => u.id === p_user_id);
      if (!user) {
        return { error: { message: "ユーザーが存在しません。" } };
      }
      if (user.gift_code) {
        return { data: user.gift_code, error: null };
      }
      
      // ユニークなコードを生成
      let code = "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let isUnique = false;
      while (!isUnique) {
        code = "";
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        isUnique = !users.some((u: any) => u.gift_code === code);
      }
      
      user.gift_code = code;
      this.setStorage("users", users);
      return { data: code, error: null };
    }

    if (funcName === "add_user_xp") {
      const { p_user_id, p_xp_amount } = params;
      const users = this.getStorage("users");
      const user = users.find((u: any) => u.id === p_user_id);
      if (!user) {
        return { error: { message: "ユーザーが存在しません。" } };
      }
      
      let level = user.level || 1;
      let xp = user.xp || 0;
      let leveledUp = false;
      
      if (level < 99) {
        xp += p_xp_amount;
        const levelMaster = this.getStorage("user_level_master");
        
        while (level < 99) {
          const lvRec = levelMaster.find((l: any) => l.level === level) || { next_xp: level * 100 };
          const nextXp = lvRec.next_xp;
          if (nextXp === 0 || xp < nextXp) {
            break;
          }
          xp -= nextXp;
          level += 1;
          leveledUp = true;
          
          if (level === 99) {
            xp = 0;
            break;
          }
        }
        
        user.level = level;
        user.xp = xp;
        this.setStorage("users", users);
        
        if (leveledUp) {
          this.rpc("evaluate_mission_progress", {
            p_user_id: p_user_id,
            p_trigger_type: "USER_LEVEL_UP",
            p_progress_increment: level
          });
        }
      }
      
      return {
        data: {
          leveled_up: leveledUp,
          level: level,
          xp: xp
        },
        error: null
      };
    }

    if (funcName === "initialize_new_user") {
      const {
        p_user_id,
        p_username,
        p_character_id,
        p_area_id,
        p_gift_code,
        p_gender,
        p_hair_id,
        p_face_id
      } = params;
      
      const users = this.getStorage("users");
      if (users.some((u: any) => u.id === p_user_id)) {
        return { error: { message: "すでに初期セットアップが完了しています。" } };
      }
      if (users.some((u: any) => u.username === p_username)) {
        return { error: { message: "このユーザー名は既に使用されています。" } };
      }

      // ギフトコードの評価
      let inviterId: string | null = null;
      if (p_gift_code && p_gift_code.trim() !== "") {
        const giftCodeTrimmed = p_gift_code.trim();
        const inviter = users.find((u: any) => u.gift_code === giftCodeTrimmed);
        if (!inviter) {
          return { error: { message: "無効なギフトコードです。" } };
        }
        if (inviter.id === p_user_id) {
          return { error: { message: "自分のギフトコードは使用できません。" } };
        }

        const invitations = this.getStorage("user_invitations") || [];
        const inviteCount = invitations.filter((i: any) => i.inviter_id === inviter.id).length;
        if (inviteCount >= 10) {
          return { error: { message: "このギフトコードは10人使用済です。" } };
        }
        inviterId = inviter.id;
      }

      users.push({
        id: p_user_id,
        username: p_username,
        gift_code: null, // 発行ボタンを押すまではNULL
        bio: "歌舞伎町の覇権を握るため立ち上がる。",
        avatar_url: p_character_id === "11111111-1111-1111-1111-111111111111" ? "/reiji_transparent_asset.png" : p_character_id === "33333333-3333-3333-3333-333333333333" ? "/rui_transparent_asset.png" : p_character_id === "22222222-2222-2222-2222-222222222222" ? "/chang_transparent_asset.png" : "/reiji_transparent_asset.png",
        cash: 10000,
        neon_diamonds: 200,
        vitality: 100,
        pvp_tickets: 5,
        sound_settings: { bgm: true, se: true },
        current_base_id: p_area_id === "shinjuku" ? "neon_tower" : p_area_id, // 既存IDをデフォルト拠点にマッピング
        last_tribute_claimed_at: null,
        favorite_character_id: p_character_id || null,
        title_equipped: "title_none",
        equipped_background: "bg_default",
        equipped_front_effect: "effect_none",
        last_active_at: new Date().toISOString(),
        level: 1,
        xp: 0
      });
      this.setStorage("users", users);

      if (p_character_id) {
        const chars = this.getStorage("user_characters");
        chars.push({ id: `c_${p_character_id}`, user_id: p_user_id, character_id: p_character_id, level: 1, awakening_level: 0 });
        this.setStorage("user_characters", chars);

        const skills = this.getStorage("user_skills");
        const skillId = p_character_id === "11111111-1111-1111-1111-111111111111" ? "SKILL_037" : p_character_id === "33333333-3333-3333-3333-333333333333" ? "SKILL_039" : "SKILL_038";
        skills.push({ id: `s_${skillId}`, user_id: p_user_id, skill_card_id: skillId, plus_val: 0, slot_index: 0, equipped_character_id: `c_${p_character_id}` });
        this.setStorage("user_skills", skills);

        const equips = this.getStorage("user_equipments");
        const starterGears = [
          { id: `e_weapon_${p_user_id}`, equipment_id: "WEAPON_001", slot_index: 0 },
          { id: `e_head_${p_user_id}`, equipment_id: "HEAD_001", slot_index: 2 },
          { id: `e_body_${p_user_id}`, equipment_id: "BODY_001", slot_index: 3 },
          { id: `e_legs_${p_user_id}`, equipment_id: "LEGS_001", slot_index: 4 },
          { id: `e_acc_${p_user_id}`, equipment_id: "ACCESSORY_001", slot_index: 5 }
        ];
        starterGears.forEach(g => {
          equips.push({
            id: g.id,
            user_id: p_user_id,
            equipment_id: g.equipment_id,
            level: 1,
            plus_val: 0,
            equipped_character_id: `c_${p_character_id}`,
            slot_index: g.slot_index,
            random_options: [
              { name: "クリティカル率", val: "+5%", unlocked: true },
              { name: "命中率", val: "+8%", unlocked: false },
              { name: "回避率", val: "+6%", unlocked: false },
              { name: "防御貫通力", val: "+12%", unlocked: false }
            ]
          });
        });
        this.setStorage("user_equipments", equips);
      }

      // 招待処理の実行
      if (inviterId) {
        const invitations = this.getStorage("user_invitations") || [];
        invitations.push({
          id: `inv_${Date.now()}`,
          inviter_id: inviterId,
          invitee_id: p_user_id,
          created_at: new Date().toISOString()
        });
        this.setStorage("user_invitations", invitations);

        // 招待者のミッション進捗評価を発火
        this.rpc("evaluate_mission_progress", {
          p_user_id: inviterId,
          p_trigger_type: "USER_INVITE",
          p_progress_increment: 1
        });

        // 被招待者（新規登録者）のプレゼントボックスにギフトコード入力報酬を追加
        const presents = this.getStorage("presents") || [];
        presents.push({
          id: `gift_reward_${Date.now()}`,
          user_id: p_user_id,
          item_id: "DIAMOND",
          quantity: 100,
          message: "ギフトコード入力報酬: ダイヤ獲得",
          status: "UNCLAIMED",
          sent_at: new Date().toISOString(),
          expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        this.setStorage("presents", presents);
      }

      // 初期ミッションの割り当て (user_missions)
      const userMissions = this.getStorage("user_missions") || [];
      const initialMissionIds = [
        "m_pvp_01", "m_pat_01", "m_lvl_01",
        "m_invite_01", "m_invite_02", "m_invite_03", "m_invite_04", "m_invite_05",
        "m_invite_06", "m_invite_07", "m_invite_08", "m_invite_09", "m_invite_10"
      ];
      initialMissionIds.forEach(mId => {
        if (!userMissions.some((um: any) => um.user_id === p_user_id && um.mission_id === mId)) {
          userMissions.push({
            user_id: p_user_id,
            mission_id: mId,
            current_progress: 0,
            status: "PROGRESS",
            updated_at: new Date().toISOString()
          });
        }
      });
      this.setStorage("user_missions", userMissions);

      // I. 初期アバターの登録
      const userAvatarParts = this.getStorage("user_avatar_parts") || [];
      const initialParts = [
        p_hair_id || "hair_male_spiky",
        p_face_id || "face_male_smirk",
        "body_basic"
      ];
      initialParts.forEach(pId => {
        if (!userAvatarParts.some((uap: any) => uap.user_id === p_user_id && uap.part_id === pId)) {
          userAvatarParts.push({
            user_id: p_user_id,
            part_id: pId,
            unlocked_at: new Date().toISOString()
          });
        }
      });
      this.setStorage("user_avatar_parts", userAvatarParts);

      const userAvatars = this.getStorage("user_avatars") || [];
      if (!userAvatars.some((ua: any) => ua.user_id === p_user_id)) {
        userAvatars.push({
          user_id: p_user_id,
          gender: p_gender || "MALE",
          hair_id: p_hair_id || "hair_male_spiky",
          face_id: p_face_id || "face_male_smirk",
          body_id: "body_basic",
          shoes_id: null,
          accessory_id: null,
          bg_effect_1_id: null,
          bg_effect_2_id: null,
          updated_at: new Date().toISOString()
        });
      }
      this.setStorage("user_avatars", userAvatars);

      // PvP ランクの初期登録
      const pvpRanks = this.getStorage("pvp_ranks") || [];
      if (!pvpRanks.some((r: any) => r.user_id === p_user_id)) {
        pvpRanks.push({
          user_id: p_user_id,
          rank_points: 1000,
          daily_wins: 0,
          season_wins: 0,
          updated_at: new Date().toISOString()
        });
        this.setStorage("pvp_ranks", pvpRanks);
      }

      // PvP 防衛デッキの初期登録
      const pvpDecks = this.getStorage("pvp_defense_decks") || [];
      if (!pvpDecks.some((d: any) => d.user_id === p_user_id)) {
        pvpDecks.push({
          user_id: p_user_id,
          character_1_id: `c_${p_character_id}`,
          character_2_id: null,
          character_3_id: null,
          character_4_id: null,
          character_5_id: null,
          tactic: "OFFENSIVE",
          updated_at: new Date().toISOString()
        });
        this.setStorage("pvp_defense_decks", pvpDecks);
      }

      // 初期所持アイテムの追加
      const userItems = this.getStorage("user_items") || [];
      const initialItems = [
        { item_id: "HEAL_POTION", quantity: 5 },
        { item_id: "DOCTOR_SPRAY", quantity: 2 },
        { item_id: "ENERGY_DRINK", quantity: 3 },
        { item_id: "PVP_VIP_PASS", quantity: 3 },
        { item_id: "LAW_OF_STRIFE", quantity: 5 },
        { item_id: "TRAINING_MANUAL", quantity: 10 },
        { item_id: "POLISHING_STONE", quantity: 10 },
        { item_id: "EXCLUSIVE_CONTRACT", quantity: 2 }
      ];
      initialItems.forEach(item => {
        if (!userItems.some((ui: any) => ui.user_id === p_user_id && ui.item_id === item.item_id)) {
          userItems.push({
            user_id: p_user_id,
            item_id: item.item_id,
            quantity: item.quantity,
            updated_at: new Date().toISOString()
          });
        }
      });
      this.setStorage("user_items", userItems);

      return { data: { status: "success" }, error: null };
    }

    if (funcName === "sync_and_recover_vitality_and_tickets") {
      const { p_user_id } = params;
      const users = this.getStorage("users");
      const user = users.find((u: any) => u.id === p_user_id);
      
      if (user) {
        // ギルドみかじめ料判定
        const guildMembers = this.getStorage("guild_members") || [];
        const myMember = guildMembers.find((m: any) => m.user_id === p_user_id);
        
        if (myMember) {
          const controls = this.getStorage("guild_base_controls") || [];
          
          // 各拠点で daily_points が一番高いギルドを支配ギルドとする
          const baseWinners: { [baseId: string]: string } = {};
          const basePoints: { [baseId: string]: number } = {};
          
          controls.forEach((c: any) => {
            if (!basePoints[c.base_id] || c.daily_points > basePoints[c.base_id]) {
              basePoints[c.base_id] = c.daily_points;
              baseWinners[c.base_id] = c.guild_id;
            }
          });

          let controlCount = 0;
          Object.entries(baseWinners).forEach(([bId, gId]) => {
            if (gId === myMember.guild_id) {
              controlCount++;
            }
          });

          if (controlCount > 0) {
            const now = new Date();
            const lastClaim = user.last_tribute_claimed_at ? new Date(user.last_tribute_claimed_at) : null;
            
            const boundary = new Date();
            boundary.setHours(4, 0, 0, 0);
            if (now.getHours() < 4) {
              boundary.setDate(boundary.getDate() - 1);
            }

            if (!lastClaim || lastClaim < boundary) {
              const tributeAmount = controlCount * 10000;
              const presents = this.getStorage("presents") || [];
              presents.push({
                id: `tribute_${Date.now()}`,
                user_id: p_user_id,
                item_id: "CASH",
                quantity: tributeAmount,
                message: `制圧みかじめ料: 支配拠点数 ${controlCount} 箇所`,
                status: "UNCLAIMED",
                sent_at: now.toISOString(),
                expire_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
              });
              this.setStorage("presents", presents);
              
              user.last_tribute_claimed_at = now.toISOString();
              this.setStorage("users", users);
            }
          }
        }
      }

      const activeUser = user || { cash: 10000, neon_diamonds: 200, vitality: 100, pvp_tickets: 5 };
      return {
        data: [{
          out_vitality: activeUser.vitality ?? 100,
          out_tickets: activeUser.pvp_tickets ?? 5,
          out_cash: activeUser.cash ?? 10000,
          out_diamonds: activeUser.neon_diamonds ?? 200
        }],
        error: null
      };
    }

    if (funcName === "sync_and_evaluate_raid_timeout") {
      const { p_raid_boss_id } = params;
      let bosses = this.getStorage("raid_bosses");
      let boss = bosses.find((b: any) => b.id === p_raid_boss_id);
      
      const masters = this.getStorage("raid_boss_master");
      const defaultMaster = masters.find((m: any) => m.id === "BOSS_001") || {
        id: "BOSS_001",
        boss_name: "極道連合組長",
        level: 99,
        max_hp: 9999999,
        atk: 250,
        def: 150,
        spd: 100,
        luk: 5,
        skills: []
      };

      const now = new Date();
      let shouldReset = false;

      if (!boss) {
        // 新規作成
        boss = {
          id: p_raid_boss_id,
          boss_master_id: "BOSS_001",
          base_id: "neon_tower",
          current_hp: defaultMaster.max_hp,
          status: "ACTIVE",
          spawned_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 86400 * 1000).toISOString()
        };
        bosses.push(boss);
        this.setStorage("raid_bosses", bosses);
      } else {
        const expiresAt = new Date(boss.expires_at);
        if (expiresAt <= now) {
          shouldReset = true;
        }
      }

      if (shouldReset) {
        const bases = ["neon_tower", "deep_dock", "junk_bazar", "kitakura_gate"];
        const randomBase = bases[Math.floor(Math.random() * bases.length)];
        
        boss.current_hp = defaultMaster.max_hp;
        boss.status = "ACTIVE";
        boss.base_id = randomBase;
        boss.spawned_at = now.toISOString();
        boss.expires_at = new Date(now.getTime() + 86400 * 1000).toISOString();
        
        // ダメージログと獲得済報酬の削除
        this.setStorage("raid_damage_logs", []);
        this.setStorage("user_raid_claimed_rewards", []);

        // ボスリストの更新
        bosses = bosses.map((b: any) => b.id === p_raid_boss_id ? boss : b);
        this.setStorage("raid_bosses", bosses);
      }

      const activeMaster = masters.find((m: any) => m.id === boss.boss_master_id) || defaultMaster;
      const secondsLeft = Math.max(Math.floor((new Date(boss.expires_at).getTime() - now.getTime()) / 1000), 0);

      return {
        data: [{
          out_current_hp: Number(boss.current_hp),
          out_max_hp: Number(activeMaster.max_hp),
          out_seconds_left: secondsLeft,
          out_base_id: boss.base_id,
          out_boss_name: activeMaster.boss_name,
          out_boss_master_id: boss.boss_master_id
        }],
        error: null
      };
    }

    if (funcName === "evaluate_mission_progress") {
      const { p_user_id, p_trigger_type, p_progress_increment, p_params } = params;
      const missions = this.getStorage("missions");
      const userMissions = this.getStorage("user_missions") || [];
      
      const updated = userMissions.map((um: any) => {
        if (um.user_id !== p_user_id || um.status !== "PROGRESS") return um;
        const m = missions.find((ms: any) => ms.id === um.mission_id);
        if (!m || m.trigger_type !== p_trigger_type) return um;
        
        // condition_params の評価
        if (m.condition_params) {
          let match = true;
          for (const [key, val] of Object.entries(m.condition_params)) {
            if (!p_params || p_params[key] !== val) {
              match = false;
              break;
            }
          }
          if (!match) return um;
        }
        
        const nextProgress = Math.min(um.current_progress + p_progress_increment, m.target_value);
        const nextStatus = nextProgress >= m.target_value ? "CLEAR" : "PROGRESS";
        return {
          ...um,
          current_progress: nextProgress,
          status: nextStatus,
          updated_at: new Date().toISOString()
        };
      });
      
      this.setStorage("user_missions", updated);
      return { data: { status: "success" }, error: null };
    }

    if (funcName === "complete_patrol_instantly") {
      const { p_user_id, p_patrol_id } = params;
      const patrols = this.getStorage("user_patrols") || [];
      const active = patrols.find((p: any) => p.id === p_patrol_id && p.user_id === p_user_id);
      if (!active || active.status !== "ONGOING") {
        return { error: { message: "無効な見回りセッションです。" } };
      }

      const nowStr = new Date().toISOString();
      active.status = "CLAIMABLE";
      active.expires_at = nowStr;

      this.setStorage("user_patrols", patrols);
      return { data: { status: "success" }, error: null };
    }

    if (funcName === "get_pvp_opponents") {
      const { p_user_id, p_my_points } = params;
      const pvpRanks = this.getStorage("pvp_ranks") || [];
      const users = this.getStorage("users") || [];
      const pvpDecks = this.getStorage("pvp_defense_decks") || [];
      const guildMembers = this.getStorage("guild_members") || [];
      const guilds = this.getStorage("guilds") || [];

      // 1. レート差100以内のリアル他ユーザーを抽出
      const candidates = pvpRanks.filter((r: any) => {
        return r.user_id !== p_user_id && Math.abs(r.rank_points - p_my_points) <= 100;
      });

      // シャッフル
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const chosenReal = shuffled.slice(0, 5);

      const result = chosenReal.map((r: any) => {
        const u = users.find((us: any) => us.id === r.user_id) || {};
        const deck = pvpDecks.find((d: any) => d.user_id === r.user_id) || {};
        const gMember = guildMembers.find((gm: any) => gm.user_id === r.user_id);
        const guild = gMember ? guilds.find((g: any) => g.id === gMember.guild_id) : null;

        const charIds = [
          deck.character_1_id,
          deck.character_2_id,
          deck.character_3_id,
          deck.character_4_id,
          deck.character_5_id
        ].filter(Boolean);

        return {
          opponent_user_id: r.user_id,
          opponent_username: u.username || "他プレイヤー",
          opponent_points: r.rank_points,
          opponent_guild_name: guild ? guild.name : "未所属",
          opponent_guild_main_alignment: guild ? guild.main_alignment : null,
          opponent_guild_sub_alignment: guild ? guild.sub_alignment : null,
          is_npc: false,
          defense_character_ids: charIds,
          tactic: deck.tactic || "OFFENSIVE"
        };
      });

      // 2. 5人に満たない場合はダミーNPCを補填
      if (result.length < 5) {
        const npcNames = ["リュウ", "カイ", "シン", "ハヤト", "ユキ"];
        const npcTactics = ["OFFENSIVE", "BALANCED", "DEFENSIVE", "HEALING", "OFFENSIVE"];
        const npcGuilds = ["新宿南部連合", "渋谷ノイズ", "歌舞伎町黒曜会", "池袋アングラ", "六本木シャドウズ"];
        const npcAligns = [
          { main: "EVIL", sub: "CHAOS" },
          { main: "ORDER", sub: "JUSTICE" },
          { main: "EVIL", sub: "ORDER" },
          { main: "JUSTICE", sub: "ORDER" },
          { main: "CHAOS", sub: "EVIL" }
        ];
        
        let npcIdx = 0;
        while (result.length < 5 && npcIdx < npcNames.length) {
          const npcName = npcNames[npcIdx];
          const exists = result.some((r: any) => r.opponent_username.includes(npcName));
          if (!exists) {
            const npcPoints = p_my_points + Math.floor(Math.random() * 100 - 50);
            const dummyCharIds = [
              `dummy_enemy_0`,
              `dummy_enemy_1`,
              `dummy_enemy_2`,
              `dummy_enemy_3`,
              `dummy_enemy_4`
            ].slice(0, 3 + Math.floor(Math.random() * 3));
            
            const align = npcAligns[npcIdx] || { main: "JUSTICE", sub: "ORDER" };

            result.push({
              opponent_user_id: `npc_dummy_${npcIdx}`,
              opponent_username: `${npcName} (NPC)`,
              opponent_points: npcPoints,
              opponent_guild_name: npcGuilds[npcIdx] || "未所属",
              opponent_guild_main_alignment: align.main,
              opponent_guild_sub_alignment: align.sub,
              is_npc: true,
              defense_character_ids: dummyCharIds,
              tactic: npcTactics[npcIdx] || "OFFENSIVE"
            });
          }
          npcIdx++;
        }
      }

      return { data: result.slice(0, 5), error: null };
    }

    return { data: null, error: null };
  }

  // 🗃️ 3. テーブルクエリビルダ (Chained Interface)
  from(tableName: string) {
    const context = this;
    let dataList = this.getStorage(tableName);

    // 各種初期モックシードデータ
    if (dataList.length === 0) {
      if (tableName === "gacha_masters") {
        dataList = [
          { id: "CHAR_TUTORIAL", name: "チュートリアル100連無料ガチャ", gacha_type: "CHARACTER", cost_cash: 0, cost_diamond: 0, cost_pay_diamond: 0, description: "新規登録者限定。無料で100連引ける特別な構成員スカウト。" },
          { id: "CHAR_NORMAL", name: "定常構成員ガチャ", gacha_type: "CHARACTER", cost_cash: 50000, cost_diamond: 100, cost_pay_diamond: 0, description: "キャッシュまたはダイヤで引ける常設の構成員スカウト。" },
          { id: "CHAR_EX", name: "有償限定構成員ガチャ", gacha_type: "CHARACTER", cost_cash: 0, cost_diamond: 0, cost_pay_diamond: 100, description: "有償ダイヤ限定。10連でおまけとして「抗争の掟 x1」を獲得。" },
          { id: "CHAR_LIMIT", name: "【期間限定】ピックアップ構成員ガチャ", gacha_type: "CHARACTER", cost_cash: 0, cost_diamond: 120, cost_pay_diamond: 0, description: "期間限定。情報屋ルイの出現率がアップしている特別な構成員スカウト。" }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "gacha_items_master") {
        dataList = [];
        let idCounter = 1;
        
        // チュートリアルガチャ
        CHARACTERS_MASTER.forEach(char => {
          dataList.push({ id: idCounter++, gacha_id: "CHAR_TUTORIAL", item_id: char.id, weight: 100, is_pickup: false });
        });
        
        // 定常ガチャ
        CHARACTERS_MASTER.forEach(char => {
          dataList.push({ id: idCounter++, gacha_id: "CHAR_NORMAL", item_id: char.id, weight: 100, is_pickup: false });
        });
        
        // 有償限定ガチャ
        CHARACTERS_MASTER.forEach(char => {
          dataList.push({ id: idCounter++, gacha_id: "CHAR_EX", item_id: char.id, weight: 100, is_pickup: false });
        });
        
        // 期間限定（ルイピックアップ）
        CHARACTERS_MASTER.forEach(char => {
          const isRui = char.id === "33333333-3333-3333-3333-333333333333";
          dataList.push({
            id: idCounter++,
            gacha_id: "CHAR_LIMIT",
            item_id: char.id,
            weight: isRui ? 300 : 100,
            is_pickup: isRui
          });
        });
        
        this.setStorage(tableName, dataList);
      }
      if (tableName === "character_growth_patterns") {
        dataList = CHARACTER_GROWTH_PATTERNS;
        this.setStorage(tableName, dataList);
      }
      if (tableName === "character_awakening_master") {
        dataList = CHARACTER_AWAKENING_MASTER;
        this.setStorage(tableName, dataList);
      }
      if (tableName === "enemies") {
        dataList = ENEMIES_MASTER;
        this.setStorage(tableName, dataList);
      }
      if (tableName === "pvp_rewards_master") {
        dataList = [
          { id: "pr1", threshold_points: 2000, reward_item_id: "DIAMOND", reward_quantity: 500 },
          { id: "pr2", threshold_points: 1800, reward_item_id: "DIAMOND", reward_quantity: 300 },
          { id: "pr3", threshold_points: 1500, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "pr4", threshold_points: 0, reward_item_id: "DIAMOND", reward_quantity: 50 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "pvp_ranks") {
        dataList = [
          { id: "pvr_dummy_1", user_id: "dummy_player_id_1", rank_points: 1050, daily_wins: 3, season_wins: 12 },
          { id: "pvr_dummy_2", user_id: "dummy_player_id_2", rank_points: 950, daily_wins: 1, season_wins: 8 },
          { id: "pvr_dummy_3", user_id: "dummy_player_id_3", rank_points: 1100, daily_wins: 5, season_wins: 20 }
        ];
        this.setStorage(tableName, dataList);

        const users = this.getStorage("users");
        const dummyUsers = [
          { id: "dummy_player_id_1", username: "狂犬の狂三", avatar_url: "/reiji_transparent_asset.png", cash: 10000, neon_diamonds: 100 },
          { id: "dummy_player_id_2", username: "歌舞伎町スネーク", avatar_url: "/rui_transparent_asset.png", cash: 5000, neon_diamonds: 50 },
          { id: "dummy_player_id_3", username: "闇金シンジ", avatar_url: "/chang_transparent_asset.png", cash: 50000, neon_diamonds: 500 }
        ];
        dummyUsers.forEach(du => {
          if (!users.some((u: any) => u.id === du.id)) {
            users.push(du);
          }
        });
        this.setStorage("users", users);

        const pvpDecks = this.getStorage("pvp_defense_decks") || [];
        const dummyDecks = [
          { user_id: "dummy_player_id_1", character_1_id: "c_11111111-1111-1111-1111-111111111111", character_2_id: null, character_3_id: null, character_4_id: null, character_5_id: null, tactic: "OFFENSIVE", updated_at: new Date().toISOString() },
          { user_id: "dummy_player_id_2", character_1_id: "c_33333333-3333-3333-3333-333333333333", character_2_id: null, character_3_id: null, character_4_id: null, character_5_id: null, tactic: "DEFENSIVE", updated_at: new Date().toISOString() },
          { user_id: "dummy_player_id_3", character_1_id: "c_22222222-2222-2222-2222-222222222222", character_2_id: null, character_3_id: null, character_4_id: null, character_5_id: null, tactic: "BALANCED", updated_at: new Date().toISOString() }
        ];
        dummyDecks.forEach(dd => {
          if (!pvpDecks.some((d: any) => d.user_id === dd.user_id)) {
            pvpDecks.push(dd);
          }
        });
        this.setStorage("pvp_defense_decks", pvpDecks);
      }
      if (tableName === "avatar_parts") {
        dataList = [
          { id: "base_male", name: "男性素体", part_type: "BODY", image_path: "/avatar/base_male.webp", price_cash: 0, price_diamond: 0 },
          { id: "base_female", name: "女性素体", part_type: "BODY", image_path: "/avatar/base_female.webp", price_cash: 0, price_diamond: 0 },
          { id: "body_basic", name: "ベーシックアパレル", part_type: "BODY", image_path: "/avatar/body_basic.webp", price_cash: 0, price_diamond: 0 },
          
          { id: "face_male_standard", name: "通常 (男)", part_type: "FACE", image_path: "/avatar/face_male_standard.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_male_smirk", name: "不敵 (男)", part_type: "FACE", image_path: "/avatar/face_male_smirk.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_male_angry", name: "怒り (男)", part_type: "FACE", image_path: "/avatar/face_male_angry.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_male_smile", name: "笑顔 (男)", part_type: "FACE", image_path: "/avatar/face_male_smile.webp", price_cash: 0, price_diamond: 0 },
          
          { id: "face_female_standard", name: "通常 (女)", part_type: "FACE", image_path: "/avatar/face_female_standard.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_female_smirk", name: "不敵 (女)", part_type: "FACE", image_path: "/avatar/face_female_smirk.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_female_angry", name: "怒り (女)", part_type: "FACE", image_path: "/avatar/face_female_angry.webp", price_cash: 0, price_diamond: 0 },
          { id: "face_female_smile", name: "笑顔 (女)", part_type: "FACE", image_path: "/avatar/face_female_smile.webp", price_cash: 0, price_diamond: 0 },
          
          { id: "hair_male_spiky", name: "ツンツン (男)", part_type: "HAIR", image_path: "/avatar/hair_male_spiky.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_male_short", name: "ショート (男)", part_type: "HAIR", image_path: "/avatar/hair_male_short.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_male_wavy", name: "ウエーブ (男)", part_type: "HAIR", image_path: "/avatar/hair_male_wavy.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_male_long", name: "ロング (男)", part_type: "HAIR", image_path: "/avatar/hair_male_long.webp", price_cash: 0, price_diamond: 0 },
          
          { id: "hair_female_spiky", name: "ツンツン (女)", part_type: "HAIR", image_path: "/avatar/hair_female_spiky.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_female_short", name: "ショート (女)", part_type: "HAIR", image_path: "/avatar/hair_female_short.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_female_wavy", name: "ウエーブ (女)", part_type: "HAIR", image_path: "/avatar/hair_female_wavy.webp", price_cash: 0, price_diamond: 0 },
          { id: "hair_female_long", name: "ロング (女)", part_type: "HAIR", image_path: "/avatar/hair_female_long.webp", price_cash: 0, price_diamond: 0 },
          
          { id: "effect_aura_purple", name: "紫のオーラ", part_type: "BACKGROUND_EFFECT", image_path: "/avatar/effect_aura_purple.webp", price_cash: 5000, price_diamond: 0 },
          { id: "effect_sparks_gold", name: "黄金の火花", part_type: "BACKGROUND_EFFECT", image_path: "/avatar/effect_sparks_gold.webp", price_cash: 0, price_diamond: 50 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "news") {
        dataList = [
          { id: 1, category: "INFO", title: "【モックDB】ローカルオフラインデモモードで稼働中", content: "SupabaseのAPIキーがダミーのため、ブラウザのローカルストレージ（Mock DB）を用いて全ゲームデータを処理しています。お手元の.env.localに実プロジェクトのキーをセットすると、自動的に実DB同期に切り替わります。", start_at: new Date().toISOString() }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "guilds") {
        dataList = [
          { 
            id: "g1", 
            name: "新宿シャドウズ", 
            leader_id: "leader1", 
            level: 5, 
            xp: 200, 
            main_alignment: null, 
            sub_alignment: null,
            funds: 25000,
            unlocked_decorations: [],
            unlocked_banners: [],
            equipped_decoration: null,
            equipped_banner: null
          }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "guild_level_master") {
        dataList = [
          { level: 1, next_xp: 1000 }, { level: 2, next_xp: 2000 }, { level: 3, next_xp: 3000 },
          { level: 4, next_xp: 4000 }, { level: 5, next_xp: 5000 }, { level: 6, next_xp: 6000 },
          { level: 7, next_xp: 7000 }, { level: 8, next_xp: 8000 }, { level: 9, next_xp: 9000 },
          { level: 10, next_xp: 10000 }, { level: 11, next_xp: 12000 }, { level: 12, next_xp: 14000 },
          { level: 13, next_xp: 16000 }, { level: 14, next_xp: 18000 }, { level: 15, next_xp: 20000 },
          { level: 16, next_xp: 22000 }, { level: 17, next_xp: 24000 }, { level: 18, next_xp: 26000 },
          { level: 19, next_xp: 28000 }, { level: 20, next_xp: 30000 }, { level: 21, next_xp: 35000 },
          { level: 22, next_xp: 40000 }, { level: 23, next_xp: 45000 }, { level: 24, next_xp: 50000 },
          { level: 25, next_xp: 55000 }, { level: 26, next_xp: 60000 }, { level: 27, next_xp: 65000 },
          { level: 28, next_xp: 70000 }, { level: 29, next_xp: 75000 }, { level: 30, next_xp: 80000 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "guild_xp_action_master") {
        dataList = [
          { action_type: "QUEST", xp_gain: 30, contribution_gain: 20 },
          { action_type: "PVP", xp_gain: 50, contribution_gain: 30 },
          { action_type: "GVG", xp_gain: 150, contribution_gain: 100 },
          { action_type: "DONATE_SMALL", xp_gain: 20, contribution_gain: 10 },
          { action_type: "DONATE_MEDIUM", xp_gain: 120, contribution_gain: 60 },
          { action_type: "DONATE_LARGE", xp_gain: 300, contribution_gain: 150 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "guild_base_controls") {
        dataList = [
          { base_id: "neon_tower", guild_id: "g1", daily_points: 1200, total_seasonal_days: 3, is_controlling: true },
          { base_id: "deep_dock", guild_id: "g1", daily_points: 500, total_seasonal_days: 1, is_controlling: false }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "quest_towns") {
        dataList = [
          { id: "shinjuku", name: "新宿" },
          { id: "shibuya", name: "渋谷" },
          { id: "ikebukuro", name: "池袋" },
          { id: "roppongi", name: "六本木" },
          { id: "akihabara", name: "秋葉原" },
          { id: "kawasaki", name: "川崎" },
          { id: "yokohama", name: "横浜" }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "quests") {
        dataList = [
          { id: "q_shinjuku_easy", town_id: "shinjuku", name: "歌舞伎町の見回り (初級)", course_type: "EASY", duration_seconds: 60, cost_vitality: 10, reward_cash: 500, reward_items_pool: [{ item_id: "TRAINING_MANUAL", chance: 0.8 }], reward_xp: 100 },
          { id: "q_shinjuku_normal", town_id: "shinjuku", name: "ホストクラブの用心棒 (中級)", course_type: "NORMAL", duration_seconds: 180, cost_vitality: 30, reward_cash: 2500, reward_items_pool: [{ item_id: "POLISHING_STONE", chance: 0.5 }], reward_xp: 300 },
          { id: "q_shinjuku_hard", town_id: "shinjuku", name: "闇スロットの利権争い (上級)", course_type: "HARD", duration_seconds: 300, cost_vitality: 50, reward_cash: 6000, reward_items_pool: [{ item_id: "LAW_OF_STRIFE", chance: 0.3 }], reward_xp: 500 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "user_level_master") {
        dataList = [];
        for (let i = 1; i <= 99; i++) {
          dataList.push({
            level: i,
            next_xp: i === 99 ? 0 : i * 100
          });
        }
        this.setStorage(tableName, dataList);
      }
      if (tableName === "pvp_match_rewards_master") {
        dataList = [
          { status: "VICTORY", reward_xp: 150, reward_cash_base: 400 },
          { status: "DEFEAT", reward_xp: 0, reward_cash_base: 0 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "board_posts") {
        dataList = [
          { id: 1, author_name: "システム", content: "暗号化SNS『TRIBE』へようこそ。現在モックDBモードで同期中です。", target_type: "GLOBAL", created_at: new Date().toISOString() }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "missions") {
        dataList = [
          { id: "m_pvp_01", category: "DAILY", title: "PvP挑戦 I", description: "PvPで1回勝利する", trigger_type: "PVP_WIN", target_value: 1, reward_item_id: "DIAMOND", reward_quantity: 50 },
          { id: "m_pat_01", category: "DAILY", title: "見回り I", description: "見回りを1回完了する", trigger_type: "PATROL_CLEAR", target_value: 1, reward_item_id: "CASH", reward_quantity: 1000 },
          { id: "m_lvl_01", category: "NORMAL", title: "首領の成長 I", description: "お気に入りキャラをレベル2にする", trigger_type: "CHAR_LEVEL_UP", target_value: 2, reward_item_id: "TRAINING_MANUAL", reward_quantity: 5 },
          { id: "m_invite_01", category: "NORMAL", title: "盟友の招聘 I", description: "他のプレイヤーを1人招待する", trigger_type: "USER_INVITE", target_value: 1, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "m_invite_02", category: "NORMAL", title: "盟友の招聘 II", description: "他のプレイヤーを2人招待する", trigger_type: "USER_INVITE", target_value: 2, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "m_invite_03", category: "NORMAL", title: "盟友の招聘 III", description: "他のプレイヤーを3人招待する", trigger_type: "USER_INVITE", target_value: 3, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "m_invite_04", category: "NORMAL", title: "盟友の招聘 IV", description: "他のプレイヤーを4人招待する", trigger_type: "USER_INVITE", target_value: 4, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "m_invite_05", category: "NORMAL", title: "盟友の招聘 V", description: "他のプレイヤーを5人招待する", trigger_type: "USER_INVITE", target_value: 5, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "m_invite_06", category: "NORMAL", title: "盟友の招聘 VI", description: "他のプレイヤーを6人招待する", trigger_type: "USER_INVITE", target_value: 6, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "m_invite_07", category: "NORMAL", title: "盟友の招聘 VII", description: "他のプレイヤーを7人招待する", trigger_type: "USER_INVITE", target_value: 7, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "m_invite_08", category: "NORMAL", title: "盟友の招聘 VIII", description: "他のプレイヤーを8人招待する", trigger_type: "USER_INVITE", target_value: 8, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "m_invite_09", category: "NORMAL", title: "盟友の招聘 IX", description: "他のプレイヤーを9人招待する", trigger_type: "USER_INVITE", target_value: 9, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "m_invite_10", category: "NORMAL", title: "盟友の招聘 X", description: "他のプレイヤーを10人招待する", trigger_type: "USER_INVITE", target_value: 10, reward_item_id: "DIAMOND", reward_quantity: 300 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "raid_boss_master") {
        dataList = [
          {
            id: "BOSS_001",
            boss_name: "極道連合組長",
            level: 99,
            max_hp: 9999999,
            atk: 250,
            def: 150,
            spd: 100,
            luk: 5,
            skills: [
              { id: "e_boss_atk", name: "新宿壊滅撃", ap_cost: 2, power: 180, effect_type: "ATTACK" },
              { id: "e_boss_def", name: "防弾プロテクト", ap_cost: 1, power: 80, effect_type: "DEFENSE" }
            ]
          }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "raid_rewards_master") {
        dataList = [
          { id: "r1", reward_type: "DEFEAT", threshold_val: 50000, reward_item_id: "DIAMOND", reward_quantity: 50 },
          { id: "r2", reward_type: "DEFEAT", threshold_val: 50000, reward_item_id: "CASH", reward_quantity: 3000 },
          { id: "r3", reward_type: "DAMAGE_ACCUM", threshold_val: 100000, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "r4", reward_type: "DAMAGE_ACCUM", threshold_val: 500000, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "r5", reward_type: "DAMAGE_ACCUM", threshold_val: 1000000, reward_item_id: "DIAMOND", reward_quantity: 250 },
          { id: "r6", reward_type: "RANK_PERSONAL", threshold_val: 1, reward_item_id: "DIAMOND", reward_quantity: 1000 },
          { id: "r7", reward_type: "RANK_PERSONAL", threshold_val: 2, reward_item_id: "DIAMOND", reward_quantity: 500 },
          { id: "r8", reward_type: "RANK_PERSONAL", threshold_val: 3, reward_item_id: "DIAMOND", reward_quantity: 500 },
          { id: "r9", reward_type: "RANK_PERSONAL", threshold_val: 10, reward_item_id: "DIAMOND", reward_quantity: 300 },
          { id: "r10", reward_type: "RANK_GUILD", threshold_val: 1, reward_item_id: "DIAMOND", reward_quantity: 300 },
          { id: "r11", reward_type: "RANK_GUILD", threshold_val: 2, reward_item_id: "DIAMOND", reward_quantity: 150 },
          { id: "r12", reward_type: "RANK_GUILD", threshold_val: 3, reward_item_id: "DIAMOND", reward_quantity: 150 }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "raid_bosses") {
        const now = new Date();
        dataList = [
          {
            id: "88888888-8888-8888-8888-888888888888",
            boss_master_id: "BOSS_001",
            base_id: "neon_tower",
            current_hp: 9452100,
            status: "ACTIVE",
            spawned_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 86400 * 1000).toISOString()
          }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "gvg_defense_decks") {
        dataList = [];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "gvg_matches") {
        dataList = [];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "user_gvg_ranks") {
        dataList = [];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "gvg_season_status") {
        dataList = [
          { id: 1, current_day: 1, updated_at: new Date().toISOString() }
        ];
        this.setStorage(tableName, dataList);
      }
      if (tableName === "gvg_rewards_master") {
        dataList = [
          { id: "gr1", reward_type: "DAILY_CONTROL", threshold_val: 1, reward_item_id: "DIAMOND", reward_quantity: 50 },
          { id: "gr2", reward_type: "DAILY_CONTROL", threshold_val: 1, reward_item_id: "CASH", reward_quantity: 5000 },
          { id: "gr3", reward_type: "SEASON_PERSONAL_RANK", threshold_val: 1, reward_item_id: "DIAMOND", reward_quantity: 500 },
          { id: "gr4", reward_type: "SEASON_PERSONAL_RANK", threshold_val: 2, reward_item_id: "DIAMOND", reward_quantity: 300 },
          { id: "gr5", reward_type: "SEASON_PERSONAL_RANK", threshold_val: 3, reward_item_id: "DIAMOND", reward_quantity: 100 },
          { id: "gr6", reward_type: "SEASON_GUILD_FINALS", threshold_val: 1, reward_item_id: "DIAMOND", reward_quantity: 1000 },
          { id: "gr7", reward_type: "SEASON_GUILD_FINALS", threshold_val: 2, reward_item_id: "DIAMOND", reward_quantity: 500 },
          { id: "gr8", reward_type: "SEASON_GUILD_FINALS", threshold_val: 3, reward_item_id: "DIAMOND", reward_quantity: 200 }
        ];
        this.setStorage(tableName, dataList);
      }
    }

    class QueryBuilder {
      private list: any[] = [...dataList];
      private filters: Array<(item: any) => boolean> = [];
      private orderByCol: string | null = null;
      private orderAsc = true;
      private limitVal: number | null = null;
      private isUpsert = false;

      private action: "SELECT" | "INSERT" | "UPDATE" | "DELETE" = "SELECT";
      private actionData: any = null;

      select(cols?: string) {
        this.action = "SELECT";
        return this;
      }

      eq(col: string, val: any) {
        this.filters.push((item: any) => {
          if (col === "users.username" || col === "guilds.name") return true; // リレーション簡易通過
          return item[col] === val;
        });
        return this;
      }

      neq(col: string, val: any) {
        this.filters.push((item: any) => item[col] !== val);
        return this;
      }

      gte(col: string, val: any) {
        this.filters.push((item: any) => item[col] >= val);
        return this;
      }

      in(col: string, vals: any[]) {
        this.filters.push((item: any) => vals.includes(item[col]));
        return this;
      }

      order(col: string, opts?: { ascending?: boolean }) {
        this.orderByCol = col;
        this.orderAsc = opts?.ascending !== false;
        return this;
      }

      limit(n: number) {
        this.limitVal = n;
        return this;
      }

      insert(newData: any) {
        this.action = "INSERT";
        this.actionData = newData;
        return this;
      }

      update(updateData: any) {
        this.action = "UPDATE";
        this.actionData = updateData;
        return this;
      }

      upsert(upsertData: any, opts?: any) {
        this.action = "INSERT";
        this.actionData = upsertData;
        this.isUpsert = true;
        return this;
      }

      delete() {
        this.action = "DELETE";
        return this;
      }

      async single() {
        const { data, error } = await this.execute();
        if (error) return { data: null, error };
        if (!data || data.length === 0) return { data: null, error: { message: "No row found" } };
        return { data: data[0], error: null };
      }

      async maybeSingle() {
        const { data, error } = await this.execute();
        if (error) return { data: null, error };
        if (!data || data.length === 0) return { data: null, error: null };
        return { data: data[0], error: null };
      }

      async then(resolve: any) {
        const res = await this.execute();
        resolve(res);
      }

      private async execute() {
        let filtered = this.list;
        this.filters.forEach(f => {
          filtered = filtered.filter(f);
        });

        if (this.orderByCol) {
          filtered.sort((a, b) => {
            const valA = a[this.orderByCol!];
            const valB = b[this.orderByCol!];
            if (valA < valB) return this.orderAsc ? -1 : 1;
            if (valA > valB) return this.orderAsc ? 1 : -1;
            return 0;
          });
        }
        if (this.limitVal !== null) {
          filtered = filtered.slice(0, this.limitVal);
        }

        if (this.action === "INSERT") {
          const rows = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
          const allList = context.getStorage(tableName);
          const insertedRows: any[] = [];

          rows.forEach((r: any) => {
            let matchIdx = -1;
            if (this.isUpsert) {
              if (tableName === "guild_base_controls") {
                matchIdx = allList.findIndex((item: any) => item.base_id === r.base_id && item.guild_id === r.guild_id);
              } else if (tableName === "user_gvg_ranks" || tableName === "gvg_defense_decks" || tableName === "pvp_defense_decks" || tableName === "pvp_ranks" || tableName === "user_power_rankings" || tableName === "users") {
                matchIdx = allList.findIndex((item: any) => item.user_id === r.user_id || item.id === r.user_id);
              } else if (r.id) {
                matchIdx = allList.findIndex((item: any) => item.id === r.id);
              }
            }

            if (matchIdx !== -1) {
              allList[matchIdx] = { ...allList[matchIdx], ...r, updated_at: new Date().toISOString() };
              insertedRows.push(allList[matchIdx]);
            } else {
              const newRow = {
                id: r.id || Math.floor(Math.random() * 89999) + 10000,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...r
              };
              allList.push(newRow);
              insertedRows.push(newRow);
            }
          });

          dataList = allList;
          context.setStorage(tableName, dataList);
          return { data: Array.isArray(this.actionData) ? insertedRows : insertedRows[0], error: null };
        }

        if (this.action === "UPDATE") {
          filtered.forEach(item => {
            Object.assign(item, this.actionData);
          });
          
          const allList = context.getStorage(tableName);
          allList.forEach((item: any) => {
            const match = filtered.find(f => f.id === item.id || (f.user_id && f.user_id === item.user_id && tableName === "users"));
            if (match) {
              Object.assign(item, match);
            }
          });
          context.setStorage(tableName, allList);
          return { data: filtered, error: null };
        }

        if (this.action === "DELETE") {
          const allList = context.getStorage(tableName);
          const nextList = allList.filter((item: any) => !filtered.some(f => f.id === item.id));
          context.setStorage(tableName, nextList);
          return { data: filtered, error: null };
        }

        if (this.action === "SELECT") {
          if (tableName === "user_avatars") {
            const tribeDemoUuid = typeof window !== "undefined" ? localStorage.getItem("tribe_demo_uuid") : null;
            if (filtered.length === 0 && tribeDemoUuid) {
              const defaultAvatar = {
                user_id: tribeDemoUuid,
                gender: "MALE",
                hair_id: "hair_male_spiky",
                face_id: "face_male_smirk",
                body_id: "body_basic",
                shoes_id: null,
                accessory_id: null,
                bg_effect_1_id: null,
                bg_effect_2_id: null,
                updated_at: new Date().toISOString()
              };
              const userAvatars = context.getStorage("user_avatars") || [];
              userAvatars.push(defaultAvatar);
              context.setStorage("user_avatars", userAvatars);
              filtered = [defaultAvatar];

              const userAvatarParts = context.getStorage("user_avatar_parts") || [];
              ["hair_male_spiky", "face_male_smirk", "body_basic"].forEach(pId => {
                if (!userAvatarParts.some((uap: any) => uap.user_id === tribeDemoUuid && uap.part_id === pId)) {
                  userAvatarParts.push({
                    user_id: tribeDemoUuid,
                    part_id: pId,
                    unlocked_at: new Date().toISOString()
                  });
                }
              });
              context.setStorage("user_avatar_parts", userAvatarParts);
            }
          }
          if (tableName === "user_missions") {
            const missions = context.getStorage("missions");
            const joined = filtered.map((um: any) => {
              const m = missions.find((ms: any) => ms.id === um.mission_id);
              return {
                ...um,
                missions: m || null
              };
            });
            return { data: joined, error: null };
          }
          if (tableName === "pvp_ranks") {
            const users = context.getStorage("users");
            const joined = filtered.map((pr: any) => {
              const u = users.find((us: any) => us.id === pr.user_id);
              return {
                ...pr,
                users: u ? { username: u.username, avatar_url: u.avatar_url } : null
              };
            });
            return { data: joined, error: null };
          }
          if (tableName === "guild_members") {
            const users = context.getStorage("users");
            const joined = filtered.map((gm: any) => {
              const u = users.find((us: any) => us.id === gm.user_id);
              return {
                ...gm,
                users: u ? { username: u.username, avatar_url: u.avatar_url, bio: u.bio, favorite_character_id: u.favorite_character_id } : null
              };
            });
            return { data: joined, error: null };
          }
          if (tableName === "guild_base_controls") {
            const guilds = context.getStorage("guilds");
            const joined = filtered.map((gbc: any) => {
              const g = guilds.find((gu: any) => gu.id === gbc.guild_id);
              return {
                ...gbc,
                guilds: g ? { name: g.name } : null
              };
            });
            return { data: joined, error: null };
          }
          if (tableName === "user_gvg_ranks") {
            const users = context.getStorage("users");
            const joined = filtered.map((ugr: any) => {
              const u = users.find((us: any) => us.id === ugr.user_id);
              return {
                ...ugr,
                users: u ? { username: u.username, avatar_url: u.avatar_url } : null
              };
            });
            return { data: joined, error: null };
          }
          if (tableName === "gvg_matches") {
            const guilds = context.getStorage("guilds");
            const joined = filtered.map((gm: any) => {
              const ga = guilds.find((gu: any) => gu.id === gm.guild_a_id);
              const gb = guilds.find((gu: any) => gu.id === gm.guild_b_id);
              return {
                ...gm,
                guild_a: ga ? { name: ga.name } : null,
                guild_b: gb ? { name: gb.name } : null
              };
            });
            return { data: joined, error: null };
          }
        }

        return { data: filtered, error: null };
      }
    }


    return new QueryBuilder();
  }
}

export const supabase = (isDummy
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey)) as SupabaseClient<any, "public", any>;
