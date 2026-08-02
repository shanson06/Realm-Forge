import { describe, expect, it } from "vitest";

import { chooseTrialsAction, enumerateActions } from "@/game-ai/trials";
import { buildQuickPlayDeck, getManifest, QUICKPLAY_DECK_SIZE } from "@/game-data/quickplay";
import { GameMode } from "@/game-data/schema";
import { canAttack, canPlayCard, legalAttackTargets } from "@/game-engine/trials/legal";
import {
  applyTrialsAction,
  applyTrialsActions,
  startTrialsMatch,
} from "@/game-engine/trials/reducer";
import {
  createTrialsMatch,
  TRIALS_DECK_IDS,
  TRIALS_SETUP,
  validateTrialsSetup,
  type TrialsSeatConfig,
} from "@/game-engine/trials/setup";
import { unitsOf } from "@/game-engine/trials/queries";
import {
  crystalsTarget,
  gateTarget,
  otherSeat,
  P1,
  P2,
  type TrialsDifficulty,
  type TrialsMatchState,
  type TrialsSeatId,
} from "@/game-engine/trials/types";

const SEED = "trials-test-seed";

function human(deckId: string, name: string): TrialsSeatConfig {
  return { deckId, controller: "human", displayName: name };
}

function ai(deckId: string, difficulty: TrialsDifficulty): TrialsSeatConfig {
  return { deckId, controller: "ai", difficulty, displayName: `Computer ${difficulty}` };
}

function newDuel(
  seats: [TrialsSeatConfig, TrialsSeatConfig] = [
    human("trials-truthwardens", "Player 1"),
    human("trials-honorbound", "Player 2"),
  ],
  firstSeatId: TrialsSeatId = P1,
): TrialsMatchState {
  return startTrialsMatch(createTrialsMatch({ seed: SEED, seats, firstSeatId, shuffle: false }));
}

function keep(state: TrialsMatchState): TrialsMatchState {
  return applyTrialsActions(state, [{ kind: "mulligan", replace: false }]);
}

/** Plays through a whole turn without acting, returning the state after Pass. */
function passTurn(state: TrialsMatchState): TrialsMatchState {
  let next = state.prompt?.kind === "mulligan" ? keep(state) : state;
  next = applyTrialsActions(next, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
  if (next.handoffPending) {
    next = applyTrialsActions(next, [{ kind: "acknowledgeHandoff" }]);
  }
  return next;
}

describe("Trials setup", () => {
  it("builds three 20-card competitive decks", () => {
    for (const deckId of TRIALS_DECK_IDS) {
      const manifest = getManifest(deckId);
      expect(manifest).toBeDefined();
      expect(manifest!.mode).toBe(GameMode.Competitive);
      const deck = buildQuickPlayDeck(manifest!);
      expect(deck.cardIds).toHaveLength(QUICKPLAY_DECK_SIZE);
      expect(deck.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    }
  });

  it("rejects a table that is not two competitive Orders", () => {
    expect(validateTrialsSetup([human("trials-truthwardens", "solo")])).not.toBeNull();
    expect(
      validateTrialsSetup([human("coop-truthwardens", "a"), human("trials-honorbound", "b")]),
    ).not.toBeNull();
    expect(
      validateTrialsSetup([human("trials-truthwardens", "a"), human("trials-honorbound", "b")]),
    ).toBeNull();
  });

  it("starts both sides at 10 Ward, 6 crystals and a hand of four", () => {
    const state = createTrialsMatch({
      seed: SEED,
      seats: [human("trials-truthwardens", "a"), human("trials-dawnwatch", "b")],
      firstSeatId: P1,
    });
    for (const seatId of [P1, P2] as const) {
      const player = state.players[seatId];
      expect(player.gateWard).toBe(10);
      expect(player.crystalSpinner).toBe(6);
      expect(player.hand).toHaveLength(TRIALS_SETUP.startingHand);
      expect(player.unitSlots).toHaveLength(3);
      expect(player.energy.maxPermanentCrystals).toBe(6);
      expect(player.cardPlayLimit).toBe(2);
    }
  });

  it("rolls a reproducible first player from the seed", () => {
    const seats: [TrialsSeatConfig, TrialsSeatConfig] = [
      human("trials-truthwardens", "a"),
      human("trials-honorbound", "b"),
    ];
    const a = createTrialsMatch({ seed: "roll-1", seats });
    const b = createTrialsMatch({ seed: "roll-1", seats });
    expect(a.firstSeatId).toBe(b.firstSeatId);
    expect([P1, P2]).toContain(a.firstSeatId);
  });
});

describe("First-turn rules", () => {
  it("skips the first player's first Draw but not their second", () => {
    const state = keep(newDuel());
    expect(state.players[P1].hand).toHaveLength(TRIALS_SETUP.startingHand);
    expect(state.players[P1].energy.faceUpCrystals).toBe(1);

    let next = passTurn(state); // P2's turn begins
    next = passTurn(next); // back to P1
    expect(next.activeSeatId).toBe(P1);
    expect(next.players[P1].hand.length).toBe(TRIALS_SETUP.startingHand + 1);
  });

  it("draws for the second player on their first turn", () => {
    const state = keep(newDuel());
    const next = keep(passTurn(state));
    expect(next.activeSeatId).toBe(P2);
    expect(next.players[P2].hand.length).toBe(TRIALS_SETUP.startingHand + 1);
  });
});

describe("Reserve token", () => {
  it("is given only to the second player", () => {
    const state = newDuel(undefined, P1);
    expect(state.players[P1].reserveToken).toBe("none");
    expect(state.players[P2].reserveToken).toBe("available");
  });

  it("adds one temporary crystal and is removed during Pass", () => {
    let state = keep(newDuel());
    state = keep(passTurn(state));
    expect(state.activeSeatId).toBe(P2);

    const before = state.players[P2].energy.temporaryCrystals;
    state = applyTrialsActions(state, [{ kind: "spendReserveToken" }]);
    expect(state.players[P2].energy.temporaryCrystals).toBe(before + 1);
    expect(state.players[P2].reserveToken).toBe("spent");

    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
    expect(state.players[P2].energy.temporaryCrystals).toBe(0);
  });

  it("cannot be spent twice", () => {
    let state = keep(passTurn(keep(newDuel())));
    state = applyTrialsActions(state, [{ kind: "spendReserveToken" }]);
    const { legality } = applyTrialsAction(state, { kind: "spendReserveToken" });
    expect(legality.legal).toBe(false);
  });

  it("expires after the second player's first three turns", () => {
    let state = keep(newDuel());
    state = keep(passTurn(state)); // P2 turn 1
    while (state.players[P2].turnsTaken < 3 || state.activeSeatId === P2) {
      state = passTurn(state);
      if (state.prompt?.kind === "mulligan") state = keep(state);
      if (state.players[P2].turnsTaken >= 3 && state.activeSeatId !== P2) break;
    }
    expect(state.players[P2].reserveToken).toBe("spent");
    const p2Turn = (state.activeSeatId as TrialsSeatId) === P2 ? state : passTurn(state);
    const { legality } = applyTrialsAction(p2Turn, { kind: "spendReserveToken" });
    expect(legality.legal).toBe(false);
  });
});

describe("Play limits and energy", () => {
  it("never allows more than two cards in one turn", () => {
    let state = keep(newDuel());
    // Charge the pool over several rounds so cost is not the blocker.
    for (let i = 0; i < 8; i += 1) {
      state = passTurn(state);
      if (state.prompt?.kind === "mulligan") state = keep(state);
    }
    const seatId = state.activeSeatId;
    let played = 0;
    for (const instanceId of [...state.players[seatId].hand]) {
      if (!canPlayCard(state, instanceId).legal) continue;
      state = applyTrialsAction(state, {
        kind: "playCard",
        instanceId,
        slotIndex: null,
        targetIds: [],
      }).state;
      if (state.prompt) state = applyTrialsAction(state, { kind: "cancelPending" }).state;
      played += 1;
      if (played === 2) break;
    }
    expect(state.players[seatId].cardsPlayedThisTurn).toBeLessThanOrEqual(2);
    if (played === 2) {
      const third = state.players[seatId].hand[0];
      if (third) expect(canPlayCard(state, third).legal).toBe(false);
    }
  });

  it("caps permanent crystals at six", () => {
    let state = keep(newDuel());
    for (let i = 0; i < 16; i += 1) {
      state = passTurn(state);
      if (state.prompt?.kind === "mulligan") state = keep(state);
    }
    expect(state.players[P1].energy.permanentCrystals).toBeLessThanOrEqual(6);
    expect(state.players[P2].energy.permanentCrystals).toBeLessThanOrEqual(6);
  });
});

/* Board manipulation helpers for targeting tests. */
function putUnit(
  state: TrialsMatchState,
  seatId: TrialsSeatId,
  definitionId: string,
  slot: number,
  options: { aegis?: boolean; ready?: boolean } = {},
): TrialsMatchState {
  const draft = structuredClone(state) as TrialsMatchState;
  const instanceId = `${seatId}-test-${slot}`;
  (draft.instances as Record<string, unknown>)[instanceId] = {
    instanceId,
    definitionId,
    ownerId: seatId,
    zone: "unitSlot",
    slotIndex: slot,
    damage: 0,
    exhausted: options.ready === false,
    enteredOnRound: 0,
    temporaryAtk: 0,
    roundAtk: 0,
    nextAttackAtk: 0,
    flags: {},
    grantedKeywords: options.aegis ? ["Aegis"] : [],
    controllerSeatId: seatId,
  };
  (draft.players[seatId].unitSlots as (string | null)[])[slot] = instanceId;
  return draft;
}

function firstUnitDefinition(deckId: string): string {
  const manifest = getManifest(deckId)!;
  const deck = buildQuickPlayDeck(manifest);
  return deck.cardIds[0];
}

describe("Attack targeting", () => {
  it("routes attacks through a ready Aegis unit but never protects the Gate", () => {
    let state = keep(newDuel());
    const attackerDef = firstUnitDefinition("trials-truthwardens");
    const foeDef = firstUnitDefinition("trials-honorbound");
    state = putUnit(state, P1, attackerDef, 0);
    state = putUnit(state, P2, foeDef, 0, { aegis: true });
    state = putUnit(state, P2, foeDef, 1);
    state = { ...state, step: "battle" } as TrialsMatchState;

    const attackerId = state.players[P1].unitSlots[0]!;
    const targets = legalAttackTargets(state, attackerId);
    const aegisId = state.players[P2].unitSlots[0]!;
    const plainId = state.players[P2].unitSlots[1]!;

    expect(targets).toContain(aegisId);
    expect(targets).not.toContain(plainId);
    // The Gate is always attackable — Aegis never guards it.
    expect(targets).toContain(gateTarget(P2));
  });

  it("stops protecting once the Aegis unit is used", () => {
    let state = keep(newDuel());
    const def = firstUnitDefinition("trials-truthwardens");
    state = putUnit(state, P1, def, 0);
    state = putUnit(state, P2, def, 0, { aegis: true, ready: false });
    state = putUnit(state, P2, def, 1);
    state = { ...state, step: "battle" } as TrialsMatchState;

    const attackerId = state.players[P1].unitSlots[0]!;
    expect(legalAttackTargets(state, attackerId)).toContain(state.players[P2].unitSlots[1]!);
  });

  it("locks crystals until the Gate breaks and never spills excess Gate damage", () => {
    let state = keep(newDuel());
    const def = firstUnitDefinition("trials-truthwardens");
    state = putUnit(state, P1, def, 0);
    state = { ...state, step: "battle" } as TrialsMatchState;
    const attackerId = state.players[P1].unitSlots[0]!;

    expect(legalAttackTargets(state, attackerId)).not.toContain(crystalsTarget(P2));

    // Take the Gate to 1 Ward, then hit it with a bigger attack.
    state = structuredClone(state) as TrialsMatchState;
    (state.players[P2] as { gateWard: number }).gateWard = 1;
    const crystalsBefore = state.players[P2].crystalSpinner;
    state = applyTrialsAction(state, {
      kind: "declareAttack",
      attackerId,
      targetId: gateTarget(P2),
    }).state;
    expect(state.players[P2].gateWard).toBe(0);
    expect(state.players[P2].crystalSpinner).toBe(crystalsBefore);

    // With the Gate broken, crystals become legal targets.
    state = putUnit(state, P1, def, 1);
    state = { ...state, step: "battle" } as TrialsMatchState;
    const second = state.players[P1].unitSlots[1]!;
    expect(legalAttackTargets(state, second)).toContain(crystalsTarget(P2));
  });

  it("refuses attacks from a unit that entered this turn without Surge", () => {
    let state = keep(newDuel());
    const seatId = state.activeSeatId;
    const hand = [...state.players[seatId].hand];
    const playable = hand.find((id) => canPlayCard(state, id).legal);
    if (!playable) return;
    state = applyTrialsAction(state, {
      kind: "playCard",
      instanceId: playable,
      slotIndex: 0,
      targetIds: [],
    }).state;
    if (state.prompt) state = applyTrialsAction(state, { kind: "cancelPending" }).state;
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }]);
    const placed = state.players[seatId].unitSlots[0];
    if (placed && !unitsOf(state, seatId).some((u) => u.instanceId === placed)) return;
    if (placed) {
      const legality = canAttack(state, placed);
      // Either it has Surge (legal) or it is summoning sick.
      if (!legality.legal) expect(legality.reason.code).toBe("summoning-sick");
    }
  });
});

describe("Win conditions", () => {
  it("wins after the Gate breaks and all six crystals are gone", () => {
    let state = keep(newDuel());
    const def = firstUnitDefinition("trials-truthwardens");
    state = putUnit(state, P1, def, 0);
    state = { ...state, step: "battle" } as TrialsMatchState;
    state = structuredClone(state) as TrialsMatchState;
    (state.players[P2] as { gateWard: number }).gateWard = 0;
    (state.players[P2] as { crystalSpinner: number }).crystalSpinner = 1;

    const attackerId = state.players[P1].unitSlots[0]!;
    state = applyTrialsAction(state, {
      kind: "declareAttack",
      attackerId,
      targetId: crystalsTarget(P2),
    }).state;

    expect(state.players[P2].crystalSpinner).toBe(0);
    expect(state.result?.winningPlayerIds).toContain(P1);
  });

  it("loses the duel when a player must draw from an empty deck", () => {
    let state = keep(newDuel());
    state = structuredClone(state) as TrialsMatchState;
    (state.players[P2] as unknown as { deck: string[] }).deck = [];
    state = passTurn(state);
    if (state.prompt?.kind === "mulligan") state = keep(state);
    expect(state.result).not.toBeNull();
    expect(state.result?.winningPlayerIds).toContain(P1);
    // Deck-out is reported as a win for the opponent, with the reason naming the empty deck.
    expect(state.result?.reason.toLowerCase()).toContain("deck");
  });

  it("ends immediately on concede", () => {
    const state = keep(newDuel());
    const next = applyTrialsAction(state, { kind: "surrender", seatId: P1 }).state;
    expect(next.result?.winningPlayerIds).toContain(P2);
  });
});

describe("Pass-and-play privacy", () => {
  it("pauses on a handoff between two human players and hides nothing in the log", () => {
    let state = keep(newDuel());
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
    expect(state.handoffPending).toBe(true);
    expect(state.pendingSeatId).toBe(P2);
    // The incoming player's hand is not readable from the log.
    const handIds = new Set([...state.players[P1].hand, ...state.players[P2].hand]);
    for (const entry of state.log) {
      for (const id of handIds) expect(entry.summary).not.toContain(id);
    }
  });

  it("does not pause when the opponent is a computer", () => {
    let state = keep(
      newDuel([human("trials-truthwardens", "P1"), ai("trials-honorbound", "guardian")], P1),
    );
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
    expect(state.handoffPending).toBe(false);
    expect(state.activeSeatId).toBe(P2);
  });
});

describe("Computer opponents", () => {
  const difficulties: TrialsDifficulty[] = ["initiate", "guardian", "champion"];

  function runAiTurns(state: TrialsMatchState, maxActions: number): TrialsMatchState {
    let current = state;
    for (let i = 0; i < maxActions; i += 1) {
      if (current.result) break;
      const seat = current.players[current.activeSeatId];
      if (seat.controller !== "ai") break;
      const decision = chooseTrialsAction(current, seat.difficulty!);
      if (!decision) break;
      const { state: next, legality } = applyTrialsAction(current, decision.action);
      expect(legality.legal).toBe(true);
      expect(decision.reason.length).toBeGreaterThan(0);
      current = next;
    }
    return current;
  }

  it.each(difficulties)("%s plays only legal actions and finishes its turn", (difficulty) => {
    let state = keep(
      newDuel([human("trials-truthwardens", "P1"), ai("trials-honorbound", difficulty)], P1),
    );
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
    expect(state.activeSeatId).toBe(P2);
    const after = runAiTurns(state, 40);
    // The computer either handed the turn back or the duel ended.
    expect(after.result !== null || after.activeSeatId === P1).toBe(true);
  });

  it.each(difficulties)("%s is deterministic for the same position", (difficulty) => {
    const state = keep(
      newDuel([ai("trials-truthwardens", difficulty), human("trials-honorbound", "P2")], P1),
    );
    const a = chooseTrialsAction(state, difficulty);
    const b = chooseTrialsAction(state, difficulty);
    expect(JSON.stringify(a?.action)).toBe(JSON.stringify(b?.action));
  });

  it("never proposes an action outside the engine's legal list", () => {
    let state = keep(
      newDuel([human("trials-truthwardens", "P1"), ai("trials-dawnwatch", "champion")], P1),
    );
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }, { kind: "endTurn" }]);
    const legal = enumerateActions(state).map((a) => JSON.stringify(a));
    const decision = chooseTrialsAction(state, "champion");
    if (decision && decision.action.kind !== "mulligan") {
      expect(legal).toContain(JSON.stringify(decision.action));
    }
  });

  it("does not alter the shuffle, energy, hands or statistics of either seat", () => {
    const state = keep(
      newDuel([human("trials-truthwardens", "P1"), ai("trials-honorbound", "guardian")], P1),
    );
    const snapshot = JSON.stringify(state);
    chooseTrialsAction(state, "guardian");
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("Every matchup", () => {
  const combos = TRIALS_DECK_IDS.flatMap((a) => TRIALS_DECK_IDS.map((b) => [a, b] as const));

  it.each(combos)("%s versus %s starts and runs four turns", (deckA, deckB) => {
    let state = keep(newDuel([human(deckA, "P1"), ai(deckB, "guardian")], P1));
    for (let turn = 0; turn < 4 && !state.result; turn += 1) {
      if (state.players[state.activeSeatId].controller === "ai") {
        const decision = chooseTrialsAction(state, "guardian");
        if (!decision) break;
        const { state: next, legality } = applyTrialsAction(state, decision.action);
        expect(legality.legal).toBe(true);
        state = next;
      } else {
        state = passTurn(state);
        if (state.prompt?.kind === "mulligan") state = keep(state);
      }
    }
    expect(state.players[P1].gateMaxWard).toBe(10);
    expect(state.players[P2].gateMaxWard).toBe(10);
  });
});

describe("Save and restore", () => {
  it("survives a JSON round trip with identical behaviour", () => {
    let state = keep(newDuel());
    state = applyTrialsActions(state, [{ kind: "beginStep", step: "battle" }]);
    const restored = JSON.parse(JSON.stringify(state)) as TrialsMatchState;
    const a = applyTrialsAction(state, { kind: "endTurn" }).state;
    const b = applyTrialsAction(restored, { kind: "endTurn" }).state;
    expect(JSON.stringify({ ...a, startedAt: "" })).toBe(JSON.stringify({ ...b, startedAt: "" }));
  });

  it("keeps the opposite seat's identity after a handoff", () => {
    let state = keep(newDuel());
    state = applyTrialsActions(state, [
      { kind: "beginStep", step: "battle" },
      { kind: "endTurn" },
      { kind: "acknowledgeHandoff" },
    ]);
    expect(state.activeSeatId).toBe(otherSeat(P1));
    expect(state.handoffPending).toBe(false);
  });
});
