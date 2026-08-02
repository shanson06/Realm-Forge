/**
 * Read-only queries over MatchState. Pure, no mutation, no React.
 * Everything the UI or the automation needs to *ask* lives here.
 */
import { getCard, requireCard } from "@/game-data/load";
import { getEffect } from "./effects";
import { ONE_SHOT_TYPES, SUPPORT_TYPES, UNIT_TYPES } from "@/game-data/schema";
import type { CardDefinition, Keyword } from "@/game-data/schema";
import {
  HOLLOW,
  OATHGUARD,
  type CardInstance,
  type MatchState,
  type PlayerState,
  type SideId,
} from "./types";

export function player(state: MatchState, side: SideId): PlayerState {
  return state.players[side];
}

export function opposing(side: SideId): SideId {
  return side === OATHGUARD ? HOLLOW : OATHGUARD;
}

export function instance(state: MatchState, instanceId: string): CardInstance | undefined {
  return state.board.instances[instanceId];
}

export function definitionOf(state: MatchState, instanceId: string): CardDefinition {
  const inst = state.board.instances[instanceId];
  if (!inst) throw new Error(`Unknown card instance "${instanceId}".`);
  return requireCard(state.mode, inst.definitionId);
}

export function tryDefinition(state: MatchState, instanceId: string): CardDefinition | undefined {
  const inst = state.board.instances[instanceId];
  return inst ? getCard(state.mode, inst.definitionId) : undefined;
}

export function keywordsOf(state: MatchState, instanceId: string): readonly Keyword[] {
  const inst = state.board.instances[instanceId];
  if (!inst) return [];
  const def = definitionOf(state, instanceId);
  return [...def.keywords, ...inst.grantedKeywords];
}

export function hasKeyword(state: MatchState, instanceId: string, keyword: Keyword): boolean {
  if (!keywordsOf(state, instanceId).includes(keyword)) return false;
  // Veyr's reveal effect: damaged Oathguard units lose Aegis until end of round.
  if (keyword === "Aegis" && state.turnFlags.damagedOathguardLoseAegis) {
    const inst = state.board.instances[instanceId];
    if (inst && inst.ownerId === OATHGUARD && inst.damage > 0) return false;
  }
  return true;
}

/**
 * Printed ATK plus turn, round and next-attack bonuses, Global Threat for enemies,
 * the revealed boss's ally bonus, and every registered static ATK aura in play.
 */
export function attackOf(state: MatchState, instanceId: string): number {
  const inst = state.board.instances[instanceId];
  if (!inst) return 0;
  const def = definitionOf(state, instanceId);
  const isEnemy = inst.ownerId === HOLLOW;
  const threat = isEnemy ? state.players[HOLLOW].globalThreat : 0;
  const boss = state.board.boss;
  const bossAura = isEnemy && boss?.revealed ? boss.allyAtkBonus : 0;
  return Math.max(
    0,
    (def.atk ?? 0) +
      inst.temporaryAtk +
      inst.roundAtk +
      inst.nextAttackAtk +
      threat +
      bossAura +
      atkAuraTotal(state, instanceId),
  );
}

/** Cards currently in play on either side (unit spaces and Support spaces). */
export function cardsInPlay(state: MatchState): CardInstance[] {
  return Object.values(state.board.instances).filter(
    (i) => i.zone === "unitSlot" || i.zone === "supportSlot",
  );
}

function atkAuraTotal(state: MatchState, instanceId: string): number {
  let total = 0;
  for (const source of cardsInPlay(state)) {
    const aura = getEffect(state.mode, source.definitionId)?.atkAura;
    if (aura) total += aura(state, instanceId, source.instanceId);
  }
  return total;
}

/** Extra ATK this attacker adds when its target is a Gate. */
export function gateAttackBonus(state: MatchState, instanceId: string): number {
  const inst = state.board.instances[instanceId];
  if (!inst) return 0;
  let bonus = getEffect(state.mode, inst.definitionId)?.gateAttackBonus ?? 0;
  for (const source of cardsInPlay(state)) {
    if (source.ownerId !== inst.ownerId) continue;
    bonus += getEffect(state.mode, source.definitionId)?.gateAttackAura ?? 0;
  }
  return bonus;
}

export function remainingDef(state: MatchState, instanceId: string): number {
  const inst = state.board.instances[instanceId];
  if (!inst) return 0;
  const def = definitionOf(state, instanceId);
  return Math.max(0, (def.def ?? 0) - inst.damage);
}

export function unitsOf(state: MatchState, side: SideId): CardInstance[] {
  return state.players[side].unitSlots
    .map((id) => (id ? state.board.instances[id] : null))
    .filter((i): i is CardInstance => i !== null && i !== undefined);
}

export function readyUnitsOf(state: MatchState, side: SideId): CardInstance[] {
  return unitsOf(state, side).filter((u) => !u.exhausted);
}

export function firstEmptyUnitSlot(state: MatchState, side: SideId): number | null {
  const index = state.players[side].unitSlots.findIndex((s) => s === null);
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

export function gateBroken(state: MatchState, side: SideId): boolean {
  return state.players[side].gateWard <= 0;
}

export function bossActive(state: MatchState): boolean {
  return state.board.boss !== null && state.board.boss.revealed;
}

/**
 * Standard cooperative target priority (rulebook §10), applied to a candidate pool:
 * eligible Aegis unit with lowest remaining DEF, then other unit with lowest remaining DEF.
 * Ties: lowest printed DEF, then lowest ATK, then leftmost.
 */
export function pickByTargetPriority(
  state: MatchState,
  candidates: readonly CardInstance[],
  options: { ignoreAegis?: boolean } = {},
): CardInstance | null {
  if (candidates.length === 0) return null;
  const aegis = options.ignoreAegis
    ? []
    : candidates.filter((c) => hasKeyword(state, c.instanceId, "Aegis") && !c.exhausted);
  const pool = aegis.length > 0 ? aegis : candidates;
  return [...pool].sort((a, b) => compareLowestDefence(state, a, b))[0] ?? null;
}

export function compareLowestDefence(state: MatchState, a: CardInstance, b: CardInstance): number {
  const byRemaining = remainingDef(state, a.instanceId) - remainingDef(state, b.instanceId);
  if (byRemaining !== 0) return byRemaining;
  const defA = definitionOf(state, a.instanceId);
  const defB = definitionOf(state, b.instanceId);
  const byPrinted = (defA.def ?? 0) - (defB.def ?? 0);
  if (byPrinted !== 0) return byPrinted;
  const byAtk = attackOf(state, a.instanceId) - attackOf(state, b.instanceId);
  if (byAtk !== 0) return byAtk;
  return (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
}

/** Enemy attack order (rulebook §10): highest ATK, then highest Threat, then lowest remaining DEF, then leftmost. */
export function enemyAttackOrder(state: MatchState): CardInstance[] {
  return [...unitsOf(state, HOLLOW)].sort((a, b) => {
    const byAtk = attackOf(state, b.instanceId) - attackOf(state, a.instanceId);
    if (byAtk !== 0) return byAtk;
    const threatA = definitionOf(state, a.instanceId).cost;
    const threatB = definitionOf(state, b.instanceId).cost;
    if (threatB !== threatA) return threatB - threatA;
    const byDef = remainingDef(state, a.instanceId) - remainingDef(state, b.instanceId);
    if (byDef !== 0) return byDef;
    return (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
  });
}
