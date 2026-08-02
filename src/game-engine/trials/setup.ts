/**
 * Competitive match construction (Realmforge: Oathguard Trials QuickPlay).
 *
 * Two seats, each with a 20-card Order deck, three unit spaces, one Support
 * space, a 10-Ward Gate and a six-crystal Spinner. All numbers come from the
 * locked QuickPlay rules; card data keeps its stable source IDs.
 */
import { GameMode } from "@/game-data/schema";
import { buildQuickPlayDeck, getManifest } from "@/game-data/quickplay";
import { randomAt, seededShuffle } from "../rng";
import "./effects";
import {
  P1,
  P2,
  type CardInstance,
  type TrialsControllerKind,
  type TrialsDifficulty,
  type TrialsMatchState,
  type TrialsPlayerState,
  type TrialsSeatId,
} from "./types";

export const TRIALS_SCHEMA_VERSION = 1;

export const TRIALS_SETUP = {
  startingHand: 4,
  gateWard: 10,
  crystals: 6,
  maxPermanentCrystals: 6,
  cardPlayLimit: 2,
  unitSpaces: 3,
} as const;

export const TRIALS_DECK_IDS = [
  "trials-truthwardens",
  "trials-honorbound",
  "trials-dawnwatch",
] as const;

export interface TrialsSeatConfig {
  readonly deckId: string;
  readonly displayName?: string;
  readonly controller: TrialsControllerKind;
  readonly difficulty?: TrialsDifficulty | null;
}

export interface CreateTrialsMatchOptions {
  readonly matchId?: string;
  readonly seed: string;
  readonly seats: readonly [TrialsSeatConfig, TrialsSeatConfig];
  /** Omit to roll the first player from the seeded stream. */
  readonly firstSeatId?: TrialsSeatId;
  /** Skip shuffling so tests can rely on manifest order. */
  readonly shuffle?: boolean;
}

export function validateTrialsSetup(seats: readonly TrialsSeatConfig[]): string | null {
  if (seats.length !== 2) return "Oathguard Trials needs exactly two players.";
  for (const seat of seats) {
    const manifest = getManifest(seat.deckId);
    if (!manifest) return `Unknown Trials deck "${seat.deckId}".`;
    if (manifest.mode !== GameMode.Competitive) {
      return `${manifest.label} is not an Oathguard Trials deck.`;
    }
  }
  return null;
}

function emptyEnergy() {
  return {
    permanentCrystals: 0,
    faceUpCrystals: 0,
    temporaryCrystals: 0,
    maxPermanentCrystals: TRIALS_SETUP.maxPermanentCrystals,
  };
}

function makeInstances(cardIds: readonly string[], seatId: TrialsSeatId): CardInstance[] {
  return cardIds.map((definitionId, index) => ({
    instanceId: `${seatId}-${index}`,
    definitionId,
    ownerId: seatId,
    zone: "deck",
    slotIndex: null,
    damage: 0,
    exhausted: false,
    enteredOnRound: 0,
    temporaryAtk: 0,
    roundAtk: 0,
    nextAttackAtk: 0,
    flags: {},
    grantedKeywords: [],
    controllerSeatId: seatId,
  }));
}

export function createTrialsMatch(options: CreateTrialsMatchOptions): TrialsMatchState {
  const error = validateTrialsSetup(options.seats);
  if (error) throw new Error(error);

  const instances: Record<string, CardInstance> = {};
  let cursor = 0;

  const seatIds: readonly TrialsSeatId[] = [P1, P2];
  const players = {} as Record<TrialsSeatId, TrialsPlayerState>;

  seatIds.forEach((seatId, index) => {
    const config = options.seats[index];
    const manifest = getManifest(config.deckId)!;
    const deck = buildQuickPlayDeck(manifest);
    const blocking = deck.issues.filter((issue) => issue.severity === "error");
    if (blocking.length > 0) {
      throw new Error(`Cannot start a match: ${blocking.map((i) => i.message).join(" | ")}`);
    }

    const built = makeInstances(deck.cardIds, seatId);
    built.forEach((inst) => {
      instances[inst.instanceId] = inst;
    });

    let order = built.map((i) => i.instanceId);
    if (options.shuffle !== false) {
      const shuffled = seededShuffle(order, options.seed, cursor);
      order = shuffled.items;
      cursor = shuffled.cursor;
    }
    const hand = order.slice(0, TRIALS_SETUP.startingHand);
    hand.forEach((id) => {
      instances[id] = { ...instances[id], zone: "hand" };
    });

    players[seatId] = {
      seatId,
      displayName:
        config.displayName ??
        (config.controller === "ai"
          ? `Computer · ${manifest.label}`
          : `Player ${index + 1} · ${manifest.label}`),
      deckId: manifest.deckId,
      faction: manifest.faction,
      controller: config.controller,
      difficulty: config.controller === "ai" ? (config.difficulty ?? "guardian") : null,
      energy: emptyEnergy(),
      gateWard: TRIALS_SETUP.gateWard,
      gateMaxWard: TRIALS_SETUP.gateWard,
      crystalSpinner: TRIALS_SETUP.crystals,
      maxCrystals: TRIALS_SETUP.crystals,
      cardsPlayedThisTurn: 0,
      cardPlayLimit: TRIALS_SETUP.cardPlayLimit,
      reserveToken: "none",
      deck: order.slice(TRIALS_SETUP.startingHand),
      hand,
      discard: [],
      unitSlots: Array.from({ length: TRIALS_SETUP.unitSpaces }, () => null),
      supportSlot: null,
      mulliganUsed: false,
      turnsTaken: 0,
      skipNextDraw: false,
    };
  });

  // Random first player, drawn from the seeded stream so the result is reproducible.
  let firstSeatId = options.firstSeatId;
  if (!firstSeatId) {
    firstSeatId = randomAt(options.seed, cursor) < 0.5 ? P1 : P2;
    cursor += 1;
  }
  const secondSeatId: TrialsSeatId = firstSeatId === P1 ? P2 : P1;

  // First player skips the Draw portion of their first Ready and Charge step.
  players[firstSeatId] = { ...players[firstSeatId], skipNextDraw: true };
  // Second player receives one Reserve token.
  players[secondSeatId] = { ...players[secondSeatId], reserveToken: "available" };

  return {
    matchId: options.matchId ?? `trials-${options.seed}`,
    mode: GameMode.Competitive,
    schemaVersion: TRIALS_SCHEMA_VERSION,
    rngSeed: options.seed,
    rngCursor: cursor,
    round: 0,
    turnSequence: 0,
    firstSeatId,
    activeSeatId: firstSeatId,
    step: "setup",
    players,
    instances,
    modifiers: [],
    prompt: null,
    handoffPending: false,
    pendingSeatId: null,
    attacksThisTurn: 0,
    stats: { cardsPlayed: 0, attacks: 0, unitsDefeated: 0, wardRestored: 0 },
    startedAt: new Date().toISOString(),
    log: [
      {
        sequence: 1,
        round: 0,
        playerId: null,
        summary: `${players[firstSeatId].displayName} goes first and skips their first Draw. ${players[secondSeatId].displayName} receives one Reserve token.`,
        undoSafe: true,
      },
    ],
    result: null,
    lastAiReason: null,
  };
}
