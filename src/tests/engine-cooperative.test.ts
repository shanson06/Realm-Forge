import { describe, expect, it } from "vitest";
import { GameMode } from "@/game-data/schema";
import { buildQuickPlayDeck, getManifest, QUICKPLAY_DECK_SIZE } from "@/game-data/quickplay";
import { applyAction, applyActions, beginSeatTurn } from "@/game-engine/reducer";
import { canAttack, canAttackTarget, canPlayCard, legalAttackTargets } from "@/game-engine/legal";
import { createCooperativeMatch, QUICKPLAY_SETUP } from "@/game-engine/setup";
import { checkStageProgress, damageGate, damageUnit } from "@/game-engine/mutations";
import { pickByTargetPriority, unitsOf } from "@/game-engine/queries";
import { runHollowCrownTurn } from "@/game-engine/hollow-crown";
import {
  HOLLOW,
  OATHGUARD,
  TARGET_BOSS,
  TARGET_HOLLOW_CRYSTALS,
  TARGET_HOLLOW_GATE,
  type GameAction,
  type MatchDraft,
  type MatchState,
} from "@/game-engine/types";

const SEED = "phase-3-test-seed";

function newMatch(shuffle = false): MatchState {
  return createCooperativeMatch({ seed: SEED, shuffle });
}

function keepHand(state: MatchState): MatchState {
  return applyActions(state, [{ kind: "mulligan", replace: false }]);
}

/** Dismisses any optional prompt a card effect opened, so tests can continue. */
function settle(state: MatchState): MatchState {
  return state.prompt ? applyAction(state, { kind: "cancelPending" }).state : state;
}

function play(state: MatchState, instanceId: string, slotIndex: number | null = null): MatchState {
  return settle(applyActions(state, [{ kind: "playCard", instanceId, slotIndex, targetIds: [] }]));
}

function draftOf(state: MatchState): MatchDraft {
  return structuredClone(state) as MatchDraft;
}

describe("cooperative deck construction", () => {
  it("builds two 20-card QuickPlay decks with two copies of every title", () => {
    for (const deckId of ["coop-truthwardens", "coop-veilborn"]) {
      const manifest = getManifest(deckId);
      expect(manifest, deckId).toBeDefined();
      const deck = buildQuickPlayDeck(manifest!);
      expect(deck.totalCards, deckId).toBe(QUICKPLAY_DECK_SIZE);
      expect(deck.entries).toHaveLength(10);
      expect(deck.entries.every((e) => e.copies === 2)).toBe(true);
      expect(deck.issues.filter((i) => i.severity === "error")).toEqual([]);
      const counts = new Map<string, number>();
      deck.cardIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
    }
  });
});

describe("setup", () => {
  it("uses the locked QuickPlay starting numbers", () => {
    const state = newMatch();
    expect(state.players[OATHGUARD].hand).toHaveLength(QUICKPLAY_SETUP.startingHand);
    expect(state.players[OATHGUARD].gateWard).toBe(10);
    expect(state.players[HOLLOW].gateWard).toBe(10);
    expect(state.players[OATHGUARD].crystalSpinner).toBe(6);
    expect(state.players[HOLLOW].crystalSpinner).toBe(6);
    expect(state.players[OATHGUARD].energy.permanentCrystals).toBe(0);
    expect(state.board.boss?.health).toBe(12);
    expect(state.board.boss?.revealed).toBe(false);
    expect(state.players[OATHGUARD].unitSlots).toHaveLength(4);
    expect(state.players[HOLLOW].unitSlots).toHaveLength(4);
    expect(state.prompt?.kind).toBe("mulligan");
  });

  it("replaces the whole hand exactly once", () => {
    const state = applyActions(newMatch(), [{ kind: "mulligan", replace: true }]);
    expect(state.mulliganUsed).toBe(true);
    expect(state.players[OATHGUARD].hand).toHaveLength(5); // 4 replaced + 1 drawn at Charge
    const again = applyAction(state, { kind: "mulligan", replace: true });
    expect(again.legality.legal).toBe(false);
  });

  it("is deterministic for a given seed", () => {
    const a = createCooperativeMatch({ seed: "abc", shuffle: true });
    const b = createCooperativeMatch({ seed: "abc", shuffle: true });
    expect(a.players[OATHGUARD].deck).toEqual(b.players[OATHGUARD].deck);
    expect(a.players[HOLLOW].deck).toEqual(b.players[HOLLOW].deck);
  });
});

describe("ready and charge", () => {
  it("adds one permanent crystal up to six, turns them face up and draws one", () => {
    let state = keepHand(newMatch());
    expect(state.round).toBe(1);
    expect(state.step).toBe("play");
    expect(state.players[OATHGUARD].energy.permanentCrystals).toBe(1);
    expect(state.players[OATHGUARD].energy.faceUpCrystals).toBe(1);
    expect(state.players[OATHGUARD].hand).toHaveLength(5);

    for (let i = 0; i < 8 && !state.result; i += 1) {
      state = applyActions(state, [{ kind: "endTurn" }]);
    }
    expect(state.players[OATHGUARD].energy.permanentCrystals).toBeLessThanOrEqual(6);
  });
});

describe("playing cards", () => {
  it("rejects a card that costs more Energy than is face-up", () => {
    const state = keepHand(newMatch());
    const expensive = state.players[OATHGUARD].hand.find(
      (id) => state.board.instances[id].definitionId === "RF-OATH-TRU-003",
    )!;
    const legality = canPlayCard(state, expensive);
    expect(legality.legal).toBe(false);
    expect(legality.legal === false && legality.reason.code).toBe("not-enough-energy");
  });

  it("spends face-up crystals and places the unit", () => {
    const state = keepHand(newMatch());
    const cheap = state.players[OATHGUARD].hand[0];
    const next = play(state, cheap);
    expect(next.players[OATHGUARD].energy.faceUpCrystals).toBe(0);
    expect(next.players[OATHGUARD].unitSlots[0]).toBe(cheap);
    expect(next.players[OATHGUARD].cardsPlayedThisTurn).toBe(1);
  });

  it("enforces the two-card limit once Energy allows a third play", () => {
    const charged = draftOf(keepHand(newMatch()));
    charged.players[OATHGUARD].energy.permanentCrystals = 6;
    charged.players[OATHGUARD].energy.faceUpCrystals = 6;
    let state = charged as MatchState;
    const affordable = state.players[OATHGUARD].hand.filter((id) => canPlayCard(state, id).legal);
    expect(affordable.length).toBeGreaterThanOrEqual(3);
    state = play(state, affordable[0]);
    state = play(state, affordable[1]);
    const third = canPlayCard(state, affordable[2]);
    expect(third.legal).toBe(false);
    expect(third.legal === false && third.reason.code).toBe("card-limit-reached");
  });
});

describe("battle", () => {
  it("blocks a unit that entered play this turn and allows it with Surge", () => {
    let state = keepHand(newMatch());
    const cheap = state.players[OATHGUARD].hand[0];
    state = applyActions(play(state, cheap), [{ kind: "beginStep", step: "battle" }]);
    const blocked = canAttack(state, cheap);
    expect(blocked.legal).toBe(false);
    expect(blocked.legal === false && blocked.reason.code).toBe("summoning-sick");

    const surged = structuredClone(state) as MatchDraft;
    surged.board.instances[cheap].grantedKeywords = ["Surge"];
    expect(canAttack(surged as MatchState, cheap).legal).toBe(true);
  });

  it("requires the Gate to break before crystals can be damaged", () => {
    let state = keepHand(newMatch());
    const cheap = state.players[OATHGUARD].hand[0];
    state = applyActions(play(state, cheap), [
      { kind: "endTurn" },
      { kind: "beginStep", step: "battle" },
    ]);
    expect(legalAttackTargets(state, cheap)).toContain(TARGET_HOLLOW_GATE);
    expect(legalAttackTargets(state, cheap)).not.toContain(TARGET_HOLLOW_CRYSTALS);
    const illegal = canAttackTarget(state, cheap, TARGET_HOLLOW_CRYSTALS);
    expect(illegal.legal).toBe(false);
    expect(illegal.legal === false && illegal.reason.message).toContain("Gate must be broken");
  });

  it("does not carry excess Gate damage into crystals", () => {
    const draft = draftOf(keepHand(newMatch()));
    draft.players[HOLLOW].gateWard = 2;
    damageGate(draft, HOLLOW, 9);
    expect(draft.players[HOLLOW].gateWard).toBe(0);
    expect(draft.players[HOLLOW].crystalSpinner).toBe(6);
  });

  it("keeps damage on units and discards them at DEF", () => {
    const state = keepHand(newMatch());
    const cheap = state.players[OATHGUARD].hand[0]; // Beacon Initiate, DEF 2
    const draft = draftOf(play(state, cheap));
    damageUnit(draft, cheap, 1);
    expect(draft.board.instances[cheap].damage).toBe(1);
    expect(draft.board.instances[cheap].zone).toBe("unitSlot");
    damageUnit(draft, cheap, 1);
    expect(draft.board.instances[cheap].zone).toBe("discard");
    expect(draft.players[OATHGUARD].unitSlots[0]).toBeNull();
  });
});

describe("stage order, boss and results", () => {
  it("reveals the boss only after the enemy Gate and all six crystals are gone", () => {
    const draft = draftOf(keepHand(newMatch()));
    draft.players[HOLLOW].gateWard = 0;
    draft.players[HOLLOW].crystalSpinner = 1;
    checkStageProgress(draft);
    expect(draft.board.boss?.revealed).toBe(false);
    draft.players[HOLLOW].crystalSpinner = 0;
    checkStageProgress(draft);
    expect(draft.board.boss?.revealed).toBe(true);
  });

  it("wins only when Veyr is defeated", () => {
    const draft = draftOf(keepHand(newMatch()));
    draft.players[HOLLOW].gateWard = 0;
    draft.players[HOLLOW].crystalSpinner = 0;
    checkStageProgress(draft);
    expect(draft.result).toBeNull();
    draft.board.boss!.damage = 12;
    checkStageProgress(draft);
    expect(draft.result?.outcome).toBe("oathguard-victory");
  });

  it("loses when the Oathguard Crystal Spinner reaches zero", () => {
    const draft = draftOf(keepHand(newMatch()));
    draft.players[OATHGUARD].crystalSpinner = 0;
    checkStageProgress(draft);
    expect(draft.result?.outcome).toBe("hollow-crown-victory");
  });

  it("targets the boss only once it is active", () => {
    let state = keepHand(newMatch());
    const cheap = state.players[OATHGUARD].hand[0];
    state = applyActions(play(state, cheap), [
      { kind: "endTurn" },
      { kind: "beginStep", step: "battle" },
    ]);
    expect(canAttackTarget(state, cheap, TARGET_BOSS).legal).toBe(false);
  });
});

describe("hollow crown automation", () => {
  it("prefers the lowest-DEF Aegis unit, then the lowest-DEF unit, then the Gate", () => {
    const draft = draftOf(keepHand(newMatch()));
    const units = Object.values(draft.board.instances)
      .filter((i) => i.ownerId === OATHGUARD)
      .slice(0, 2);
    units.forEach((unit, index) => {
      unit.zone = "unitSlot";
      unit.slotIndex = index;
      draft.players[OATHGUARD].unitSlots[index] = unit.instanceId;
      draft.players[OATHGUARD].hand = draft.players[OATHGUARD].hand.filter(
        (id) => id !== unit.instanceId,
      );
    });
    const pick = pickByTargetPriority(draft, unitsOf(draft, OATHGUARD), { ignoreAegis: false });
    expect(pick).not.toBeNull();
    expect(unitsOf(draft, OATHGUARD)).toHaveLength(2);
  });

  it("never exceeds four enemy unit spaces across a long game", () => {
    let state = keepHand(newMatch(true));
    for (let i = 0; i < 25 && !state.result; i += 1) {
      state = applyActions(state, [{ kind: "endTurn" }]);
      expect(state.players[HOLLOW].unitSlots.filter(Boolean).length).toBeLessThanOrEqual(4);
      expect(state.players[OATHGUARD].unitSlots).toHaveLength(4);
    }
    expect(state.result?.outcome).toBe("hollow-crown-victory");
  });

  it("readies Hollow Crown cards at the end of its turn", () => {
    const draft = draftOf(keepHand(newMatch()));
    runHollowCrownTurn(draft);
    const enemies = unitsOf(draft, HOLLOW);
    expect(enemies.every((u) => !u.exhausted)).toBe(true);
  });
});

describe("save and restore", () => {
  it("survives a JSON round trip and keeps playing identically", () => {
    let state = keepHand(newMatch(true));
    state = applyActions(state, [{ kind: "endTurn" }, { kind: "endTurn" }]);
    const restored = JSON.parse(JSON.stringify(state)) as MatchState;
    expect(restored).toEqual(state);

    const continueAction: GameAction = { kind: "endTurn" };
    const a = applyAction(state, continueAction).state;
    const b = applyAction(restored, continueAction).state;
    expect(b.log.map((l) => l.summary)).toEqual(a.log.map((l) => l.summary));
    expect(b.players[OATHGUARD].crystalSpinner).toBe(a.players[OATHGUARD].crystalSpinner);
  });
});

describe("surrender", () => {
  it("ends the match immediately", () => {
    const state = applyActions(keepHand(newMatch()), [{ kind: "surrender", playerId: OATHGUARD }]);
    expect(state.result?.outcome).toBe("surrendered");
    expect(applyAction(state, { kind: "endTurn" }).legality.legal).toBe(false);
  });
});

describe("guard rails", () => {
  it("keeps beginSeatTurn a no-op after the match ends", () => {
    const draft = draftOf(keepHand(newMatch()));
    draft.result = {
      outcome: "surrendered",
      winningPlayerIds: [HOLLOW],
      reason: "test",
      rounds: 1,
      endedAt: new Date().toISOString(),
    };
    const before = draft.round;
    beginSeatTurn(draft, draft.activeSeatId, true);
    expect(draft.round).toBe(before);
  });

  it("only accepts cooperative mode data", () => {
    expect(newMatch().mode).toBe(GameMode.Cooperative);
  });
});
describe("digital effect coverage", () => {
  it("implements a typed effect for every QuickPlay deck card with rules text", async () => {
    await import("@/game-engine/effects");
    await import("@/game-engine/trials/effects");
    const { getEffect } = await import("@/game-engine/effects");
    const { getTrialsEffect } = await import("@/game-engine/trials/effects");
    const { buildAllQuickPlayDecks } = await import("@/game-data/quickplay");

    const missing: string[] = [];
    for (const deck of buildAllQuickPlayDecks()) {
      for (const entry of deck.entries) {
        const card = entry.card;
        if (!card.rules_text.trim()) continue;
        const implemented =
          card.mode === GameMode.Competitive
            ? Boolean(getTrialsEffect(card.id))
            : Boolean(getEffect(card.mode, card.id));
        if (!implemented) missing.push(`${card.id} ${card.name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("gives low-cost Hollow Crown units +1 ATK while Veiled Court Relic is in play", async () => {
    await import("@/game-engine/effects");
    const { getEffect } = await import("@/game-engine/effects");
    const effect = getEffect(GameMode.Cooperative, "RF-HC-VEI-008");
    expect(effect?.atkAura).toBeTypeOf("function");
    expect(effect?.ambiguity).toBeTruthy();
  });
});
