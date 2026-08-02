/**
 * Opponent decision-making.
 *
 * Phase 2 defines the contract only. No decision logic exists yet, by design:
 * the Hollow Crown automation and the competitive AI are later-phase work.
 *
 * Contract rules every future implementation must hold to:
 *  - the controller receives the same MatchState a player can see (no hidden info);
 *  - it may only return actions the engine's own legality check accepts;
 *  - it is deterministic given (state, seed) so matches stay reproducible.
 */
import type { GameAction, MatchState, PlayerId } from "@/game-engine/types";

export type Difficulty = "initiate" | "guardian" | "champion";

export interface OpponentController {
  readonly id: string;
  readonly label: string;
  readonly difficulty: Difficulty | null;
  chooseAction(state: MatchState, playerId: PlayerId): GameAction | null;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, { label: string; description: string }> = {
  initiate: {
    label: "Initiate",
    description: "Plays affordable cards in cost order and attacks the most obvious target.",
  },
  guardian: {
    label: "Guardian",
    description: "Values board trades, respects Aegis, and protects its own Gate.",
  },
  champion: {
    label: "Champion",
    description: "Plans a turn ahead over legal actions and pressures the win condition.",
  },
};

/** Placeholder so the contract is importable and testable before the AI phase. */
export const NOT_IMPLEMENTED_CONTROLLER: OpponentController = {
  id: "not-implemented",
  label: "Not implemented",
  difficulty: null,
  chooseAction: () => null,
};