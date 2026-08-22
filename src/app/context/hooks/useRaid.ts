"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { CANONICAL_RAID_BOSSES } from "@/domain/gameplay/canonical/combat_production";

export function useRaid(
  session: any,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>
) {
  const fallbackBoss = CANONICAL_RAID_BOSSES.bosses[0];
  const [raidBossHp, setRaidBossHp] = useState<number>(fallbackBoss.maxHp);
  const [raidBossMaxHp, setRaidBossMaxHp] = useState<number>(fallbackBoss.maxHp);
  const [raidBossSecondsLeft, setRaidBossSecondsLeft] = useState<number>(86400);
  const [raidTotalDamage, setRaidTotalDamage] = useState<number>(0);
  const [raidBossBaseId, setRaidBossBaseId] = useState<string>("shinjuku");
  const [raidBossName, setRaidBossName] = useState<string>(fallbackBoss.displayName);

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
