import { useEffect } from "react";

import { usePlayerData, type MatchOutcome } from "@/hooks/use-player-data";

const RECORDED_KEY = "realmforge.recorded-matches.v1";

function recordedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECORDED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function remember(matchId: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = [...new Set([...recordedIds(), matchId])].slice(-200);
    window.localStorage.setItem(RECORDED_KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked — the worst case is a re-count after reload */
  }
}

/**
 * Records a finished match into local statistics exactly once per match id,
 * even across reloads. It never touches match state.
 */
export function useRecordOutcome(matchId: string | null, outcome: MatchOutcome | null) {
  const { recordMatchResult } = usePlayerData();

  useEffect(() => {
    if (!matchId || !outcome) return;
    if (recordedIds().includes(matchId)) return;
    remember(matchId);
    recordMatchResult(outcome);
  }, [matchId, outcome, recordMatchResult]);
}
