/**
 * Competitive legal-action generation and validation.
 * The UI asks these functions what it may offer; it never decides legality itself.
 */
import { getTrialsEffect, trialsEffectStatus } from "./effects";
import {
  availableEnergy,
  canActThisTurn,
  definitionOf,
  firstEmptyUnitSlot,
  hasKeyword,
  isOneShotCard,
  isSupportCard,
  isUnitCard,
  unitsOf,
} from "./queries";
import {
  crystalsTarget,
  gateTarget,
  otherSeat,
  type TrialsAction,
  type TrialsIllegalReason,
  type TrialsLegality,
  type TrialsMatchState,
  type TrialsSeatId,
} from "./types";

const LEGAL: TrialsLegality = { legal: true };

function illegal(code: TrialsIllegalReason["code"], message: string): TrialsLegality {
  return { legal: false, reason: { code, message } };
}

function baseChecks(state: TrialsMatchState): TrialsLegality | null {
  if (state.result) return illegal("match-over", "This match has already ended.");
  if (state.handoffPending) {
    return illegal("awaiting-handoff", "Hand the device to the next player first.");
  }
  if (state.prompt) return illegal("awaiting-choice", "Finish the current choice first.");
  return null;
}

/** Reserve token: once during the second player's first three turns. */
export function canSpendReserveToken(state: TrialsMatchState): TrialsLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  const player = state.players[state.activeSeatId];
  if (player.reserveToken !== "available") {
    return illegal("no-reserve-token", "You do not have a Reserve token to spend.");
  }
  if (state.step !== "play" && state.step !== "battle") {
    return illegal("wrong-step", "Spend the Reserve token during your Play or Battle step.");
  }
  if (player.turnsTaken > 3) {
    return illegal("no-reserve-token", "The Reserve token expires after your third turn.");
  }
  return LEGAL;
}

export function canPlayCard(
  state: TrialsMatchState,
  instanceId: string,
  slotIndex: number | null = null,
): TrialsLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;

  const seatId = state.activeSeatId;
  const player = state.players[seatId];

  if (state.step !== "play") {
    return illegal("wrong-step", "Cards can only be played during the Play step.");
  }
  if (!player.hand.includes(instanceId)) {
    return illegal("illegal-target", "That card is not in your hand.");
  }
  if (player.cardsPlayedThisTurn >= player.cardPlayLimit) {
    return illegal(
      "card-limit-reached",
      `You have already played ${player.cardPlayLimit} cards this turn.`,
    );
  }

  const card = definitionOf(state, instanceId);
  if (trialsEffectStatus(card) === "not-implemented") {
    return illegal(
      "effect-not-implemented",
      `${card.name} has no approved digital effect yet, so it cannot be played.`,
    );
  }

  const available = availableEnergy(player);
  if (card.cost > available) {
    return illegal(
      "not-enough-energy",
      `${card.name} costs ${card.cost} Energy and you have ${available} face-up crystals.`,
    );
  }

  if (isUnitCard(card)) {
    if (slotIndex !== null) {
      if (slotIndex < 0 || slotIndex >= player.unitSlots.length) {
        return illegal("illegal-target", "That is not a valid unit space.");
      }
      if (player.unitSlots[slotIndex] !== null) {
        return illegal("board-full", "That unit space is already occupied.");
      }
    } else if (firstEmptyUnitSlot(state, seatId) === null) {
      return illegal("board-full", "All three of your unit spaces are full.");
    }
    return LEGAL;
  }

  if (isSupportCard(card)) {
    if (player.supportSlot !== null) {
      return illegal("no-slot", "Your Support space is already occupied.");
    }
    return LEGAL;
  }

  if (isOneShotCard(card)) {
    const targeting = getTrialsEffect(card.id)?.targeting;
    if (
      targeting &&
      !targeting.optional &&
      targeting.candidates(state, seatId, instanceId).length === 0
    ) {
      return illegal("illegal-target", `${card.name} has no legal target right now.`);
    }
    return LEGAL;
  }

  return illegal("illegal-target", `${card.name} cannot be played from hand.`);
}

export function playableHandCards(
  state: TrialsMatchState,
): { instanceId: string; legality: TrialsLegality }[] {
  return state.players[state.activeSeatId].hand.map((instanceId) => ({
    instanceId,
    legality: canPlayCard(state, instanceId),
  }));
}

export function canAttack(state: TrialsMatchState, attackerId: string): TrialsLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (state.step !== "battle") {
    return illegal("wrong-step", "Attacks happen during the Battle step.");
  }
  const attacker = state.instances[attackerId];
  if (!attacker || attacker.zone !== "unitSlot" || attacker.ownerId !== state.activeSeatId) {
    return illegal("illegal-target", "That is not one of your units.");
  }
  if (attacker.exhausted) {
    return illegal("already-attacked", "That unit is already used this turn.");
  }
  if (!canActThisTurn(state, attackerId)) {
    return illegal(
      "summoning-sick",
      "That unit entered play this turn. Only units with Surge can attack immediately.",
    );
  }
  return LEGAL;
}

/**
 * Legal attack targets.
 * A ready Aegis unit protects the other units of its controller, but never the Gate.
 * Crystals can only be attacked once that player's Gate is broken.
 */
export function legalAttackTargets(state: TrialsMatchState, attackerId: string): string[] {
  const attacker = state.instances[attackerId];
  if (!attacker) return [];
  const defenderId = otherSeat(attacker.ownerId as TrialsSeatId);
  const defender = state.players[defenderId];
  const targets: string[] = [];

  const enemyUnits = unitsOf(state, defenderId);
  const readyAegis = enemyUnits.filter(
    (u) => !u.exhausted && hasKeyword(state, u.instanceId, "Aegis"),
  );
  const pool = readyAegis.length > 0 ? readyAegis : enemyUnits;
  targets.push(...pool.map((u) => u.instanceId));

  if (defender.gateWard > 0) targets.push(gateTarget(defenderId));
  else if (defender.crystalSpinner > 0) targets.push(crystalsTarget(defenderId));

  return targets;
}

export function canAttackTarget(
  state: TrialsMatchState,
  attackerId: string,
  targetId: string,
): TrialsLegality {
  const attackerLegality = canAttack(state, attackerId);
  if (!attackerLegality.legal) return attackerLegality;
  if (legalAttackTargets(state, attackerId).includes(targetId)) return LEGAL;

  const attacker = state.instances[attackerId];
  const defenderId = otherSeat(attacker.ownerId as TrialsSeatId);
  if (targetId === crystalsTarget(defenderId) && state.players[defenderId].gateWard > 0) {
    return illegal(
      "illegal-target",
      "The opposing Gate must be broken before its crystals can be damaged.",
    );
  }
  return illegal(
    "illegal-target",
    "A ready Aegis defender must be attacked before the units behind it.",
  );
}

export function canEndTurn(state: TrialsMatchState): TrialsLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (state.step !== "play" && state.step !== "battle") {
    return illegal("wrong-step", "You can only end the turn during Play or Battle.");
  }
  return LEGAL;
}

export function canBeginStep(
  state: TrialsMatchState,
  step: TrialsMatchState["step"],
): TrialsLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (step === "battle" && state.step === "play") return LEGAL;
  return illegal("wrong-step", "That step cannot be entered right now.");
}

/** Full legality gate used by the reducer. The UI mirrors it; the engine enforces it. */
export function checkTrialsAction(state: TrialsMatchState, action: TrialsAction): TrialsLegality {
  switch (action.kind) {
    case "mulligan":
      return state.prompt?.kind === "mulligan"
        ? LEGAL
        : illegal("wrong-step", "There is no opening hand to replace.");
    case "playCard":
      return canPlayCard(state, action.instanceId, action.slotIndex);
    case "declareAttack":
      return canAttackTarget(state, action.attackerId, action.targetId);
    case "beginStep":
      return canBeginStep(state, action.step);
    case "endTurn":
      return canEndTurn(state);
    case "spendReserveToken":
      return canSpendReserveToken(state);
    case "chooseTarget":
      return state.prompt && "effectId" in state.prompt && state.prompt.effectId === action.effectId
        ? LEGAL
        : illegal("awaiting-choice", "That choice is no longer open.");
    case "cancelPending":
      return state.prompt ? LEGAL : illegal("awaiting-choice", "There is nothing to cancel.");
    case "acknowledgeHandoff":
      return state.handoffPending ? LEGAL : illegal("wrong-step", "No handoff is waiting.");
    case "surrender":
      return state.result ? illegal("match-over", "This match has already ended.") : LEGAL;
    default:
      return illegal("wrong-step", "Unsupported action.");
  }
}
