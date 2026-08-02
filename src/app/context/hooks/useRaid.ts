"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useRaid(
  session: any,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>
) {
  const [raidBossHp, setRaidBossHp] = useState<number>(9452100);
  const [raidBossMaxHp, setRaidBossMaxHp] = useState<number>(9999999);
  const [raidBossSecondsLeft, setRaidBossSecondsLeft] = useState<number>(86400);
  const [raidTotalDamage, setRaidTotalDamage] = useState<number>(0);
  const [raidBossBaseId, setRaidBossBaseId] = useState<string>("shinjuku");
  const [raidBossName, setRaidBossName] = useState<string>("極道連合組長");

  const [raidDamageLogs, setRaidDamageLogs] = useState<any[]>([]);
  const [raidSeasonRankings, setRaidSeasonRankings] = useState<any[]>([]);
  const [raidDefeatLoading, setRaidDefeatLoading] = useState<boolean>(false);

  const isRaidActive = raidBossHp > 0 && raidBossSecondsLeft > 0;

  return {
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
  };
}
