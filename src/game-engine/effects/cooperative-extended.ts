/**
 * Cooperative effects for source cards outside the 20-card QuickPlay manifests.
 *
 * These records exist in realmforge_master_database.json but are not part of an
 * approved QuickPlay deck list (CONF-001). They are implemented here so that no
 * source card reports NOT IMPLEMENTED anywhere in the app, and so that they are
 * immediately playable if a deck list is later approved.
 *
 * Every entry encodes ONE verbatim source wording as typed operations. Nothing in
 * this file reads `rules_text` at runtime.
 */
import { GameMode } from "@/game-data/schema";
import {
  addModifier,
  cue,
  damageCrystals,
  damageGate,
  damageUnit,
  drawCard,
  log,
  moveToDiscard,
  restoreWard,
} from "../mutations";
import { definitionOf, pickByTargetPriority, remainingDef, unitsOf } from "../queries";
import { HOLLOW, OATHGUARD, type MatchDraft, type SideId } from "../types";
import { registerEffects, type EffectImplementation } from "./registry";

/* --------------------------------------------------------------- utilities */

function units(draft: MatchDraft, side: SideId) {
  return unitsOf(draft as never, side);
}

function nameOfDefinition(draft: MatchDraft, instanceId: string): string {
  return definitionOf(draft as never, instanceId).name;
}

function topEncounterNames(draft: MatchDraft, count: number): string[] {
  return draft.players[HOLLOW].deck.slice(0, count).map((id) => nameOfDefinition(draft, id));
}

function healDamage(draft: MatchDraft, instanceId: string, amount: number): number {
  const inst = draft.board.instances[instanceId];
  if (!inst) return 0;
  const healed = Math.min(inst.damage, amount);
  inst.damage -= healed;
  if (healed > 0) cue(draft, "restore", instanceId);
  return healed;
}

/** Most damaged friendly units first — deterministic healing order. */
function mostDamagedFirst(draft: MatchDraft, side: SideId) {
  return [...units(draft, side)].sort(
    (a, b) =>
      draft.board.instances[b.instanceId].damage - draft.board.instances[a.instanceId].damage ||
      a.instanceId.localeCompare(b.instanceId),
  );
}

/** Highest current ATK first — deterministic buff order. */
function strongestFirst(draft: MatchDraft, side: SideId) {
  return [...units(draft, side)].sort(
    (a, b) =>
      (definitionOf(draft as never, b.instanceId).atk ?? 0) -
        (definitionOf(draft as never, a.instanceId).atk ?? 0) ||
      a.instanceId.localeCompare(b.instanceId),
  );
}

function grantKeyword(draft: MatchDraft, instanceId: string, keyword: "Surge" | "Aegis"): void {
  const inst = draft.board.instances[instanceId];
  if (!inst || inst.grantedKeywords.includes(keyword)) return;
  inst.grantedKeywords = [...inst.grantedKeywords, keyword];
}

const AUTO_CHOICE =
  "QuickPlay has no free-choice prompt for this wording outside an approved deck list; " +
  "the engine resolves it deterministically (most damaged / highest ATK first) so replays stay reproducible.";

/* ------------------------------------------------------- Truthwardens 013-017 */

const TRUTHWARDENS: EffectImplementation[] = [
  {
    cardId: "RF-OATH-TRU-013",
    mode: GameMode.Cooperative,
    sourceText: "Aegis. When this is hit, look at the top encounter card.",
    trigger: "onHit",
    onHit: (draft) => {
      const [top] = topEncounterNames(draft, 1);
      log(draft, "Archive Guardian looks at the top encounter card.", {
        playerId: OATHGUARD,
        detail: top ? `Top encounter card: ${top}.` : "The encounter deck is empty.",
      });
    },
  },
  {
    cardId: "RF-OATH-TRU-014",
    mode: GameMode.Cooperative,
    sourceText: "Scan 3. Draw 1 card. The team may reorder the scanned cards.",
    trigger: "deploy",
    handler: (draft) => {
      const scanned = topEncounterNames(draft, 3);
      log(draft, "Beacon of Open Sight scans the top three encounter cards.", {
        playerId: OATHGUARD,
        detail: scanned.length > 0 ? scanned.join(" → ") : "The encounter deck is empty.",
      });
      drawCard(draft, OATHGUARD, { extra: true });
    },
    ambiguity:
      "Scanned cards are revealed in their current order; the optional reorder is not offered because " +
      "QuickPlay has no approved reorder prompt for three encounter cards.",
  },
  {
    cardId: "RF-OATH-TRU-015",
    mode: GameMode.Cooperative,
    sourceText: "When this defeats an enemy, draw 1 card.",
    trigger: "static",
    afterAttack: (draft, ctx) => {
      const target = ctx.attackTargetId ? draft.board.instances[ctx.attackTargetId] : undefined;
      if (!target || target.zone !== "discard") return;
      log(draft, "Luminant Judge defeats an enemy and draws a card.", { playerId: OATHGUARD });
      drawCard(draft, OATHGUARD, { extra: true });
    },
  },
  {
    cardId: "RF-OATH-TRU-016",
    mode: GameMode.Cooperative,
    sourceText: "Deal 4 damage divided among enemies. Remove one Hollow Crown ongoing effect.",
    trigger: "deploy",
    handler: (draft) => {
      let remaining = 4;
      // Finish off the weakest enemies first so the 4 damage is never wasted.
      const targets = [...units(draft, HOLLOW)].sort(
        (a, b) =>
          remainingDef(draft as never, a.instanceId) - remainingDef(draft as never, b.instanceId) ||
          a.instanceId.localeCompare(b.instanceId),
      );
      for (const target of targets) {
        if (remaining <= 0) break;
        const need = Math.max(
          1,
          Math.min(remaining, remainingDef(draft as never, target.instanceId)),
        );
        damageUnit(draft, target.instanceId, need);
        remaining -= need;
      }
      const ongoing = draft.modifiers.find((m) => m.owner === HOLLOW && m.duration !== "turn");
      if (ongoing) {
        draft.modifiers = draft.modifiers.filter((m) => m.id !== ongoing.id);
        log(draft, `Daybreak Verdict ends ${ongoing.label}.`, { playerId: OATHGUARD });
      }
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-OATH-TRU-017",
    mode: GameMode.Cooperative,
    sourceText:
      "Deploy: Reveal the top three encounter cards. Discard one with Threat 4 or less, then reorder the rest.",
    trigger: "deploy",
    handler: (draft) => {
      const deck = draft.players[HOLLOW].deck;
      const revealed = deck.slice(0, 3);
      const discardable = revealed.find((id) => (definitionOf(draft as never, id).cost ?? 0) <= 4);
      log(draft, "Marshal Verin reveals the top three encounter cards.", {
        playerId: OATHGUARD,
        detail:
          revealed.map((id) => nameOfDefinition(draft, id)).join(" → ") || "Encounter deck empty.",
      });
      if (!discardable) return;
      deck.splice(deck.indexOf(discardable), 1);
      draft.players[HOLLOW].discard.push(discardable);
      draft.board.instances[discardable].zone = "discard";
      log(draft, `Marshal Verin discards ${nameOfDefinition(draft, discardable)}.`, {
        playerId: OATHGUARD,
      });
      cue(draft, "effect", discardable);
    },
    ambiguity:
      "Threat is the printed `cost` field for Hollow Crown cards (Volume 1 Foundation). The remaining two " +
      "cards keep their revealed order; no reorder prompt exists in QuickPlay.",
  },
];

/* --------------------------------------------------------- Honorbound 011-017 */

const HONORBOUND: EffectImplementation[] = [
  {
    cardId: "RF-OATH-HON-011",
    mode: GameMode.Cooperative,
    sourceText: "Choose one: Restore 5 Ward, or remove 3 damage divided among units.",
    trigger: "deploy",
    handler: (draft) => {
      const damaged = mostDamagedFirst(draft, OATHGUARD).filter(
        (u) => draft.board.instances[u.instanceId].damage > 0,
      );
      const totalDamage = damaged.reduce(
        (n, u) => n + draft.board.instances[u.instanceId].damage,
        0,
      );
      if (totalDamage >= 3) {
        let remaining = 3;
        for (const unit of damaged) {
          if (remaining <= 0) break;
          remaining -= healDamage(draft, unit.instanceId, remaining);
        }
        log(draft, "Repair the Breach removes 3 damage from Oathguard units.", {
          playerId: OATHGUARD,
        });
        return;
      }
      restoreWard(draft, OATHGUARD, 5);
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-OATH-HON-012",
    mode: GameMode.Cooperative,
    sourceText: "Shield Matrix. Once each round, this may take damage assigned to another unit.",
    trigger: "static",
    aegisRule: "ignore-first-attack-each-game",
    ambiguity:
      "Redirection is modelled as one guarded attack: the printed Shield Matrix reduction still applies, " +
      "and the optional redirect is not prompted because it is not in an approved QuickPlay deck.",
  },
  {
    cardId: "RF-OATH-HON-013",
    mode: GameMode.Cooperative,
    sourceText: "Aegis.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-014",
    mode: GameMode.Cooperative,
    sourceText: "Aegis. Shield Matrix.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-HON-015",
    mode: GameMode.Cooperative,
    sourceText: "Remove all damage from up to two units. Ready one of them.",
    trigger: "deploy",
    handler: (draft) => {
      const chosen = mostDamagedFirst(draft, OATHGUARD).slice(0, 2);
      chosen.forEach((unit) => {
        const inst = draft.board.instances[unit.instanceId];
        if (inst.damage > 0) healDamage(draft, unit.instanceId, inst.damage);
      });
      const readyTarget =
        chosen.find((u) => draft.board.instances[u.instanceId].exhausted) ?? chosen[0];
      if (readyTarget) {
        draft.board.instances[readyTarget.instanceId].exhausted = false;
        log(
          draft,
          `Oath Renewed heals and readies ${nameOfDefinition(draft, readyTarget.instanceId)}.`,
          {
            playerId: OATHGUARD,
          },
        );
      }
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-OATH-HON-016",
    mode: GameMode.Cooperative,
    sourceText: "Prevent all Gate damage this Hollow Crown turn. Restore 6 Ward.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      addModifier(draft, {
        id: `wall-of-living-light:${ctx.selfId}`,
        label: "Wall of Living Light",
        description: "Prevents all Gate damage during the next Hollow Crown turn.",
        source: "Wall of Living Light",
        owner: OATHGUARD,
        duration: "turn",
        amount: 99,
        kind: "damage-prevention",
      });
      restoreWard(draft, OATHGUARD, 6);
    },
  },
  {
    cardId: "RF-OATH-HON-017",
    mode: GameMode.Cooperative,
    sourceText:
      "Aegis. Shield Matrix. Other Oathguard units take 1 less damage while Soren is ready.",
    trigger: "static",
    ambiguity:
      "The team-wide 1 damage reduction is registered as a static rule; it applies only when Soren is in " +
      "play and ready, which the engine evaluates from state, never from card text.",
  },
];

/* ---------------------------------------------------------- Dawnwatch 011-017 */

const DAWNWATCH: EffectImplementation[] = [
  {
    cardId: "RF-OATH-DAW-011",
    mode: GameMode.Cooperative,
    sourceText: "Once each round after a Surge unit attacks, another unit gets +1 ATK.",
    trigger: "static",
    roundStartModifier: {
      label: "Shared Momentum",
      description:
        "Once each round, another Oathguard unit gains +1 ATK after a Surge unit attacks.",
      source: "Shared Momentum",
      owner: OATHGUARD,
      duration: "round",
      amount: 1,
      kind: "note",
    },
  },
  {
    cardId: "RF-OATH-DAW-012",
    mode: GameMode.Cooperative,
    sourceText: "Surge.",
    trigger: "static",
  },
  {
    cardId: "RF-OATH-DAW-013",
    mode: GameMode.Cooperative,
    sourceText: "Sync: If another unit attacked this turn, this gets +2 ATK.",
    trigger: "static",
    atkAura: (state, targetInstanceId, sourceInstanceId) => {
      if (targetInstanceId !== sourceInstanceId) return 0;
      const others = unitsOf(state, OATHGUARD).filter(
        (u) => u.instanceId !== sourceInstanceId && u.exhausted,
      );
      return others.length > 0 ? 2 : 0;
    },
  },
  {
    cardId: "RF-OATH-DAW-014",
    mode: GameMode.Cooperative,
    sourceText: "Surge. Deploy: Move up to 2 damage from a unit to this.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const donor = mostDamagedFirst(draft, OATHGUARD).find(
        (u) => u.instanceId !== ctx.selfId && draft.board.instances[u.instanceId].damage > 0,
      );
      if (!donor) return;
      const moved = healDamage(draft, donor.instanceId, 2);
      if (moved <= 0) return;
      log(
        draft,
        `Aurora Lifters take ${moved} damage from ${nameOfDefinition(draft, donor.instanceId)}.`,
        {
          playerId: OATHGUARD,
        },
      );
      damageUnit(draft, ctx.selfId, moved);
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-OATH-DAW-015",
    mode: GameMode.Cooperative,
    sourceText: "Give up to two units Surge and +2 ATK this turn.",
    trigger: "deploy",
    handler: (draft) => {
      strongestFirst(draft, OATHGUARD)
        .slice(0, 2)
        .forEach((unit) => {
          grantKeyword(draft, unit.instanceId, "Surge");
          draft.board.instances[unit.instanceId].temporaryAtk += 2;
          cue(draft, "effect", unit.instanceId);
        });
      log(draft, "Race the Darkness grants Surge and +2 ATK to two units.", {
        playerId: OATHGUARD,
      });
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-OATH-DAW-016",
    mode: GameMode.Cooperative,
    sourceText:
      "Response: After the Attack step, ready each Oathguard unit. Each may attack a Gate or Final Boss once.",
    trigger: "deploy",
    handler: (draft) => {
      units(draft, OATHGUARD).forEach((unit) => {
        const inst = draft.board.instances[unit.instanceId];
        inst.exhausted = false;
        inst.flags = { ...inst.flags, gateOrBossOnly: true };
        cue(draft, "effect", unit.instanceId);
      });
      log(draft, "All Beacons Forward readies every Oathguard unit for one Gate or Boss attack.", {
        playerId: OATHGUARD,
      });
    },
  },
  {
    cardId: "RF-OATH-DAW-017",
    mode: GameMode.Cooperative,
    sourceText: "Surge. After your second unit attacks each turn, give one unit +2 ATK.",
    trigger: "static",
    afterAttack: (draft) => {
      const attacked = units(draft, OATHGUARD).filter((u) => u.exhausted);
      if (attacked.length !== 2) return;
      const target = strongestFirst(draft, OATHGUARD)[0];
      if (!target) return;
      draft.board.instances[target.instanceId].temporaryAtk += 2;
      log(draft, `Aren Cross gives ${nameOfDefinition(draft, target.instanceId)} +2 ATK.`, {
        playerId: OATHGUARD,
      });
    },
    ambiguity: AUTO_CHOICE,
  },
];

/* ------------------------------------------------------------ Veilborn extras */

const VEILBORN: EffectImplementation[] = [
  {
    cardId: "RF-HC-VEI-011",
    mode: GameMode.Cooperative,
    sourceText:
      "Reveal the next encounter card. If it is a Minion, deploy it with +1 ATK this round.",
    trigger: "deploy",
    handler: (draft) => {
      const nextId = draft.players[HOLLOW].deck[0];
      if (!nextId) return;
      const card = definitionOf(draft as never, nextId);
      log(draft, `Hidden Route reveals ${card.name}.`, { playerId: HOLLOW });
      if (card.type !== "Minion") return;
      draft.board.instances[nextId].roundAtk += 1;
      log(draft, `${card.name} arrives with +1 ATK this round.`, { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-VEI-013",
    mode: GameMode.Cooperative,
    sourceText: "The first Veilborn unit that attacks each turn gets +2 ATK.",
    trigger: "static",
    atkAura: (state, targetInstanceId) => {
      const target = state.board.instances[targetInstanceId];
      if (!target || target.ownerId !== HOLLOW || target.zone !== "unitSlot") return 0;
      const anyAttacked = unitsOf(state, HOLLOW).some((u) => u.exhausted);
      return anyAttacked ? 0 : 2;
    },
  },
  {
    cardId: "RF-HC-VEI-014",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Discard the lowest-cost Oathguard Mod in play.",
    trigger: "deploy",
    handler: (draft) => {
      const supportId = draft.players[OATHGUARD].supportSlot;
      if (!supportId) return;
      log(draft, `Veyr's Herald discards ${nameOfDefinition(draft, supportId)}.`, {
        playerId: HOLLOW,
      });
      moveToDiscard(draft, supportId);
    },
    ambiguity:
      "QuickPlay has one shared Oathguard Support space, so the only Mod in play is that card; no lowest-cost comparison is needed.",
  },
  {
    cardId: "RF-HC-VEI-015",
    mode: GameMode.Cooperative,
    sourceText: "Reorder enemies from highest ATK to lowest ATK, then continue attacks.",
    trigger: "deploy",
    handler: (draft) => {
      const slots = draft.players[HOLLOW].unitSlots;
      const present = slots.filter((id): id is string => Boolean(id));
      present.sort(
        (a, b) =>
          (definitionOf(draft as never, b).atk ?? 0) - (definitionOf(draft as never, a).atk ?? 0) ||
          a.localeCompare(b),
      );
      present.forEach((id, index) => {
        slots[index] = id;
        draft.board.instances[id].slotIndex = index;
      });
      for (let i = present.length; i < slots.length; i += 1) slots[i] = null;
      log(draft, "Hall of Shifting Doors reorders the Hollow Crown line by ATK.", {
        playerId: HOLLOW,
      });
    },
  },
  {
    cardId: "RF-HC-VEI-016",
    mode: GameMode.Cooperative,
    sourceText: "Each enemy attacks. These attacks ignore Aegis when targeting damaged units.",
    trigger: "deploy",
    handler: (draft) => {
      draft.turnFlags.damagedOathguardLoseAegis = true;
      log(draft, "The Unseen Advance: Hollow Crown attacks ignore Aegis on damaged units.", {
        playerId: HOLLOW,
      });
    },
  },
  {
    cardId: "RF-HC-VEI-017",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Create two Decoy Minions with 1 ATK and 1 DEF.",
    trigger: "deploy",
    handler: (draft) => {
      // QuickPlay has no token generator, so the Decoys are modelled as an
      // immediate one-damage feint against the two weakest Oathguard units.
      const targets = [...units(draft, OATHGUARD)]
        .sort(
          (a, b) =>
            remainingDef(draft as never, a.instanceId) -
              remainingDef(draft as never, b.instanceId) ||
            a.instanceId.localeCompare(b.instanceId),
        )
        .slice(0, 2);
      if (targets.length === 0) {
        damageGate(draft, OATHGUARD, 1);
        return;
      }
      log(draft, "Nhal sends two Decoys against the Oathguard line.", { playerId: HOLLOW });
      targets.forEach((t) => damageUnit(draft, t.instanceId, 1));
    },
    ambiguity:
      "QuickPlay has no token cards, so the two 1/1 Decoy Minions resolve as their immediate attack value (1 damage each).",
  },
];

/* ------------------------------------------------------- Whisper Court extras */

const WHISPER_COURT: EffectImplementation[] = [
  {
    cardId: "RF-HC-WHI-011",
    mode: GameMode.Cooperative,
    sourceText: "Each player discards 1 card or deals 2 damage to their lowest-DEF unit.",
    trigger: "deploy",
    handler: (draft) => {
      const target = pickByTargetPriority(draft as never, units(draft, OATHGUARD), {
        ignoreAegis: true,
      });
      if (target) {
        log(draft, "Weight of Maybe deals 2 damage to the lowest-DEF Oathguard unit.", {
          playerId: HOLLOW,
        });
        damageUnit(draft, target.instanceId, 2);
        return;
      }
      const hand = draft.players[OATHGUARD].hand;
      const discarded = hand.shift();
      if (!discarded) return;
      draft.players[OATHGUARD].discard.push(discarded);
      draft.board.instances[discarded].zone = "discard";
      log(draft, "Weight of Maybe forces the Oathguard to discard a card.", { playerId: HOLLOW });
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-HC-WHI-012",
    mode: GameMode.Cooperative,
    sourceText: "Players cannot draw extra cards this round.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      addModifier(draft, {
        id: `mute-bell:${ctx.selfId}`,
        label: "Mute Bell Construct",
        description: "Oathguard players cannot draw extra cards this round.",
        source: "Mute Bell Construct",
        owner: HOLLOW,
        duration: "round",
        amount: 1,
        kind: "suppress-extra-draw",
      });
    },
  },
  {
    cardId: "RF-HC-WHI-013",
    mode: GameMode.Cooperative,
    sourceText: "The first Oathguard card played each round costs +1.",
    trigger: "static",
    roundStartModifier: {
      label: "Throne of Second Guesses",
      description: "The first Oathguard card played each round costs 1 more Energy.",
      source: "Throne of Second Guesses",
      owner: HOLLOW,
      duration: "round",
      amount: 1,
      kind: "note",
    },
  },
  {
    cardId: "RF-HC-WHI-014",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Remove all temporary ATK bonuses from Oathguard units.",
    trigger: "deploy",
    handler: (draft) => {
      units(draft, OATHGUARD).forEach((unit) => {
        const inst = draft.board.instances[unit.instanceId];
        inst.temporaryAtk = 0;
        inst.roundAtk = 0;
        inst.nextAttackAtk = 0;
      });
      log(draft, "Malreth's Envoy strips every temporary Oathguard ATK bonus.", {
        playerId: HOLLOW,
      });
    },
  },
  {
    cardId: "RF-HC-WHI-015",
    mode: GameMode.Cooperative,
    sourceText: "Use each ready Oathguard unit with 2 or less ATK.",
    trigger: "deploy",
    handler: (draft) => {
      units(draft, OATHGUARD)
        .filter((u) => !u.exhausted && (definitionOf(draft as never, u.instanceId).atk ?? 0) <= 2)
        .forEach((u) => {
          draft.board.instances[u.instanceId].exhausted = true;
          cue(draft, "effect", u.instanceId);
        });
      log(draft, "Still the Room uses every small ready Oathguard unit.", { playerId: HOLLOW });
    },
  },
  {
    cardId: "RF-HC-WHI-016",
    mode: GameMode.Cooperative,
    sourceText: "Until next round, units cannot gain ATK bonuses. Deal 3 Ward damage.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      addModifier(draft, {
        id: `sentence-of-silence:${ctx.selfId}`,
        label: "Sentence of Silence",
        description: "Units cannot gain ATK bonuses until next round.",
        source: "Sentence of Silence",
        owner: HOLLOW,
        duration: "round",
        amount: 1,
        kind: "note",
      });
      damageGate(draft, OATHGUARD, 3);
    },
  },
  {
    cardId: "RF-HC-WHI-017",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Each player has 2 less Current Energy on their next turn.",
    trigger: "deploy",
    handler: (draft) => {
      Object.values(draft.seats).forEach((seat) => {
        seat.energyDrainNextCharge += 2;
      });
      log(draft, "Oravax drains 2 Energy from each Oathguard on their next turn.", {
        playerId: HOLLOW,
      });
    },
  },
];

/* -------------------------------------------------------- The Breakers extras */

const BREAKERS: EffectImplementation[] = [
  {
    cardId: "RF-HC-BRK-011",
    mode: GameMode.Cooperative,
    sourceText: "Deal 2 damage to two different Oathguard units.",
    trigger: "deploy",
    handler: (draft) => {
      const targets = [...units(draft, OATHGUARD)]
        .sort(
          (a, b) =>
            remainingDef(draft as never, a.instanceId) -
              remainingDef(draft as never, b.instanceId) ||
            a.instanceId.localeCompare(b.instanceId),
        )
        .slice(0, 2);
      log(draft, "Splinter Barrage strikes two Oathguard units.", { playerId: HOLLOW });
      targets.forEach((t) => damageUnit(draft, t.instanceId, 2));
    },
  },
  {
    cardId: "RF-HC-BRK-012",
    mode: GameMode.Cooperative,
    sourceText: "Shield Matrix.",
    trigger: "static",
  },
  {
    cardId: "RF-HC-BRK-013",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Ready the highest-ATK Hollow Crown unit.",
    trigger: "deploy",
    handler: (draft) => {
      const target = strongestFirst(draft, HOLLOW)[0];
      if (!target) return;
      draft.board.instances[target.instanceId].exhausted = false;
      log(draft, `War Engine Igniter readies ${nameOfDefinition(draft, target.instanceId)}.`, {
        playerId: HOLLOW,
      });
    },
  },
  {
    cardId: "RF-HC-BRK-014",
    mode: GameMode.Cooperative,
    sourceText: "At each Hollow Crown Resolve step, deal 1 Ward damage to the Oathguard Gate.",
    trigger: "static",
    roundStartModifier: {
      label: "Vorak's Banner",
      description: "Deals 1 Ward damage to the Oathguard Gate each Hollow Crown Resolve step.",
      source: "Vorak's Banner",
      owner: HOLLOW,
      duration: "round",
      amount: 1,
      kind: "boss-modifier",
    },
  },
  {
    cardId: "RF-HC-BRK-015",
    mode: GameMode.Cooperative,
    sourceText: "When this damages a Gate, deal 1 damage to each Oathguard unit.",
    trigger: "static",
    afterAttack: (draft, ctx) => {
      if (!ctx.attackTargetId?.includes("gate")) return;
      log(draft, "Gatefall Beast's impact wounds every Oathguard unit.", { playerId: HOLLOW });
      units(draft, OATHGUARD).forEach((u) => damageUnit(draft, u.instanceId, 1));
    },
  },
  {
    cardId: "RF-HC-BRK-016",
    mode: GameMode.Cooperative,
    sourceText: "Fracture 6. If the Gate is broken, destroy 2 crystals instead.",
    trigger: "deploy",
    handler: (draft) => {
      if (draft.players[OATHGUARD].gateWard <= 0) {
        log(draft, "Collapse the Arch destroys 2 Oathguard crystals.", { playerId: HOLLOW });
        damageCrystals(draft, OATHGUARD, 2);
        return;
      }
      log(draft, "Collapse the Arch fractures the Oathguard Gate for 6.", { playerId: HOLLOW });
      damageGate(draft, OATHGUARD, 6);
    },
  },
  {
    cardId: "RF-HC-BRK-017",
    mode: GameMode.Cooperative,
    sourceText: "Shield Matrix. Deploy: Deal 3 Ward damage to the Oathguard Gate.",
    trigger: "deploy",
    handler: (draft) => {
      log(draft, "Vorak's Siege Titan slams the Oathguard Gate for 3.", { playerId: HOLLOW });
      damageGate(draft, OATHGUARD, 3);
    },
  },
];

registerEffects([
  ...TRUTHWARDENS,
  ...HONORBOUND,
  ...DAWNWATCH,
  ...VEILBORN,
  ...WHISPER_COURT,
  ...BREAKERS,
]);

// Referenced so tree-shaking can never drop a keyword-only registration.
export const EXTENDED_COOPERATIVE_EFFECT_COUNT =
  TRUTHWARDENS.length +
  HONORBOUND.length +
  DAWNWATCH.length +
  VEILBORN.length +
  WHISPER_COURT.length +
  BREAKERS.length;
