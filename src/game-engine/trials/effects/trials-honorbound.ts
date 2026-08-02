/**
 * Honorbound Trials QuickPlay effects.
 * Wording source: realmforge_oathguard_trials_card_database.json (Honorbound Trials Deck).
 */
import { healUnit, log, restoreWard, addModifier } from "../mutations";
import { hasKeyword, unitsOf } from "../queries";
import { type TrialsSeatId } from "../types";
import { registerTrialsEffects } from "./registry";

function damagedFriendlyUnits(state: Parameters<typeof unitsOf>[0], controller: TrialsSeatId) {
  return unitsOf(state, controller)
    .filter((u) => u.damage > 0)
    .map((u) => u.instanceId);
}

registerTrialsEffects([
  {
    cardId: "RF-TRIAL-HON-001",
    sourceText: "Deploy: Restore 1 damage from a friendly unit.",
    targeting: {
      count: 1,
      optional: true,
      description: "Remove 1 damage from a friendly unit.",
      candidates: (state, controller) => damagedFriendlyUnits(state, controller),
    },
    onPlay: (draft, ctx) => {
      if (ctx.targetIds[0]) healUnit(draft, ctx.targetIds[0], 1);
    },
  },
  {
    cardId: "RF-TRIAL-HON-002",
    sourceText: "Shield Matrix.",
  },
  {
    cardId: "RF-TRIAL-HON-003",
    sourceText: "Aegis.",
  },
  {
    cardId: "RF-TRIAL-HON-004",
    sourceText: "Restore 3 Ward to your Gate.",
    onPlay: (draft, ctx) => restoreWard(draft, ctx.controller, 3),
  },
  {
    cardId: "RF-TRIAL-HON-005",
    sourceText: "Aegis.",
  },
  {
    cardId: "RF-TRIAL-HON-006",
    sourceText: "Response: Prevent the next 3 damage to a friendly unit or your Gate this turn.",
    onPlay: (draft, ctx) => {
      addModifier(draft, {
        id: `interpose:${ctx.controller}`,
        label: "Interpose",
        description: "Prevents the next 3 damage to your units or Gate this turn.",
        source: "Interpose",
        owner: ctx.controller,
        duration: "turn",
        amount: 3,
        kind: "damage-prevention",
      });
      log(draft, `${draft.players[ctx.controller].displayName} readies Interpose (prevent 3).`, {
        seatId: ctx.controller,
      });
    },
    ambiguity:
      "QuickPlay has no Response window, so the shield is created when the card is played and lasts until the end of that turn cycle.",
  },
  {
    cardId: "RF-TRIAL-HON-007",
    sourceText: "Aegis. Shield Matrix.",
  },
  {
    cardId: "RF-TRIAL-HON-008",
    sourceText: "Friendly units with Aegis have +1 ATK.",
    atkAura: (state, targetInstanceId, sourceInstanceId) => {
      const source = state.instances[sourceInstanceId];
      const target = state.instances[targetInstanceId];
      if (!source || !target || target.zone !== "unitSlot") return 0;
      if (target.ownerId !== source.ownerId) return 0;
      return hasKeyword(state, targetInstanceId, "Aegis") ? 1 : 0;
    },
  },
  {
    cardId: "RF-TRIAL-HON-009",
    sourceText:
      "Deploy: Restore 1 Ward to your Gate. If you control a unit with Shield Matrix, Restore 2 Ward instead.",
    onPlay: (draft, ctx) => {
      const shielded = unitsOf(draft, ctx.controller).some(
        (u) => u.instanceId !== ctx.selfId && hasKeyword(draft, u.instanceId, "Shield Matrix"),
      );
      restoreWard(draft, ctx.controller, shielded ? 2 : 1);
    },
  },
  {
    cardId: "RF-TRIAL-HON-010",
    sourceText: "Aegis.",
  },
]);
