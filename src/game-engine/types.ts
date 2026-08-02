/**
 * Deterministic rules-engine data model.
 *
 * PURE TYPESCRIPT ONLY. No React, no DOM, no animation, no randomness at module scope.
 * Phase 3 fills in the cooperative reducer, effect queue and Hollow Crown automation.
 */
import type { CardDefinition, GameMode, Keyword } from "@/game-data/schema";

export type { CardDefinition, GameMode, Keyword };

/** Board zones a card instance can occupy. */
export type Zone = "deck" | "hand" | "unitSlot" | "supportSlot" | "discard" | "removed" | "boss";

export type PlayerId = string;
export type ControllerKind = "human" | "hollow-crown" | "ai-opponent";

/** The two sides of a cooperative match. Also used as PlayerId keys. */
export const OATHGUARD = "oathguard" as const;
export const HOLLOW = "hollow" as const;
export type SideId = typeof OATHGUARD | typeof HOLLOW;

/** Non-card attack/effect targets, addressed by stable string. */
export const TARGET_OATHGUARD_GATE = "target:oathguard-gate";
export const TARGET_OATHGUARD_CRYSTALS = "target:oathguard-crystals";
export const TARGET_HOLLOW_GATE = "target:hollow-gate";
export const TARGET_HOLLOW_CRYSTALS = "target:hollow-crystals";
export const TARGET_BOSS = "target:boss";

/** A concrete copy of a CardDefinition inside a match. */
export interface CardInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerId: PlayerId;
  readonly zone: Zone;
  /** Slot index when zone is unitSlot/supportSlot. */
  readonly slotIndex: number | null;
  /** Persistent damage. A unit is discarded when damage >= DEF. */
  readonly damage: number;
  /** Cleared during Ready and Charge. */
  readonly exhausted: boolean;
  /** Round number the card entered play. Blocks attacking without Surge on that round. */
  readonly enteredOnRound: number;
  /** ATK bonus lasting until end of turn. */
  readonly temporaryAtk: number;
  /** ATK bonus/penalty lasting until the end of the current round. */
  readonly roundAtk: number;
  /** ATK bonus consumed by the next attack only. */
  readonly nextAttackAtk: number;
  /** Per-instance rules flags set only by registered effects (never text-parsed). */
  readonly flags: Readonly<Record<string, boolean>>;
  readonly grantedKeywords: readonly Keyword[];
  /** Cooperative seat that played this card. Null for Hollow Crown cards. */
  readonly controllerSeatId: string | null;
}

/** Unified Energy: permanent crystals only, face-up = spendable. */
export interface EnergyPool {
  readonly permanentCrystals: number;
  readonly faceUpCrystals: number;
  readonly temporaryCrystals: number;
  readonly maxPermanentCrystals: number;
}

export interface PlayerState {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly side: SideId;
  readonly controller: ControllerKind;
  readonly deckId: string;
  readonly energy: EnergyPool;
  readonly gateWard: number;
  readonly gateMaxWard: number;
  readonly crystalSpinner: number;
  readonly maxCrystals: number;
  readonly cardsPlayedThisTurn: number;
  readonly cardPlayLimit: number;
  readonly reserveTokenAvailable: boolean;
  readonly deck: readonly string[];
  readonly hand: readonly string[];
  readonly discard: readonly string[];
  readonly unitSlots: readonly (string | null)[];
  readonly supportSlot: string | null;
  /** Hollow Crown only: +1 ATK to every enemy per level, gained on encounter reshuffle. */
  readonly globalThreat: number;
}

export interface BossState {
  readonly definitionId: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly damage: number;
  readonly revealed: boolean;
  readonly enraged: boolean;
  readonly enrageThreshold: number;
  readonly attacksThisRound: number;
  /** QuickPlay boss profile, copied into state so no modifier lives in UI code. */
  readonly atk: number;
  readonly ignoresAegis: boolean;
  readonly gateWardBonus: number;
  readonly allyAtkBonus: number;
  readonly chargeDrain: number;
}

/**
 * A cooperative seat: one locally controlled Oathguard Order.
 * The shared board (Gate, Spinner, unit spaces, Support space) lives on
 * `players.oathguard`; only private resources live here.
 */
export interface SeatState {
  readonly seatId: string;
  readonly displayName: string;
  readonly deckId: string;
  readonly faction: string;
  readonly energy: EnergyPool;
  readonly deck: readonly string[];
  readonly hand: readonly string[];
  readonly discard: readonly string[];
  readonly cardsPlayedThisTurn: number;
  /** Face-up crystals removed at this seat's next Ready and Charge (Siphon, Malreth). */
  readonly energyDrainNextCharge: number;
  readonly mulliganUsed: boolean;
}

/** Any temporary rule currently altering play. Rendered directly by the HUD. */
export interface ActiveModifier {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: string;
  readonly owner: SideId;
  /** "round" clears at the next Oathguard round start; "match" never clears. */
  readonly duration: "turn" | "round" | "match";
  /** Remaining prevention/charge budget where the modifier has one. */
  readonly amount: number;
  readonly kind:
    | "damage-prevention"
    | "enters-used"
    | "suppress-extra-draw"
    | "boss-modifier"
    | "energy-drain"
    | "note";
}

export interface MatchStats {
  readonly damageDealt: number;
  readonly damageTaken: number;
  readonly enemyUnitsDefeated: number;
  readonly oathguardUnitsLost: number;
  readonly wardRestored: number;
  readonly cardsPlayed: number;
}

export interface BoardState {
  readonly instances: Readonly<Record<string, CardInstance>>;
  readonly boss: BossState | null;
}

export type TurnStep = "setup" | "readyAndCharge" | "play" | "battle" | "pass" | "hollowCrown";

/** Declarative target constraint. Evaluated by the engine, never parsed from text. */
export interface TargetRule {
  readonly id: string;
  readonly count: number;
  readonly optional: boolean;
  readonly side: "friendly" | "enemy" | "any";
  readonly zones: readonly Zone[];
  readonly types: readonly CardDefinition["type"][];
  readonly requiresKeyword?: Keyword;
  readonly excludesKeyword?: Keyword;
  readonly damagedOnly?: boolean;
}

/** An effect waiting in the deterministic resolution queue. */
export interface QueuedEffect {
  readonly effectId: string;
  readonly sourceInstanceId: string;
  readonly definitionId: string;
  readonly effectKey: string;
  readonly controllerId: PlayerId;
  readonly pendingTargets: readonly TargetRule[];
  readonly chosenTargets: readonly string[];
  readonly resolved: boolean;
}

export interface LogEntry {
  readonly sequence: number;
  readonly round: number;
  readonly playerId: PlayerId | null;
  readonly summary: string;
  readonly detail?: string;
  /** Set when the state before this entry can be safely restored. */
  readonly undoSafe: boolean;
}

/** Short animation cues emitted by the reducer. The UI plays and clears them. */
export type AnimationCue =
  | "draw"
  | "charge"
  | "spend"
  | "play"
  | "attack"
  | "damage"
  | "effect"
  | "restore"
  | "gate-break"
  | "crystal-damage"
  | "boss-reveal"
  | "victory"
  | "defeat";

export interface AnimationEvent {
  readonly id: number;
  readonly cue: AnimationCue;
  readonly subjectId?: string;
}

/** A decision the engine is waiting on. UI renders it; UI never invents one. */
export type Prompt =
  | { readonly kind: "mulligan"; readonly description: string }
  | {
      readonly kind: "selectTarget";
      readonly effectId: string;
      readonly sourceInstanceId: string;
      readonly legalTargetIds: readonly string[];
      readonly optional: boolean;
      readonly description: string;
    }
  | {
      readonly kind: "discardFromHand";
      readonly effectId: string;
      readonly sourceInstanceId: string;
      readonly legalTargetIds: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: "encounterOrder";
      readonly effectId: string;
      readonly sourceInstanceId: string;
      /** Revealed encounter instance IDs, current top first. */
      readonly revealedIds: readonly string[];
      /** "bottomOrKeep": choose one to bottom, or keep. "chooseTop": choose which goes on top. */
      readonly style: "bottomOrKeep" | "chooseTop";
      readonly description: string;
    };

export interface MatchResult {
  readonly outcome:
    | "oathguard-victory"
    | "hollow-crown-victory"
    | "player-victory"
    | "draw"
    | "surrendered";
  readonly winningPlayerIds: readonly PlayerId[];
  readonly reason: string;
  readonly rounds: number;
  readonly endedAt: string;
}

/** Turn-scoped rules flags set only by registered effects. */
export interface TurnFlags {
  readonly nextEnemyAttackIgnoresAegis: boolean;
  readonly damagedOathguardLoseAegis: boolean;
  readonly attacksFirstInstanceId: string | null;
}

export interface MatchState {
  readonly matchId: string;
  readonly mode: GameMode;
  readonly schemaVersion: number;
  /** Seeded RNG state — every shuffle and reveal is reproducible. */
  readonly rngSeed: string;
  readonly rngCursor: number;
  readonly round: number;
  readonly activePlayerId: PlayerId;
  readonly turnSide: SideId;
  readonly step: TurnStep;
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  readonly turnOrder: readonly PlayerId[];
  /** Cooperative seats, in turn order. Always at least one. */
  readonly seats: Readonly<Record<string, SeatState>>;
  readonly seatOrder: readonly string[];
  readonly activeSeatId: string;
  readonly playerCount: 1 | 2 | 3;
  readonly encounterDeckId: string;
  readonly bossId: string;
  readonly modifiers: readonly ActiveModifier[];
  readonly stats: MatchStats;
  readonly startedAt: string;
  readonly board: BoardState;
  readonly effectQueue: readonly QueuedEffect[];
  readonly prompt: Prompt | null;
  readonly turnFlags: TurnFlags;
  readonly mulliganUsed: boolean;
  readonly animations: readonly AnimationEvent[];
  readonly log: readonly LogEntry[];
  readonly result: MatchResult | null;
}

export type GameAction =
  | { readonly kind: "beginStep"; readonly step: TurnStep }
  | { readonly kind: "mulligan"; readonly replace: boolean }
  | {
      readonly kind: "playCard";
      readonly instanceId: string;
      readonly slotIndex: number | null;
      readonly targetIds: readonly string[];
    }
  | { readonly kind: "declareAttack"; readonly attackerId: string; readonly targetId: string }
  | { readonly kind: "spendReserveToken" }
  | {
      readonly kind: "chooseTarget";
      readonly effectId: string;
      readonly targetIds: readonly string[];
    }
  | { readonly kind: "clearAnimations" }
  | { readonly kind: "cancelPending" }
  | { readonly kind: "endTurn" }
  | { readonly kind: "surrender"; readonly playerId: PlayerId };

/** Why an action is not legal. Surfaced verbatim to the player. */
export interface IllegalReason {
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
    | "no-slot"
    | "effect-not-implemented";
  readonly message: string;
}

export type ActionLegality =
  | { readonly legal: true }
  | { readonly legal: false; readonly reason: IllegalReason };

/** Deep-mutable view used inside the reducer. The reducer clones once, mutates, freezes conceptually. */
export type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

export type MatchDraft = Mutable<MatchState>;