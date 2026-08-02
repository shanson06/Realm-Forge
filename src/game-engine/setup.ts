/**
 * Cooperative match construction.
 *
 * One to three locally controlled Oathguard Orders (seats) share one Gate, one
 * Crystal Spinner, four unit spaces and one Support space. Private resources —
 * deck, hand, discard and Energy — belong to the seat.
 *
 * All numbers come from the locked QuickPlay rules; card data comes from the
 * uploaded cooperative database with stable IDs preserved.
 */
import { requireCard } from "@/game-data/load";
import { GameMode } from "@/game-data/schema";
import { buildQuickPlayDeck, getManifest } from "@/game-data/quickplay";
import { bossEnrageFor, bossHealthFor, getBossProfile } from "@/game-data/bosses";
import "./effects";
import { seededShuffle } from "./rng";
import {
  HOLLOW,
  OATHGUARD,
  type CardInstance,
  type MatchState,
  type PlayerState,
  type SeatState,
} from "./types";

export const MATCH_SCHEMA_VERSION = 4;

/** Locked QuickPlay setup numbers. */
export const QUICKPLAY_SETUP = {
  startingHand: 4,
  gateWard: 10,
  crystals: 6,
  maxPermanentCrystals: 6,
  cardPlayLimit: 2,
  oathguardUnitSpaces: 4,
  hollowUnitSpaces: 4,
  bossHealthByPlayerCount: [12, 16, 20] as const,
} as const;

export const VEYR_DEFINITION_ID = "RF-HC-BOSS-001";

export const COOP_PLAYER_DECK_ID = "coop-truthwardens";
export const COOP_ENCOUNTER_DECK_ID = "coop-veilborn";

export const OATHGUARD_ORDER_DECK_IDS = [
  "coop-truthwardens",
  "coop-honorbound",
  "coop-dawnwatch",
] as const;

export const HOLLOW_ENCOUNTER_DECK_IDS = [
  "coop-veilborn",
  "coop-whisper-court",
  "coop-breakers",
] as const;

function emptyEnergy() {
  return {
    permanentCrystals: 0,
    faceUpCrystals: 0,
    temporaryCrystals: 0,
    maxPermanentCrystals: QUICKPLAY_SETUP.maxPermanentCrystals,
  };
}

function makeInstances(
  cardIds: readonly string[],
  ownerId: string,
  prefix: string,
  controllerSeatId: string | null,
): CardInstance[] {
  return cardIds.map((definitionId, index) => ({
    instanceId: `${prefix}-${index}`,
    definitionId,
    ownerId,
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
    controllerSeatId,
  }));
}

function emptyPlayer(
  overrides: Partial<PlayerState> & Pick<PlayerState, "playerId" | "side">,
): PlayerState {
  return {
    displayName: "",
    controller: "human",
    deckId: "",
    energy: emptyEnergy(),
    gateWard: QUICKPLAY_SETUP.gateWard,
    gateMaxWard: QUICKPLAY_SETUP.gateWard,
    crystalSpinner: QUICKPLAY_SETUP.crystals,
    maxCrystals: QUICKPLAY_SETUP.crystals,
    cardsPlayedThisTurn: 0,
    cardPlayLimit: QUICKPLAY_SETUP.cardPlayLimit,
    reserveTokenAvailable: false,
    deck: [],
    hand: [],
    discard: [],
    unitSlots: [null, null, null, null],
    supportSlot: null,
    globalThreat: 0,
    ...overrides,
  };
}

export interface CreateMatchOptions {
  readonly matchId?: string;
  readonly seed: string;
  readonly playerCount?: 1 | 2 | 3;
  /** One Oathguard deck id per seat. Must be distinct when more than one seat plays. */
  readonly orderDeckIds?: readonly string[];
  readonly encounterDeckId?: string;
  readonly bossId?: string;
  /** Skip shuffling so tests can rely on manifest order. */
  readonly shuffle?: boolean;
}

export function validateSetup(options: CreateMatchOptions): string | null {
  const count = options.playerCount ?? 1;
  const orders = options.orderDeckIds ?? [COOP_PLAYER_DECK_ID];
  if (orders.length !== count) {
    return `Choose exactly ${count} Oathguard ${count === 1 ? "Order" : "Orders"}.`;
  }
  if (new Set(orders).size !== orders.length) {
    return "Each player must control a different Oathguard Order.";
  }
  return null;
}

export function createCooperativeMatch(options: CreateMatchOptions): MatchState {
  const playerCount = options.playerCount ?? 1;
  const orderDeckIds = options.orderDeckIds ?? [COOP_PLAYER_DECK_ID];
  const encounterDeckId = options.encounterDeckId ?? COOP_ENCOUNTER_DECK_ID;
  const bossId = options.bossId ?? VEYR_DEFINITION_ID;

  const setupError = validateSetup({ ...options, playerCount, orderDeckIds });
  if (setupError) throw new Error(setupError);

  const encounterManifest = getManifest(encounterDeckId);
  if (!encounterManifest) throw new Error(`Unknown encounter deck "${encounterDeckId}".`);
  const encounterDeck = buildQuickPlayDeck(encounterManifest);

  const orderDecks = orderDeckIds.map((deckId) => {
    const manifest = getManifest(deckId);
    if (!manifest) throw new Error(`Unknown Oathguard deck "${deckId}".`);
    return buildQuickPlayDeck(manifest);
  });

  const blocking = [...orderDecks.flatMap((d) => d.issues), ...encounterDeck.issues].filter(
    (issue) => issue.severity === "error",
  );
  if (blocking.length > 0) {
    throw new Error(`Cannot start a match: ${blocking.map((i) => i.message).join(" | ")}`);
  }

  const instances: Record<string, CardInstance> = {};
  let cursor = 0;

  const seats: Record<string, SeatState> = {};
  const seatOrder: string[] = [];

  orderDecks.forEach((deck, seatIndex) => {
    const seatId = `seat-${seatIndex + 1}`;
    seatOrder.push(seatId);
    const built = makeInstances(deck.cardIds, OATHGUARD, `og${seatIndex + 1}`, seatId);
    built.forEach((inst) => {
      instances[inst.instanceId] = inst;
    });

    let order = built.map((i) => i.instanceId);
    if (options.shuffle !== false) {
      const shuffled = seededShuffle(order, options.seed, cursor);
      order = shuffled.items;
      cursor = shuffled.cursor;
    }
    const hand = order.slice(0, QUICKPLAY_SETUP.startingHand);
    hand.forEach((id) => {
      instances[id] = { ...instances[id], zone: "hand" };
    });

    seats[seatId] = {
      seatId,
      displayName:
        orderDecks.length === 1
          ? deck.manifest.label
          : `Player ${seatIndex + 1} · ${deck.manifest.label}`,
      deckId: deck.manifest.deckId,
      faction: deck.manifest.faction,
      energy: emptyEnergy(),
      deck: order.slice(QUICKPLAY_SETUP.startingHand),
      hand,
      discard: [],
      cardsPlayedThisTurn: 0,
      energyDrainNextCharge: 0,
      mulliganUsed: false,
    };
  });

  const encounterInstances = makeInstances(encounterDeck.cardIds, HOLLOW, "hc", null);
  encounterInstances.forEach((inst) => {
    instances[inst.instanceId] = inst;
  });
  let encounterOrder = encounterInstances.map((i) => i.instanceId);
  if (options.shuffle !== false) {
    const shuffled = seededShuffle(encounterOrder, options.seed, cursor);
    encounterOrder = shuffled.items;
    cursor = shuffled.cursor;
  }

  const bossCard = requireCard(GameMode.Cooperative, bossId);
  const bossProfile = getBossProfile(bossId);
  const bossHealth = bossHealthFor(playerCount);
  const firstSeat = seats[seatOrder[0]];

  return {
    matchId: options.matchId ?? `coop-${options.seed}`,
    mode: GameMode.Cooperative,
    schemaVersion: MATCH_SCHEMA_VERSION,
    rngSeed: options.seed,
    rngCursor: cursor,
    round: 0,
    activePlayerId: OATHGUARD,
    turnSide: OATHGUARD,
    step: "setup",
    playerCount,
    encounterDeckId,
    bossId,
    seats,
    seatOrder,
    activeSeatId: seatOrder[0],
    modifiers: [
      {
        id: `boss:${bossProfile.id}`,
        label: bossProfile.shortName,
        description: bossProfile.modifierLabel,
        source: bossCard.name,
        owner: HOLLOW,
        duration: "match",
        amount: 0,
        kind: "boss-modifier",
      },
    ],
    stats: {
      damageDealt: 0,
      damageTaken: 0,
      enemyUnitsDefeated: 0,
      oathguardUnitsLost: 0,
      wardRestored: 0,
      cardsPlayed: 0,
    },
    startedAt: new Date().toISOString(),
    players: {
      [OATHGUARD]: emptyPlayer({
        playerId: OATHGUARD,
        side: OATHGUARD,
        displayName: firstSeat.displayName,
        controller: "human",
        deckId: firstSeat.deckId,
        deck: firstSeat.deck,
        hand: firstSeat.hand,
        energy: firstSeat.energy,
      }),
      [HOLLOW]: emptyPlayer({
        playerId: HOLLOW,
        side: HOLLOW,
        displayName: encounterManifest.label,
        controller: "hollow-crown",
        deckId: encounterDeckId,
        deck: encounterOrder,
      }),
    },
    turnOrder: [OATHGUARD, HOLLOW],
    board: {
      instances,
      boss: {
        definitionId: bossCard.id,
        health: bossHealth,
        maxHealth: bossHealth,
        damage: 0,
        revealed: false,
        enraged: false,
        enrageThreshold: bossEnrageFor(bossProfile, bossHealth),
        attacksThisRound: 0,
        atk: bossProfile.atk,
        ignoresAegis: bossProfile.ignoresAegis,
        gateWardBonus: bossProfile.gateWardBonus,
        allyAtkBonus: bossProfile.allyAtkBonus,
        chargeDrain: bossProfile.chargeDrain,
      },
    },
    effectQueue: [],
    prompt: {
      kind: "mulligan",
      description:
        "Keep this opening hand of four, or replace all four cards once before the match begins.",
    },
    turnFlags: {
      nextEnemyAttackIgnoresAegis: false,
      damagedOathguardLoseAegis: false,
      attacksFirstInstanceId: null,
    },
    mulliganUsed: false,
    animations: [],
    log: [
      {
        sequence: 1,
        round: 0,
        playerId: null,
        summary: `Setup complete. ${playerCount} ${playerCount === 1 ? "Order" : "Orders"} versus ${encounterManifest.label} and ${bossCard.name} (Boss Health ${bossHealth}).`,
        undoSafe: true,
      },
    ],
    result: null,
  };
}
