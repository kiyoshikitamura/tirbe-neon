"use client";

import { useState } from "react";

export function useGacha() {
  const [featureOperatingStates, setFeatureOperatingStates] = useState<Record<"SPECIAL_GACHA" | "GVG" | "PAYMENT", "CLOSED" | "OPEN">>({
    SPECIAL_GACHA: "CLOSED",
    GVG: "CLOSED",
    PAYMENT: "CLOSED"
  });
  const [gachaMasters, setGachaMasters] = useState<any[]>([]);
  const [gachaItemsMaster, setGachaItemsMaster] = useState<any[]>([]);
  const [dailyFreeGachaFlags, setDailyFreeGachaFlags] = useState<{ CHARACTER: boolean; SKILL: boolean; EQUIPMENT: boolean }>({
    CHARACTER: true,
    SKILL: true,
    EQUIPMENT: true
  });
  const [specialPityPoints, setSpecialPityPoints] = useState<number>(0);

  const [scoutAnimationState, setScoutAnimationState] = useState<null | "FLASHING" | "READY" | "SHOW_RESULTS">(null);
  const [scoutFlashingColor, setScoutFlashingColor] = useState<"BLUE" | "PURPLE" | "GOLD">("BLUE");
  const [scoutResults, setScoutResults] = useState<any[]>([]);

  return {
    featureOperatingStates, setFeatureOperatingStates,
    gachaMasters, setGachaMasters,
    gachaItemsMaster, setGachaItemsMaster,
    dailyFreeGachaFlags, setDailyFreeGachaFlags,
    specialPityPoints, setSpecialPityPoints,
    scoutAnimationState, setScoutAnimationState,
    scoutFlashingColor, setScoutFlashingColor,
    scoutResults, setScoutResults
  };
}
