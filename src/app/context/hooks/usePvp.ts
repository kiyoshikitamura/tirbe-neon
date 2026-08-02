"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import { getCharacterTotalStats } from "@/utils/stats_calculator";

export function usePvp(
  session: any,
  setUpgradeLoading: (loading: boolean) => void,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [pvpTickets, setPvpTickets] = useState<number>(5);
  const [battleSubTab, setBattleSubTab] = useState<string>("pvp");
  const [pvpOpponents, setPvpOpponents] = useState<any[]>([]);
  const [opponentsLoading, setOpponentsLoading] = useState<boolean>(false);
  const [pvpPoints, setPvpPoints] = useState<number>(1000);

  const [pvpSubView, setPvpSubView] = useState<"opponents" | "daily" | "season" | "defense">("opponents");
  const [myPvpDefenseDeck, setMyPvpDefenseDeck] = useState<any>(null);
  const [pvpRankings, setPvpRankings] = useState<any[]>([]);
  const [powerRankings, setPowerRankings] = useState<any[]>([]);
  const [guildPowerRankings, setGuildPowerRankings] = useState<any[]>([]);
  const [pvpSeasonLoading, setPvpSeasonLoading] = useState<boolean>(false);
  const [pvpDefenseLogs, setPvpDefenseLogs] = useState<any[]>([]);
  const [simulatingDefense, setSimulatingDefense] = useState<boolean>(false);

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
      setConfirmDialogConfig({ isOpen: true, title: "保存完了", message: "防衛デッキおよび作戦を保存しました。", onConfirm: () => setConfirmDialogConfig(null), onCancel: () => setConfirmDialogConfig(null) });
      return { success: true };
    } catch (err: any) {
      console.warn("Failed to save pvp defense deck:", err.message);
      setErrorMessage("防衛デッキの保存に失敗しました。");
      return { success: false, message: err.message };
    } finally {
      setUpgradeLoading(false);
    }
  };

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

  return {
    pvpTickets, setPvpTickets,
    battleSubTab, setBattleSubTab,
    pvpOpponents, setPvpOpponents,
    opponentsLoading, setOpponentsLoading,
    pvpPoints, setPvpPoints,
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
  };
}
