/**
 * Hollow Crown automation (cooperative QuickPlay, solo).
 *
 * Order per rulebook §9/§10 and the QuickPlay brief:
 *   Reveal -> Resolve -> Attack (highest ATK first) -> Boss -> Resolve -> Ready.
 * No AI, no heuristics: the priority tables decide everything.
 */
import { requireCard } from "@/game-data/load";
import { UNIT_TYPES } from "@/game-data/schema";
import { getEffect } from "./effects";
import {
  checkStageProgress,
  cue,
  damageGate,
  damageCrystals,
  damageUnit,
  log,
  moveToDiscard,
  shuffleInto,
} from "./mutations";
import {
  attackOf,
  definitionOf,
  enemyAttackOrder,
  gateAttackBonus,
  hasKeyword,
  pickByTargetPriority,
  remainingDef,
  unitsOf,
} from "./queries";
import { HOLLOW, OATHGUARD, type CardInstance, type MatchDraft } from "./types";

export const VEYR_ID = "RF-HC-BOSS-001";

/**
 * Reveal one encounter card in solo, two with two or three players
 * (Cooperative QuickPlay rulebook §9).
 */
function revealCount(draft: MatchDraft): number {
  const base = draft.playerCount >= 2 ? 2 : 1;
  // The Hollow Crown Awakened's Reveal queues one extra encounter card.
  const pending = draft.modifiers.find((m) => m.id === "pending-extra-reveal");
  if (!pending) return base;
  draft.modifiers = draft.modifiers.filter((m) => m.id !== pending.id);
  return base + pending.amount;
}

function drawEncounter(draft: MatchDraft): string | null {
  const hollow = draft.players[HOLLOW];
  if (hollow.deck.length === 0) {
    if (hollow.discard.length === 0) return null;
    hollow.deck = shuffleInto(draft, [...hollow.discard]);
    hollow.discard = [];
    hollow.globalThreat += 1;
    log(draft, `Encounter deck reshuffled — Global Threat is now ${hollow.globalThreat}.`);
  }
  return hollow.deck.shift() ?? null;
}

function deployEnemy(draft: MatchDraft, instanceId: string): void {
  const hollow = draft.players[HOLLOW];
  let slot = hollow.unitSlots.indexOf(null);
  if (slot === -1) {
    // Board overflow: discard the enemy with the lowest ATK, then deploy.
    const weakest = [...unitsOf(draft, HOLLOW)].sort(
      (a, b) => attackOf(draft, a.instanceId) - attackOf(draft, b.instanceId),
    )[0];
    if (weakest) {
      log(draft, `${definitionOf(draft, weakest.instanceId).name} is discarded to make room.`, {
        playerId: HOLLOW,
      });
      moveToDiscard(draft, weakest.instanceId);
    }
    slot = hollow.unitSlots.indexOf(null);
  }
  if (slot === -1) return;
  hollow.unitSlots[slot] = instanceId;
  const inst = draft.board.instances[instanceId];
  inst.zone = "unitSlot";
  inst.slotIndex = slot;
  inst.enteredOnRound = draft.round;
  inst.exhausted = false;
  cue(draft, "play", instanceId);
}

function resolveEncounter(draft: MatchDraft, instanceId: string): void {
  const card = requireCard(draft.mode, draft.board.instances[instanceId].definitionId);
  log(draft, `Hollow Crown reveals ${card.name}.`, { playerId: HOLLOW, detail: card.rules_text });

  const effect = getEffect(draft.mode, card.id);

  if (UNIT_TYPES.includes(card.type)) {
    deployEnemy(draft, instanceId);
    effect?.handler?.(draft, { selfId: instanceId, controllerId: HOLLOW, targetIds: [] });
    return;
  }

  if (card.type === "Relic" || card.type === "Item") {
    const hollow = draft.players[HOLLOW];
    if (hollow.supportSlot) moveToDiscard(draft, hollow.supportSlot);
    hollow.supportSlot = instanceId;
    draft.board.instances[instanceId].zone = "supportSlot";
    effect?.handler?.(draft, { selfId: instanceId, controllerId: HOLLOW, targetIds: [] });
    return;
  }

  // Dark Event / Shadow Spell: resolve, then discard.
  effect?.handler?.(draft, { selfId: instanceId, controllerId: HOLLOW, targetIds: [] });
  draft.players[HOLLOW].discard.push(instanceId);
  draft.board.instances[instanceId].zone = "discard";
}

function ignoresAegis(
  draft: MatchDraft,
  attacker: CardInstance,
  candidateDamaged: boolean,
): boolean {
  if (draft.turnFlags.nextEnemyAttackIgnoresAegis) return true;
  // Vorak's units ignore Aegis entirely once he is revealed.
  if (draft.board.boss?.revealed && draft.board.boss.ignoresAegis) return true;
  const rule = getEffect(draft.mode, attacker.definitionId)?.aegisRule;
  if (rule === "always-ignore") return true;
  if (rule === "ignore-when-target-damaged") return candidateDamaged;
  if (rule === "ignore-first-attack-each-game") return attacker.flags.firstAttackUsed !== true;
  return false;
}

function chooseEnemyTarget(draft: MatchDraft, attacker: CardInstance): string | null {
  const oath = draft.players[OATHGUARD];
  const units = unitsOf(draft, OATHGUARD);
  const rule = getEffect(draft.mode, attacker.definitionId)?.attackTargetRule;

  // "Attacks the Gate whenever it can" overrides the standard priority table.
  if (rule === "gate-if-able" && oath.gateWard > 0) return "gate";

  if (units.length > 0) {
    // Explicit card text overrides the standard priority table (rulebook §10).
    if (rule === "lowest-printed-def-unit") {
      const printed = (id: string) => definitionOf(draft, id).def ?? 0;
      const lowest = Math.min(...units.map((u) => printed(u.instanceId)));
      const pool = units.filter((u) => printed(u.instanceId) === lowest);
      return pool[0].instanceId;
    }
    if (rule === "lowest-remaining-def-unit") {
      const lowest = Math.min(...units.map((u) => remainingDef(draft, u.instanceId)));
      return units.filter((u) => remainingDef(draft, u.instanceId) === lowest)[0].instanceId;
    }

    const damagedPick = pickByTargetPriority(
      draft,
      units.filter((u) => u.damage > 0),
      {
        ignoreAegis: true,
      },
    );
    if (damagedPick && ignoresAegis(draft, attacker, true)) return damagedPick.instanceId;

    const normal = pickByTargetPriority(draft, units, {
      ignoreAegis: ignoresAegis(draft, attacker, false),
    });
    if (normal) return normal.instanceId;
  }

  if (oath.gateWard > 0) return "gate";
  if (oath.crystalSpinner > 0) return "crystals";
  return null;
}

function enemyAttack(draft: MatchDraft, attacker: CardInstance): void {
  const inst = draft.board.instances[attacker.instanceId];
  if (!inst || inst.zone !== "unitSlot" || inst.exhausted) return;
  if (inst.enteredOnRound === draft.round && !hasKeyword(draft, inst.instanceId, "Surge")) return;

  const targetId = chooseEnemyTarget(draft, inst);
  if (!targetId) return;

  const isGate = targetId === "gate";
  const power =
    attackOf(draft, inst.instanceId) + (isGate ? gateAttackBonus(draft, inst.instanceId) : 0);
  const name = definitionOf(draft, inst.instanceId).name;
  inst.exhausted = true;
  inst.flags = { ...inst.flags, firstAttackUsed: true };
  cue(draft, "attack", inst.instanceId);

  if (targetId === "gate") {
    log(draft, `${name} attacks the Oathguard Gate for ${power}.`, { playerId: HOLLOW });
    damageGate(draft, OATHGUARD, power);
  } else if (targetId === "crystals") {
    log(draft, `${name} strikes the Oathguard crystals for ${power}.`, { playerId: HOLLOW });
    damageCrystals(draft, OATHGUARD, power);
  } else {
    log(draft, `${name} attacks ${definitionOf(draft, targetId).name} for ${power}.`, {
      playerId: HOLLOW,
    });
    damageUnit(draft, targetId, power);
  }

  draft.turnFlags.nextEnemyAttackIgnoresAegis = false;
  inst.nextAttackAtk = 0;
}

function bossAttack(draft: MatchDraft): void {
  const boss = draft.board.boss;
  if (!boss || !boss.revealed || draft.result) return;

  const card = requireCard(draft.mode, boss.definitionId);
  // QuickPlay ATK comes from the boss profile stored in state, not from UI code.
  const power = boss.atk;
  const units = unitsOf(draft, OATHGUARD);
  const firstAttackThisRound = boss.attacksThisRound === 0;

  // Bosses strike the damaged Oathguard unit with the lowest remaining DEF first,
  // then fall back to the standard priority table.
  const damaged = units.filter((u) => u.damage > 0);
  const bossIgnoresAegis = boss.ignoresAegis || firstAttackThisRound;
  const pick =
    pickByTargetPriority(draft, damaged, { ignoreAegis: true }) ??
    pickByTargetPriority(draft, units, { ignoreAegis: bossIgnoresAegis });

  boss.attacksThisRound += 1;
  cue(draft, "attack", boss.definitionId);

  if (pick) {
    log(draft, `${card.name} attacks ${definitionOf(draft, pick.instanceId).name} for ${power}.`, {
      playerId: HOLLOW,
    });
    damageUnit(draft, pick.instanceId, power);
  } else if (draft.players[OATHGUARD].gateWard > 0) {
    log(draft, `${card.name} attacks the Oathguard Gate for ${power}.`, { playerId: HOLLOW });
    damageGate(draft, OATHGUARD, power);
  } else {
    log(draft, `${card.name} strikes the Oathguard crystals for ${power}.`, { playerId: HOLLOW });
    damageCrystals(draft, OATHGUARD, power);
  }

  // Boss-turn behaviour: move the leftmost Hollow Crown unit to the rightmost position.
  const slots = draft.players[HOLLOW].unitSlots;
  const leftmost = slots.findIndex((id) => id !== null);
  if (leftmost !== -1) {
    const [moved] = slots.splice(leftmost, 1);
    slots.push(moved);
    slots.forEach((id, index) => {
      if (id) draft.board.instances[id].slotIndex = index;
    });
    log(draft, `${card.name} shifts the Hollow Crown line.`, { playerId: HOLLOW });
  }
}

/** Runs the entire Hollow Crown turn. Deterministic from the current state + seed. */
export function runHollowCrownTurn(draft: MatchDraft): void {
  if (draft.result) return;
  draft.turnSide = HOLLOW;
  draft.activePlayerId = HOLLOW;
  draft.step = "hollowCrown";
  log(draft, "— Hollow Crown turn —", { playerId: HOLLOW });

  // 1. Reveal
  const revealed: string[] = [];
  for (let i = 0; i < revealCount(draft); i += 1) {
    const id = drawEncounter(draft);
    if (id) revealed.push(id);
  }
  const boss = draft.board.boss;
  if (boss?.enraged && revealed.length > 0) {
    const threat = requireCard(draft.mode, draft.board.instances[revealed[0]].definitionId).cost;
    if (threat <= 3) {
      const extra = drawEncounter(draft);
      if (extra) {
        log(draft, "Enraged: the Hollow Crown reveals an additional encounter card.", {
          playerId: HOLLOW,
        });
        revealed.push(extra);
      }
    }
  }

  // 2. Resolve
  for (const id of revealed) {
    if (draft.result) break;
    resolveEncounter(draft, id);
  }

  // 3. Attack — highest ATK first, with "attacks first" overrides honoured.
  const order = enemyAttackOrder(draft);
  const first = draft.turnFlags.attacksFirstInstanceId;
  const sequence = first
    ? [
        ...order.filter((u) => u.instanceId === first),
        ...order.filter((u) => u.instanceId !== first),
      ]
    : order;
  for (const unit of sequence) {
    if (draft.result) break;
    enemyAttack(draft, unit);
  }

  // 4. Boss
  bossAttack(draft);

  // 5. Ready all Hollow Crown cards
  for (const inst of Object.values(draft.board.instances)) {
    if (inst.ownerId === HOLLOW) {
      inst.exhausted = false;
      inst.temporaryAtk = 0;
      inst.nextAttackAtk = 0;
    }
  }
  if (draft.board.boss) draft.board.boss.attacksThisRound = 0;
  draft.turnFlags = {
    nextEnemyAttackIgnoresAegis: false,
    damagedOathguardLoseAegis: false,
    attacksFirstInstanceId: null,
  };
  checkStageProgress(draft);
}
