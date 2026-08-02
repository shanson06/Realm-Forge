/**
 * Draft mutations. Every rules change to a MatchState goes through one of these
 * helpers so that logging, animation cues, death checks and win/loss checks are
 * applied consistently. Pure functions over a cloned draft — no React, no DOM.
 */
import { requireCard } from "@/game-data/load";
import { getEffect } from "./effects";
import { seededShuffle } from "./rng";
import {
  HOLLOW,
  OATHGUARD,
  TARGET_BOSS,
  TARGET_HOLLOW_CRYSTALS,
  TARGET_HOLLOW_GATE,
  TARGET_OATHGUARD_CRYSTALS,
  TARGET_OATHGUARD_GATE,
  type AnimationCue,
  type ActiveModifier,
  type MatchDraft,
  type SideId,
} from "./types";

/** Adds a temporary rule to state so the HUD can render it. Never stored in UI code. */
export function addModifier(draft: MatchDraft, modifier: ActiveModifier): void {
  draft.modifiers = [...draft.modifiers.filter((m) => m.id !== modifier.id), modifier];
}

export function removeModifier(draft: MatchDraft, id: string): void {
  draft.modifiers = draft.modifiers.filter((m) => m.id !== id);
}

export function findModifier(draft: MatchDraft, kind: ActiveModifier["kind"], owner: SideId) {
  return draft.modifiers.find((m) => m.kind === kind && m.owner === owner);
}

/**
 * Spends any active damage-prevention modifier belonging to `side`.
 * Returns the damage that still gets through.
 */
function applyPrevention(draft: MatchDraft, side: SideId, amount: number): number {
  let remaining = amount;
  for (const modifier of [...draft.modifiers]) {
    if (remaining <= 0) break;
    if (modifier.kind !== "damage-prevention" || modifier.owner !== side) continue;
    const absorbed = Math.min(modifier.amount, remaining);
    remaining -= absorbed;
    const left = modifier.amount - absorbed;
    log(draft, `${modifier.source} prevents ${absorbed} damage.`, { playerId: side });
    if (left <= 0) removeModifier(draft, modifier.id);
    else addModifier(draft, { ...modifier, amount: left });
  }
  return remaining;
}

export function log(
  draft: MatchDraft,
  summary: string,
  options: { playerId?: SideId | null; detail?: string; undoSafe?: boolean } = {},
): void {
  draft.log.push({
    sequence: draft.log.length + 1,
    round: draft.round,
    playerId: options.playerId ?? null,
    summary,
    detail: options.detail,
    undoSafe: options.undoSafe ?? false,
  });
}

export function cue(draft: MatchDraft, animation: AnimationCue, subjectId?: string): void {
  draft.animations.push({ id: draft.animations.length + 1, cue: animation, subjectId });
}

export function shuffleInto(draft: MatchDraft, ids: string[]): string[] {
  const { items, cursor } = seededShuffle(ids, draft.rngSeed, draft.rngCursor);
  draft.rngCursor = cursor;
  return items;
}

/** Draws one card. Empty deck: reshuffle discard and destroy one Oathguard crystal (rulebook §15). */
export function drawCard(
  draft: MatchDraft,
  side: SideId,
  options: { extra?: boolean } = {},
): string | null {
  if (options.extra) {
    const block = findModifier(draft, "suppress-extra-draw", HOLLOW);
    if (block) {
      log(draft, `${block.source} cancels an extra card draw.`, { playerId: side });
      removeModifier(draft, block.id);
      return null;
    }
  }
  const p = draft.players[side];
  if (p.deck.length === 0) {
    if (p.discard.length === 0) return null;
    p.deck = shuffleInto(draft, [...p.discard]);
    p.discard = [];
    if (side === OATHGUARD) {
      log(draft, "Oathguard deck reshuffled — one crystal destroyed.", { playerId: side });
      damageCrystals(draft, OATHGUARD, 1);
    } else {
      draft.players[HOLLOW].globalThreat += 1;
      log(
        draft,
        `Encounter deck reshuffled — Global Threat is now ${draft.players[HOLLOW].globalThreat}.`,
      );
    }
    if (draft.result) return null;
  }
  const id = p.deck.shift();
  if (!id) return null;
  p.hand.push(id);
  draft.board.instances[id].zone = "hand";
  cue(draft, "draw", id);
  return id;
}

export function discardFromHand(draft: MatchDraft, side: SideId, instanceId: string): void {
  const p = draft.players[side];
  const index = p.hand.indexOf(instanceId);
  if (index === -1) return;
  p.hand.splice(index, 1);
  p.discard.push(instanceId);
  draft.board.instances[instanceId].zone = "discard";
}

export function moveToDiscard(draft: MatchDraft, instanceId: string): void {
  const inst = draft.board.instances[instanceId];
  if (!inst) return;
  const p = draft.players[inst.ownerId as SideId];
  if (inst.zone === "unitSlot" && inst.slotIndex !== null) p.unitSlots[inst.slotIndex] = null;
  if (inst.zone === "supportSlot") p.supportSlot = null;
  inst.zone = "discard";
  inst.slotIndex = null;
  inst.damage = 0;
  inst.exhausted = false;
  inst.temporaryAtk = 0;
  inst.nextAttackAtk = 0;
  inst.grantedKeywords = [];
  inst.flags = {};
  p.discard.push(instanceId);
}

/** Applies damage to a unit and defeats it when damage >= DEF. Returns true if defeated. */
export function damageUnit(draft: MatchDraft, instanceId: string, amount: number): boolean {
  const inst = draft.board.instances[instanceId];
  if (!inst || inst.zone !== "unitSlot" || amount <= 0) return false;
  const card0 = requireCard(draft.mode, inst.definitionId);
  const side = inst.ownerId as SideId;
  let incoming = amount;

  // Shield Matrix: reduce damage dealt to this unit by 1 each time it is hit.
  const keywords = [...card0.keywords, ...inst.grantedKeywords];
  if (keywords.includes("Shield Matrix")) {
    incoming = Math.max(0, incoming - 1);
    log(draft, `${card0.name}'s Shield Matrix absorbs 1 damage.`, { playerId: side });
  }

  incoming = applyPrevention(draft, side, incoming);
  if (incoming <= 0) return false;

  if (side === OATHGUARD) draft.stats.damageTaken += incoming;
  else draft.stats.damageDealt += incoming;

  inst.damage += incoming;
  cue(draft, "damage", instanceId);
  const card = requireCard(draft.mode, inst.definitionId);
  const def = card.def ?? 0;
  if (inst.damage >= def) {
    log(draft, `${card.name} is defeated.`, { playerId: inst.ownerId as SideId });
    if (side === OATHGUARD) draft.stats.oathguardUnitsLost += 1;
    else draft.stats.enemyUnitsDefeated += 1;
    fireEcho(draft, instanceId);
    moveToDiscard(draft, instanceId);
    return true;
  }
  log(draft, `${card.name} takes ${incoming} damage (${inst.damage}/${def}).`, {
    playerId: inst.ownerId as SideId,
  });
  fireOnHit(draft, instanceId);
  return false;
}

/** onHit: resolves when a unit takes damage and survives. */
export function fireOnHit(draft: MatchDraft, instanceId: string): void {
  const inst = draft.board.instances[instanceId];
  if (!inst) return;
  const effect = getEffect(draft.mode, inst.definitionId);
  if (!effect?.onHit) return;
  effect.onHit(draft, {
    selfId: instanceId,
    controllerId: inst.ownerId as SideId,
    targetIds: [],
  });
}

/** Echo: resolves after this card is defeated, before it reaches the discard pile. */
export function fireEcho(draft: MatchDraft, instanceId: string): void {
  const inst = draft.board.instances[instanceId];
  if (!inst) return;
  const effect = getEffect(draft.mode, inst.definitionId);
  if (effect?.trigger !== "echo" || !effect.handler) return;
  effect.handler(draft, {
    selfId: instanceId,
    controllerId: inst.ownerId as SideId,
    targetIds: [],
  });
}

/** Ward damage. Clamps at 0 and never carries into crystals. */
export function damageGate(draft: MatchDraft, side: SideId, amount: number): void {
  const p = draft.players[side];
  if (amount <= 0 || p.gateWard <= 0) return;
  const incoming = applyPrevention(draft, side, amount);
  if (incoming <= 0) return;
  const before = p.gateWard;
  p.gateWard = Math.max(0, p.gateWard - incoming);
  if (side === OATHGUARD) draft.stats.damageTaken += before - p.gateWard;
  else draft.stats.damageDealt += before - p.gateWard;
  log(
    draft,
    `${sideLabel(side)} Gate takes ${before - p.gateWard} Ward damage (${p.gateWard}/${p.gateMaxWard}).`,
  );
  if (p.gateWard === 0) {
    cue(draft, "gate-break", side);
    log(draft, `${sideLabel(side)} Gate is broken.`);
  }
}

export function restoreWard(draft: MatchDraft, side: SideId, amount: number): void {
  const p = draft.players[side];
  if (amount <= 0) return;
  const before = p.gateWard;
  p.gateWard = Math.min(p.gateMaxWard, p.gateWard + amount);
  if (p.gateWard !== before) {
    if (side === OATHGUARD) draft.stats.wardRestored += p.gateWard - before;
    cue(draft, "restore", side);
    log(
      draft,
      `${sideLabel(side)} Gate restores ${p.gateWard - before} Ward (${p.gateWard}/${p.gateMaxWard}).`,
    );
  }
}

/** Each point of crystal damage destroys one crystal (rulebook §11). */
export function damageCrystals(draft: MatchDraft, side: SideId, amount: number): void {
  const p = draft.players[side];
  if (amount <= 0 || p.crystalSpinner <= 0) return;
  p.crystalSpinner = Math.max(0, p.crystalSpinner - amount);
  cue(draft, "crystal-damage", side);
  if (side === HOLLOW) draft.stats.damageDealt += amount;
  log(draft, `${sideLabel(side)} Crystal Spinner falls to ${p.crystalSpinner}.`);
  checkStageProgress(draft);
}

export function damageBoss(draft: MatchDraft, amount: number): void {
  const boss = draft.board.boss;
  if (!boss || !boss.revealed || amount <= 0) return;
  boss.damage += amount;
  draft.stats.damageDealt += amount;
  cue(draft, "damage", TARGET_BOSS);
  log(
    draft,
    `The Quick Boss takes ${amount} damage (${Math.min(boss.damage, boss.health)}/${boss.health}).`,
  );
  if (!boss.enraged && boss.health - boss.damage <= boss.enrageThreshold) {
    boss.enraged = true;
    log(draft, "The Quick Boss is Enraged.");
  }
  checkStageProgress(draft);
}

export function sideLabel(side: SideId): string {
  return side === OATHGUARD ? "Oathguard" : "Hollow Crown";
}

/** Boss reveal, victory and defeat checks. Called after every state-changing mutation. */
export function checkStageProgress(draft: MatchDraft): void {
  if (draft.result) return;

  const oath = draft.players[OATHGUARD];
  const hollow = draft.players[HOLLOW];
  const boss = draft.board.boss;

  if (boss && !boss.revealed && hollow.gateWard <= 0 && hollow.crystalSpinner <= 0) {
    boss.revealed = true;
    cue(draft, "boss-reveal", TARGET_BOSS);
    const bossCard = requireCard(draft.mode, boss.definitionId);
    log(draft, `The Hollow Crown Spinner reaches zero. ${bossCard.name} is revealed.`);
    revealBoss(draft);
  }

  if (boss && boss.revealed && boss.damage >= boss.health) {
    cue(draft, "victory");
    const bossCard = requireCard(draft.mode, boss.definitionId);
    draft.result = {
      outcome: "oathguard-victory",
      winningPlayerIds: [OATHGUARD],
      reason: `${bossCard.name} is defeated. The Hollow Crown's grip on this realm breaks.`,
      rounds: draft.round,
      endedAt: new Date().toISOString(),
    };
    return;
  }

  if (oath.crystalSpinner <= 0) {
    cue(draft, "defeat");
    draft.result = {
      outcome: "hollow-crown-victory",
      winningPlayerIds: [HOLLOW],
      reason: "The Oathguard Crystal Spinner reached zero.",
      rounds: draft.round,
      endedAt: new Date().toISOString(),
    };
  }
}

/**
 * Boss Reveal abilities, taken verbatim from the four source boss cards.
 * Selected by stable boss ID — never parsed from English rules text.
 */
export function revealBoss(draft: MatchDraft): void {
  const boss = draft.board.boss;
  if (!boss) return;
  const card = requireCard(draft.mode, boss.definitionId);

  switch (boss.definitionId) {
    case "RF-HC-BOSS-001":
      draft.turnFlags.damagedOathguardLoseAegis = true;
      log(draft, "Veyr's Reveal: until end of round, damaged Oathguard units lose Aegis.");
      break;
    case "RF-HC-BOSS-002": {
      for (const inst of Object.values(draft.board.instances)) {
        if (inst.ownerId === OATHGUARD) {
          inst.temporaryAtk = 0;
          inst.roundAtk = Math.min(0, inst.roundAtk);
          inst.nextAttackAtk = 0;
        }
      }
      for (const seatId of draft.seatOrder) draft.seats[seatId].energyDrainNextCharge += 1;
      log(
        draft,
        "Malreth's Reveal: temporary ATK bonuses are removed and every Order loses 1 Energy next turn.",
      );
      break;
    }
    case "RF-HC-BOSS-003":
      if (draft.players[OATHGUARD].gateWard <= 0) {
        log(draft, "Vorak's Reveal: two Oathguard crystals shatter.");
        damageCrystals(draft, OATHGUARD, 2);
      } else {
        log(draft, "Vorak's Reveal: Fracture 4 against the Oathguard Gate.");
        damageGate(draft, OATHGUARD, 4);
      }
      break;
    case "RF-HC-BOSS-004":
      draft.players[HOLLOW].globalThreat += 1;
      addModifier(draft, {
        id: "pending-extra-reveal",
        label: "Extra encounter card",
        description: "The Hollow Crown Awakened reveals one additional encounter card.",
        source: card.name,
        owner: HOLLOW,
        duration: "match",
        amount: 1,
        kind: "note",
      });
      log(
        draft,
        `The Hollow Crown Awakened raises Global Threat to ${draft.players[HOLLOW].globalThreat}.`,
      );
      break;
    default:
      break;
  }

  addModifier(draft, {
    id: `boss-active:${boss.definitionId}`,
    label: `${card.name} is active`,
    description: `Boss Health ${boss.health}. Enrages at ${boss.enrageThreshold} Health.`,
    source: card.name,
    owner: HOLLOW,
    duration: "match",
    amount: 0,
    kind: "boss-modifier",
  });
}

/** Resolves an attack from `attackerId` onto a target id (unit instance or special target). */
export function resolveAttackDamage(draft: MatchDraft, amount: number, targetId: string): void {
  switch (targetId) {
    case TARGET_HOLLOW_GATE:
      damageGate(draft, HOLLOW, amount);
      return;
    case TARGET_OATHGUARD_GATE:
      damageGate(draft, OATHGUARD, amount);
      return;
    case TARGET_HOLLOW_CRYSTALS:
      damageCrystals(draft, HOLLOW, amount);
      return;
    case TARGET_OATHGUARD_CRYSTALS:
      damageCrystals(draft, OATHGUARD, amount);
      return;
    case TARGET_BOSS:
      damageBoss(draft, amount);
      return;
    default:
      damageUnit(draft, targetId, amount);
  }
}
