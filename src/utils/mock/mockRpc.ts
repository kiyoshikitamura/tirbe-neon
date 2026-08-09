"use client";




export async function executeMockRpc(client: any, funcName: string, params: any): Promise<any> {
  console.log(`[Mock DB RPC] Calling ${funcName} with:`, params);

  if (funcName === "save_pvp_defense_deck" || funcName === "save_gvg_defense_deck") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    if (!userId) return { data: null, error: { message: "authentication required", code: "42501" } };
    const requestedIds = Array.isArray(params.p_character_ids) ? params.p_character_ids.filter(Boolean) : [];
    if (requestedIds.length > 5) return { data: null, error: { message: "party supports at most five characters", code: "22023" } };
    const ownedCharacters = client.getStorage("user_characters") || [];
    const canonicalIds = requestedIds.map((requestedId: string) => {
      const owned = ownedCharacters.find((character: any) =>
        character.user_id === userId && (character.id === requestedId || character.character_id === requestedId)
      );
      return owned?.id || null;
    });
    if (canonicalIds.some((id: string | null) => !id)) {
      return { data: null, error: { message: "party contains a character that is not owned", code: "23503" } };
    }
    if (new Set(canonicalIds).size !== canonicalIds.length) {
      return { data: null, error: { message: "party contains duplicate characters", code: "23505" } };
    }

    if (funcName === "save_gvg_defense_deck") {
      const memberships = client.getStorage("guild_members") || [];
      const membership = memberships.find((member: any) => member.user_id === userId);
      if (!membership) return { data: null, error: { message: "guild membership required", code: "42501" } };
      const decks = client.getStorage("gvg_defense_decks") || [];
      const remaining = decks.filter((deck: any) => deck.user_id !== userId);
      if (canonicalIds.length > 0) {
        remaining.push({
          id: `gvg_defense_${userId}`,
          user_id: userId,
          guild_id: membership.guild_id,
          character_1_id: canonicalIds[0] || null,
          character_2_id: canonicalIds[1] || null,
          character_3_id: canonicalIds[2] || null,
          character_4_id: canonicalIds[3] || null,
          character_5_id: canonicalIds[4] || null,
          updated_at: new Date().toISOString(),
        });
      }
      client.setStorage("gvg_defense_decks", remaining);
      return { data: { status: "success", removed: canonicalIds.length === 0, character_ids: canonicalIds }, error: null };
    }

    const tactic = params.p_tactic || "ATTACK_PRIORITY";
    const validTactics = ["ATTACK_PRIORITY", "HEAL_PRIORITY", "SKILL_PRIORITY", "BALANCED", "WEAKNESS_FOCUS"];
    if (!validTactics.includes(tactic)) return { data: null, error: { message: "invalid tactic", code: "22023" } };
    const decks = client.getStorage("pvp_defense_decks") || [];
    const existing = decks.find((deck: any) => deck.user_id === userId);
    const nextDeck = {
      ...(existing || { id: `pvp_defense_${userId}`, user_id: userId }),
      character_1_id: canonicalIds[0] || null,
      character_2_id: canonicalIds[1] || null,
      character_3_id: canonicalIds[2] || null,
      character_4_id: canonicalIds[3] || null,
      character_5_id: canonicalIds[4] || null,
      tactic,
      updated_at: new Date().toISOString(),
    };
    client.setStorage("pvp_defense_decks", existing ? decks.map((deck: any) => deck.user_id === userId ? nextDeck : deck) : [...decks, nextDeck]);
    return { data: { status: "success", character_ids: canonicalIds, tactic }, error: null };
  }

  if (funcName === "begin_gvg_attack") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    const user = users.find((entry: any) => entry.id === userId);
    const members = client.getStorage("guild_members") || [];
    const membership = members.find((entry: any) => entry.user_id === userId);
    const matches = client.getStorage("gvg_match_sessions") || [];
    const match = matches.find((entry: any) => entry.id === params.p_match_session_id && entry.status === "ACTIVE");
    if (!user || !membership || !match || Number(user.vitality || 0) < 20) return { data: null, error: { message: "公式GvGに参加できません。" } };
    const defenderSide = match.guild_a_id === membership.guild_id ? "B" : "A";
    const snapshots = client.getStorage("gvg_match_member_snapshots") || [];
    const candidates = snapshots.filter((entry: any) => entry.match_session_id === match.id && entry.side === defenderSide);
    const target = candidates[0];
    if (!target) return { data: null, error: { message: "防衛スナップショットがありません。" } };
    user.vitality -= 20;
    const attacks = client.getStorage("gvg_attack_logs") || [];
    const attack = { id: `gvg_attack_${Date.now()}`, match_session_id: match.id, attacker_user_id: userId, attacker_guild_id: membership.guild_id, defender_snapshot_id: target.id, battle_result: "PENDING", raw_damage: 0, applied_damage: 0 };
    attacks.push(attack);
    client.setStorage("users", users);
    client.setStorage("gvg_attack_logs", attacks);
    return { data: { attack_id: attack.id, remaining_ap: user.vitality, defense_deck: target.defense_deck || [] }, error: null };
  }

  if (funcName === "cancel_unresolved_gvg_attack") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const attacks = client.getStorage("gvg_attack_logs") || [];
    const attack = attacks.find((entry: any) => entry.id === params.p_attack_id && entry.attacker_user_id === userId && entry.battle_result === "PENDING");
    if (!attack) return { data: null, error: { message: "未確定の公式GvG攻撃がありません。" } };

    const replays = client.getStorage("battle_replay_sessions") || [];
    const relatedReplays = replays.filter((entry: any) => entry.requester_user_id === userId && entry.battle_mode === "GVG" && entry.source_reference_id === attack.id);
    if (relatedReplays.some((entry: any) => entry.status !== "PENDING")) {
      return { data: null, error: { message: "確定済みの公式GvGリプレイは取消できません。" } };
    }

    client.setStorage("battle_replay_sessions", replays.filter((entry: any) => !relatedReplays.includes(entry)));
    client.setStorage("gvg_attack_logs", attacks.filter((entry: any) => entry !== attack));
    return { data: null, error: null };
  }

  if (funcName === "create_battle_replay_pending") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    if (!userId || !Array.isArray(params.p_player_snapshot) || !Array.isArray(params.p_enemy_snapshot)) return { data: null, error: { message: "リプレイ入力が不正です。" } };
    const sessions = client.getStorage("battle_replay_sessions") || [];
    const id = `replay_${Date.now()}`;
    sessions.push({ id, requester_user_id: userId, battle_mode: params.p_battle_mode, tactic_id: params.p_tactic_id, random_seed: params.p_random_seed, source_reference_id: params.p_source_reference_id || null, status: "PENDING", player_snapshot: params.p_player_snapshot, enemy_snapshot: params.p_enemy_snapshot });
    client.setStorage("battle_replay_sessions", sessions);
    return { data: id, error: null };
  }

  if (funcName === "resolve_gvg_attack") {
    const attacks = client.getStorage("gvg_attack_logs") || [];
    const replays = client.getStorage("battle_replay_sessions") || [];
    const attack = attacks.find((entry: any) => entry.id === params.p_attack_id && entry.battle_result === "PENDING");
    const replay = replays.find((entry: any) => entry.id === params.p_battle_replay_session_id && entry.status === "RESOLVED" && entry.source_reference_id === params.p_attack_id);
    if (!attack || !replay) return { data: null, error: { message: "公式GvG結果を確定できません。" } };
    const rawDamage = Number(replay.result?.playerRawDamage || 0);
    const isVictory = replay.result?.winner === "PLAYER";
    attack.battle_result = isVictory ? "VICTORY" : "DEFEAT";
    attack.raw_damage = rawDamage;
    attack.applied_damage = Math.floor(rawDamage * (isVictory ? 1.5 : 1));
    attack.battle_replay_session_id = replay.id;
    client.setStorage("gvg_attack_logs", attacks);
    return { data: { raw_damage: rawDamage, applied_damage: attack.applied_damage }, error: null };
  }

  if (funcName === "get_user_setup_status") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    // The browser demo is a QA environment, not the production onboarding.
    // Give each persisted demo identity a baseline profile on first use so a
    // refresh never sends a reviewer back to player registration.
    if (userId && !users.some((user: any) => user.id === userId)) {
      const shortId = userId.slice(-4);
      const seeded = await executeMockRpc(client, "initialize_new_user", {
        p_user_id: userId,
        p_username: `検証${shortId}`,
        p_character_id: "11111111-1111-1111-1111-111111111111",
        p_area_id: "shinjuku",
        p_gift_code: null,
      });
      if (seeded.error) return seeded;
    }
    const currentUsers = client.getStorage("users") || [];
    return { data: !!userId && currentUsers.some((user: any) => user.id === userId), error: null };
  }

  if (funcName === "get_public_profiles") {
    const userIds = params.p_user_ids || [];
    const users = client.getStorage("users") || [];
    const members = client.getStorage("guild_members") || [];
    const guilds = client.getStorage("guilds") || [];
    return {
      data: users.filter((user: any) => userIds.includes(user.id)).map((user: any) => {
        const membership = members.find((member: any) => member.user_id === user.id);
        const guild = guilds.find((entry: any) => entry.id === membership?.guild_id);
        return { ...user, user_id: user.id, title_name: user.title_equipped || "称号なし", guild_id: membership?.guild_id || null, guild_name: guild?.name || null };
      }),
      error: null
    };
  }

  if (funcName === "start_tutorial_progress") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    if (!userId) return { data: null, error: { message: "Authentication is required" } };
    const progress = client.getStorage("tutorial_progress") || [];
    if (!progress.some((entry: any) => entry.user_id === userId)) {
      progress.push({ user_id: userId, step_id: "WORLD_INTRO" });
      client.setStorage("tutorial_progress", progress);
    }
    return { data: "WORLD_INTRO", error: null };
  }

  if (funcName === "advance_tutorial_progress") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const progress = client.getStorage("tutorial_progress") || [];
    const entry = progress.find((value: any) => value.user_id === userId);
    if (!entry || entry.step_id !== params.p_expected_step) return { data: null, error: { message: "Unexpected tutorial step" } };
    entry.step_id = params.p_next_step;
    client.setStorage("tutorial_progress", progress);
    return { data: entry.step_id, error: null };
  }

  if (funcName === "complete_tutorial_authentication") {
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const progress = client.getStorage("tutorial_progress") || [];
    const entry = progress.find((value: any) => value.user_id === userId);
    if (!entry || entry.step_id !== "COMPLETE") return { data: null, error: { message: "Tutorial completion is required" } };
    const methods = client.getStorage("user_account_auth_methods") || [];
    if (methods.some((value: any) => value.user_id === userId)) return { data: null, error: { message: "An authentication method is already linked" } };
    methods.push({ user_id: userId, auth_method: params.p_auth_method });
    entry.step_id = "AUTHENTICATION";
    client.setStorage("tutorial_progress", progress);
    client.setStorage("user_account_auth_methods", methods);
    return { data: "AUTHENTICATION", error: null };
  }

  if (funcName === "send_direct_message") {
    const { p_recipient_id, p_message } = params;
    const senderId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    const recipientExists = users.some((user: any) => user.id === p_recipient_id);
    if (!senderId || !p_recipient_id || p_recipient_id === senderId || typeof p_message !== "string" || !p_message.trim() || p_message.length > 140 || !recipientExists) {
      return { data: null, error: { message: "Invalid direct-message recipient" } };
    }
    const messages = client.getStorage("direct_messages") || [];
    const message = { id: `dm_${Date.now()}`, sender_id: senderId, recipient_id: p_recipient_id, message: p_message.trim(), created_at: new Date().toISOString() };
    messages.push(message);
    client.setStorage("direct_messages", messages);
    return { data: message, error: null };
  }

  if (funcName === "mark_direct_message_read") {
    const recipientId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const messages = client.getStorage("direct_messages") || [];
    const message = messages.find((entry: any) => entry.id === params.p_message_id && entry.recipient_id === recipientId);
    if (!message) {
      return { data: null, error: { message: "Direct message was not found" } };
    }
    message.is_read = true;
    client.setStorage("direct_messages", messages);
    return { data: null, error: null };
  }

  if (funcName === "send_chat_message") {
    const { p_target_type, p_content } = params;
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    const user = users.find((entry: any) => entry.id === userId);
    const members = client.getStorage("guild_members") || [];
    const membership = members.find((entry: any) => entry.user_id === userId);
    if (!user || !["GLOBAL", "GUILD"].includes(p_target_type) || !p_content?.trim() || p_content.trim().length > 140 || (p_target_type === "GUILD" && !membership)) {
      return { data: null, error: { message: "Invalid chat message" } };
    }
    const posts = client.getStorage("board_posts") || [];
    const post = { id: `chat_${Date.now()}`, title: "", user_id: userId, author_id: userId, author_name: user.username || "Player", author_avatar_url: user.avatar_url, content: p_content.trim(), target_type: p_target_type, target_id: p_target_type === "GUILD" ? membership.guild_id : null, is_system: false, created_at: new Date().toISOString() };
    posts.push(post);
    client.setStorage("board_posts", posts);
    return { data: post, error: null };
  }

  if (funcName === "create_bbs_thread") {
    const { p_category, p_title, p_content } = params;
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const user = (client.getStorage("users") || []).find((entry: any) => entry.id === userId);
    if (!userId || !user || !["RECRUIT", "STRATEGY_CHAT"].includes(p_category) || !p_title?.trim() || p_title.trim().length > 50 || !p_content?.trim() || p_content.trim().length > 200) {
      return { data: null, error: { message: "Invalid BBS thread" } };
    }
    const threads = client.getStorage("bbs_threads") || [];
    const thread = { id: `bbs_thread_${Date.now()}`, category: p_category, title: p_title.trim(), content: p_content.trim(), user_id: userId, author_name: user.username || "Player", author_avatar_url: user.avatar_url, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    threads.unshift(thread);
    client.setStorage("bbs_threads", threads);
    return { data: thread, error: null };
  }

  if (funcName === "create_bbs_post") {
    const { p_thread_id, p_content } = params;
    const userId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const user = (client.getStorage("users") || []).find((entry: any) => entry.id === userId);
    const threads = client.getStorage("bbs_threads") || [];
    if (!userId || !user || !threads.some((thread: any) => thread.id === p_thread_id) || !p_content?.trim() || p_content.trim().length > 200) {
      return { data: null, error: { message: "Invalid BBS post" } };
    }
    const posts = client.getStorage("bbs_posts") || [];
    const post = { id: `bbs_post_${Date.now()}`, thread_id: p_thread_id, user_id: userId, author_name: user.username || "Player", author_avatar_url: user.avatar_url, content: p_content.trim(), created_at: new Date().toISOString() };
    posts.push(post);
    const thread = threads.find((entry: any) => entry.id === p_thread_id);
    if (thread) thread.updated_at = post.created_at;
    client.setStorage("bbs_posts", posts);
    client.setStorage("bbs_threads", threads);
    return { data: post, error: null };
  }

  if (funcName === "generate_user_gift_code") {
    const { p_user_id } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) {
      return { error: { message: "ユーザーが存在しません。" } };
    }
    if (user.gift_code) {
      return { data: user.gift_code, error: null };
    }

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
    client.setStorage("users", users);
    return { data: code, error: null };
  }

  if (funcName === "search_user_by_name") {
    const { p_username } = params;
    const users = client.getStorage("users") || [];
    const results = users.filter((u: any) => u.username.includes(p_username)).map((u: any) => ({
      id: u.id,
      username: u.username,
      avatar_url: u.avatar_url,
      level: u.level
    }));
    return { data: results, error: null };
  }

  if (funcName === "send_friend_request") {
    const { p_sender_id, p_receiver_id } = params;
    if (p_sender_id === p_receiver_id) return { data: null, error: { message: "自分自身には申請できません。" } };
    
    // §26: 友達は最大30人
    const friends = client.getStorage("user_friends") || [];
    const myFriendsCount = friends.filter((f: any) => f.user_id_1 === p_sender_id || f.user_id_2 === p_sender_id).length;
    if (myFriendsCount >= 30) return { data: null, error: { message: "友達の最大数(30人)に達しています。" } };
    
    const requests = client.getStorage("friend_requests") || [];
    if (requests.find((r: any) => r.sender_id === p_sender_id && r.receiver_id === p_receiver_id && r.status === "PENDING")) {
      return { data: null, error: { message: "既に申請済みです。" } };
    }

    requests.push({
      id: "req_" + Date.now(),
      sender_id: p_sender_id,
      receiver_id: p_receiver_id,
      status: "PENDING",
      created_at: new Date().toISOString()
    });
    
    client.setStorage("friend_requests", requests);
    return { data: { success: true }, error: null };
  }

  if (funcName === "accept_friend_request") {
    const { p_request_id } = params;
    const requests = client.getStorage("friend_requests") || [];
    const req = requests.find((r: any) => r.id === p_request_id);
    
    if (req) {
      req.status = "ACCEPTED";
      client.setStorage("friend_requests", requests);
      
      const friends = client.getStorage("user_friends") || [];
      friends.push({
        id: "friendship_" + Date.now(),
        user_id_1: req.sender_id,
        user_id_2: req.receiver_id,
        created_at: new Date().toISOString()
      });
      client.setStorage("user_friends", friends);
    }
    
    return { data: { success: true }, error: null };
  }

  if (funcName === "reject_friend_request") {
    const { p_request_id } = params;
    const requests = client.getStorage("friend_requests") || [];
    const req = requests.find((r: any) => r.id === p_request_id);
    
    if (req) {
      req.status = "REJECTED";
      client.setStorage("friend_requests", requests);
    }
    
    return { data: { success: true }, error: null };
  }

  if (funcName === "remove_friend") {
    const { p_user_id, p_friend_id } = params;
    let friends = client.getStorage("user_friends") || [];
    
    friends = friends.filter((f: any) => !(f.user_id_1 === p_user_id && f.user_id_2 === p_friend_id) && !(f.user_id_1 === p_friend_id && f.user_id_2 === p_user_id));
    
    client.setStorage("user_friends", friends);
    return { data: { success: true }, error: null };
  }

  if (funcName === "process_daily_reset") {
    const { p_user_id } = params;
    const users = client.getStorage("users") || [];
    const userIdx = users.findIndex((u: any) => u.id === p_user_id);
    if (userIdx !== -1) {
      const today = new Date().toISOString().split("T")[0];
      const user = users[userIdx];
      
      if (user.last_login_date !== today) {
        user.last_login_date = today;
        user.raid_attempts_today = 0;
        if (user.vitality < 100) {
          user.vitality = 100;
        }
        
        // Reset missions
        const missions = client.getStorage("user_missions") || [];
        missions.forEach((m: any) => {
          if (m.user_id === p_user_id) {
            // In a real app we check if mission_id is DAILY category
            // For mock, just reset all that look like daily
            m.status = "IN_PROGRESS";
            m.progress_val = 0;
            m.claimed_at = null;
          }
        });
        client.setStorage("user_missions", missions);
        client.setStorage("users", users);
      }
    }
    return { data: { success: true }, error: null };
  }

  if (funcName === "process_stripe_shop_purchase") {
    const { p_user_id, p_product_id } = params;
    // mock behavior
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) {
      if (p_product_id.includes("diamond")) {
        user.diamonds = (user.diamonds || 0) + 1000;
      }
      client.setStorage("users", users);
    }
    return { data: { success: true }, error: null };
  }

  if (funcName === "gvg_season_reset") {
    // mock behavior: reset gvg data
    client.setStorage("user_gvg_ranks", []);
    client.setStorage("gvg_season_status", [{ id: 1, current_day: 1 }]);
    const controls = client.getStorage("guild_base_controls") || [];
    controls.forEach((c: any) => {
      c.daily_points = 0;
      c.total_seasonal_days = 0;
      c.is_controlling = false;
    });
    client.setStorage("guild_base_controls", controls);
    return { data: { success: true }, error: null };
  }

  if (funcName === "pvp_season_reset") {
    const ranks = client.getStorage("pvp_ranks") || [];
    ranks.forEach((r: any) => {
      if (r.user_id !== "00000000-0000-0000-0000-000000000099") {
        r.rank_points = 1000;
        r.daily_wins = 0;
        r.season_wins = 0;
      }
    });
    client.setStorage("pvp_ranks", ranks);
    return { data: { success: true }, error: null };
  }

  if (funcName === "raid_boss_defeat") {
    client.setStorage("raid_damage_logs", []);
    return { data: { success: true }, error: null };
  }

  if (funcName === "raid_season_reset") {
    client.setStorage("raid_damage_logs", []);
    client.setStorage("user_raid_claimed_rewards", []);
    return { data: { success: true }, error: null };
  }
  if (funcName === "purchase_monthly_pass") {
    const { p_user_id } = params;
    const passes = client.getStorage("user_monthly_passes") || [];
    const activePass = passes.find((p: any) => p.user_id === p_user_id && p.is_active);
    
    if (activePass) {
      // Extend 30 days
      const currentExpires = new Date(activePass.expires_at);
      currentExpires.setDate(currentExpires.getDate() + 30);
      activePass.expires_at = currentExpires.toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      passes.push({
        id: "mock_pass_" + Date.now(),
        user_id: p_user_id,
        purchased_at: new Date().toISOString(),
        expires_at: d.toISOString(),
        daily_claimed_at: null,
        is_active: true
      });
    }
    client.setStorage("user_monthly_passes", passes);
    return { data: { success: true }, error: null };
  }

  if (funcName === "claim_daily_pass_reward") {
    const { p_user_id } = params;
    const passes = client.getStorage("user_monthly_passes") || [];
    const activePass = passes.find((p: any) => p.user_id === p_user_id && p.is_active && new Date(p.expires_at) > new Date());
    
    if (!activePass) {
      return { data: null, error: { message: "有効な月額パスがありません。" } };
    }
    
    const today = new Date().toISOString().split("T")[0];
    if (activePass.daily_claimed_at === today) {
      return { data: null, error: { message: "本日の報酬は既に受け取り済みです。" } };
    }
    
    activePass.daily_claimed_at = today;
    client.setStorage("user_monthly_passes", passes);
    
    const users = client.getStorage("users") || [];
    const uIdx = users.findIndex((u: any) => u.id === p_user_id);
    if (uIdx !== -1) {
      users[uIdx].diamonds = (users[uIdx].diamonds || 0) + 100;
      client.setStorage("users", users);
    }
    
    return { data: { success: true }, error: null };
  }
  if (funcName === "consume_raid_attempt") {
    const { p_user_id, p_cost_type, p_cost_amount } = params;
    const users = client.getStorage("users") || [];
    const idx = users.findIndex((u: any) => u.id === p_user_id);
    if (idx !== -1) {
      if (p_cost_type === "CASH" && users[idx].cash < p_cost_amount) {
        return { data: null, error: { message: "Cashが不足しています。" } };
      }
      if (p_cost_type === "DIAMOND" && users[idx].neon_diamonds < p_cost_amount) {
        return { data: null, error: { message: "ダイヤが不足しています。" } };
      }
      
      if (p_cost_type === "CASH") users[idx].cash -= p_cost_amount;
      if (p_cost_type === "DIAMOND") users[idx].neon_diamonds -= p_cost_amount;
      
      const today = new Date().toISOString().split("T")[0];
      const resetAt = users[idx].raid_attempts_reset_at ? new Date(users[idx].raid_attempts_reset_at).toISOString().split("T")[0] : null;
      if (resetAt !== today) {
        users[idx].raid_attempts_today = 1;
        users[idx].raid_attempts_reset_at = new Date().toISOString();
      } else {
        users[idx].raid_attempts_today = (users[idx].raid_attempts_today || 0) + 1;
      }
      
      client.setStorage("users", users);
      return { data: { success: true }, error: null };
    }
    return { data: null, error: { message: "ユーザーが見つかりません。" } };
  }
  if (funcName === "consume_vitality_for_gvg") {
    const { p_user_id, p_cost } = params;
    const users = client.getStorage("users") || [];
    const idx = users.findIndex((u: any) => u.id === p_user_id);
    if (idx !== -1 && users[idx].vitality >= p_cost) {
      users[idx].vitality -= p_cost;
      client.setStorage("users", users);
      return { data: { success: true }, error: null };
    }
    return { data: null, error: { message: "行動力が不足しています。" } };
  }
    if (funcName === "distribute_ranking_rewards") {
    // In mock, just return success
    return { data: { success: true }, error: null };
  }
  if (funcName === "add_user_xp") {
    const { p_user_id, p_xp_amount } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) {
      return { error: { message: "ユーザーが存在しません。" } };
    }

    let level = user.level || 1;
    let xp = user.xp || 0;
    let leveledUp = false;

    if (level < 99) {
      xp += p_xp_amount;
      const levelMaster = client.getStorage("user_level_master");

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
      client.setStorage("users", users);

      if (leveledUp) {
        executeMockRpc(client, "evaluate_mission_progress", {
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
    } = params;

    const users = client.getStorage("users");
    if (users.some((u: any) => u.id === p_user_id)) {
      return { error: { message: "すでに初期セットアップが完了しています。" } };
    }
    if (users.some((u: any) => u.username === p_username)) {
      return { error: { message: "このユーザー名は既に使用されています。" } };
    }

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

      const invitations = client.getStorage("user_invitations") || [];
      const inviteCount = invitations.filter((i: any) => i.inviter_id === inviter.id).length;
      if (inviteCount >= 10) {
        return { error: { message: "このギフトコードは10人使用済です。" } };
      }
      inviterId = inviter.id;
    }

    users.push({
      id: p_user_id,
      username: p_username,
      gift_code: null,
      bio: "歌舞伎町の覇権を握るため立ち上がる。",
      avatar_url: p_character_id === "11111111-1111-1111-1111-111111111111" ? "/reiji_transparent_asset.png" : p_character_id === "33333333-3333-3333-3333-333333333333" ? "/rui_transparent_asset.png" : p_character_id === "22222222-2222-2222-2222-222222222222" ? "/chang_transparent_asset.png" : "/reiji_transparent_asset.png",
      cash: 10000,
      neon_diamonds: 200,
      vitality: 100,
      pvp_points: 5,
      sound_settings: { bgm: true, se: true },
      current_base_id: p_area_id === "shinjuku" ? "shinjuku" : p_area_id,
      last_tribute_claimed_at: null,
      favorite_character_id: p_character_id || null,
      title_equipped: "title_none",
      equipped_background: "bg_default",
      equipped_front_effect: "effect_none",
      last_active_at: new Date().toISOString(),
      level: 1,
      xp: 0
    });
    client.setStorage("users", users);

    if (p_character_id) {
      const chars = client.getStorage("user_characters");
      chars.push({ id: `c_${p_character_id}`, user_id: p_user_id, character_id: p_character_id, level: 1, awakening_level: 0 });
      client.setStorage("user_characters", chars);
    }

    if (inviterId) {
      const invitations = client.getStorage("user_invitations") || [];
      invitations.push({
        id: `inv_${Date.now()}`,
        inviter_id: inviterId,
        invitee_id: p_user_id,
        created_at: new Date().toISOString()
      });
      client.setStorage("user_invitations", invitations);

      executeMockRpc(client, "evaluate_mission_progress", {
        p_user_id: inviterId,
        p_trigger_type: "USER_INVITE",
        p_progress_increment: 1
      });

      const presents = client.getStorage("presents") || [];
      presents.push({
        id: `pres_inv_${Date.now()}`,
        user_id: p_user_id,
        item_id: "DIAMOND",
        quantity: 100,
        message: "組織設立 招待コード入力報酬",
        status: "UNCLAIMED",
        sent_at: new Date().toISOString(),
        expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      client.setStorage("presents", presents);
    }

    return { data: { status: "success" }, error: null };
  }

  if (funcName === "evaluate_mission_progress") {
    const { p_user_id, p_trigger_type, p_progress_increment } = params;
    const missionMaster = client.getStorage("mission_master") || [];
    const userMissions = client.getStorage("user_missions") || [];

    const matchedMissions = missionMaster.filter((m: any) => m.trigger_type === p_trigger_type);
    for (const m of matchedMissions) {
      let uMission = userMissions.find((um: any) => um.user_id === p_user_id && um.mission_id === m.id);
      if (!uMission) {
        uMission = {
          id: `um_${p_user_id}_${m.id}`,
          user_id: p_user_id,
          mission_id: m.id,
          current_progress: 0,
          status: "IN_PROGRESS"
        };
        userMissions.push(uMission);
      }

      if (uMission.status === "IN_PROGRESS") {
        if (p_trigger_type === "CHAR_LEVEL_UP" || p_trigger_type === "USER_LEVEL_UP") {
          uMission.current_progress = Math.max(uMission.current_progress, p_progress_increment);
        } else {
          uMission.current_progress += p_progress_increment;
        }

        if (uMission.current_progress >= m.target_value) {
          uMission.status = "COMPLETED";
        }
      }
    }
    client.setStorage("user_missions", userMissions);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "donate_to_guild") {
    const { p_user_id, p_guild_id, p_amount } = params;
    const donationRewards: Record<number, { xp: number; contribution: number }> = {
      1000: { xp: 20, contribution: 10 },
      5000: { xp: 120, contribution: 60 },
      10000: { xp: 300, contribution: 150 }
    };
    const reward = donationRewards[p_amount];
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const members = client.getStorage("guild_members") || [];
    const member = members.find((entry: any) => entry.guild_id === p_guild_id && entry.user_id === p_user_id);
    if (currentUserId !== p_user_id || !reward || !member) {
      return { data: null, error: { message: "Invalid guild donation" } };
    }
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || (user.cash || 0) < p_amount) {
      return { error: { message: "キャッシュが不足しています。" } };
    }

    const guilds = client.getStorage("guilds");
    const guild = guilds.find((g: any) => g.id === p_guild_id);
    if (!guild) {
      return { error: { message: "ギルドが存在しません。" } };
    }

    user.cash = (user.cash || 0) - p_amount;
    guild.funds = Number(guild.funds || 0) + p_amount;
    guild.xp = Number(guild.xp || 0) + reward.xp;
    member.weekly_contribution = Number(member.weekly_contribution || 0) + reward.contribution;
    member.total_contribution = Number(member.total_contribution || 0) + reward.contribution;
    member.contribution_points = Number(member.contribution_points || 0) + reward.contribution;

    client.setStorage("users", users);
    client.setStorage("guilds", guilds);
    client.setStorage("guild_members", members);
    return { data: { status: "success", next_cash: user.cash, next_funds: guild.funds, xp_gained: reward.xp, contribution_gained: reward.contribution }, error: null };
  }

  if (funcName === "buy_normal_shop_product") {
    const { p_user_id, p_product_id, p_currency_type, p_price, p_items, p_product_title } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "ユーザーが存在しません。" } };

    if (p_currency_type === "DIAMOND") {
      if ((user.neon_diamonds || 0) < p_price) return { error: { message: "ダイヤが不足しています。" } };
      user.neon_diamonds = (user.neon_diamonds || 0) - p_price;
    } else {
      if ((user.cash || 0) < p_price) return { error: { message: "キャッシュが不足しています。" } };
      user.cash = (user.cash || 0) - p_price;
    }

    const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const presents = client.getStorage("presents") || [];
    if (p_items && p_items.length > 0) {
      for (const it of p_items) {
        presents.push({
          id: `pres_${Date.now()}_${Math.random()}`,
          user_id: p_user_id,
          item_id: it.itemId,
          quantity: it.quantity,
          message: `ショップ購入: ${p_product_title}`,
          status: "UNCLAIMED",
          expire_at: expireAt,
          sent_at: new Date().toISOString()
        });
      }
    }

    const purchases = client.getStorage("user_shop_purchases") || [];
    const purchaseRecord = purchases.find((p: any) => p.user_id === p_user_id && p.product_id === p_product_id);
    if (purchaseRecord) {
      purchaseRecord.purchase_count = (purchaseRecord.purchase_count || 0) + 1;
      purchaseRecord.last_purchased_at = new Date().toISOString();
    } else {
      purchases.push({
        id: `p_${Date.now()}`,
        user_id: p_user_id,
        product_id: p_product_id,
        purchase_count: 1,
        last_purchased_at: new Date().toISOString()
      });
    }

    client.setStorage("users", users);
    client.setStorage("user_shop_purchases", purchases);
    client.setStorage("presents", presents);
    return { data: { status: "success", user }, error: null };
  }

  if (funcName === "process_stripe_shop_purchase") {
    const { p_user_id, p_stripe_session_id, p_product_id, p_amount_jpy, p_items, p_product_title, p_is_beginner, p_purchase_limit } = params;
    
    const txs = client.getStorage("payment_transactions") || [];
    const existTx = txs.find((t: any) => t.stripe_session_id === p_stripe_session_id);
    if (existTx) {
      return { data: { duplicate: true }, error: null };
    }

    txs.push({
      id: `tx_${Date.now()}`,
      user_id: p_user_id,
      stripe_session_id: p_stripe_session_id,
      amount: p_amount_jpy,
      currency: "jpy",
      diamonds_added: 0,
      status: "COMPLETED",
      created_at: new Date().toISOString()
    });

    const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const presents = client.getStorage("presents") || [];
    if (p_items && p_items.length > 0) {
      for (const it of p_items) {
        presents.push({
          id: `pres_${Date.now()}_${Math.random()}`,
          user_id: p_user_id,
          item_id: it.itemId,
          quantity: it.quantity,
          message: `購入特典: ${p_product_title}`,
          status: "UNCLAIMED",
          expire_at: expireAt,
          sent_at: new Date().toISOString()
        });
      }
    }

    const purchases = client.getStorage("user_shop_purchases") || [];
    const purchaseRecord = purchases.find((p: any) => p.user_id === p_user_id && p.product_id === p_product_id);
    if (purchaseRecord) {
      purchaseRecord.purchase_count = (purchaseRecord.purchase_count || 0) + 1;
      purchaseRecord.last_purchased_at = new Date().toISOString();
    } else {
      purchases.push({
        id: `p_${Date.now()}`,
        user_id: p_user_id,
        product_id: p_product_id,
        purchase_count: 1,
        last_purchased_at: new Date().toISOString()
      });
    }

    client.setStorage("payment_transactions", txs);
    client.setStorage("presents", presents);
    client.setStorage("user_shop_purchases", purchases);
    
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "get_pvp_opponents") {
    const { p_user_id, p_my_points } = params;
    const users = client.getStorage("users") || [];
    const ranks = client.getStorage("pvp_ranks") || [];
    const candidates = users
      .filter((u: any) => u.id !== p_user_id)
      .slice(0, 3)
      .map((u: any, idx: number) => ({
        opponent_user_id: u.id,
        opponent_username: u.username || `Player ${idx + 1}`,
        opponent_guild_name: "No Guild",
        opponent_points: ranks.find((rank: any) => rank.user_id === u.id)?.rank_points ?? 1000,
        tactic: "BALANCED",
        opponent_guild_main_alignment: "NEUTRAL",
        opponent_guild_sub_alignment: "NEUTRAL",
        id: u.id,
        username: u.username || `対戦者_${idx + 1}`,
        avatar_url: u.avatar_url || "/reiji_transparent_asset.png",
        title_equipped: u.title_equipped || "title_none",
        pvp_points: u.pvp_points ?? 5,
        total_power: 15000 + idx * 2500,
        defense_character_ids: ["c_reiji", "c_rui", "c_chang"]
      }));

    return { data: candidates, error: null };
  }

  if (funcName === "process_pvp_match_result") {
    const { p_user_id, p_target_user_id, p_is_win, p_point_diff, p_cash_reward } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "ユーザーが存在しません。" } };

    user.pvp_points = user.pvp_points ?? 5;
    user.cash = (user.cash || 0) + (p_cash_reward || 0);

    const ranks = client.getStorage("pvp_ranks") || [];
    const rank = ranks.find((r: any) => r.user_id === p_user_id);
    if (rank) {
      rank.rank_points = Math.max(0, (rank.rank_points ?? 1000) + (p_point_diff || 0));
      if (p_is_win) {
        rank.daily_wins = (rank.daily_wins || 0) + 1;
        rank.season_wins = (rank.season_wins || 0) + 1;
      }
    } else {
      ranks.push({
        id: `pr_${Date.now()}`,
        user_id: p_user_id,
        rank_points: Math.max(0, 1000 + (p_point_diff || 0)),
        daily_wins: p_is_win ? 1 : 0,
        season_wins: p_is_win ? 1 : 0
      });
    }

    client.setStorage("users", users);
    client.setStorage("pvp_ranks", ranks);
    return { data: { status: "success", rank_points: rank?.rank_points ?? Math.max(0, 1000 + (p_point_diff || 0)) }, error: null };
  }

  if (funcName === "claim_gvg_base") {
    const { p_guild_id, p_base_id } = params;
    const bases = client.getStorage("gvg_bases") || [];
    let base = bases.find((b: any) => b.id === p_base_id);
    if (!base) {
      base = { id: p_base_id, occupied_guild_id: p_guild_id, updated_at: new Date().toISOString() };
      bases.push(base);
    } else {
      base.occupied_guild_id = p_guild_id;
      base.updated_at = new Date().toISOString();
    }
    client.setStorage("gvg_bases", bases);
    return { data: { status: "success", base }, error: null };
  }

  if (funcName === "record_raid_boss_damage") {
    const { p_user_id, p_guild_id, p_boss_id, p_damage } = params;
    const logs = client.getStorage("raid_damage_logs") || [];
    logs.push({
      id: `raid_${Date.now()}`,
      user_id: p_user_id,
      guild_id: p_guild_id,
      boss_id: p_boss_id,
      damage: p_damage,
      created_at: new Date().toISOString()
    });
    client.setStorage("raid_damage_logs", logs);
    return { data: { status: "success", total_damage: p_damage }, error: null };
  }

  
  if (funcName === "record_raid_boss_damage_v2") {
    const { p_user_id, p_boss_id, p_damage } = params;
    const bosses = client.getStorage("raid_bosses") || [];
    const boss = bosses.find((b: any) => b.id === p_boss_id);
    if (!boss) return { error: { message: "ボスが存在しません" } };

    const nextHp = Math.max(0, boss.current_hp - p_damage);
    const isDefeated = nextHp === 0;
    
    if (isDefeated && boss.current_hp > 0) {
      boss.current_hp = boss.max_hp; // Reset for mock
      
      const presents = client.getStorage("presents") || [];
      const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      presents.push({
        id: `pres_${Date.now()}_${Math.random()}`,
        user_id: p_user_id,
        item_id: "raid_medal",
        quantity: 50,
        message: "レイドボス討伐貢献報酬",
        status: "UNCLAIMED",
        expire_at: expireAt,
        sent_at: new Date().toISOString()
      });
      client.setStorage("presents", presents);
    } else {
      boss.current_hp = nextHp;
    }
    client.setStorage("raid_bosses", bosses);
    return { data: { status: "success", current_hp: boss.current_hp, is_defeated: isDefeated }, error: null };
  }

  if (funcName === "process_gvg_battle_result") {
    const { p_user_id, p_guild_id, p_base_id, p_is_practice, p_is_win } = params;
    
    const baseControls = client.getStorage("guild_base_controls") || [];
    let baseCtrl = baseControls.find((b: any) => b.base_id === p_base_id && b.guild_id === p_guild_id);
    if (!baseCtrl) {
      baseCtrl = { id: `gbc_${Date.now()}`, base_id: p_base_id, guild_id: p_guild_id, daily_points: 0 };
      baseControls.push(baseCtrl);
    }

    const matches = client.getStorage("gvg_matches") || [];
    const myMatch = matches.find((m: any) => m.status === "ONGOING" && (m.guild_a_id === p_guild_id || m.guild_b_id === p_guild_id));

    let addedBasePoints = 0;
    let addedMatchPoints = 0;
    let addedPersonalPoints = 0;

    if (p_is_practice) {
      if (p_is_win) {
        addedBasePoints = 100;
        addedMatchPoints = 100;
      }
    } else {
      if (p_is_win) {
        addedBasePoints = 250;
        addedMatchPoints = 250;
        addedPersonalPoints = 250;
      } else {
        addedBasePoints = -100;
        addedMatchPoints = -100;
        addedPersonalPoints = -100;
      }
    }

    baseCtrl.daily_points = Math.max(0, (baseCtrl.daily_points || 0) + addedBasePoints);

    if (myMatch) {
      if (myMatch.guild_a_id === p_guild_id) {
        myMatch.guild_a_points = Math.max(0, (myMatch.guild_a_points || 0) + addedMatchPoints);
        if (!p_is_win && !p_is_practice) myMatch.guild_b_points = (myMatch.guild_b_points || 0) + 100;
      } else {
        myMatch.guild_b_points = Math.max(0, (myMatch.guild_b_points || 0) + addedMatchPoints);
        if (!p_is_win && !p_is_practice) myMatch.guild_a_points = (myMatch.guild_a_points || 0) + 100;
      }
    }

    if (!p_is_practice) {
      const gvgRanks = client.getStorage("user_gvg_ranks") || [];
      let rank = gvgRanks.find((r: any) => r.user_id === p_user_id);
      if (!rank) {
        rank = { id: `ugr_${Date.now()}`, user_id: p_user_id, season_points: 0 };
        gvgRanks.push(rank);
      }
      rank.season_points = Math.max(0, (rank.season_points || 0) + addedPersonalPoints);
      client.setStorage("user_gvg_ranks", gvgRanks);
    }

    client.setStorage("guild_base_controls", baseControls);
    client.setStorage("gvg_matches", matches);

    return { data: { status: "success", added_base_points: addedBasePoints }, error: null };
  }


  if (funcName === "character_level_up") {
    const { p_user_id, p_character_id, p_exp_item_id, p_count, p_cash_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const items = client.getStorage("user_items");
    const expItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === p_exp_item_id);
    if (!expItem || expItem.quantity < p_count) return { error: { message: "経験の書が不足しています。" } };
    
    const chars = client.getStorage("user_characters");
    const char = chars.find((c: any) => c.user_id === p_user_id && c.character_id === p_character_id);
    if (!char) return { error: { message: "キャラクターが存在しません。" } };
    
    user.cash -= p_cash_cost;
    expItem.quantity -= p_count;
    char.level = Math.min(100, (char.level || 1) + p_count);
    
    client.setStorage("users", users);
    client.setStorage("user_items", items);
    client.setStorage("user_characters", chars);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "CHAR_LEVEL_UP", p_progress_increment: p_count });
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "character_awaken") {
    const { p_user_id, p_character_id, p_cash_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const items = client.getStorage("user_items");
    const awakenItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === "LAW_OF_STRIFE");
    if (!awakenItem || awakenItem.quantity < 1) return { error: { message: "覚醒の書が不足しています。" } };
    
    const chars = client.getStorage("user_characters");
    const char = chars.find((c: any) => c.user_id === p_user_id && c.character_id === p_character_id);
    if (!char || (char.awakening_level || 0) >= 5) return { error: { message: "キャラクターが存在しないか、覚醒上限です。" } };
    
    user.cash -= p_cash_cost;
    awakenItem.quantity -= 1;
    char.awakening_level = (char.awakening_level || 0) + 1;
    
    client.setStorage("users", users);
    client.setStorage("user_items", items);
    client.setStorage("user_characters", chars);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "upgrade_gear") {
    const { p_user_id, p_equipment_id, p_exp_item_id, p_count, p_cash_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const items = client.getStorage("user_items");
    const expItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === p_exp_item_id);
    if (!expItem || expItem.quantity < p_count) return { error: { message: "強化素材が不足しています。" } };
    
    const equips = client.getStorage("user_equipments");
    const equip = equips.find((e: any) => e.id === p_equipment_id && e.user_id === p_user_id);
    if (!equip) return { error: { message: "装備が存在しません。" } };
    
    user.cash -= p_cash_cost;
    expItem.quantity -= p_count;
    equip.level = Math.min(100, (equip.level || 1) + p_count);
    
    client.setStorage("users", users);
    client.setStorage("user_items", items);
    client.setStorage("user_equipments", equips);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "GEAR_UPGRADE", p_progress_increment: p_count });
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "limit_break_gear") {
    const { p_user_id, p_equipment_id, p_cash_cost, p_hammer_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const items = client.getStorage("user_items");
    const hammerItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === "EQUIP_LB_HAMMER");
    if (!hammerItem || hammerItem.quantity < p_hammer_cost) return { error: { message: "限界突破ハンマーが不足しています。" } };
    
    const equips = client.getStorage("user_equipments");
    const equip = equips.find((e: any) => e.id === p_equipment_id && e.user_id === p_user_id);
    if (!equip) return { error: { message: "装備が存在しません。" } };
    
    user.cash -= p_cash_cost;
    hammerItem.quantity -= p_hammer_cost;
    equip.plus_val = (equip.plus_val || 0) + 1;
    
    client.setStorage("users", users);
    client.setStorage("user_items", items);
    client.setStorage("user_equipments", equips);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "GEAR_LIMIT_BREAK", p_progress_increment: 1 });
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "limit_break_skill") {
    const { p_user_id, p_skill_id, p_cash_cost, p_book_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const items = client.getStorage("user_items");
    const bookItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === "SKILL_LB_BOOK");
    if (!bookItem || bookItem.quantity < p_book_cost) return { error: { message: "奥義書が不足しています。" } };
    
    const skills = client.getStorage("user_skills");
    const skill = skills.find((s: any) => s.id === p_skill_id && s.user_id === p_user_id);
    if (!skill) return { error: { message: "スキルが存在しません。" } };
    
    user.cash -= p_cash_cost;
    bookItem.quantity -= p_book_cost;
    skill.plus_val = (skill.plus_val || 0) + 1;
    
    client.setStorage("users", users);
    client.setStorage("user_items", items);
    client.setStorage("user_skills", skills);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "SKILL_LIMIT_BREAK", p_progress_increment: 1 });
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "create_guild") {
    const { p_user_id, p_guild_name, p_guild_description, p_guild_logo, p_guild_color, p_creation_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_creation_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const guilds = client.getStorage("guilds") || [];
    const newGuildId = "guild_" + Date.now();
    const newGuild = {
      id: newGuildId,
      name: p_guild_name,
      description: p_guild_description || "",
      logo_icon: p_guild_logo || "guild_icon_default.png",
      color_theme: p_guild_color || "red",
      level: 1,
      xp: 0,
      cash: 0,
      approval_required: false,
      auto_kick_days: 7,
      created_at: new Date().toISOString()
    };
    guilds.push(newGuild);
    
    const members = client.getStorage("guild_members") || [];
    members.push({
      id: "gm_" + Date.now(),
      guild_id: newGuildId,
      user_id: p_user_id,
      role: "MASTER",
      joined_at: new Date().toISOString()
    });
    
    user.cash -= p_creation_cost;
    user.guild_id = newGuildId;
    
    client.setStorage("users", users);
    client.setStorage("guilds", guilds);
    client.setStorage("guild_members", members);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "GUILD_JOIN", p_progress_increment: 1 });
    return { data: { guild_id: newGuildId }, error: null };
  }

  if (funcName === "buy_guild_decoration") {
    const { p_user_id, p_guild_id, p_decoration_id, p_cost } = params;
    const guilds = client.getStorage("guilds") || [];
    const guild = guilds.find((g: any) => g.id === p_guild_id);
    if (!guild || (guild.cash || 0) < p_cost) return { error: { message: "ギルド資金が不足しています。" } };
    
    const decorations = client.getStorage("guild_decorations") || [];
    decorations.push({
      id: "gdec_" + Date.now(),
      guild_id: p_guild_id,
      decoration_id: p_decoration_id,
      unlocked_at: new Date().toISOString()
    });
    
    guild.cash -= p_cost;
    
    client.setStorage("guilds", guilds);
    client.setStorage("guild_decorations", decorations);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "use_inventory_item") {
    const { p_user_id, p_item_id, p_quantity, p_vitality_gain } = params;
    const items = client.getStorage("user_items");
    const item = items.find((i: any) => i.user_id === p_user_id && i.item_id === p_item_id);
    if (!item || item.quantity < p_quantity) return { error: { message: "アイテムが不足しています。" } };
    
    item.quantity -= p_quantity;
    client.setStorage("user_items", items);
    
    if (p_vitality_gain > 0) {
      const users = client.getStorage("users");
      const user = users.find((u: any) => u.id === p_user_id);
      if (user) {
        user.vitality = Math.min(100, (user.vitality || 0) + p_vitality_gain);
        client.setStorage("users", users);
      }
    }
    
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "complete_patrol_instantly") {
    const { p_user_id, p_patrol_id, p_use_currency } = params;
    const patrols = client.getStorage("user_patrols") || [];
    const patrol = patrols.find((entry: any) => entry.id === p_patrol_id && entry.user_id === p_user_id);
    if (!patrol) return { data: null, error: { message: "Patrol not found" } };
    if (p_use_currency === "FREE_TUTORIAL") {
      const progress = (client.getStorage("tutorial_progress") || []).find((entry: any) => entry.user_id === p_user_id);
      if (progress?.step_id !== "FREE_INSTANT") return { data: null, error: { message: "Free completion is unavailable" } };
    }
    patrol.status = "CLAIMABLE";
    patrol.expires_at = new Date().toISOString();
    client.setStorage("user_patrols", patrols);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "complete_patrol_instant") {
    const { p_user_id, p_patrol_id, p_diamond_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.neon_diamonds < p_diamond_cost) return { error: { message: "ダイヤが不足しています。" } };
    
    const patrols = client.getStorage("user_patrols") || [];
    const patrolIndex = patrols.findIndex((p: any) => p.id === p_patrol_id && p.user_id === p_user_id);
    if (patrolIndex === -1) return { error: { message: "クエストが存在しません。" } };
    
    user.neon_diamonds -= p_diamond_cost;
    patrols.splice(patrolIndex, 1);
    
    client.setStorage("users", users);
    client.setStorage("user_patrols", patrols);
    
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "claim_battle_rewards") {
    const { p_user_id, p_cash_amount, p_exp_amount, p_item_rewards } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "ユーザーが存在しません。" } };
    
    user.cash = (user.cash || 0) + p_cash_amount;
    client.setStorage("users", users);
    
    if (p_exp_amount > 0) {
      executeMockRpc(client, "add_user_xp", { p_user_id, p_xp_amount: p_exp_amount });
    }
    
    const items = client.getStorage("user_items") || [];
    if (p_item_rewards && p_item_rewards.length > 0) {
      for (const reward of p_item_rewards) {
        const existing = items.find((i: any) => i.user_id === p_user_id && i.item_id === reward.item_id);
        if (existing) {
          existing.quantity += reward.quantity;
        } else {
          items.push({
            id: `ui_${Date.now()}_${Math.random()}`,
            user_id: p_user_id,
            item_id: reward.item_id,
            quantity: reward.quantity
          });
        }
      }
      client.setStorage("user_items", items);
    }
    
    return { data: { status: "success" }, error: null };
  }
  
  if (funcName === "execute_asset_gacha") {
    const { p_user_id, p_gacha_id, p_pull_count, p_currency_type } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    if (!currentUserId || currentUserId !== p_user_id) return { data: null, error: { message: "認証が必要です。" } };
    if (!Number.isInteger(p_pull_count) || p_pull_count < 1 || p_pull_count > 10) return { data: null, error: { message: "ガチャ回数が不正です。" } };
    if (p_currency_type === "free" && p_pull_count !== 10) return { data: null, error: { message: "無料ガチャは10連のみです。" } };

    const users = client.getStorage("users") || [];
    const user = users.find((entry: any) => entry.id === p_user_id);
    const gachas = client.getStorage("gacha_masters") || [];
    const gacha = gachas.find((entry: any) => entry.id === p_gacha_id && (entry.gacha_type === "SKILL" || entry.gacha_type === "EQUIPMENT"));
    const pool = (client.getStorage("gacha_items_master") || []).filter((entry: any) => entry.gacha_id === p_gacha_id && entry.item_id);
    if (!user || !gacha || pool.length === 0) return { data: null, error: { message: "ガチャ設定が見つかりません。" } };

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    const claims = client.getStorage("user_daily_gacha_claims") || [];
    if (p_currency_type === "free") {
      const claim = claims.find((entry: any) => entry.user_id === p_user_id && entry.gacha_type === gacha.gacha_type);
      if (claim?.last_claimed_date === today) return { data: null, error: { message: "本日の無料ガチャは受取済みです。" } };
      if (claim) claim.last_claimed_date = today;
      else claims.push({ user_id: p_user_id, gacha_type: gacha.gacha_type, last_claimed_date: today });
    } else if (p_currency_type === "cash" || p_currency_type === "diamonds") {
      const field = p_currency_type === "cash" ? "cash" : "neon_diamonds";
      const unitCost = Number(p_currency_type === "cash" ? gacha.cost_cash : gacha.cost_diamond);
      const cost = unitCost * p_pull_count;
      if (!Number.isFinite(unitCost) || unitCost < 0 || Number(user[field] || 0) < cost) return { data: null, error: { message: "ガチャ通貨が不足しています。" } };
      user[field] = Number(user[field] || 0) - cost;
    } else if (p_currency_type === "ticket") {
      const items = client.getStorage("user_items") || [];
      const ticket = items.find((entry: any) => entry.user_id === p_user_id && entry.item_id === "GACHA_TICKET");
      if (!ticket || Number(ticket.quantity || 0) < p_pull_count) return { data: null, error: { message: "ガチャチケットが不足しています。" } };
      ticket.quantity -= p_pull_count;
      client.setStorage("user_items", items);
    } else {
      return { data: null, error: { message: "通貨種別が不正です。" } };
    }

    const weightedPick = () => {
      const total = pool.reduce((sum: number, entry: any) => sum + Math.max(1, Number(entry.weight || 1)), 0);
      let roll = Math.random() * total;
      return pool.find((entry: any) => (roll -= Math.max(1, Number(entry.weight || 1))) <= 0) || pool[pool.length - 1];
    };
    const results: { type: "SKILL" | "EQUIPMENT"; item_id: string; outcome: "new" | "limit_break" | "converted" }[] = [];
    const skills = client.getStorage("user_skills") || [];
    const equipments = client.getStorage("user_equipments") || [];
    const items = client.getStorage("user_items") || [];
    for (let index = 0; index < p_pull_count; index += 1) {
      const picked = weightedPick();
      if (gacha.gacha_type === "SKILL") {
        const existing = skills.find((entry: any) => entry.user_id === p_user_id && entry.skill_card_id === picked.item_id);
        if (!existing) {
          skills.push({ id: `mock_skill_${Date.now()}_${index}`, user_id: p_user_id, skill_card_id: picked.item_id, plus_val: 0 });
          results.push({ type: "SKILL", item_id: picked.item_id, outcome: "new" });
        } else if (Number(existing.plus_val || 0) < 10) {
          existing.plus_val = Number(existing.plus_val || 0) + 1;
          results.push({ type: "SKILL", item_id: picked.item_id, outcome: "limit_break" });
        } else {
          const manual = items.find((entry: any) => entry.user_id === p_user_id && entry.item_id === "TRAINING_MANUAL");
          if (manual) manual.quantity = Number(manual.quantity || 0) + 2;
          else items.push({ user_id: p_user_id, item_id: "TRAINING_MANUAL", quantity: 2 });
          results.push({ type: "SKILL", item_id: picked.item_id, outcome: "converted" });
        }
      } else {
        equipments.push({ id: `mock_equipment_${Date.now()}_${index}`, user_id: p_user_id, equipment_id: picked.item_id, level: 1, plus_val: 0, random_options: [] });
        results.push({ type: "EQUIPMENT", item_id: picked.item_id, outcome: "new" });
      }
    }
    client.setStorage("users", users);
    client.setStorage("user_daily_gacha_claims", claims);
    client.setStorage("user_skills", skills);
    client.setStorage("user_equipments", equipments);
    client.setStorage("user_items", items);
    if (p_currency_type !== "free" && (p_gacha_id === "SKILL_SPECIAL" || p_gacha_id === "EQUIP_SPECIAL")) {
      const pityPoints = client.getStorage("user_gacha_pity_points") || [];
      const pity = pityPoints.find((entry: any) => entry.user_id === p_user_id && entry.pity_master_id === "pity_special_common");
      if (pity) pity.current_points = Number(pity.current_points || 0) + p_pull_count;
      else pityPoints.push({ user_id: p_user_id, pity_master_id: "pity_special_common", current_points: p_pull_count });
      client.setStorage("user_gacha_pity_points", pityPoints);
    }
    return { data: { status: "success", results, cash: user.cash, diamonds: user.neon_diamonds }, error: null };
  }

  if (funcName === "execute_gacha") {
    const { p_user_id, p_currency_type, p_currency_cost, p_results } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "ユーザーが存在しません。" } };
    
    if (p_currency_type === "cash") {
      if (user.cash < p_currency_cost) return { error: { message: "キャッシュが不足しています。" } };
      user.cash -= p_currency_cost;
    } else if (p_currency_type === "diamonds") {
      if (user.neon_diamonds < p_currency_cost) return { error: { message: "ダイヤが不足しています。" } };
      user.neon_diamonds -= p_currency_cost;
    } else if (p_currency_type === "free") {
      // do nothing
    } else if (p_currency_type === "ticket") {
      const items = client.getStorage("user_items") || [];
      const ticket = items.find((i: any) => i.user_id === p_user_id && i.item_id === "GACHA_TICKET");
      if (!ticket || ticket.quantity < p_currency_cost) return { error: { message: "ガチャチケットが不足しています。" } };
      ticket.quantity -= p_currency_cost;
      client.setStorage("user_items", items);
    } else {
      return { error: { message: "不正な通貨タイプです。" } };
    }
    
    if (p_currency_type !== "free") {
       user.special_pity_points = (user.special_pity_points || 0) + p_results.length;
    }
    
    client.setStorage("users", users);
    
    const items = client.getStorage("user_items") || [];
    const characters = client.getStorage("user_characters") || [];
    
    for (const res of p_results) {
      if (res.type === "character") {
        const existingChar = characters.find((c: any) => c.user_id === p_user_id && c.character_id === res.character_id);
        if (existingChar) {
          const dupItemId = "CHAR_EXP_M";
          const existingItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === dupItemId);
          if (existingItem) {
             existingItem.quantity += 5;
          } else {
             items.push({ id: `ui_${Date.now()}_${Math.random()}`, user_id: p_user_id, item_id: dupItemId, quantity: 5 });
          }
        } else {
          characters.push({
            id: `uc_${Date.now()}_${Math.random()}`,
            user_id: p_user_id,
            character_id: res.character_id,
            level: 1,
            awakening_level: 0
          });
        }
      } else if (res.type === "item") {
         const existingItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === res.item_id);
         if (existingItem) {
            existingItem.quantity += res.quantity;
         } else {
            items.push({ id: `ui_${Date.now()}_${Math.random()}`, user_id: p_user_id, item_id: res.item_id, quantity: res.quantity });
         }
      }
    }
    
    client.setStorage("user_items", items);
    client.setStorage("user_characters", characters);
    
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "create_guild_v2") {
    const { p_user_id, p_guild_name, p_creation_cost } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_creation_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    const guilds = client.getStorage("guilds") || [];
    if (guilds.some((g: any) => g.name === p_guild_name)) {
       return { error: { message: "このギルド名は既に登録されています。" } };
    }
    
    const newGuildId = "guild_" + Date.now();
    const newGuild = {
      id: newGuildId,
      name: p_guild_name,
      leader_id: p_user_id,
      level: 1,
      xp: 0,
      funds: 0,
      created_at: new Date().toISOString()
    };
    guilds.push(newGuild);
    
    const members = client.getStorage("guild_members") || [];
    members.push({
      id: "gm_" + Date.now(),
      guild_id: newGuildId,
      user_id: p_user_id,
      role: "MASTER",
      joined_at: new Date().toISOString()
    });
    
    user.cash -= p_creation_cost;
    user.guild_id = newGuildId;
    
    client.setStorage("users", users);
    client.setStorage("guilds", guilds);
    client.setStorage("guild_members", members);
    
    executeMockRpc(client, "evaluate_mission_progress", { p_user_id, p_trigger_type: "GUILD_JOIN", p_progress_increment: 1 });
    return { data: { status: "success", guild_id: newGuildId }, error: null };
  }

  if (funcName === "join_guild") {
    const { p_guild_id } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    const user = users.find((entry: any) => entry.id === currentUserId);
    const guilds = client.getStorage("guilds") || [];
    const guild = guilds.find((entry: any) => entry.id === p_guild_id);
    const members = client.getStorage("guild_members") || [];
    const memberLimit = guild?.member_limit || (guild?.level >= 5 ? 20 : guild?.level === 4 ? 18 : guild?.level === 3 ? 15 : guild?.level === 2 ? 12 : 10);
    const leftAt = user?.last_guild_left_at ? new Date(user.last_guild_left_at).getTime() : 0;
    if (!user || user.level < 3 || !guild || guild.approval_required || members.some((entry: any) => entry.user_id === currentUserId)
      || (leftAt > 0 && Date.now() - leftAt < 24 * 60 * 60 * 1000) || members.filter((entry: any) => entry.guild_id === p_guild_id).length >= memberLimit) {
      return { data: null, error: { message: "Guild joining requirements are not met" } };
    }
    members.push({ id: `gm_${Date.now()}`, guild_id: p_guild_id, user_id: currentUserId, role: "MEMBER", weekly_contribution: 0, total_contribution: 0 });
    user.guild_id = p_guild_id;
    client.setStorage("guild_members", members);
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "limit_break_gear_v2") {
    const { p_user_id, p_equipment_id, p_cash_cost, p_use_wildcard, p_dupe_id, p_new_options } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    if (p_use_wildcard) {
      const items = client.getStorage("user_items");
      const hammerItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === "EQUIP_LB_HAMMER");
      if (!hammerItem || hammerItem.quantity < 1) return { error: { message: "万能カスタムツールが不足しています。" } };
      hammerItem.quantity -= 1;
      client.setStorage("user_items", items);
    } else {
      const equips = client.getStorage("user_equipments");
      const dupeIdx = equips.findIndex((e: any) => e.id === p_dupe_id && e.user_id === p_user_id);
      if (dupeIdx === -1) return { error: { message: "同名の予備装備品が見つかりません。" } };
      equips.splice(dupeIdx, 1);
      client.setStorage("user_equipments", equips);
    }
    
    const equips = client.getStorage("user_equipments");
    const equip = equips.find((e: any) => e.id === p_equipment_id && e.user_id === p_user_id);
    if (!equip) return { error: { message: "対象装備が存在しません。" } };
    
    user.cash -= p_cash_cost;
    equip.plus_val = (equip.plus_val || 0) + 1;
    if (p_new_options) equip.random_options = p_new_options;
    
    client.setStorage("users", users);
    client.setStorage("user_equipments", equips);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "limit_break_skill_v2") {
    const { p_user_id, p_skill_id, p_cash_cost, p_use_wildcard, p_dupe_id, p_wildcard_item_id } = params;
    const users = client.getStorage("users");
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.cash < p_cash_cost) return { error: { message: "キャッシュが不足しています。" } };
    
    if (p_use_wildcard) {
      const items = client.getStorage("user_items");
      const bookItem = items.find((i: any) => i.user_id === p_user_id && i.item_id === p_wildcard_item_id);
      if (!bookItem || bookItem.quantity < 1) return { error: { message: "限界突破の書が不足しています。" } };
      bookItem.quantity -= 1;
      client.setStorage("user_items", items);
    } else {
      const skills = client.getStorage("user_skills");
      const dupeIdx = skills.findIndex((s: any) => s.id === p_dupe_id && s.user_id === p_user_id);
      if (dupeIdx === -1) return { error: { message: "同名の予備スキルカードが見つかりません。" } };
      skills.splice(dupeIdx, 1);
      client.setStorage("user_skills", skills);
    }
    
    const skills = client.getStorage("user_skills");
    const skill = skills.find((s: any) => s.id === p_skill_id && s.user_id === p_user_id);
    if (!skill) return { error: { message: "対象スキルが存在しません。" } };
    
    user.cash -= p_cash_cost;
    skill.plus_val = (skill.plus_val || 0) + 1;
    
    client.setStorage("users", users);
    client.setStorage("user_skills", skills);
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "update_guild_alignment") {
    const { p_guild_id, p_main, p_sub } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const members = client.getStorage("guild_members") || [];
    const membership = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    if (membership?.role !== "MASTER" || !["JUSTICE", "EVIL", "ORDER", "CHAOS"].includes(p_main) || !["JUSTICE", "EVIL", "ORDER", "CHAOS"].includes(p_sub)) {
      return { data: null, error: { message: "Invalid guild alignment" } };
    }
    const guilds = client.getStorage("guilds") || [];
    const g = guilds.find((x: any) => x.id === p_guild_id);
    if (g) {
      g.main_alignment = p_main;
      g.sub_alignment = p_sub;
      client.setStorage("guilds", guilds);
    }
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "leave_guild") {
    const { p_user_id, p_guild_id, p_is_master, p_has_others } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const members = client.getStorage("guild_members") || [];
    const membership = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    const hasOtherMembers = members.some((member: any) => member.guild_id === p_guild_id && member.user_id !== currentUserId);
    if (p_user_id !== currentUserId || !membership || (membership.role === "MASTER" && hasOtherMembers)) {
      return { data: null, error: { message: "Invalid guild leave" } };
    }
    if (membership.role === "MASTER") {
      const guilds = client.getStorage("guilds") || [];
      client.setStorage("guilds", guilds.filter((g: any) => g.id !== p_guild_id));
    } else {
      client.setStorage("guild_members", members.filter((member: any) => member.user_id !== p_user_id || member.guild_id !== p_guild_id));
    }
    const users = client.getStorage("users") || [];
    const u = users.find((x: any) => x.id === p_user_id);
    if (u) {
      u.last_guild_left_at = new Date().toISOString();
      u.guild_id = null;
      client.setStorage("users", users);
    }
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "transfer_guild_leader") {
    const { p_guild_id, p_old_id, p_new_id } = params;
    const members = client.getStorage("guild_members") || [];
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const oldM = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === p_old_id);
    const newM = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === p_new_id);
    if (currentUserId !== p_old_id || p_old_id === p_new_id || oldM?.role !== "MASTER" || !newM) {
      return { data: null, error: { message: "Invalid guild leadership transfer" } };
    }
    if (oldM) oldM.role = "SUBMASTER";
    if (newM) newM.role = "MASTER";
    client.setStorage("guild_members", members);
    
    const guilds = client.getStorage("guilds") || [];
    const g = guilds.find((x: any) => x.id === p_guild_id);
    if (g) {
      g.leader_id = p_new_id;
      client.setStorage("guilds", guilds);
    }
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "set_guild_member_role") {
    const { p_guild_id, p_target_user_id, p_new_role } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const members = client.getStorage("guild_members") || [];
    const actor = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    const target = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === p_target_user_id);
    if (actor?.role !== "MASTER" || !target || target.role === "MASTER" || p_target_user_id === currentUserId || !["MEMBER", "SUBMASTER"].includes(p_new_role)) {
      return { data: null, error: { message: "Invalid guild role change" } };
    }
    target.role = p_new_role;
    client.setStorage("guild_members", members);
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "kick_guild_member") {
    const { p_guild_id, p_user_id } = params;
    const members = client.getStorage("guild_members") || [];
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const actor = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    const target = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === p_user_id);
    const isAllowed = (actor?.role === "MASTER" && ["SUBMASTER", "MEMBER"].includes(target?.role))
      || (actor?.role === "SUBMASTER" && target?.role === "MEMBER");
    if (!isAllowed || p_user_id === currentUserId) {
      return { data: null, error: { message: "Insufficient guild member removal permission" } };
    }
    client.setStorage("guild_members", members.filter((m: any) => m.user_id !== p_user_id || m.guild_id !== p_guild_id));
    
    const users = client.getStorage("users") || [];
    const u = users.find((x: any) => x.id === p_user_id);
    if (u) {
      u.last_guild_left_at = new Date().toISOString();
      u.guild_id = null;
      client.setStorage("users", users);
    }
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "update_guild_settings") {
    const { p_guild_id, p_desc, p_approval, p_kick_days } = params;
    const guilds = client.getStorage("guilds") || [];
    const g = guilds.find((x: any) => x.id === p_guild_id);
    if (g) {
      g.description = p_desc;
      g.approval_required = p_approval;
      g.auto_kick_days = p_kick_days;
      client.setStorage("guilds", guilds);
    }
    return { data: { status: "success" }, error: null };
  }
  if (funcName === "equip_guild_decoration") {
    const { p_guild_id, p_type, p_item_id } = params;
    const guilds = client.getStorage("guilds") || [];
    const members = client.getStorage("guild_members") || [];
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const membership = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    if (membership?.role !== "MASTER") {
      return { data: null, error: { message: "Only the guild master can change guild page items" } };
    }
    const g = guilds.find((x: any) => x.id === p_guild_id);
    if (g) {
      const ownedItems = p_type === "DECORATION" ? g.unlocked_decorations : g.unlocked_banners;
      if (p_type !== "DECORATION" && p_type !== "BANNER") {
        return { data: null, error: { message: "Invalid guild item type" } };
      }
      if (p_item_id !== null && !(Array.isArray(ownedItems) && ownedItems.includes(p_item_id))) {
        return { data: null, error: { message: "Guild item is not owned" } };
      }
      if (p_type === "DECORATION") g.equipped_decoration = p_item_id;
      else g.equipped_banner = p_item_id;
      client.setStorage("guilds", guilds);
    }
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "buy_guild_decoration_v2") {
    const { p_guild_id, p_type, p_item_id, p_cost } = params;
    const guildShopPrices: Record<string, number> = {
      bg_neon_kabukicho: 5000,
      bg_industrial_docks: 10000,
      banner_neon_reign: 3000,
      banner_kabukicho_king: 8000
    };
    const guilds = client.getStorage("guilds") || [];
    const members = client.getStorage("guild_members") || [];
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const membership = members.find((member: any) => member.guild_id === p_guild_id && member.user_id === currentUserId);
    if (membership?.role !== "MASTER" && membership?.role !== "SUBMASTER") {
      return { data: null, error: { message: "Only guild masters and submasters can purchase guild items" } };
    }
    const expectedCost = guildShopPrices[p_item_id];
    const isValidType = (p_type === "DECORATION" && ["bg_neon_kabukicho", "bg_industrial_docks"].includes(p_item_id))
      || (p_type === "BANNER" && ["banner_neon_reign", "banner_kabukicho_king"].includes(p_item_id));
    if (!isValidType || typeof p_cost !== "number" || p_cost !== expectedCost) {
      return { data: null, error: { message: "Invalid guild item purchase" } };
    }
    const g = guilds.find((x: any) => x.id === p_guild_id);
    if (!g || (g.funds || 0) < p_cost) return { error: { message: "ギルド資金が不足しています。" } };
    
    if (p_type === "DECORATION") {
      const list = Array.isArray(g.unlocked_decorations) ? g.unlocked_decorations : [];
      if (list.includes(p_item_id)) return { error: { message: "このアイテムは既に購入済みです。" } };
      g.unlocked_decorations = [...list, p_item_id];
    } else {
      const list = Array.isArray(g.unlocked_banners) ? g.unlocked_banners : [];
      if (list.includes(p_item_id)) return { error: { message: "このアイテムは既に購入済みです。" } };
      g.unlocked_banners = [...list, p_item_id];
    }
    g.funds -= p_cost;
    client.setStorage("guilds", guilds);
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "use_energy_drink") {
    const { p_user_id } = params;
    const items = client.getStorage("user_items") || [];
    const drink = items.find((i: any) => i.user_id === p_user_id && i.item_id === "ENERGY_DRINK");
    if (!drink || drink.quantity < 1) return { error: { message: "エナジードリンクを所持していません。" } };
    drink.quantity -= 1;
    
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) user.vitality = 100;
    
    client.setStorage("user_items", items);
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "add_test_diamonds") {
    const { p_user_id, p_amount } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) user.neon_diamonds = (user.neon_diamonds || 0) + (p_amount || 50);
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "claim_present") {
    const { p_user_id, p_present_id } = params;
    const presents = client.getStorage("presents") || [];
    const p = presents.find((x: any) => x.id === p_present_id && x.user_id === p_user_id && x.status === "UNCLAIMED");
    if (!p) return { error: { message: "プレゼントが見つからないか、既に受け取り済みです。" } };
    
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "User not found" } };
    
    if (p.item_id === "CASH") user.cash = (user.cash || 0) + p.quantity;
    else if (p.item_id === "DIA") user.neon_diamonds = (user.neon_diamonds || 0) + p.quantity;
    else if (p.item_id.startsWith("EQUIP_")) {
      const equips = client.getStorage("user_equipments") || [];
      equips.push({
        id: "equip_" + Date.now(),
        user_id: p_user_id,
        equipment_master_id: p.item_id,
        level: 1,
        plus_val: 0
      });
      client.setStorage("user_equipments", equips);
    } else {
      const items = client.getStorage("user_items") || [];
      const ex = items.find((i: any) => i.user_id === p_user_id && i.item_id === p.item_id);
      if (ex) ex.quantity += p.quantity;
      else items.push({ id: "itm_" + Date.now(), user_id: p_user_id, item_id: p.item_id, quantity: p.quantity });
      client.setStorage("user_items", items);
    }
    
    p.status = "CLAIMED";
    p.claimed_at = new Date().toISOString();
    
    client.setStorage("users", users);
    client.setStorage("presents", presents);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "claim_all_presents") {
    const { p_user_id } = params;
    const presents = client.getStorage("presents") || [];
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "User not found" } };
    let claimed = 0;
    presents.filter((x: any) => x.user_id === p_user_id && x.status === "UNCLAIMED").forEach((p: any) => {
      if (p.item_id === "CASH") user.cash = (user.cash || 0) + p.quantity;
      else if (p.item_id === "DIA") user.neon_diamonds = (user.neon_diamonds || 0) + p.quantity;
      else if (p.item_id.startsWith("EQUIP_")) {
        const equips = client.getStorage("user_equipments") || [];
        equips.push({
          id: "equip_" + Date.now() + Math.random(),
          user_id: p_user_id,
          equipment_master_id: p.item_id,
          level: 1,
          plus_val: 0
        });
        client.setStorage("user_equipments", equips);
      } else {
        const items = client.getStorage("user_items") || [];
        const ex = items.find((i: any) => i.user_id === p_user_id && i.item_id === p.item_id);
        if (ex) ex.quantity += p.quantity;
        else items.push({ id: "itm_" + Date.now() + Math.random(), user_id: p_user_id, item_id: p.item_id, quantity: p.quantity });
        client.setStorage("user_items", items);
      }
      p.status = "CLAIMED";
      p.claimed_at = new Date().toISOString();
      claimed++;
    });
    client.setStorage("users", users);
    client.setStorage("presents", presents);
    return { data: { status: "success", claimed_count: claimed }, error: null };
  }

  if (funcName === "claim_mission_reward") {
    const { p_user_id, p_mission_id } = params;
    const userMissions = client.getStorage("user_missions") || [];
    const um = userMissions.find((m: any) => m.user_id === p_user_id && m.mission_id === p_mission_id && m.status === "COMPLETED");
    if (!um) return { error: { message: "ミッションが見つからないか未達成です。" } };
    
    um.status = "CLAIMED";
    um.updated_at = new Date().toISOString();
    
    const presents = client.getStorage("presents") || [];
    presents.push({
      id: Date.now(),
      user_id: p_user_id,
      item_id: "DIA", // mock fallback
      quantity: 100,
      message: "ミッション報酬",
      status: "UNCLAIMED"
    });
    
    client.setStorage("user_missions", userMissions);
    client.setStorage("presents", presents);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "claim_all_mission_rewards") {
    const { p_user_id, p_mission_ids } = params;
    const userMissions = client.getStorage("user_missions") || [];
    const presents = client.getStorage("presents") || [];
    let count = 0;
    userMissions.forEach((um: any) => {
      if (um.user_id === p_user_id && p_mission_ids.includes(um.mission_id) && um.status === "COMPLETED") {
        um.status = "CLAIMED";
        um.updated_at = new Date().toISOString();
        presents.push({
          id: Date.now() + Math.random(),
          user_id: p_user_id,
          item_id: "CASH", // mock fallback
          quantity: 5000,
          message: "ミッション一括報酬",
          status: "UNCLAIMED"
        });
        count++;
      }
    });
    client.setStorage("user_missions", userMissions);
    client.setStorage("presents", presents);
    return { data: { status: "success", claimed_count: count }, error: null };
  }

  if (funcName === "admin_reset_daily_missions") {
    const { p_user_id, p_mission_ids } = params;
    const userMissions = client.getStorage("user_missions") || [];
    userMissions.forEach((um: any) => {
      if (um.user_id === p_user_id && p_mission_ids.includes(um.mission_id)) {
        um.status = "IN_PROGRESS";
        um.current_progress = 0;
        um.updated_at = new Date().toISOString();
      }
    });
    client.setStorage("user_missions", userMissions);
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "start_patrol") {
    const { p_course_id, p_character_id } = params;
    const currentUserId = typeof window === "undefined" ? null : localStorage.getItem("tribe_demo_uuid");
    const users = client.getStorage("users") || [];
    const user = users.find((entry: any) => entry.id === currentUserId);
    const ownedCharacters = client.getStorage("user_characters") || [];
    const owned = ownedCharacters.find((entry: any) => entry.user_id === currentUserId && (entry.id === p_character_id || entry.character_id === p_character_id));
    if (!user || !owned) return { data: null, error: { message: "所持していないキャラクターです。", code: "23503" } };

    const quests = client.getStorage("quests") || [];
    const quest = quests.find((entry: any) => entry.id === p_course_id);
    const level = String(p_course_id).match(/_(\d)$/)?.[1];
    const durationSeconds = Number(quest?.duration_seconds ?? (level === "1" ? 60 : level === "2" ? 180 : 300));
    const costVitality = Number(quest?.cost_vitality ?? (level === "1" ? 5 : level === "2" ? 10 : 15));
    if (user.vitality < costVitality) return { data: null, error: { message: "スタミナが不足しています。", code: "23514" } };

    const patrols = client.getStorage("user_patrols") || [];
    if (patrols.filter((entry: any) => entry.user_id === currentUserId && entry.status !== "COMPLETED").length >= 5) {
      return { data: null, error: { message: "派遣枠が埋まっています。", code: "23514" } };
    }
    const characterMasterId = owned.character_id;
    if (patrols.some((entry: any) => entry.user_id === currentUserId && entry.character_id === characterMasterId && entry.status !== "COMPLETED")) {
      return { data: null, error: { message: "このキャラクターは出撃中です。", code: "23505" } };
    }

    const tutorialProgress = (client.getStorage("tutorial_progress") || []).find((entry: any) => entry.user_id === currentUserId);
    const hasBattle = tutorialProgress?.step_id === "DISPATCH" || Math.random() <= 0.2;
    const newId = `patrol_${Date.now()}`;
    patrols.push({
      id: newId,
      user_id: currentUserId,
      course_id: p_course_id,
      character_id: characterMasterId,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
      status: "ONGOING",
      has_battle_event: hasBattle,
      battle_resolved: false,
    });
    user.vitality -= costVitality;
    client.setStorage("users", users);
    client.setStorage("user_patrols", patrols);
    return { data: { status: "success", patrol_id: newId, has_battle: hasBattle, duration_seconds: durationSeconds, cost_vitality: costVitality }, error: null };
  }

  if (funcName === "start_patrol_v2") {
    const { p_user_id, p_course_id, p_character_id, p_duration_seconds, p_cost_vitality, p_battle_chance } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.vitality < p_cost_vitality) return { error: { message: "スタミナが不足しています。" } };
    
    const tutorialProgress = (client.getStorage("tutorial_progress") || []).find((entry: any) => entry.user_id === p_user_id);
    const has_battle = tutorialProgress?.step_id === "DISPATCH" || Math.random() <= (p_battle_chance || 0.2);
    const newId = "patrol_" + Date.now();
    const patrols = client.getStorage("user_patrols") || [];
    
    patrols.push({
      id: newId,
      user_id: p_user_id,
      course_id: p_course_id,
      character_id: p_character_id,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + p_duration_seconds * 1000).toISOString(),
      status: "ONGOING",
      has_battle_event: has_battle,
      battle_resolved: false
    });
    
    user.vitality -= p_cost_vitality;
    client.setStorage("users", users);
    client.setStorage("user_patrols", patrols);
    return { data: { status: "success", patrol_id: newId, has_battle }, error: null };
  }

  if (funcName === "complete_patrol_v2") {
    const { p_user_id, p_patrol_id, p_cash, p_xp, p_course_name, p_reward_item_id, p_reward_qty, p_gear_dropped, p_is_victory, p_battle_reward_item_id, p_battle_reward_qty } = params;
    const patrols = client.getStorage("user_patrols") || [];
    const p = patrols.find((x: any) => x.id === p_patrol_id && x.user_id === p_user_id);
    if (p) p.status = "COMPLETED";
    
    const presents = client.getStorage("presents") || [];
    presents.push({
      id: Date.now(),
      user_id: p_user_id,
      item_id: "CASH",
      quantity: p_cash,
      message: `見回り完了報酬 (${p_course_name}${p_is_victory ? '・バトル勝利' : ''})`,
      status: "UNCLAIMED"
    });
    
    if (p_reward_item_id && p_reward_qty > 0) {
      presents.push({
        id: Date.now() + 1,
        user_id: p_user_id,
        item_id: p_reward_item_id,
        quantity: p_reward_qty,
        message: `見回りドロップ報酬 (${p_course_name})`,
        status: "UNCLAIMED"
      });
    }
    
    if (p_gear_dropped) {
      presents.push({
        id: Date.now() + 2,
        user_id: p_user_id,
        item_id: "WEAPON_001",
        quantity: 1,
        message: `見回り追加ドロップ装備 (${p_course_name})`,
        status: "UNCLAIMED"
      });
    }

    if (p_battle_reward_item_id && p_battle_reward_qty > 0) {
      presents.push({
        id: Date.now() + 3,
        user_id: p_user_id,
        item_id: p_battle_reward_item_id,
        quantity: p_battle_reward_qty,
        message: `見回りバトル勝利追加報酬 (${p_course_name})`,
        status: "UNCLAIMED"
      });
    }

    
    client.setStorage("user_patrols", patrols);
    client.setStorage("presents", presents);
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "consume_pvp_point") {
    const { p_user_id } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user || user.pvp_points < 1) return { error: { message: "PvPポイントが不足しています。" } };
    
    if (user.pvp_points === 5) user.pvp_points_last_recovered_at = new Date().toISOString();
    user.pvp_points -= 1;
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "process_pvp_match_result_v2") {
    const { p_user_id, p_is_win, p_point_diff, p_cash_reward } = params;
    const ranks = client.getStorage("pvp_ranks") || [];
    let r = ranks.find((x: any) => x.user_id === p_user_id);
    if (!r) {
      r = { user_id: p_user_id, rank_points: 1000, daily_wins: 0, season_wins: 0 };
      ranks.push(r);
    }
    r.rank_points = Math.max(0, r.rank_points + p_point_diff);
    if (p_is_win) {
      r.daily_wins += 1;
      r.season_wins += 1;
    }
    client.setStorage("pvp_ranks", ranks);
    
    if (p_cash_reward > 0) {
      const users = client.getStorage("users") || [];
      const u = users.find((x: any) => x.id === p_user_id);
      if (u) {
        u.cash = (u.cash || 0) + p_cash_reward;
        client.setStorage("users", users);
      }
    }
    return { data: { status: "success" }, error: null };
  }

  // Duplicate record_raid_boss_damage_v2 handler removed (handled at L593)


  if (funcName === "process_gvg_battle_result_v2") {
    const { p_user_id, p_guild_id, p_base_id, p_is_practice, p_is_win } = params;
    if (p_is_practice) return { data: { status: "success", practice: true }, error: null };
    
    const seasonStatus = client.getStorage("gvg_season_status") || [{ id: 1, current_day: 1 }];
    const currentDay = seasonStatus[0].current_day;
    const isFinals = currentDay === 7;
    
    const matches = client.getStorage("gvg_matches") || [];
    const myMatch = matches.find((m: any) => m.status === "ONGOING" && m.is_finals === isFinals && (m.guild_a_id === p_guild_id || m.guild_b_id === p_guild_id));
    
    if (p_is_win) {
      if (myMatch) {
        if (myMatch.guild_a_id === p_guild_id) myMatch.guild_a_points = (myMatch.guild_a_points || 0) + 250;
        else myMatch.guild_b_points = (myMatch.guild_b_points || 0) + 250;
        client.setStorage("gvg_matches", matches);
      }
      
      const ranks = client.getStorage("user_gvg_ranks") || [];
      let r = ranks.find((x: any) => x.user_id === p_user_id);
      if (!r) { r = { user_id: p_user_id, season_points: 0 }; ranks.push(r); }
      r.season_points += 250;
      client.setStorage("user_gvg_ranks", ranks);
      
      const controls = client.getStorage("guild_base_controls") || [];
      let c = controls.find((x: any) => x.base_id === p_base_id && x.guild_id === p_guild_id);
      if (!c) { c = { base_id: p_base_id, guild_id: p_guild_id, daily_points: 0 }; controls.push(c); }
      c.daily_points += 250;
      client.setStorage("guild_base_controls", controls);
    } else {
      if (myMatch) {
        if (myMatch.guild_a_id === p_guild_id) {
          myMatch.guild_a_points = Math.max(0, (myMatch.guild_a_points || 0) - 100);
          myMatch.guild_b_points = (myMatch.guild_b_points || 0) + 100;
        } else {
          myMatch.guild_b_points = Math.max(0, (myMatch.guild_b_points || 0) - 100);
          myMatch.guild_a_points = (myMatch.guild_a_points || 0) + 100;
        }
        client.setStorage("gvg_matches", matches);
      }
      
      const ranks = client.getStorage("user_gvg_ranks") || [];
      let r = ranks.find((x: any) => x.user_id === p_user_id);
      if (!r) { r = { user_id: p_user_id, season_points: 0 }; ranks.push(r); }
      r.season_points = Math.max(0, r.season_points - 100);
      client.setStorage("user_gvg_ranks", ranks);
      
      const controls = client.getStorage("guild_base_controls") || [];
      let c = controls.find((x: any) => x.base_id === p_base_id && x.guild_id === p_guild_id);
      if (!c) { c = { base_id: p_base_id, guild_id: p_guild_id, daily_points: 0 }; controls.push(c); }
      c.daily_points = Math.max(0, c.daily_points - 100);
      client.setStorage("guild_base_controls", controls);
    }
    
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "process_gvg_battle_result_old") {
    const { p_guild_id, p_battle_id, p_points, p_is_guild_a } = params;
    const battles = client.getStorage("gvg_battles") || [];
    const b = battles.find((x: any) => x.id === p_battle_id);
    if (b) {
      if (p_is_guild_a) b.guild_a_points = (b.guild_a_points || 0) + p_points;
      else b.guild_b_points = (b.guild_b_points || 0) + p_points;
      client.setStorage("gvg_battles", battles);
    }
    return { data: { status: "success" }, error: null };
  }


  if (funcName === "admin_respawn_raid_boss") {
    const { p_boss_id, p_max_hp, p_base_id } = params;
    const bosses = client.getStorage("raid_bosses") || [];
    const b = bosses.find((x: any) => x.id === p_boss_id);
    if (b) {
      b.current_hp = p_max_hp;
      b.base_id = p_base_id;
      b.status = "ACTIVE";
      b.spawned_at = new Date().toISOString();
      b.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      client.setStorage("raid_bosses", bosses);
    }
    client.setStorage("raid_damage_logs", []);
    client.setStorage("user_raid_claimed_rewards", []);
    return { data: { status: "success" }, error: null };
  }

  // --- Phase 3-B: Additional Mock Stubs ---

  if (funcName === "add_test_cash") {
    const { p_user_id, p_amount } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) user.cash = (user.cash || 0) + (p_amount || 10000);
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "add_user_vitality") {
    const { p_user_id, p_amount } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) user.vitality = Math.min((user.vitality || 0) + (p_amount || 100), 200);
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "update_favorite_character") {
    const { p_user_id, p_character_id } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (user) user.favorite_character_id = p_character_id;
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "buy_avatar_part") {
    const { p_user_id, p_currency_type, p_price } = params;
    const users = client.getStorage("users") || [];
    const user = users.find((u: any) => u.id === p_user_id);
    if (!user) return { error: { message: "User not found" } };
    if (p_currency_type === "CASH") {
      if (user.cash < p_price) return { error: { message: "キャッシュが不足しています。" } };
      user.cash -= p_price;
    } else {
      if ((user.neon_diamonds || 0) < p_price) return { error: { message: "ダイヤが不足しています。" } };
      user.neon_diamonds -= p_price;
    }
    client.setStorage("users", users);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "admin_update_guild") {
    const { p_guild_id, p_funds, p_level, p_xp } = params;
    const guilds = client.getStorage("guilds") || [];
    const guild = guilds.find((g: any) => g.id === p_guild_id);
    if (guild) {
      guild.funds = p_funds;
      guild.level = p_level;
      guild.xp = p_xp;
    }
    client.setStorage("guilds", guilds);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "admin_add_guild_funds") {
    const { p_guild_id, p_amount } = params;
    const guilds = client.getStorage("guilds") || [];
    const guild = guilds.find((g: any) => g.id === p_guild_id);
    if (guild) guild.funds = (guild.funds || 0) + p_amount;
    client.setStorage("guilds", guilds);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "admin_update_guild_finals") {
    const { p_guild_id, p_funds_add, p_decorations } = params;
    const guilds = client.getStorage("guilds") || [];
    const guild = guilds.find((g: any) => g.id === p_guild_id);
    if (guild) {
      guild.funds = (guild.funds || 0) + p_funds_add;
      guild.unlocked_decorations = p_decorations;
    }
    client.setStorage("guilds", guilds);
    return { data: { status: "success" }, error: null };
  }

  if (funcName === "reset_daily_power_rankings") return { data: { status: "success" }, error: null };
  if (funcName === "reset_seasonal_power_rankings") return { data: { status: "success" }, error: null };

  console.warn(`[Mock RPC] Unhandled RPC call: ${funcName}`);
  return { data: null, error: null };
}
