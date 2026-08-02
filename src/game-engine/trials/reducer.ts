/**
 * The competitive reducer: the single entry point for changing a Trials match.
 *
 * Four-step turn (Ready and Charge, Play, Battle, Pass), two cards per turn,
 * a six-crystal Energy cap, and the QuickPlay attack/target rules.
 */
import { getTrialsEffect } from "./effects";
import { parseEffectId } from "./effects/helpers";
import { checkTrialsAction } from "./legal";
import {
  checkVictory,
  damageUnit,
  discardFromHand,
  drawCard,
  log,
  moveToDiscard,
  resolveDamage,
  shuffleInto,
} from "./mutations";
import {
  attackBonusAgainst,
  attackOf,
  definitionOf,
  firstEmptyUnitSlot,
  isOneShotCard,
  isSupportCard,
  isUnitCard,
} from "./queries";
import { TRIALS_SETUP } from "./setup";
import {
  otherSeat,
  type TrialsAction,
  type TrialsDraft,
  type TrialsMatchState,
  type TrialsOutcome,
  type TrialsSeatId,
} from "./types";

function clone(state: TrialsMatchState): TrialsDraft {
  return structuredClone(state) as TrialsDraft;
}

/** Ready and Charge, then Draw, then the Play step. */
function readyAndCharge(draft: TrialsDraft, seatId: TrialsSeatId): void {
  const player = draft.players[seatId];
  draft.step = "readyAndCharge";

  for (const inst of Object.values(draft.instances)) {
    if (inst.ownerId === seatId && (inst.zone === "unitSlot" || inst.zone === "supportSlot")) {
      inst.exhausted = false;
    }
  }

  player.energy.permanentCrystals = Math.min(
    player.energy.permanentCrystals + 1,
    player.energy.maxPermanentCrystals,
  );
  player.energy.faceUpCrystals = player.energy.permanentCrystals;
  log(
    draft,
    `${player.displayName} readies and charges to ${player.energy.faceUpCrystals} face-up crystals.`,
    { seatId, undoSafe: true },
  );

  if (player.skipNextDraw) {
    player.skipNextDraw = false;
    log(draft, `${player.displayName} goes first and skips this Draw.`, { seatId });
  } else {
    drawCard(draft, seatId);
  }
  if (draft.result) return;

  draft.step = "play";
}

/** Starts a seat's turn, pausing for its one-time opening-hand replacement. */
export function beginTurn(draft: TrialsDraft, seatId: TrialsSeatId): void {
  draft.activeSeatId = seatId;
  draft.attacksThisTurn = 0;
  const player = draft.players[seatId];
  player.cardsPlayedThisTurn = 0;
  draft.turnSequence += 1;
  player.turnsTaken += 1;
  if (seatId === draft.firstSeatId) draft.round += 1;

  log(draft, `— ${player.displayName}'s turn (round ${draft.round}) —`, {
    seatId,
    undoSafe: true,
  });

  if (!player.mulliganUsed) {
    draft.step = "setup";
    draft.prompt = {
      kind: "mulligan",
      seatId,
      description:
        "Keep this opening hand of four, or replace all four cards once before your first turn.",
    };
    return;
  }

  readyAndCharge(draft, seatId);
}

function resolveMulligan(draft: TrialsDraft, replace: boolean): void {
  const seatId = draft.prompt?.kind === "mulligan" ? draft.prompt.seatId : draft.activeSeatId;
  const player = draft.players[seatId];
  if (replace) {
    const returned = [...player.hand];
    player.hand = [];
    returned.forEach((id) => {
      draft.instances[id].zone = "deck";
    });
    player.deck = shuffleInto(draft, [...player.deck, ...returned]);
    log(draft, `${player.displayName} replaces their opening hand.`, { seatId });
    for (let i = 0; i < TRIALS_SETUP.startingHand; i += 1) drawCard(draft, seatId);
  } else {
    log(draft, `${player.displayName} keeps their opening hand.`, { seatId });
  }
  player.mulliganUsed = true;
  draft.prompt = null;
  if (!draft.result) readyAndCharge(draft, seatId);
}

function spendEnergy(draft: TrialsDraft, seatId: TrialsSeatId, cost: number): void {
  const energy = draft.players[seatId].energy;
  let remaining = cost;
  const fromTemporary = Math.min(energy.temporaryCrystals, remaining);
  energy.temporaryCrystals -= fromTemporary;
  remaining -= fromTemporary;
  energy.faceUpCrystals = Math.max(0, energy.faceUpCrystals - remaining);
}

function resolveEffect(
  draft: TrialsDraft,
  selfId: string,
  seatId: TrialsSeatId,
  targetIds: readonly string[],
): void {
  const inst = draft.instances[selfId];
  const effect = getTrialsEffect(inst.definitionId);
  effect?.onPlay?.(draft, { selfId, controller: seatId, targetIds });
  checkVictory(draft);
}

function playCard(
  draft: TrialsDraft,
  instanceId: string,
  slotIndex: number | null,
  targetIds: readonly string[],
): void {
  const seatId = draft.activeSeatId;
  const player = draft.players[seatId];
  const card = definitionOf(draft, instanceId);
  const inst = draft.instances[instanceId];

  spendEnergy(draft, seatId, card.cost);
  player.hand = player.hand.filter((id) => id !== instanceId);
  player.cardsPlayedThisTurn += 1;
  draft.stats.cardsPlayed += 1;
  log(draft, `${player.displayName} plays ${card.name} (cost ${card.cost}).`, { seatId });

  if (isUnitCard(card)) {
    const index = slotIndex ?? firstEmptyUnitSlot(draft, seatId) ?? 0;
    player.unitSlots[index] = instanceId;
    inst.zone = "unitSlot";
    inst.slotIndex = index;
    inst.exhausted = false;
    inst.enteredOnRound = draft.turnSequence;
  } else if (isSupportCard(card)) {
    player.supportSlot = instanceId;
    inst.zone = "supportSlot";
    inst.slotIndex = null;
    inst.enteredOnRound = draft.turnSequence;
  }

  const effect = getTrialsEffect(card.id);
  const targeting = effect?.targeting;

  if (targeting && targetIds.length === 0) {
    const candidates = targeting.candidates(draft, seatId, instanceId);
    if (candidates.length > 0) {
      draft.prompt = {
        kind: "selectTarget",
        effectId: `${instanceId}|play`,
        seatId,
        sourceInstanceId: instanceId,
        legalTargetIds: candidates,
        count: targeting.count,
        optional: targeting.optional,
        description: targeting.description,
      };
      if (isOneShotCard(card)) moveToDiscard(draft, instanceId);
      return;
    }
  }

  if (isOneShotCard(card)) {
    moveToDiscard(draft, instanceId);
  }
  resolveEffect(draft, instanceId, seatId, targetIds);
}

function declareAttack(draft: TrialsDraft, attackerId: string, targetId: string): void {
  const seatId = draft.activeSeatId;
  const attacker = draft.instances[attackerId];
  const power = attackOf(draft, attackerId) + attackBonusAgainst(draft, attackerId, targetId);

  log(
    draft,
    `${definitionOf(draft, attackerId).name} attacks for ${power}.`,
    { seatId },
  );
  attacker.exhausted = true;
  attacker.nextAttackAtk = 0;
  draft.attacksThisTurn += 1;
  draft.stats.attacks += 1;

  resolveDamage(draft, targetId, power);
  checkVictory(draft);
  if (!draft.result) getTrialsEffect(attacker.definitionId)?.afterAttack?.(draft, attackerId, targetId);
}

function spendReserveToken(draft: TrialsDraft): void {
  const seatId = draft.activeSeatId;
  const player = draft.players[seatId];
  player.reserveToken = "spent";
  player.energy.temporaryCrystals += 1;
  log(
    draft,
    `${player.displayName} spends their Reserve token for one temporary face-up crystal.`,
    { seatId },
  );
}

/** Pass: clear turn effects, remove temporary crystals, then hand over. */
function endTurn(draft: TrialsDraft): void {
  const seatId = draft.activeSeatId;
  const player = draft.players[seatId];
  draft.step = "pass";

  if (player.energy.temporaryCrystals > 0) {
    log(draft, `${player.displayName} removes their temporary crystal during Pass.`, { seatId });
  }
  player.energy.temporaryCrystals = 0;
  if (player.reserveToken === "available" && player.turnsTaken >= 3) {
    player.reserveToken = "spent";
    log(draft, `${player.displayName}'s unused Reserve token expires.`, { seatId });
  }

  for (const inst of Object.values(draft.instances)) {
    inst.temporaryAtk = 0;
    inst.nextAttackAtk = 0;
  }
  draft.modifiers = draft.modifiers.filter((m) => m.duration !== "turn");

  const nextSeat = otherSeat(seatId);
  const bothHuman =
    draft.players.p1.controller === "human" && draft.players.p2.controller === "human";
  if (bothHuman) {
    draft.handoffPending = true;
    draft.pendingSeatId = nextSeat;
    return;
  }
  beginTurn(draft, nextSeat);
}

function surrender(draft: TrialsDraft, seatId: TrialsSeatId): void {
  const winner = otherSeat(seatId);
  draft.result = {
    outcome: "surrendered",
    winningPlayerIds: [winner],
    reason: `${draft.players[seatId].displayName} conceded. ${draft.players[winner].displayName} wins.`,
    rounds: draft.round,
    endedAt: new Date().toISOString(),
  };
  log(draft, draft.result.reason);
}

function resolvePrompt(
  draft: TrialsDraft,
  effectIdValue: string,
  targetIds: readonly string[],
): void {
  const prompt = draft.prompt;
  const { selfId, key } = parseEffectId(effectIdValue);
  const inst = draft.instances[selfId];
  const effect = inst ? getTrialsEffect(inst.definitionId) : undefined;
  const seatId = prompt && "seatId" in prompt ? prompt.seatId : draft.activeSeatId;
  draft.prompt = null;

  if (prompt?.kind === "discardFromHand") {
    if (targetIds[0]) discardFromHand(draft, seatId, targetIds[0]);
  }

  if (key === "play") {
    resolveEffect(draft, selfId, seatId, targetIds);
    return;
  }

  effect?.resolvers?.[key]?.(draft, targetIds, selfId);
  checkVictory(draft);
}

/** The single entry point for changing competitive match state. */
export function applyTrialsAction(
  state: TrialsMatchState,
  action: TrialsAction,
): TrialsOutcome {
  const legality = checkTrialsAction(state, action);
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
      if (action.step === "battle") {
        log(draft, "— Battle —", { seatId: draft.activeSeatId });
      }
      break;
    case "spendReserveToken":
      spendReserveToken(draft);
      break;
    case "chooseTarget":
      resolvePrompt(draft, action.effectId, action.targetIds);
      break;
    case "cancelPending": {
      // Cancelling an optional choice resolves the card with no targets.
      const prompt = draft.prompt;
      draft.prompt = null;
      if (prompt && "effectId" in prompt) {
        const { key, selfId } = parseEffectId(prompt.effectId);
        if (key === "play") resolveEffect(draft, selfId, prompt.seatId, []);
        else {
          const inst = draft.instances[selfId];
          getTrialsEffect(inst.definitionId)?.resolvers?.[key]?.(draft, [], selfId);
        }
      }
      break;
    }
    case "acknowledgeHandoff": {
      draft.handoffPending = false;
      const next = draft.pendingSeatId ?? otherSeat(draft.activeSeatId);
      draft.pendingSeatId = null;
      beginTurn(draft, next);
      break;
    }
    case "endTurn":
      endTurn(draft);
      break;
    case "surrender":
      surrender(draft, action.seatId);
      break;
    default:
      break;
  }

  return { state: draft as TrialsMatchState, legality };
}

/** Convenience for tests: apply a list of actions and assert each was legal. */
export function applyTrialsActions(
  state: TrialsMatchState,
  actions: readonly TrialsAction[],
): TrialsMatchState {
  return actions.reduce((current, action) => {
    const { state: next, legality } = applyTrialsAction(current, action);
    if (!legality.legal) {
      throw new Error(`Illegal action ${action.kind}: ${legality.reason.message}`);
    }
    return next;
  }, state);
}

/** Starts the match: the first player's opening turn. */
export function startTrialsMatch(state: TrialsMatchState): TrialsMatchState {
  const draft = clone(state);
  beginTurn(draft, draft.firstSeatId);
  return draft as TrialsMatchState;
}

/** Exported for tests that need direct board manipulation. */
export { damageUnit };