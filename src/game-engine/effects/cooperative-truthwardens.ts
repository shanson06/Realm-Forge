/**
 * Truthwardens QuickPlay effects (cooperative edition, source IDs preserved).
 *
 * Each entry encodes ONE verbatim source wording as typed operations.
 * Nothing here reads `rules_text` at runtime.
 */
import { GameMode } from "@/game-data/schema";
import { cue, damageUnit, drawCard, log, moveToDiscard, restoreWard } from "../mutations";
import { definitionOf } from "../queries";
import {
  HOLLOW,
  OATHGUARD,
  TARGET_HOLLOW_GATE,
  TARGET_OATHGUARD_GATE,
  type MatchDraft,
} from "../types";
import { registerEffects, type EffectImplementation } from "./registry";
import { promptEffectId, registerPromptResolver } from "./prompts";

function encounterDeck(draft: MatchDraft): string[] {
  return draft.players[HOLLOW].deck;
}

function nameOf(draft: MatchDraft, instanceId: string): string {
  const inst = draft.board.instances[instanceId];
  return inst ? inst.definitionId : instanceId;
}

/* ------------------------------------------------------------------ prompts */

registerPromptResolver("tru-001-scry", (draft, chosen) => {
  const deck = encounterDeck(draft);
  if (chosen.length === 0 || deck.length === 0) {
    log(draft, "Beacon Initiate leaves the encounter card on top.", { playerId: OATHGUARD });
    return;
  }
  const top = deck.shift();
  if (top) deck.push(top);
  log(draft, "Beacon Initiate places the encounter card on the bottom.", { playerId: OATHGUARD });
});

registerPromptResolver("tru-003-discard", (draft, chosen) => {
  const id = chosen[0];
  if (!id) return;
  const hand = draft.players[OATHGUARD].hand;
  const index = hand.indexOf(id);
  if (index === -1) return;
  hand.splice(index, 1);
  draft.players[OATHGUARD].discard.push(id);
  draft.board.instances[id].zone = "discard";
  log(draft, `Hologlass Scribe discards ${nameOf(draft, id)}.`, { playerId: OATHGUARD });
});

registerPromptResolver("tru-004-order", (draft, chosen) => {
  // Two cards were lifted off the encounter deck; the chosen one returns on top.
  const lifted = (
    draft.prompt && draft.prompt.kind === "encounterOrder" ? draft.prompt.revealedIds : []
  ) as string[];
  const deck = encounterDeck(draft);
  const top = chosen[0] ?? lifted[0];
  const bottom = lifted.find((id) => id !== top);
  if (bottom) deck.push(bottom);
  if (top) deck.unshift(top);
  log(draft, "Clear Path Tactic reorders the encounter deck.", { playerId: OATHGUARD });
});

registerPromptResolver("tru-010-target", (draft, chosen) => {
  const id = chosen[0];
  if (!id) {
    log(draft, "Verdict Seeker finds no enemy that entered play this round.", {
      playerId: OATHGUARD,
    });
    return;
  }
  log(draft, "Verdict Seeker deals 1 damage.", { playerId: OATHGUARD });
  damageUnit(draft, id, 1);
});

registerPromptResolver("tru-006-unmask", (draft, chosen) => {
  const id = chosen[0];
  if (!id) {
    log(draft, "Unmask the Plot finds no low-Threat Hollow Crown card in play.", {
      playerId: OATHGUARD,
    });
    return;
  }
  log(draft, `Unmask the Plot discards ${nameOf(draft, id)}.`, { playerId: OATHGUARD });
  moveToDiscard(draft, id);
  cue(draft, "effect", id);
});

registerPromptResolver("tru-009-scan", (draft, chosen) => {
  const id = chosen[0];
  if (!id) {
    log(draft, "Lantern Array grants no ATK bonus.", { playerId: OATHGUARD });
    return;
  }
  draft.board.instances[id].nextAttackAtk += 1;
  log(draft, `Lantern Array gives ${nameOf(draft, id)} +1 ATK for its next attack.`, {
    playerId: OATHGUARD,
  });
  cue(draft, "effect", id);
});

/* ------------------------------------------------------------------ effects */

const EFFECTS: EffectImplementation[] = [
  {
    cardId: "RF-OATH-TRU-001",
    mode: GameMode.Cooperative,
    sourceText:
      "Deploy: Look at the top encounter card. You may leave it or place it on the bottom.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const deck = encounterDeck(draft);
      if (deck.length === 0) {
        log(draft, "Beacon Initiate looks at an empty encounter deck.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "encounterOrder",
        effectId: promptEffectId("tru-001-scry", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        revealedIds: [deck[0]],
        style: "bottomOrKeep",
        description:
          "Beacon Initiate: leave this encounter card on top, or place it on the bottom.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-002",
    mode: GameMode.Cooperative,
    sourceText: "When this attacks a damaged enemy, it gets +1 ATK for that attack.",
    trigger: "onAttack",
    handler: (draft, ctx) => {
      const target = ctx.attackTargetId ? draft.board.instances[ctx.attackTargetId] : undefined;
      if (target && target.zone === "unitSlot" && target.damage > 0) {
        draft.board.instances[ctx.selfId].nextAttackAtk += 1;
        log(draft, "Lens Sprite gains +1 ATK against a damaged enemy.", { playerId: OATHGUARD });
      }
    },
  },
  {
    cardId: "RF-OATH-TRU-003",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Draw 1 card, then discard 1 card.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      drawCard(draft, OATHGUARD);
      const hand = draft.players[OATHGUARD].hand;
      if (hand.length === 0) return;
      draft.prompt = {
        kind: "discardFromHand",
        effectId: promptEffectId("tru-003-discard", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: [...hand],
        description: "Hologlass Scribe: discard one card.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-004",
    mode: GameMode.Cooperative,
    sourceText: "Look at the top two encounter cards. Put one on the bottom and one on top.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const deck = encounterDeck(draft);
      if (deck.length < 2) {
        log(draft, "Clear Path Tactic finds fewer than two encounter cards.", {
          playerId: OATHGUARD,
        });
        return;
      }
      const lifted = deck.splice(0, 2);
      draft.prompt = {
        kind: "encounterOrder",
        effectId: promptEffectId("tru-004-order", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        revealedIds: lifted,
        style: "chooseTop",
        description:
          "Clear Path Tactic: choose which card goes on top. The other goes to the bottom.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-005",
    mode: GameMode.Cooperative,
    sourceText: "When this attacks, reveal the top encounter card, then return it to the top.",
    trigger: "onAttack",
    handler: (draft) => {
      const deck = encounterDeck(draft);
      if (deck.length === 0) return;
      log(draft, "Tower Lookout reveals the top encounter card.", {
        playerId: OATHGUARD,
        detail: draft.board.instances[deck[0]].definitionId,
      });
    },
  },
  {
    cardId: "RF-OATH-TRU-007",
    mode: GameMode.Cooperative,
    sourceText:
      "When this attacks a unit, target the Hollow Crown unit with the lowest remaining DEF.",
    trigger: "static",
    attackTargetRule: "lowest-remaining-def-unit",
  },
  {
    cardId: "RF-OATH-TRU-006",
    mode: GameMode.Cooperative,
    sourceText: "Discard a Hollow Crown Relic or Dark Event in play with Threat 3 or less.",
    trigger: "deploy",
    ambiguity:
      'Resolved from source, not a judgement call: Realmforge_Volume_1_Foundation.md states "Hollow Crown cards use Threat rather than Energy. The database field `cost` stores Threat for Hollow Crown cards." Threat therefore reads the printed cost of the Hollow Crown card, so this discards a Hollow Crown Relic or Dark Event in play with cost/Threat 3 or less.',
    handler: (draft, ctx) => {
      const legal = Object.values(draft.board.instances)
        .filter(
          (inst) =>
            inst.ownerId === HOLLOW && (inst.zone === "supportSlot" || inst.zone === "unitSlot"),
        )
        .filter((inst) => {
          const card = definitionOf(draft as never, inst.instanceId);
          return (card.type === "Relic" || card.type === "Dark Event") && card.cost <= 3;
        })
        .map((inst) => inst.instanceId);
      if (legal.length === 0) {
        log(draft, "Unmask the Plot finds no low-Threat Hollow Crown card in play.", {
          playerId: OATHGUARD,
        });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("tru-006-unmask", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: false,
        description:
          "Unmask the Plot: discard a Hollow Crown Relic or Dark Event in play with Threat (cost) 3 or less.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-009",
    mode: GameMode.Cooperative,
    sourceText:
      "Scan 2. Once each round after you Scan, one Oathguard unit gets +1 ATK for its next attack.",
    trigger: "deploy",
    ambiguity:
      "QuickPlay has no activated-ability step, so the once-each-round clause resolves with the Scan on the turn Lantern Array arrives: the top two encounter cards are revealed to the team, then one Oathguard unit gains +1 ATK for its next attack.",
    handler: (draft, ctx) => {
      const deck = encounterDeck(draft);
      const scanned = deck.slice(0, 2);
      if (scanned.length > 0) {
        log(draft, "Lantern Array scans the top of the encounter deck.", {
          playerId: OATHGUARD,
          detail: scanned.map((id) => draft.board.instances[id].definitionId).join(", "),
        });
      }
      const units = draft.players[OATHGUARD].unitSlots.filter((id): id is string => id !== null);
      if (units.length === 0) {
        log(draft, "Lantern Array has no Oathguard unit to empower.", { playerId: OATHGUARD });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("tru-009-scan", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: units,
        optional: false,
        description: "Lantern Array: one Oathguard unit gets +1 ATK for its next attack.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-008",
    mode: GameMode.Cooperative,
    sourceText: "Aegis. Deploy: Restore 1 Ward to the Oathguard Gate.",
    trigger: "deploy",
    handler: (draft) => {
      log(draft, "Beacon Warder restores 1 Ward.", { playerId: OATHGUARD });
      restoreWard(draft, OATHGUARD, 1);
    },
  },
  {
    cardId: "RF-OATH-TRU-010",
    mode: GameMode.Cooperative,
    sourceText: "Deploy: Deal 1 damage to an enemy that entered play this round.",
    trigger: "deploy",
    handler: (draft, ctx) => {
      const legal = draft.players[HOLLOW].unitSlots
        .filter((id): id is string => id !== null)
        .filter((id) => draft.board.instances[id].enteredOnRound === draft.round);
      if (legal.length === 0) {
        log(draft, "Verdict Seeker finds no enemy that entered play this round.", {
          playerId: OATHGUARD,
        });
        return;
      }
      draft.prompt = {
        kind: "selectTarget",
        effectId: promptEffectId("tru-010-target", ctx.selfId),
        sourceInstanceId: ctx.selfId,
        legalTargetIds: legal,
        optional: false,
        description: "Verdict Seeker: deal 1 damage to an enemy that entered play this round.",
      };
    },
  },
  {
    cardId: "RF-OATH-TRU-011",
    mode: GameMode.Cooperative,
    sourceText: "Remove all temporary ATK bonuses from Hollow Crown cards.",
    trigger: "deploy",
    handler: (draft) => {
      for (const inst of Object.values(draft.board.instances)) {
        if (inst.ownerId === HOLLOW) {
          inst.temporaryAtk = 0;
          inst.nextAttackAtk = 0;
        }
      }
      log(draft, "Falsehood Falls removes all temporary Hollow Crown ATK bonuses.", {
        playerId: OATHGUARD,
      });
    },
  },
  {
    cardId: "RF-OATH-TRU-012",
    mode: GameMode.Cooperative,
    sourceText: "Surge. When this attacks a Gate, Restore 1 Ward to the Oathguard Gate.",
    trigger: "onAttack",
    handler: (draft, ctx) => {
      if (
        ctx.attackTargetId === TARGET_HOLLOW_GATE ||
        ctx.attackTargetId === TARGET_OATHGUARD_GATE
      ) {
        log(draft, "Mirror-Sky Gryphon restores 1 Ward.", { playerId: OATHGUARD });
        restoreWard(draft, OATHGUARD, 1);
        cue(draft, "damage", ctx.selfId);
      }
    },
  },
];

registerEffects(EFFECTS);

export const TRUTHWARDENS_EFFECT_IDS = EFFECTS.map((e) => e.cardId);
