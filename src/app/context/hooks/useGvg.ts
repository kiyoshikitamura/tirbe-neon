"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

export function useGvg(
  session: any,
  setErrorMessage: (msg: string | null) => void,
  playCyberSe: (type: string) => void,
  syncBootstrapData: (userId: string) => Promise<void>
) {
  const [gvgBases, setGvgBases] = useState<any[]>([]);
  const [gvgBaseControls, setGvgBaseControls] = useState<any[]>([]);
  const [gvgResetLoading, setGvgResetLoading] = useState<boolean>(false);
  const [gvgSeasonDay, setGvgSeasonDay] = useState<number>(1);
  const [gvgMatches, setGvgMatches] = useState<any[]>([]);
  const [myGvgMatch, setMyGvgMatch] = useState<any | null>(null);
  const [gvgDefenseDeck, setGvgDefenseDeck] = useState<any | null>(null);
  const [personalGvgPoints, setPersonalGvgPoints] = useState<number>(0);
  const [gvgActiveRound, setGvgActiveRound] = useState<number>(0);

  return {
    gvgBases, setGvgBases,
    gvgBaseControls, setGvgBaseControls,
    gvgResetLoading, setGvgResetLoading,
    gvgSeasonDay, setGvgSeasonDay,
    gvgMatches, setGvgMatches,
    myGvgMatch, setMyGvgMatch,
    gvgDefenseDeck, setGvgDefenseDeck,
    personalGvgPoints, setPersonalGvgPoints,
    gvgActiveRound, setGvgActiveRound
  };
}
