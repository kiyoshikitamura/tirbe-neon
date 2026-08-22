"use client";

import { useState } from "react";
import { DEFAULT_OPERATIONS_STATE, type OperationsStateMap } from "@/domain/operations/operations";

export function useGacha() {
  const [featureOperatingStates, setFeatureOperatingStates] = useState<OperationsStateMap>({ ...DEFAULT_OPERATIONS_STATE });
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
