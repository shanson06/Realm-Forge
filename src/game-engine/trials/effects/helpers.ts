/** Shared helpers for competitive card effects. Pure draft mutations only. */
import { log } from "../mutations";
import { unitsOf } from "../queries";
import { otherSeat, type TrialsDraft, type TrialsSeatId } from "../types";

export function seatOf(draft: TrialsDraft, instanceId: string): TrialsSeatId {
  return draft.instances[instanceId].ownerId as TrialsSeatId;
}

export function effectId(selfId: string, key: string): string {
  return `${selfId}|${key}`;
}

export function parseEffectId(id: string): { selfId: string; key: string } {
  const [selfId, key] = id.split("|");
  return { selfId, key: key ?? "play" };
}

/** Opens a target-selection prompt owned by the card that created it. */
export function openSelect(
  draft: TrialsDraft,
  options: {
    selfId: string;
    seatId: TrialsSeatId;
    key: string;
    candidates: readonly string[];
    count: number;
    optional: boolean;
    description: string;
  },
): void {
  if (options.candidates.length === 0) return;
  draft.prompt = {
    kind: "selectTarget",
    effectId: effectId(options.selfId, options.key),
    seatId: options.seatId,
    sourceInstanceId: options.selfId,
    legalTargetIds: [...options.candidates],
    count: options.count,
    optional: options.optional,
    description: options.description,
  };
}

export function openDiscard(
  draft: TrialsDraft,
  options: { selfId: string; seatId: TrialsSeatId; key: string; description: string },
): void {
  const hand = draft.players[options.seatId].hand;
  if (hand.length === 0) return;
  draft.prompt = {
    kind: "discardFromHand",
    effectId: effectId(options.selfId, options.key),
    seatId: options.seatId,
    sourceInstanceId: options.selfId,
    legalTargetIds: [...hand],
    description: options.description,
  };
}

/**
 * Foresight X: look at the top X cards of your own deck and choose up to
 * `choose` of them to place on the bottom. Private to the seat that owns the deck.
 */
export function openForesight(
  draft: TrialsDraft,
  options: {
    selfId: string;
    seatId: TrialsSeatId;
    key: string;
    look: number;
    choose: number;
    description: string;
  },
): void {
  const deck = draft.players[options.seatId].deck;
  const revealed = deck.slice(0, options.look);
  if (revealed.length === 0) return;
  draft.prompt = {
    kind: "foresight",
    effectId: effectId(options.selfId, options.key),
    seatId: options.seatId,
    sourceInstanceId: options.selfId,
    revealedIds: revealed,
    style: "bottom",
    count: Math.min(options.choose, revealed.length),
    description: options.description,
  };
}

/** Moves the chosen revealed cards to the bottom of the seat's deck, in order. */
export function foresightBottom(
  draft: TrialsDraft,
  seatId: TrialsSeatId,
  chosenIds: readonly string[],
): void {
  if (chosenIds.length === 0) {
    log(draft, `${draft.players[seatId].displayName} keeps the top of their deck.`, { seatId });
    return;
  }
  const p = draft.players[seatId];
  p.deck = p.deck.filter((id) => !chosenIds.includes(id));
  chosenIds.forEach((id) => p.deck.push(id));
  log(
    draft,
    `${p.displayName} places ${chosenIds.length} card${chosenIds.length === 1 ? "" : "s"} on the bottom of their deck.`,
    { seatId },
  );
}

export function friendlyUnitIds(draft: TrialsDraft, seatId: TrialsSeatId): string[] {
  return unitsOf(draft, seatId).map((u) => u.instanceId);
}

export function enemyUnitIds(draft: TrialsDraft, seatId: TrialsSeatId): string[] {
  return unitsOf(draft, otherSeat(seatId)).map((u) => u.instanceId);
}

export function addTurnAtk(draft: TrialsDraft, instanceId: string, amount: number): void {
  const inst = draft.instances[instanceId];
  if (!inst) return;
  inst.temporaryAtk += amount;
  log(
    draft,
    `${draft.players[inst.ownerId as TrialsSeatId].displayName}'s unit gains +${amount} ATK this turn.`,
    {
      seatId: inst.ownerId as TrialsSeatId,
    },
  );
}

export function addNextAttackAtk(draft: TrialsDraft, instanceId: string, amount: number): void {
  const inst = draft.instances[instanceId];
  if (!inst) return;
  inst.nextAttackAtk += amount;
}
