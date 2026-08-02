/**
 * React binding for the cooperative engine.
 *
 * The hook owns storage, animation draining and error messaging only.
 * Every rules decision comes from `applyAction` — the UI never judges legality.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { applyAction } from "@/game-engine/reducer";
import { createCooperativeMatch, type CreateMatchOptions } from "@/game-engine/setup";
import type { GameAction, MatchState } from "@/game-engine/types";
import { deleteMatch, loadMatch, saveMatch } from "@/persistence/local-store";

export const ACTIVE_COOP_MATCH_ID = "coop-active";

function freshSeed(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Everything the setup screen can choose. Seed is generated when omitted. */
export type MatchConfig = Omit<CreateMatchOptions, "matchId" | "seed"> & { seed?: string };

export function createFreshMatch(config: MatchConfig = {}): MatchState {
  return createCooperativeMatch({
    ...config,
    matchId: ACTIVE_COOP_MATCH_ID,
    seed: config.seed ?? freshSeed(),
  });
}

/** Config of a match already in progress, so "restart" keeps the same table. */
export function configOf(state: MatchState): MatchConfig {
  return {
    playerCount: state.playerCount,
    orderDeckIds: state.seatOrder.map((id) => state.seats[id].deckId),
    encounterDeckId: state.encounterDeckId,
    bossId: state.bossId,
  };
}

export interface UseMatch {
  readonly state: MatchState | null;
  readonly loading: boolean;
  readonly notice: string | null;
  readonly dispatch: (action: GameAction) => void;
  readonly startNewMatch: (config?: MatchConfig) => void;
  readonly loadFromJson: (json: string) => void;
  readonly dismissNotice: () => void;
}

export function useMatch(): UseMatch {
  const [state, setState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      let restored: MatchState | undefined;
      try {
        restored = await loadMatch(ACTIVE_COOP_MATCH_ID);
      } catch {
        restored = undefined;
      }
      if (!mounted.current) return;
      setState(restored ?? createFreshMatch());
      setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const persist = useCallback((next: MatchState) => {
    void saveMatch(next).catch(() => undefined);
  }, []);

  const dispatch = useCallback(
    (action: GameAction) => {
      setState((current) => {
        if (!current) return current;
        const { state: next, legality } = applyAction(current, action);
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
    (config: MatchConfig = {}) => {
      const next = createFreshMatch(config);
      setNotice(null);
      setState(next);
      persist(next);
    },
    [persist],
  );

  const loadFromJson = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as MatchState;
        if (!parsed.matchId || !parsed.players) throw new Error("Not a Realmforge match state.");
        const next = { ...parsed, matchId: ACTIVE_COOP_MATCH_ID };
        setState(next);
        persist(next);
        setNotice("Match state imported.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not import that state.");
      }
    },
    [persist],
  );

  // Drain animation cues shortly after they are emitted so replays stay short.
  useEffect(() => {
    if (!state || state.animations.length === 0) return;
    const timer = setTimeout(() => dispatch({ kind: "clearAnimations" }), 700);
    return () => clearTimeout(timer);
  }, [state, dispatch]);

  return {
    state,
    loading,
    notice,
    dispatch,
    startNewMatch,
    loadFromJson,
    dismissNotice: useCallback(() => setNotice(null), []),
  };
}

export async function clearActiveMatch(): Promise<void> {
  await deleteMatch(ACTIVE_COOP_MATCH_ID).catch(() => undefined);
}
