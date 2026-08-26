"use client";

import { useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import { CHARACTERS_MASTER } from "@/utils/game_constants";

export function usePvp(
  session: any,
  setUpgradeLoading: (loading: boolean) => void,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>,
  setConfirmDialogConfig: React.Dispatch<React.SetStateAction<import("@/app/components/ui/ConfirmDialog").ConfirmDialogConfig | null>>
) {
  const [pvpPoints, setPvpPoints] = useState<number>(5);
  const [battleSubTab, setBattleSubTab] = useState<string>("pvp");
  const [pvpOpponents, setPvpOpponents] = useState<any[]>([]);
  const [opponentsLoading, setOpponentsLoading] = useState<boolean>(false);
  const [pvpRate, setPvpRate] = useState<number>(1000);

  const [pvpSubView, setPvpSubView] = useState<"opponents" | "daily" | "season" | "defense">("opponents");
  const [myPvpDefenseDeck, setMyPvpDefenseDeck] = useState<any>(null);
  const [pvpRankings, setPvpRankings] = useState<any[]>([]);
  const [powerRankings, setPowerRankings] = useState<any[]>([]);
  const [guildPowerRankings, setGuildPowerRankings] = useState<any[]>([]);
  const [pvpSeasonLoading, setPvpSeasonLoading] = useState<boolean>(false);
  const [pvpDefenseLogs, setPvpDefenseLogs] = useState<any[]>([]);
  const [simulatingDefense, setSimulatingDefense] = useState<boolean>(false);
  const opponentsRequestRef = useRef<Promise<any[]> | null>(null);

  const fetchPvpOpponents = (userId: string, myPoints: number): Promise<any[]> => {
    if (!userId) return Promise.resolve([]);
    if (opponentsRequestRef.current) return opponentsRequestRef.current;
    const request = (async () => {
      setOpponentsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_pvp_opponents", {
          p_user_id: userId,
          p_my_points: myPoints
        });

        if (error) throw error;
        const nextOpponents = Array.isArray(data) ? data : [];
        setPvpOpponents(nextOpponents);
        
        // 🚀 ロード時間短縮：アセット（NPC立ち絵やギルドエンブレム）のバックグラウンドプリロード
        if (typeof window !== "undefined") {
          nextOpponents.forEach((op: any) => {
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
        return nextOpponents;
      } catch (err: any) {
        console.warn("Failed to fetch PvP opponents:", err.message);
        setErrorMessage(`対戦相手を取得できませんでした。${err.message ? `（${err.message}）` : ""}`);
        return [];
      } finally {
        setOpponentsLoading(false);
      }
    })();
    opponentsRequestRef.current = request;
    void request.finally(() => {
      if (opponentsRequestRef.current === request) opponentsRequestRef.current = null;
    });
    return request;
  };

  const savePvpDefenseDeck = async (members: string[], tactic: string = "ATTACK_PRIORITY") => {
    if (!session?.user?.id) return { success: false, message: "ログインが必要です。" };
    setUpgradeLoading(true);
    playCyberSe("click");

    try {
      const { error } = await supabase.rpc("save_pvp_defense_deck", {
        p_character_ids: members,
        p_tactic: tactic,
      });

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

  const syncUserPower = async (userId: string, _charsList: any[], _equipsList: any[], _selectedMembersList: string[]) => {
    if (!userId) return 0;
    try {
      const { data, error } = await supabase.rpc("get_my_power_snapshot");
      if (error) throw error;
      return Number(data?.total_power || 0);
    } catch (err) {
      console.warn("Failed to read server power:", err);
      return 0;
    }
  };

  return {
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
  };
}
