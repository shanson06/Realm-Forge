/**
 * Cooperative QuickPlay state machine.
 *
 * Pure: (MatchState, GameAction) -> MatchState. No React, no DOM, no Math.random.
 * The UI may dispatch anything; only this module decides what actually happens.
 */
import { requireCard } from "@/game-data/load";
import { getEffect } from "./effects";
import { getPromptResolver, selfIdFromEffectId } from "./effects/prompts";
import { runHollowCrownTurn } from "./hollow-crown";
import { checkAction } from "./legal";
import {
  addModifier,
  checkStageProgress,
  cue,
  drawCard,
  log,
  resolveAttackDamage,
  shuffleInto,
} from "./mutations";
import {
  attackOf,
  definitionOf,
  firstEmptyUnitSlot,
  gateAttackBonus,
  isOneShotCard,
  isSupportCard,
  isUnitCard,
} from "./queries";
import { QUICKPLAY_SETUP } from "./setup";
import { loadSeat, saveActiveSeat, seatIndex } from "./seats";

/** Re-applies "each round" modifiers printed on cards that are still in play. */
function applyRoundStartModifiers(draft: MatchDraft): void {
  for (const inst of Object.values(draft.board.instances)) {
    if (inst.zone !== "unitSlot" && inst.zone !== "supportSlot") continue;
    const modifier = getEffect(draft.mode, inst.definitionId)?.roundStartModifier;
    if (modifier) addModifier(draft, { ...modifier, id: `round-start:${inst.instanceId}` });
  }
}
import {
  HOLLOW,
  OATHGUARD,
  TARGET_BOSS,
  TARGET_HOLLOW_GATE,
  type ActionLegality,
  type GameAction,
  type MatchDraft,
  type MatchState,
} from "./types";

export interface ReducerOutcome {
  readonly state: MatchState;
  readonly legality: ActionLegality;
}

function clone(state: MatchState): MatchDraft {
  return structuredClone(state) as MatchDraft;
}

/**
 * Starts one Oathguard seat's turn: mulligan (first time only), then
 * Ready and Charge, then the Play step.
 */
export function beginSeatTurn(draft: MatchDraft, seatId: string, startsRound: boolean): void {
  if (draft.result) return;
  saveActiveSeat(draft);
  loadSeat(draft, seatId);
  draft.turnSide = OATHGUARD;
  draft.activePlayerId = OATHGUARD;

  if (startsRound) {
    draft.round += 1;
    // Round-duration ATK effects expire when the new round begins.
    for (const inst of Object.values(draft.board.instances)) inst.roundAtk = 0;
    draft.modifiers = draft.modifiers.filter((m) => m.duration !== "round");
    draft.turnFlags.damagedOathguardLoseAegis = false;
    applyRoundStartModifiers(draft);
  }

  const seat = draft.seats[seatId];
  if (!seat.mulliganUsed) {
    draft.step = "setup";
    draft.prompt = {
      kind: "mulligan",
      description: `${seat.displayName}: keep this opening hand of four, or replace all four cards once.`,
    };
    return;
  }

  draft.step = "readyAndCharge";
  const oath = draft.players[OATHGUARD];

  log(draft, `— Round ${draft.round} · ${seat.displayName}: Ready and Charge —`, {
    playerId: OATHGUARD,
    undoSafe: true,
  });

  // Only this seat's own cards ready. Shared spaces, individual control.
  for (const inst of Object.values(draft.board.instances)) {
    if (inst.ownerId === OATHGUARD && inst.controllerSeatId === seatId) {
      inst.exhausted = false;
      inst.temporaryAtk = 0;
      inst.nextAttackAtk = 0;
    }
  }

  oath.energy.permanentCrystals = Math.min(
    oath.energy.maxPermanentCrystals,
    oath.energy.permanentCrystals + 1,
  );
  oath.energy.faceUpCrystals = oath.energy.permanentCrystals;
  oath.energy.temporaryCrystals = 0;
  cue(draft, "charge");

  // Malreth and Siphon turn face-up crystals face-down immediately after charging.
  const bossDrain = draft.board.boss?.revealed ? draft.board.boss.chargeDrain : 0;
  const drain = Math.min(oath.energy.faceUpCrystals, seat.energyDrainNextCharge + bossDrain);
  if (drain > 0) {
    oath.energy.faceUpCrystals -= drain;
    log(draft, `${seat.displayName} loses ${drain} face-up crystal${drain === 1 ? "" : "s"}.`, {
      playerId: OATHGUARD,
    });
  }
  seat.energyDrainNextCharge = 0;
  log(draft, `Energy: ${oath.energy.faceUpCrystals} face-up crystals.`, { playerId: OATHGUARD });

  drawCard(draft, OATHGUARD);
  oath.cardsPlayedThisTurn = 0;
  saveActiveSeat(draft);

  if (!draft.result) draft.step = "play";
}

function spendEnergy(draft: MatchDraft, cost: number): void {
  const energy = draft.players[OATHGUARD].energy;
  const fromTemporary = Math.min(energy.temporaryCrystals, cost);
  energy.temporaryCrystals -= fromTemporary;
  energy.faceUpCrystals -= cost - fromTemporary;
  if (cost > 0) cue(draft, "spend");
}

function runDeployEffect(draft: MatchDraft, instanceId: string, targetIds: readonly string[]): void {
  const definitionId = draft.board.instances[instanceId].definitionId;
  const effect = getEffect(draft.mode, definitionId);
  if (!effect?.handler) return;
  if (effect.trigger !== "deploy") return;
  effect.handler(draft, { selfId: instanceId, controllerId: OATHGUARD, targetIds });
}

function playCard(
  draft: MatchDraft,
  instanceId: string,
  slotIndex: number | null,
  targetIds: readonly string[],
): void {
  const oath = draft.players[OATHGUARD];
  const inst = draft.board.instances[instanceId];
  const card = requireCard(draft.mode, inst.definitionId);

  oath.hand.splice(oath.hand.indexOf(instanceId), 1);
  spendEnergy(draft, card.cost);
  oath.cardsPlayedThisTurn += 1;
  draft.stats.cardsPlayed += 1;
  inst.controllerSeatId = draft.activeSeatId;
  log(draft, `${draft.seats[draft.activeSeatId].displayName} plays ${card.name} for ${card.cost} Energy.`, {
    playerId: OATHGUARD,
    detail: card.rules_text || undefined,
  });

  if (isUnitCard(card)) {
    const slot = slotIndex ?? firstEmptyUnitSlot(draft, OATHGUARD) ?? 0;
    oath.unitSlots[slot] = instanceId;
    inst.zone = "unitSlot";
    inst.slotIndex = slot;
    inst.enteredOnRound = draft.round;
    // "The next Oathguard unit played enters used" (Whisper Court: Unsteady Thought).
    const entersUsed = draft.modifiers.find((m) => m.kind === "enters-used");
    inst.exhausted = Boolean(entersUsed);
    if (entersUsed) {
      log(draft, `${card.name} enters used — ${entersUsed.source}.`, { playerId: OATHGUARD });
      draft.modifiers = draft.modifiers.filter((m) => m.id !== entersUsed.id);
    }
    cue(draft, "play", instanceId);
  } else if (isSupportCard(card)) {
    oath.supportSlot = instanceId;
    inst.zone = "supportSlot";
    inst.slotIndex = null;
    inst.enteredOnRound = draft.round;
    cue(draft, "play", instanceId);
  } else if (isOneShotCard(card)) {
    inst.zone = "discard";
    oath.discard.push(instanceId);
    cue(draft, "play", instanceId);
  }

  runDeployEffect(draft, instanceId, targetIds);
  saveActiveSeat(draft);
  checkStageProgress(draft);
}

function declareAttack(draft: MatchDraft, attackerId: string, targetId: string): void {
  const attacker = draft.board.instances[attackerId];
  const name = definitionOf(draft, attackerId).name;
  const effect = getEffect(draft.mode, attacker.definitionId);

  if (effect?.trigger === "onAttack") {
    effect.handler?.(draft, {
      selfId: attackerId,
      controllerId: OATHGUARD,
      targetIds: [targetId],
      attackTargetId: targetId,
    });
  }

  const isGate = targetId === TARGET_HOLLOW_GATE;
  const power = attackOf(draft, attackerId) + (isGate ? gateAttackBonus(draft, attackerId) : 0);
  attacker.exhausted = true;
  attacker.flags = { ...attacker.flags, firstAttackUsed: true };
  cue(draft, "attack", attackerId);

  const targetLabel =
    targetId === TARGET_BOSS
      ? requireCard(draft.mode, draft.board.boss?.definitionId ?? "").name
      : targetId.startsWith("target:")
        ? targetId.includes("gate")
          ? "the Hollow Crown Gate"
          : "the Hollow Crown crystals"
        : definitionOf(draft, targetId).name;

  log(draft, `${name} attacks ${targetLabel} for ${power}.`, { playerId: OATHGUARD });
  resolveAttackDamage(draft, power, targetId);

  effect?.afterAttack?.(draft, {
    selfId: attackerId,
    controllerId: OATHGUARD,
    targetIds: [targetId],
    attackTargetId: targetId,
  });

  attacker.nextAttackAtk = 0;
  checkStageProgress(draft);
}

function endTurn(draft: MatchDraft): void {
  draft.step = "pass";
  const seat = draft.seats[draft.activeSeatId];
  log(draft, `${seat.displayName} passes the turn.`, { playerId: OATHGUARD });
  for (const inst of Object.values(draft.board.instances)) {
    if (inst.ownerId === OATHGUARD && inst.controllerSeatId === draft.activeSeatId) {
      inst.temporaryAtk = 0;
    }
  }
  draft.players[OATHGUARD].energy.temporaryCrystals = 0;
  saveActiveSeat(draft);

  const index = seatIndex(draft as unknown as MatchState);
  if (index < draft.seatOrder.length - 1) {
    // Every Oathguard player takes one turn before the Hollow Crown acts.
    beginSeatTurn(draft, draft.seatOrder[index + 1], false);
    return;
  }

  runHollowCrownTurn(draft);
  if (!draft.result) beginSeatTurn(draft, draft.seatOrder[0], true);
}

function resolveMulligan(draft: MatchDraft, replace: boolean): void {
  const oath = draft.players[OATHGUARD];
  const seat = draft.seats[draft.activeSeatId];
  if (replace) {
    const returned = [...oath.hand];
    oath.hand = [];
    returned.forEach((id) => {
      draft.board.instances[id].zone = "deck";
    });
    oath.deck = shuffleInto(draft, [...oath.deck, ...returned]);
    log(draft, `${seat.displayName} replaces their opening hand.`, { playerId: OATHGUARD });
    for (let i = 0; i < QUICKPLAY_SETUP.startingHand; i += 1) drawCard(draft, OATHGUARD);
  } else {
    log(draft, `${seat.displayName} keeps their opening hand.`, { playerId: OATHGUARD });
  }
  seat.mulliganUsed = true;
  draft.mulliganUsed = draft.seatOrder.every((id) => draft.seats[id].mulliganUsed);
  draft.prompt = null;
  saveActiveSeat(draft);
  beginSeatTurn(draft, draft.activeSeatId, draft.round === 0);
}

function surrender(draft: MatchDraft): void {
  cue(draft, "defeat");
  draft.result = {
    outcome: "surrendered",
    winningPlayerIds: [HOLLOW],
    reason: "You conceded the match.",
    rounds: draft.round,
    endedAt: new Date().toISOString(),
  };
  log(draft, "Match conceded.", { playerId: OATHGUARD });
}

/** The single entry point for changing match state. */
export function applyAction(state: MatchState, action: GameAction): ReducerOutcome {
  const legality = checkAction(state, action);
  if (!legality.legal) return { state, legality };

  const draft = clone(state);

  switch (action.kind) {
    case "mulligan":
      resolveMulligan(draft, action.replace);
      break;
    case "playCard":
      playCard(draft, action.instanceId, action.slotIndex, action.targetIds);
      break;
    case "declareAttack":
      declareAttack(draft, action.attackerId, action.targetId);
      break;
    case "beginStep":
      draft.step = action.step;
      if (action.step === "battle") log(draft, "— Battle —", { playerId: OATHGUARD });
      break;
    case "endTurn":
      endTurn(draft);
      break;
    case "chooseTarget": {
      const resolver = getPromptResolver(action.effectId);
      const selfId = selfIdFromEffectId(action.effectId);
      draft.prompt = null;
      resolver?.(draft, action.targetIds, selfId);
      checkStageProgress(draft);
      break;
    }
    case "cancelPending":
      draft.prompt = null;
      break;
    case "clearAnimations":
      draft.animations = [];
      break;
    case "surrender":
      surrender(draft);
      break;
    default:
      break;
  }

  return { state: draft as MatchState, legality };
}

/** Convenience for tests: apply a list of actions and assert each was legal. */
export function applyActions(state: MatchState, actions: readonly GameAction[]): MatchState {
  return actions.reduce((current, action) => {
    const { state: next, legality } = applyAction(current, action);
    if (!legality.legal) {
      throw new Error(`Illegal action ${action.kind}: ${legality.reason.message}`);
    }
    return next;
  }, state);
}