/**
 * React binding for the competitive (Oathguard Trials) engine.
 *
 * Owns storage, computer-opponent pacing and error messaging only.
 * Every rules decision comes from `applyTrialsAction`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { chooseTrialsAction } from "@/game-ai/trials";
import { applyTrialsAction, startTrialsMatch } from "@/game-engine/trials/reducer";
import {
  createTrialsMatch,
  type CreateTrialsMatchOptions,
  type TrialsSeatConfig,
} from "@/game-engine/trials/setup";
import type { TrialsAction, TrialsMatchState } from "@/game-engine/trials/types";
import { deleteMatch, loadMatch, saveMatch } from "@/persistence/local-store";

export const ACTIVE_TRIALS_MATCH_ID = "trials-active";

const AI_TURN_DELAY_MS = 650;

function freshSeed(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export type TrialsConfig = Omit<CreateTrialsMatchOptions, "matchId" | "seed"> & {
  seed?: string;
};

export function createFreshTrialsMatch(config: TrialsConfig): TrialsMatchState {
  return startTrialsMatch(
    createTrialsMatch({
      ...config,
      matchId: ACTIVE_TRIALS_MATCH_ID,
      seed: config.seed ?? freshSeed(),
    }),
  );
}

/** Config of a match in progress, so "rematch" keeps the same table. */
export function trialsConfigOf(state: TrialsMatchState): TrialsConfig {
  const seatOf = (id: "p1" | "p2"): TrialsSeatConfig => ({
    deckId: state.players[id].deckId,
    displayName: state.players[id].displayName,
    controller: state.players[id].controller,
    difficulty: state.players[id].difficulty,
  });
  return { seats: [seatOf("p1"), seatOf("p2")] };
}

export interface UseTrials {
  readonly state: TrialsMatchState | null;
  readonly loading: boolean;
  readonly notice: string | null;
  readonly aiThinking: boolean;
  readonly dispatch: (action: TrialsAction) => void;
  readonly startNewMatch: (config: TrialsConfig) => void;
  readonly dismissNotice: () => void;
}

export function useTrials(): UseTrials {
  const [state, setState] = useState<TrialsMatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      let restored: TrialsMatchState | undefined;
      try {
        restored = await loadMatch<TrialsMatchState>(ACTIVE_TRIALS_MATCH_ID);
      } catch {
        restored = undefined;
      }
      if (!mounted.current) return;
      setState(restored ?? null);
      setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const persist = useCallback((next: TrialsMatchState) => {
    void saveMatch(next).catch(() => undefined);
  }, []);

  const dispatch = useCallback(
    (action: TrialsAction) => {
      setState((current) => {
        if (!current) return current;
        const { state: next, legality } = applyTrialsAction(current, action);
        if (!legality.legal) {
          setNotice(legality.reason.message);
          return current;
        }
        setNotice(null);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const startNewMatch = useCallback(
    (config: TrialsConfig) => {
      const next = createFreshTrialsMatch(config);
      setNotice(null);
      setState(next);
      persist(next);
    },
    [persist],
  );

  // Computer opponents act one action at a time so the board stays readable.
  useEffect(() => {
    if (!state || state.result || state.handoffPending) {
      setAiThinking(false);
      return;
    }
    const seat = state.players[state.activeSeatId];
    if (seat.controller !== "ai" || !seat.difficulty) {
      setAiThinking(false);
      return;
    }
    const decision = chooseTrialsAction(state, seat.difficulty);
    if (!decision) {
      setAiThinking(false);
      return;
    }
    setAiThinking(true);
    const timer = setTimeout(() => {
      setState((current) => {
        if (!current) return current;
        const { state: next, legality } = applyTrialsAction(current, decision.action);
        if (!legality.legal) return current;
        const withReason: TrialsMatchState = { ...next, lastAiReason: decision.reason };
        if (import.meta.env.DEV) console.info("[Trials AI]", decision.reason);
        persist(withReason);
        return withReason;
      });
    }, AI_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, persist]);

  return {
    state,
    loading,
    notice,
    aiThinking,
    dispatch,
    startNewMatch,
    dismissNotice: useCallback(() => setNotice(null), []),
  };
}

export async function clearActiveTrialsMatch(): Promise<void> {
  await deleteMatch(ACTIVE_TRIALS_MATCH_ID).catch(() => undefined);
}