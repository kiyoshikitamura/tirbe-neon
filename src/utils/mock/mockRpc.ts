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

  return { data: null, error: null };
}
