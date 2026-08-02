/** Read-only queries over a competitive match. Pure, no mutation, no React. */
import { requireCard } from "@/game-data/load";
import {
  GameMode,
  ONE_SHOT_TYPES,
  SUPPORT_TYPES,
  UNIT_TYPES,
  type CardDefinition,
  type Keyword,
} from "@/game-data/schema";
import { getTrialsEffect } from "./effects";
import {
  otherSeat,
  type CardInstance,
  type TrialsMatchState,
  type TrialsPlayerState,
  type TrialsSeatId,
} from "./types";

export function seat(state: TrialsMatchState, seatId: TrialsSeatId): TrialsPlayerState {
  return state.players[seatId];
}

export function opponentOf(state: TrialsMatchState, seatId: TrialsSeatId): TrialsPlayerState {
  return state.players[otherSeat(seatId)];
}

export function definitionOf(state: TrialsMatchState, instanceId: string): CardDefinition {
  const inst = state.instances[instanceId];
  if (!inst) throw new Error(`Unknown card instance "${instanceId}".`);
  return requireCard(GameMode.Competitive, inst.definitionId);
}

export function tryDefinition(state: TrialsMatchState, instanceId: string): CardDefinition | null {
  const inst = state.instances[instanceId];
  return inst ? requireCard(GameMode.Competitive, inst.definitionId) : null;
}

export function keywordsOf(state: TrialsMatchState, instanceId: string): readonly Keyword[] {
  const inst = state.instances[instanceId];
  if (!inst) return [];
  return [...definitionOf(state, instanceId).keywords, ...inst.grantedKeywords];
}

export function hasKeyword(
  state: TrialsMatchState,
  instanceId: string,
  keyword: Keyword,
): boolean {
  return keywordsOf(state, instanceId).includes(keyword);
}

export function cardsInPlay(state: TrialsMatchState): CardInstance[] {
  return Object.values(state.instances).filter(
    (i) => i.zone === "unitSlot" || i.zone === "supportSlot",
  );
}

/** Printed ATK plus turn bonuses, next-attack bonuses and every registered ATK aura. */
export function attackOf(state: TrialsMatchState, instanceId: string): number {
  const inst = state.instances[instanceId];
  if (!inst) return 0;
  const def = definitionOf(state, instanceId);
  let auras = 0;
  for (const source of cardsInPlay(state)) {
    const aura = getTrialsEffect(source.definitionId)?.atkAura;
    if (aura) auras += aura(state, instanceId, source.instanceId);
  }
  return Math.max(
    0,
    (def.atk ?? 0) + inst.temporaryAtk + inst.roundAtk + inst.nextAttackAtk + auras,
  );
}

/** Extra ATK this attacker adds against a specific target, from its own card rule. */
export function attackBonusAgainst(
  state: TrialsMatchState,
  attackerId: string,
  targetId: string,
): number {
  const inst = state.instances[attackerId];
  if (!inst) return 0;
  return getTrialsEffect(inst.definitionId)?.attackBonus?.(state, attackerId, targetId) ?? 0;
}

export function remainingDef(state: TrialsMatchState, instanceId: string): number {
  const inst = state.instances[instanceId];
  if (!inst) return 0;
  return Math.max(0, (definitionOf(state, instanceId).def ?? 0) - inst.damage);
}

export function unitsOf(state: TrialsMatchState, seatId: TrialsSeatId): CardInstance[] {
  return state.players[seatId].unitSlots
    .map((id) => (id ? state.instances[id] : null))
    .filter((i): i is CardInstance => i != null);
}

export function readyUnitsOf(state: TrialsMatchState, seatId: TrialsSeatId): CardInstance[] {
  return unitsOf(state, seatId).filter((u) => !u.exhausted);
}

export function firstEmptyUnitSlot(state: TrialsMatchState, seatId: TrialsSeatId): number | null {
  const index = state.players[seatId].unitSlots.findIndex((s) => s === null);
  return index === -1 ? null : index;
}

export function isUnitCard(card: CardDefinition): boolean {
  return UNIT_TYPES.includes(card.type);
}
export function isSupportCard(card: CardDefinition): boolean {
  return SUPPORT_TYPES.includes(card.type);
}
export function isOneShotCard(card: CardDefinition): boolean {
  return ONE_SHOT_TYPES.includes(card.type);
}

export function gateBroken(state: TrialsMatchState, seatId: TrialsSeatId): boolean {
  return state.players[seatId].gateWard <= 0;
}

export function availableEnergy(player: TrialsPlayerState): number {
  return player.energy.faceUpCrystals + player.energy.temporaryCrystals;
}

/** Owner of a card instance as a competitive seat id. */
export function ownerSeat(inst: CardInstance): TrialsSeatId {
  return inst.ownerId as TrialsSeatId;
}

/** A unit is summoning sick unless it has Surge or entered before this turn. */
export function canActThisTurn(state: TrialsMatchState, instanceId: string): boolean {
  const inst = state.instances[instanceId];
  if (!inst) return false;
  return inst.enteredOnRound !== state.turnSequence || hasKeyword(state, instanceId, "Surge");
}