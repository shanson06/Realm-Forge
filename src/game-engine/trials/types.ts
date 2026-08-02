/**
 * Realmforge: Oathguard Trials — competitive data model.
 *
 * PURE TYPESCRIPT. No React, no DOM, no module-scope randomness.
 * The cooperative engine is untouched; this mode has its own state, legality
 * rules and reducer, and only shares card data, RNG and presentation components.
 */
import type { CardInstance, EnergyPool, LogEntry, MatchResult, Mutable } from "../types";
import type { GameMode } from "@/game-data/schema";

export type { CardInstance, EnergyPool, LogEntry, MatchResult };

/** The two competitive seats. Both are Oathguard Orders. */
export const P1 = "p1" as const;
export const P2 = "p2" as const;
export type TrialsSeatId = typeof P1 | typeof P2;

export function otherSeat(seat: TrialsSeatId): TrialsSeatId {
  return seat === P1 ? P2 : P1;
}

/** Non-card attack targets, addressed by stable string. */
export const TARGET_GATE_PREFIX = "target:gate:";
export const TARGET_CRYSTALS_PREFIX = "target:crystals:";
export const gateTarget = (seat: TrialsSeatId) => `${TARGET_GATE_PREFIX}${seat}`;
export const crystalsTarget = (seat: TrialsSeatId) => `${TARGET_CRYSTALS_PREFIX}${seat}`;

export type TrialsControllerKind = "human" | "ai";
export type TrialsDifficulty = "initiate" | "guardian" | "champion";
export type ReserveTokenState = "none" | "available" | "spent";

export type TrialsStep = "setup" | "readyAndCharge" | "play" | "battle" | "pass";

export interface TrialsPlayerState {
  readonly seatId: TrialsSeatId;
  readonly displayName: string;
  readonly deckId: string;
  readonly faction: string;
  readonly controller: TrialsControllerKind;
  readonly difficulty: TrialsDifficulty | null;
  readonly energy: EnergyPool;
  readonly gateWard: number;
  readonly gateMaxWard: number;
  readonly crystalSpinner: number;
  readonly maxCrystals: number;
  readonly cardsPlayedThisTurn: number;
  readonly cardPlayLimit: number;
  readonly reserveToken: ReserveTokenState;
  readonly deck: readonly string[];
  readonly hand: readonly string[];
  readonly discard: readonly string[];
  readonly unitSlots: readonly (string | null)[];
  readonly supportSlot: string | null;
  readonly mulliganUsed: boolean;
  /** Turns this seat has begun. Used for the Reserve token window. */
  readonly turnsTaken: number;
  /** Set once for the first player's opening Ready and Charge. */
  readonly skipNextDraw: boolean;
}

export interface TrialsModifier {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: string;
  readonly owner: TrialsSeatId;
  readonly duration: "turn" | "match";
  readonly amount: number;
  readonly kind: "damage-prevention" | "note";
}

export type TrialsPrompt =
  | { readonly kind: "mulligan"; readonly seatId: TrialsSeatId; readonly description: string }
  | {
      readonly kind: "selectTarget";
      readonly effectId: string;
      readonly seatId: TrialsSeatId;
      readonly sourceInstanceId: string;
      readonly legalTargetIds: readonly string[];
      readonly count: number;
      readonly optional: boolean;
      readonly description: string;
    }
  | {
      readonly kind: "discardFromHand";
      readonly effectId: string;
      readonly seatId: TrialsSeatId;
      readonly sourceInstanceId: string;
      readonly legalTargetIds: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: "foresight";
      readonly effectId: string;
      readonly seatId: TrialsSeatId;
      readonly sourceInstanceId: string;
      /** Revealed own-deck instance IDs, current top first. Private to this seat. */
      readonly revealedIds: readonly string[];
      /** "bottom" = chosen cards go to the bottom; "top" = chosen card goes on top. */
      readonly style: "bottom" | "top";
      readonly count: number;
      readonly description: string;
    };

export interface TrialsStats {
  readonly cardsPlayed: number;
  readonly attacks: number;
  readonly unitsDefeated: number;
  readonly wardRestored: number;
}

export interface TrialsMatchState {
  readonly matchId: string;
  readonly mode: GameMode;
  readonly schemaVersion: number;
  readonly rngSeed: string;
  readonly rngCursor: number;
  /** Full rounds completed plus one; increments when the first player starts a turn. */
  readonly round: number;
  /** Monotonic turn counter across both seats. Drives summoning sickness. */
  readonly turnSequence: number;
  readonly firstSeatId: TrialsSeatId;
  readonly activeSeatId: TrialsSeatId;
  readonly step: TrialsStep;
  readonly players: Readonly<Record<TrialsSeatId, TrialsPlayerState>>;
  readonly instances: Readonly<Record<string, CardInstance>>;
  readonly modifiers: readonly TrialsModifier[];
  readonly prompt: TrialsPrompt | null;
  /** True while a pass-and-play handoff screen must hide the board. */
  readonly handoffPending: boolean;
  /** Seat that takes over once the handoff is acknowledged. */
  readonly pendingSeatId: TrialsSeatId | null;
  /** Units belonging to the active seat that have attacked this turn (Sync). */
  readonly attacksThisTurn: number;
  readonly stats: TrialsStats;
  readonly startedAt: string;
  readonly log: readonly LogEntry[];
  readonly result: MatchResult | null;
  /** Development-only, human-readable explanation of the last computer action. */
  readonly lastAiReason: string | null;
}

export type TrialsDraft = Mutable<TrialsMatchState>;

export type TrialsAction =
  | { readonly kind: "mulligan"; readonly replace: boolean }
  | {
      readonly kind: "playCard";
      readonly instanceId: string;
      readonly slotIndex: number | null;
      readonly targetIds: readonly string[];
    }
  | { readonly kind: "declareAttack"; readonly attackerId: string; readonly targetId: string }
  | { readonly kind: "beginStep"; readonly step: TrialsStep }
  | { readonly kind: "spendReserveToken" }
  | { readonly kind: "chooseTarget"; readonly effectId: string; readonly targetIds: readonly string[] }
  | { readonly kind: "cancelPending" }
  | { readonly kind: "acknowledgeHandoff" }
  | { readonly kind: "endTurn" }
  | { readonly kind: "surrender"; readonly seatId: TrialsSeatId };

export interface TrialsIllegalReason {
  readonly code:
    | "not-enough-energy"
    | "card-limit-reached"
    | "board-full"
    | "wrong-step"
    | "illegal-target"
    | "summoning-sick"
    | "already-attacked"
    | "match-over"
    | "awaiting-choice"
    | "awaiting-handoff"
    | "no-slot"
    | "no-reserve-token"
    | "effect-not-implemented";
  readonly message: string;
}

export type TrialsLegality =
  | { readonly legal: true }
  | { readonly legal: false; readonly reason: TrialsIllegalReason };

export interface TrialsOutcome {
  readonly state: TrialsMatchState;
  readonly legality: TrialsLegality;
}