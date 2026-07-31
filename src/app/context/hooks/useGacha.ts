"use client";

import { useState } from "react";

export function useGacha() {
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

  return {
    gachaMasters, setGachaMasters,
    gachaItemsMaster, setGachaItemsMaster,
    dailyFreeGachaFlags, setDailyFreeGachaFlags,
    specialPityPoints, setSpecialPityPoints,
    scoutAnimationState, setScoutAnimationState,
    scoutFlashingColor, setScoutFlashingColor,
    scoutResults, setScoutResults
  };
}
