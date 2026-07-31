"use client";

import { CHARACTERS_MASTER, CHARACTER_AWAKENING_MASTER } from "../game_constants";


export async function executeMockRpc(client: any, funcName: string, params: any): Promise<any> {
  console.log(`[Mock DB RPC] Calling ${funcName} with:`, params);

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
      pvp_tickets: 5,
      sound_settings: { bgm: true, se: true },
      current_base_id: p_area_id === "shinjuku" ? "neon_tower" : p_area_id,
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

    client.setStorage("users", users);
    client.setStorage("guilds", guilds);
    return { data: { status: "success", next_cash: user.cash, next_funds: guild.funds }, error: null };
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
    let purchaseRecord = purchases.find((p: any) => p.user_id === p_user_id && p.product_id === p_product_id);
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
    let purchaseRecord = purchases.find((p: any) => p.user_id === p_user_id && p.product_id === p_product_id);
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
    const candidates = users
      .filter((u: any) => u.id !== p_user_id)
      .slice(0, 3)
      .map((u: any, idx: number) => ({
        id: u.id,
        username: u.username || `対戦者_${idx + 1}`,
        avatar_url: u.avatar_url || "/reiji_transparent_asset.png",
        title_equipped: u.title_equipped || "title_none",
        pvp_points: u.pvp_points || 1000,
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

    user.pvp_points = Math.max(0, (user.pvp_points || 1000) + (p_point_diff || 0));
    user.cash = (user.cash || 0) + (p_cash_reward || 0);
    // Ticket handling should probably be handled before battle starts, but if we handle it here:
    // user.pvp_tickets = Math.max(0, (user.pvp_tickets || 5) - 1);

    const ranks = client.getStorage("pvp_ranks") || [];
    let rank = ranks.find((r: any) => r.user_id === p_user_id);
    if (rank) {
      rank.rank_points = user.pvp_points;
      if (p_is_win) {
        rank.daily_wins = (rank.daily_wins || 0) + 1;
        rank.season_wins = (rank.season_wins || 0) + 1;
      }
    } else {
      ranks.push({
        id: `pr_${Date.now()}`,
        user_id: p_user_id,
        rank_points: user.pvp_points,
        daily_wins: p_is_win ? 1 : 0,
        season_wins: p_is_win ? 1 : 0
      });
    }

    client.setStorage("users", users);
    client.setStorage("pvp_ranks", ranks);
    return { data: { status: "success", pvp_points: user.pvp_points }, error: null };
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
    let boss = bosses.find((b: any) => b.id === p_boss_id);
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
    let myMatch = matches.find((m: any) => m.status === "ONGOING" && (m.guild_a_id === p_guild_id || m.guild_b_id === p_guild_id));

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

  return { data: null, error: null };
}
