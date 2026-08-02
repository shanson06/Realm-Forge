/**
 * Legal-action generation and validation.
 *
 * The UI asks these functions what it may offer; it never decides legality itself.
 * Every rejection carries a plain-language reason for the player.
 */
import { requireCard } from "@/game-data/load";
import { getEffect, getEffectStatus } from "./effects";
import {
  attackOf,
  bossActive,
  definitionOf,
  firstEmptyUnitSlot,
  hasKeyword,
  isOneShotCard,
  isSupportCard,
  isUnitCard,
  remainingDef,
  unitsOf,
} from "./queries";
import {
  HOLLOW,
  OATHGUARD,
  TARGET_BOSS,
  TARGET_HOLLOW_CRYSTALS,
  TARGET_HOLLOW_GATE,
  type ActionLegality,
  type GameAction,
  type IllegalReason,
  type MatchState,
} from "./types";

const LEGAL: ActionLegality = { legal: true };

function illegal(code: IllegalReason["code"], message: string): ActionLegality {
  return { legal: false, reason: { code, message } };
}

function baseChecks(state: MatchState): ActionLegality | null {
  if (state.result) return illegal("match-over", "This match has already ended.");
  if (state.prompt) return illegal("awaiting-choice", "Finish the current choice first.");
  if (state.turnSide !== OATHGUARD) {
    return illegal("wrong-step", "The Hollow Crown is taking its turn.");
  }
  return null;
}

/** Can this hand card be played right now? */
export function canPlayCard(
  state: MatchState,
  instanceId: string,
  slotIndex: number | null = null,
): ActionLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;

  const oath = state.players[OATHGUARD];
  if (state.step !== "play") {
    return illegal("wrong-step", "Cards can only be played during the Play step.");
  }
  if (!oath.hand.includes(instanceId)) {
    return illegal("illegal-target", "That card is not in your hand.");
  }
  if (oath.cardsPlayedThisTurn >= oath.cardPlayLimit) {
    return illegal(
      "card-limit-reached",
      `You have already played ${oath.cardPlayLimit} cards this turn.`,
    );
  }

  const card = definitionOf(state, instanceId);

  if (getEffectStatus(card) === "not-implemented") {
    return illegal(
      "effect-not-implemented",
      `${card.name} has no approved digital effect yet, so it cannot be played.`,
    );
  }

  const available = oath.energy.faceUpCrystals + oath.energy.temporaryCrystals;
  if (card.cost > available) {
    return illegal(
      "not-enough-energy",
      `${card.name} costs ${card.cost} Energy and you have ${available} face-up crystals.`,
    );
  }

  if (isUnitCard(card)) {
    if (slotIndex !== null) {
      if (slotIndex < 0 || slotIndex >= oath.unitSlots.length) {
        return illegal("illegal-target", "That is not a valid unit space.");
      }
      if (oath.unitSlots[slotIndex] !== null) {
        return illegal("board-full", "That unit space is already occupied.");
      }
    } else if (firstEmptyUnitSlot(state, OATHGUARD) === null) {
      return illegal("board-full", "All four Oathguard unit spaces are full.");
    }
    return LEGAL;
  }

  if (isSupportCard(card)) {
    if (oath.supportSlot !== null) {
      return illegal("no-slot", "The Oathguard Support space is already occupied.");
    }
    return LEGAL;
  }

  if (isOneShotCard(card)) return LEGAL;

  return illegal("illegal-target", `${card.name} cannot be played from hand.`);
}

export function playableHandCards(
  state: MatchState,
): { instanceId: string; legality: ActionLegality }[] {
  return state.players[OATHGUARD].hand.map((instanceId) => ({
    instanceId,
    legality: canPlayCard(state, instanceId),
  }));
}

export function canAttack(state: MatchState, attackerId: string): ActionLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (state.step !== "battle") {
    return illegal("wrong-step", "Attacks happen during the Battle step.");
  }
  const attacker = state.board.instances[attackerId];
  if (!attacker || attacker.zone !== "unitSlot" || attacker.ownerId !== OATHGUARD) {
    return illegal("illegal-target", "That is not one of your units.");
  }
  if (attacker.exhausted) {
    return illegal("already-attacked", "That unit is already used this turn.");
  }
  if (attacker.enteredOnRound === state.round && !hasKeyword(state, attackerId, "Surge")) {
    return illegal(
      "summoning-sick",
      "That unit entered play this turn. Only units with Surge can attack immediately.",
    );
  }
  if (legalAttackTargets(state, attackerId).length === 0) {
    return illegal("illegal-target", "There is nothing this unit can legally attack.");
  }
  return LEGAL;
}

/**
 * Attack targets for an Oathguard attacker.
 * A ready Aegis enemy protects other enemy units, but never the Gate.
 */
export function legalAttackTargets(state: MatchState, attackerId: string): string[] {
  const attacker = state.board.instances[attackerId];
  if (!attacker) return [];
  const hollow = state.players[HOLLOW];
  const targets: string[] = [];

  const enemyUnits = unitsOf(state, HOLLOW);
  const readyAegis = enemyUnits.filter(
    (u) => !u.exhausted && hasKeyword(state, u.instanceId, "Aegis"),
  );
  let unitPool = readyAegis.length > 0 ? readyAegis : enemyUnits;

  const rule = getEffect(state.mode, attacker.definitionId)?.attackTargetRule;
  if (rule === "lowest-remaining-def-unit" && unitPool.length > 0) {
    const lowest = Math.min(...unitPool.map((u) => remainingDef(state, u.instanceId)));
    unitPool = unitPool.filter((u) => remainingDef(state, u.instanceId) === lowest);
  }
  if (rule === "lowest-printed-def-unit" && unitPool.length > 0) {
    const printed = (id: string) => definitionOf(state, id).def ?? 0;
    const lowest = Math.min(...unitPool.map((u) => printed(u.instanceId)));
    unitPool = unitPool.filter((u) => printed(u.instanceId) === lowest);
  }
  targets.push(...unitPool.map((u) => u.instanceId));

  if (hollow.gateWard > 0) targets.push(TARGET_HOLLOW_GATE);
  else if (hollow.crystalSpinner > 0) targets.push(TARGET_HOLLOW_CRYSTALS);

  if (bossActive(state)) targets.push(TARGET_BOSS);

  return targets;
}

export function canAttackTarget(
  state: MatchState,
  attackerId: string,
  targetId: string,
): ActionLegality {
  const attackerLegality = canAttack(state, attackerId);
  if (!attackerLegality.legal) return attackerLegality;
  if (!legalAttackTargets(state, attackerId).includes(targetId)) {
    const hollow = state.players[HOLLOW];
    if (targetId === TARGET_HOLLOW_CRYSTALS && hollow.gateWard > 0) {
      return illegal(
        "illegal-target",
        "The Hollow Crown Gate must be broken before its crystals can be damaged.",
      );
    }
    if (targetId === TARGET_BOSS) {
      return illegal(
        "illegal-target",
        "The Quick Boss is only a legal target after the enemy Gate and all six crystals are gone.",
      );
    }
    return illegal(
      "illegal-target",
      "A ready Aegis defender must be attacked before the units behind it.",
    );
  }
  return LEGAL;
}

export function canEndTurn(state: MatchState): ActionLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (state.step !== "play" && state.step !== "battle") {
    return illegal("wrong-step", "You can only end the turn during Play or Battle.");
  }
  return LEGAL;
}

export function canBeginStep(state: MatchState, step: MatchState["step"]): ActionLegality {
  const blocked = baseChecks(state);
  if (blocked) return blocked;
  if (step === "battle" && state.step === "play") return LEGAL;
  return illegal("wrong-step", "That step cannot be entered right now.");
}

/** Full legality gate used by the reducer. UI mirrors it, engine enforces it. */
export function checkAction(state: MatchState, action: GameAction): ActionLegality {
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
    case "chooseTarget":
      return state.prompt && "effectId" in state.prompt && state.prompt.effectId === action.effectId
        ? LEGAL
        : illegal("awaiting-choice", "That choice is no longer open.");
    case "cancelPending":
    case "clearAnimations":
    case "surrender":
      return LEGAL;
    default:
      return illegal("wrong-step", "Unsupported action.");
  }
}

/** Convenience for tests and the AI shell. */
export function attackPower(state: MatchState, attackerId: string): number {
  return attackOf(state, attackerId);
}

export function definitionName(state: MatchState, instanceId: string): string {
  return requireCard(state.mode, state.board.instances[instanceId].definitionId).name;
}
