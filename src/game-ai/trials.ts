/**
 * Deterministic computer opponents for Oathguard Trials.
 *
 * Contract (enforced by construction):
 *  - only public information plus the controller's own hand is read;
 *  - every returned action passes the engine's own legality check;
 *  - no shuffle, draw, cost, statistic or hidden card is ever altered;
 *  - the same (state, difficulty) always produces the same action.
 *
 * No language model is involved in any decision.
 */
import { applyTrialsAction } from "@/game-engine/trials/reducer";
import {
  canPlayCard,
  canSpendReserveToken,
  legalAttackTargets,
  canAttack,
  checkTrialsAction,
} from "@/game-engine/trials/legal";
import {
  attackOf,
  availableEnergy,
  definitionOf,
  firstEmptyUnitSlot,
  hasKeyword,
  isUnitCard,
  readyUnitsOf,
  remainingDef,
  unitsOf,
} from "@/game-engine/trials/queries";
import {
  crystalsTarget,
  gateTarget,
  otherSeat,
  type TrialsAction,
  type TrialsDifficulty,
  type TrialsMatchState,
  type TrialsSeatId,
} from "@/game-engine/trials/types";

export interface TrialsDecision {
  readonly action: TrialsAction;
  /** Short human-readable explanation, surfaced in development mode only. */
  readonly reason: string;
}

export const TRIALS_DIFFICULTIES: Record<TrialsDifficulty, { label: string; description: string }> =
  {
    initiate: {
      label: "Initiate",
      description:
        "Plays the most expensive card it can afford and takes obvious attacks. Limited look-ahead.",
    },
    guardian: {
      label: "Guardian",
      description:
        "Weighs board control, Gate pressure, favourable trades, its Energy curve and its own defence.",
    },
    champion: {
      label: "Champion",
      description:
        "Searches ordered action sequences within a capped budget and answers one-turn threats.",
    },
  };

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                  */
/* -------------------------------------------------------------------------- */

function boardValue(state: TrialsMatchState, seatId: TrialsSeatId): number {
  return unitsOf(state, seatId).reduce((total, unit) => {
    const aegis = hasKeyword(state, unit.instanceId, "Aegis") ? 1.5 : 0;
    return (
      total + attackOf(state, unit.instanceId) * 1.2 + remainingDef(state, unit.instanceId) + aegis
    );
  }, 0);
}

/** Positive is good for `seatId`. Reads public state plus that seat's own hand size. */
export function evaluate(state: TrialsMatchState, seatId: TrialsSeatId): number {
  const foeId = otherSeat(seatId);
  const me = state.players[seatId];
  const foe = state.players[foeId];

  if (state.result) {
    return state.result.winningPlayerIds.includes(seatId) ? 100000 : -100000;
  }

  return (
    me.gateWard * 1.5 -
    foe.gateWard * 1.6 +
    me.crystalSpinner * 7 -
    foe.crystalSpinner * 7.5 +
    boardValue(state, seatId) -
    boardValue(state, foeId) +
    me.hand.length * 0.8 +
    me.deck.length * 0.15 -
    foe.deck.length * 0.1 +
    availableEnergy(me) * 0.25
  );
}

/** Incoming damage the opponent's ready board could deal next turn. */
export function incomingThreat(state: TrialsMatchState, seatId: TrialsSeatId): number {
  return unitsOf(state, otherSeat(seatId)).reduce(
    (total, unit) => total + attackOf(state, unit.instanceId),
    0,
  );
}

/* -------------------------------------------------------------------------- */
/* Legal action enumeration                                                    */
/* -------------------------------------------------------------------------- */

export function enumerateActions(state: TrialsMatchState): TrialsAction[] {
  if (state.result || state.prompt || state.handoffPending) return [];
  const seatId = state.activeSeatId;
  const player = state.players[seatId];
  const actions: TrialsAction[] = [];

  if (state.step === "play") {
    for (const instanceId of player.hand) {
      const card = definitionOf(state, instanceId);
      const slotIndex = isUnitCard(card) ? firstEmptyUnitSlot(state, seatId) : null;
      if (canPlayCard(state, instanceId, slotIndex).legal) {
        actions.push({ kind: "playCard", instanceId, slotIndex, targetIds: [] });
      }
    }
    if (canSpendReserveToken(state).legal) actions.push({ kind: "spendReserveToken" });
    actions.push({ kind: "beginStep", step: "battle" });
  }

  if (state.step === "battle") {
    for (const unit of readyUnitsOf(state, seatId)) {
      if (!canAttack(state, unit.instanceId).legal) continue;
      for (const targetId of legalAttackTargets(state, unit.instanceId)) {
        actions.push({ kind: "declareAttack", attackerId: unit.instanceId, targetId });
      }
    }
    if (canSpendReserveToken(state).legal) actions.push({ kind: "spendReserveToken" });
    actions.push({ kind: "endTurn" });
  }

  return actions.filter((action) => checkTrialsAction(state, action).legal);
}

/* -------------------------------------------------------------------------- */
/* Prompt answers                                                              */
/* -------------------------------------------------------------------------- */

function decidePrompt(state: TrialsMatchState, seatId: TrialsSeatId): TrialsDecision | null {
  const prompt = state.prompt;
  if (!prompt || prompt.seatId !== seatId) return null;

  if (prompt.kind === "mulligan") {
    const player = state.players[seatId];
    const cheap = player.hand.filter((id) => definitionOf(state, id).cost <= 3).length;
    const replace = cheap < 2;
    return {
      action: { kind: "mulligan", replace },
      reason: replace
        ? "Opening hand has fewer than two cards costing 3 or less — replacing it."
        : "Opening hand has enough early plays — keeping it.",
    };
  }

  if (prompt.kind === "discardFromHand") {
    const worst = [...prompt.legalTargetIds].sort(
      (a, b) => definitionOf(state, b).cost - definitionOf(state, a).cost,
    )[0];
    return {
      action: { kind: "chooseTarget", effectId: prompt.effectId, targetIds: [worst] },
      reason: "Discarding the most expensive card in hand.",
    };
  }

  if (prompt.kind === "foresight") {
    const affordable = availableEnergy(state.players[seatId]) + 1;
    const bottom = prompt.revealedIds
      .filter((id) => definitionOf(state, id).cost > affordable)
      .slice(0, prompt.count);
    return {
      action: { kind: "chooseTarget", effectId: prompt.effectId, targetIds: bottom },
      reason:
        bottom.length > 0
          ? "Bottoming cards it cannot afford soon."
          : "Keeping the revealed cards on top.",
    };
  }

  // selectTarget: enemy units are ranked by how close they are to being withdrawn,
  // friendly units by how much value the effect protects or amplifies.
  const candidates = [...prompt.legalTargetIds];
  const enemies = candidates.filter((id) => state.instances[id]?.ownerId !== seatId);
  const pool = enemies.length > 0 ? enemies : candidates;
  const ranked = pool.sort((a, b) => {
    const instA = state.instances[a];
    const instB = state.instances[b];
    if (!instA || !instB) return 0;
    if (enemies.length > 0) return remainingDef(state, a) - remainingDef(state, b);
    const damage = instB.damage - instA.damage;
    if (damage !== 0) return damage;
    return attackOf(state, b) - attackOf(state, a);
  });
  const chosen = ranked.slice(0, Math.max(1, prompt.count));
  return {
    action: { kind: "chooseTarget", effectId: prompt.effectId, targetIds: chosen },
    reason:
      enemies.length > 0
        ? "Targeting the opposing unit closest to being withdrawn."
        : "Supporting its most valuable friendly unit.",
  };
}

/** Applies an action and answers any prompt it opens, so search stays deterministic. */
function settle(state: TrialsMatchState, action: TrialsAction): TrialsMatchState {
  let next = applyTrialsAction(state, action).state;
  let guard = 0;
  while (next.prompt && guard < 8) {
    const decision = decidePrompt(next, next.prompt.seatId);
    if (!decision) break;
    next = applyTrialsAction(next, decision.action).state;
    guard += 1;
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Difficulty policies                                                         */
/* -------------------------------------------------------------------------- */

function describe(state: TrialsMatchState, action: TrialsAction): string {
  switch (action.kind) {
    case "playCard":
      return `Plays ${definitionOf(state, action.instanceId).name}.`;
    case "declareAttack": {
      const foe = otherSeat(state.activeSeatId);
      const target =
        action.targetId === gateTarget(foe)
          ? "the opposing Gate"
          : action.targetId === crystalsTarget(foe)
            ? "the opposing crystals"
            : definitionOf(state, action.targetId).name;
      return `${definitionOf(state, action.attackerId).name} attacks ${target}.`;
    }
    case "beginStep":
      return "Moves to the Battle step.";
    case "spendReserveToken":
      return "Spends the Reserve token for one extra crystal.";
    case "endTurn":
      return "Passes the turn.";
    default:
      return "Acts.";
  }
}

function initiate(state: TrialsMatchState): TrialsDecision | null {
  const actions = enumerateActions(state);
  if (actions.length === 0) return null;
  const seatId = state.activeSeatId;

  const plays = actions.filter((a) => a.kind === "playCard");
  if (plays.length > 0) {
    const best = plays.sort(
      (a, b) =>
        definitionOf(state, (b as { instanceId: string }).instanceId).cost -
        definitionOf(state, (a as { instanceId: string }).instanceId).cost,
    )[0];
    return { action: best, reason: `Initiate: ${describe(state, best)} Highest affordable cost.` };
  }

  const attacks = actions.filter((a) => a.kind === "declareAttack");
  if (attacks.length > 0) {
    const foe = otherSeat(seatId);
    const lethal = attacks.find((a) => {
      const attack = a as { attackerId: string; targetId: string };
      const target = state.instances[attack.targetId];
      return target && attackOf(state, attack.attackerId) >= remainingDef(state, attack.targetId);
    });
    const gateHit = attacks.find((a) => (a as { targetId: string }).targetId === gateTarget(foe));
    const chosen = lethal ?? gateHit ?? attacks[0];
    return { action: chosen, reason: `Initiate: ${describe(state, chosen)}` };
  }

  const step =
    actions.find((a) => a.kind === "beginStep") ?? actions.find((a) => a.kind === "endTurn");
  return step ? { action: step, reason: `Initiate: ${describe(state, step)}` } : null;
}

function guardian(state: TrialsMatchState): TrialsDecision | null {
  const actions = enumerateActions(state);
  if (actions.length === 0) return null;
  const seatId = state.activeSeatId;

  let best: { action: TrialsAction; score: number } | null = null;
  for (const action of actions) {
    const next = settle(state, action);
    let score = evaluate(next, seatId);

    if (action.kind === "endTurn") {
      // Passing early is only good when nothing better exists.
      score -= 1.5;
      score -= incomingThreat(next, seatId) * 0.25;
    }
    if (action.kind === "beginStep") score -= 0.5;
    if (action.kind === "playCard") {
      const card = definitionOf(state, action.instanceId);
      // Energy curve: spending most of the pool on one card is only worth it for value.
      score += card.cost * 0.15;
    }
    if (!best || score > best.score) best = { action, score };
  }
  if (!best) return null;
  return {
    action: best.action,
    reason: `Guardian: ${describe(state, best.action)} Board score ${best.score.toFixed(1)}.`,
  };
}

const CHAMPION_NODE_BUDGET = 400;
const CHAMPION_MAX_DEPTH = 5;
const CHAMPION_BREADTH = 6;

function champion(state: TrialsMatchState): TrialsDecision | null {
  const seatId = state.activeSeatId;
  const root = enumerateActions(state);
  if (root.length === 0) return null;

  let nodes = 0;

  const search = (current: TrialsMatchState, depth: number): number => {
    if (current.result || depth >= CHAMPION_MAX_DEPTH || nodes >= CHAMPION_NODE_BUDGET) {
      return evaluate(current, seatId) - incomingThreat(current, seatId) * 0.35;
    }
    if (current.activeSeatId !== seatId || current.handoffPending) {
      // The turn has passed: value the position the opponent inherits.
      return evaluate(current, seatId) - incomingThreat(current, seatId) * 0.35;
    }
    const options = enumerateActions(current)
      .map((action) => ({ action, next: settle(current, action) }))
      .sort((a, b) => evaluate(b.next, seatId) - evaluate(a.next, seatId))
      .slice(0, CHAMPION_BREADTH);
    if (options.length === 0) return evaluate(current, seatId);

    let bestScore = -Infinity;
    for (const option of options) {
      nodes += 1;
      if (nodes > CHAMPION_NODE_BUDGET) break;
      bestScore = Math.max(bestScore, search(option.next, depth + 1));
    }
    return bestScore === -Infinity ? evaluate(current, seatId) : bestScore;
  };

  let best: { action: TrialsAction; score: number } | null = null;
  for (const action of root) {
    const next = settle(state, action);
    const score = search(next, 1);
    if (!best || score > best.score) best = { action, score };
  }
  if (!best) return null;
  return {
    action: best.action,
    reason: `Champion: ${describe(state, best.action)} Sequence score ${best.score.toFixed(1)} over ${nodes} evaluated positions.`,
  };
}

/**
 * One action for the computer-controlled seat, or null when it has nothing to do.
 * Prompts opened by the computer's own cards are answered by the same policy.
 */
export function chooseTrialsAction(
  state: TrialsMatchState,
  difficulty: TrialsDifficulty,
): TrialsDecision | null {
  if (state.result) return null;
  const seatId = state.activeSeatId;
  if (state.players[seatId].controller !== "ai") return null;

  if (state.prompt) return decidePrompt(state, seatId);
  if (state.handoffPending) return null;

  const decision =
    difficulty === "initiate"
      ? initiate(state)
      : difficulty === "guardian"
        ? guardian(state)
        : champion(state);

  if (!decision) return null;
  // Final guarantee: never hand the engine an action it would reject.
  return checkTrialsAction(state, decision.action).legal ? decision : null;
}
