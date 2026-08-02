/**
 * Draft mutations for competitive play. Every rules change goes through one of
 * these helpers so logging, defeat checks and win checks stay consistent.
 * Pure functions over a cloned draft — no React, no DOM.
 */
import { requireCard } from "@/game-data/load";
import { GameMode } from "@/game-data/schema";
import { seededShuffle } from "../rng";
import { getTrialsEffect } from "./effects";
import {
  crystalsTarget,
  gateTarget,
  otherSeat,
  type TrialsDraft,
  type TrialsModifier,
  type TrialsSeatId,
} from "./types";

export function log(
  draft: TrialsDraft,
  summary: string,
  options: { seatId?: TrialsSeatId | null; detail?: string; undoSafe?: boolean } = {},
): void {
  draft.log.push({
    sequence: draft.log.length + 1,
    round: draft.round,
    playerId: options.seatId ?? null,
    summary,
    detail: options.detail,
    undoSafe: options.undoSafe ?? false,
  });
}

export function nameOf(draft: TrialsDraft, instanceId: string): string {
  const inst = draft.instances[instanceId];
  return inst ? requireCard(GameMode.Competitive, inst.definitionId).name : "A card";
}

export function seatLabel(draft: TrialsDraft, seatId: TrialsSeatId): string {
  return draft.players[seatId].displayName;
}

export function addModifier(draft: TrialsDraft, modifier: TrialsModifier): void {
  draft.modifiers = [...draft.modifiers.filter((m) => m.id !== modifier.id), modifier];
}

export function removeModifier(draft: TrialsDraft, id: string): void {
  draft.modifiers = draft.modifiers.filter((m) => m.id !== id);
}

/** Spends damage-prevention modifiers owned by `seatId`. Returns damage that gets through. */
function applyPrevention(draft: TrialsDraft, seatId: TrialsSeatId, amount: number): number {
  let remaining = amount;
  for (const modifier of [...draft.modifiers]) {
    if (remaining <= 0) break;
    if (modifier.kind !== "damage-prevention" || modifier.owner !== seatId) continue;
    const absorbed = Math.min(modifier.amount, remaining);
    remaining -= absorbed;
    const left = modifier.amount - absorbed;
    log(draft, `${modifier.source} prevents ${absorbed} damage.`, { seatId });
    if (left <= 0) removeModifier(draft, modifier.id);
    else addModifier(draft, { ...modifier, amount: left });
  }
  return remaining;
}

export function shuffleInto(draft: TrialsDraft, ids: string[]): string[] {
  const { items, cursor } = seededShuffle(ids, draft.rngSeed, draft.rngCursor);
  draft.rngCursor = cursor;
  return items;
}

/**
 * Draws one card. Drawing from an empty deck loses the match immediately
 * (Oathguard Trials QuickPlay deck-out rule) — the competitive deck is never
 * reshuffled from the discard pile.
 */
export function drawCard(draft: TrialsDraft, seatId: TrialsSeatId): string | null {
  const p = draft.players[seatId];
  if (p.deck.length === 0) {
    loseByDeckOut(draft, seatId);
    return null;
  }
  const id = p.deck.shift()!;
  p.hand.push(id);
  draft.instances[id].zone = "hand";
  return id;
}

export function loseByDeckOut(draft: TrialsDraft, seatId: TrialsSeatId): void {
  if (draft.result) return;
  const winner = otherSeat(seatId);
  draft.result = {
    outcome: "player-victory",
    winningPlayerIds: [winner],
    reason: `${draft.players[seatId].displayName} must draw from an empty deck. ${draft.players[winner].displayName} wins.`,
    rounds: draft.round,
    endedAt: new Date().toISOString(),
  };
  log(draft, draft.result.reason);
}

export function discardFromHand(
  draft: TrialsDraft,
  seatId: TrialsSeatId,
  instanceId: string,
): void {
  const p = draft.players[seatId];
  const index = p.hand.indexOf(instanceId);
  if (index === -1) return;
  p.hand.splice(index, 1);
  p.discard.push(instanceId);
  draft.instances[instanceId].zone = "discard";
  log(draft, `${p.displayName} discards a card.`, { seatId });
}

export function moveToDiscard(draft: TrialsDraft, instanceId: string): void {
  const inst = draft.instances[instanceId];
  if (!inst) return;
  const p = draft.players[inst.ownerId as TrialsSeatId];
  if (inst.zone === "unitSlot" && inst.slotIndex !== null) p.unitSlots[inst.slotIndex] = null;
  if (inst.zone === "supportSlot") p.supportSlot = null;
  inst.zone = "discard";
  inst.slotIndex = null;
  inst.damage = 0;
  inst.exhausted = false;
  inst.temporaryAtk = 0;
  inst.roundAtk = 0;
  inst.nextAttackAtk = 0;
  inst.grantedKeywords = [];
  inst.flags = {};
  p.discard.push(instanceId);
}

/** Damage a unit. Damage stays on the unit; it is discarded when damage >= DEF. */
export function damageUnit(draft: TrialsDraft, instanceId: string, amount: number): boolean {
  const inst = draft.instances[instanceId];
  if (!inst || inst.zone !== "unitSlot" || amount <= 0) return false;
  const card = requireCard(GameMode.Competitive, inst.definitionId);
  const seatId = inst.ownerId as TrialsSeatId;
  let incoming = amount;

  const keywords = [...card.keywords, ...inst.grantedKeywords];
  if (keywords.includes("Shield Matrix")) {
    incoming = Math.max(0, incoming - 1);
    log(draft, `${card.name}'s Shield Matrix absorbs 1 damage.`, { seatId });
  }

  incoming = applyPrevention(draft, seatId, incoming);
  if (incoming <= 0) return false;

  inst.damage += incoming;
  const def = card.def ?? 0;
  if (inst.damage >= def) {
    log(draft, `${card.name} is withdrawn.`, { seatId });
    draft.stats.unitsDefeated += 1;
    moveToDiscard(draft, instanceId);
    return true;
  }
  log(draft, `${card.name} takes ${incoming} damage (${inst.damage}/${def}).`, { seatId });
  getTrialsEffect(inst.definitionId)?.onHit?.(draft, instanceId);
  return false;
}

export function healUnit(draft: TrialsDraft, instanceId: string, amount: number): void {
  const inst = draft.instances[instanceId];
  if (!inst || amount <= 0) return;
  const before = inst.damage;
  inst.damage = Math.max(0, inst.damage - amount);
  if (inst.damage !== before) {
    log(draft, `${nameOf(draft, instanceId)} recovers ${before - inst.damage} damage.`, {
      seatId: inst.ownerId as TrialsSeatId,
    });
  }
}

/** Ward damage. Clamps at zero; excess never carries into crystals. */
export function damageGate(draft: TrialsDraft, seatId: TrialsSeatId, amount: number): void {
  const p = draft.players[seatId];
  if (amount <= 0 || p.gateWard <= 0) return;
  const incoming = applyPrevention(draft, seatId, amount);
  if (incoming <= 0) return;
  const before = p.gateWard;
  p.gateWard = Math.max(0, p.gateWard - incoming);
  log(
    draft,
    `${p.displayName}'s Gate takes ${before - p.gateWard} Ward damage (${p.gateWard}/${p.gateMaxWard}).`,
    { seatId },
  );
  if (p.gateWard === 0) log(draft, `${p.displayName}'s Gate is broken.`, { seatId });
}

export function restoreWard(draft: TrialsDraft, seatId: TrialsSeatId, amount: number): void {
  const p = draft.players[seatId];
  if (amount <= 0) return;
  const before = p.gateWard;
  p.gateWard = Math.min(p.gateMaxWard, p.gateWard + amount);
  if (p.gateWard !== before) {
    draft.stats.wardRestored += p.gateWard - before;
    log(
      draft,
      `${p.displayName}'s Gate restores ${p.gateWard - before} Ward (${p.gateWard}/${p.gateMaxWard}).`,
      { seatId },
    );
  }
}

/** Each point of crystal damage destroys one crystal. */
export function damageCrystals(draft: TrialsDraft, seatId: TrialsSeatId, amount: number): void {
  const p = draft.players[seatId];
  if (amount <= 0 || p.crystalSpinner <= 0) return;
  p.crystalSpinner = Math.max(0, p.crystalSpinner - amount);
  log(draft, `${p.displayName}'s Crystal Spinner falls to ${p.crystalSpinner}.`, { seatId });
  checkVictory(draft);
}

/** Applies attack or effect damage to any legal target id. */
export function resolveDamage(draft: TrialsDraft, targetId: string, amount: number): void {
  for (const seatId of ["p1", "p2"] as TrialsSeatId[]) {
    if (targetId === gateTarget(seatId)) return damageGate(draft, seatId, amount);
    if (targetId === crystalsTarget(seatId)) return damageCrystals(draft, seatId, amount);
  }
  damageUnit(draft, targetId, amount);
}

/** Victory check: the opposing Gate is broken and all six crystals are gone. */
export function checkVictory(draft: TrialsDraft): void {
  if (draft.result) return;
  for (const seatId of ["p1", "p2"] as TrialsSeatId[]) {
    const loser = draft.players[seatId];
    if (loser.gateWard <= 0 && loser.crystalSpinner <= 0) {
      const winner = otherSeat(seatId);
      draft.result = {
        outcome: "player-victory",
        winningPlayerIds: [winner],
        reason: `${draft.players[winner].displayName} broke the Gate and shattered all six crystals.`,
        rounds: draft.round,
        endedAt: new Date().toISOString(),
      };
      log(draft, draft.result.reason);
      return;
    }
  }
}