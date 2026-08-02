/**
 * Dawnwatch Trials QuickPlay effects.
 * Wording source: realmforge_oathguard_trials_card_database.json (Dawnwatch Trials Deck).
 */
import { drawCard, healUnit, log } from "../mutations";
import { readyUnitsOf, unitsOf } from "../queries";
import { registerTrialsEffects } from "./registry";
import { addTurnAtk } from "./helpers";

registerTrialsEffects([
  { cardId: "RF-TRIAL-DAW-001", sourceText: "Surge." },
  { cardId: "RF-TRIAL-DAW-002", sourceText: "Surge." },
  {
    cardId: "RF-TRIAL-DAW-003",
    sourceText: "Deploy: Another friendly unit gets +1 ATK this turn.",
    targeting: {
      count: 1,
      optional: true,
      description: "Another friendly unit gets +1 ATK this turn.",
      candidates: (state, controller, selfId) =>
        unitsOf(state, controller)
          .filter((u) => u.instanceId !== selfId)
          .map((u) => u.instanceId),
    },
    onPlay: (draft, ctx) => {
      if (ctx.targetIds[0]) addTurnAtk(draft, ctx.targetIds[0], 1);
    },
  },
  {
    cardId: "RF-TRIAL-DAW-004",
    sourceText: "Give a friendly unit Surge and +1 ATK this turn.",
    targeting: {
      count: 1,
      optional: false,
      description: "Give a friendly unit Surge and +1 ATK this turn.",
      candidates: (state, controller) => unitsOf(state, controller).map((u) => u.instanceId),
    },
    onPlay: (draft, ctx) => {
      const targetId = ctx.targetIds[0];
      if (!targetId) return;
      const inst = draft.instances[targetId];
      if (!inst.grantedKeywords.includes("Surge")) inst.grantedKeywords.push("Surge");
      addTurnAtk(draft, targetId, 1);
      log(draft, "Quick Rally grants Surge.", { seatId: ctx.controller });
    },
  },
  { cardId: "RF-TRIAL-DAW-005", sourceText: "Surge." },
  {
    cardId: "RF-TRIAL-DAW-006",
    sourceText: "Sync — If you control two ready units, draw 1 card.",
    onPlay: (draft, ctx) => {
      if (readyUnitsOf(draft, ctx.controller).length >= 2) drawCard(draft, ctx.controller);
      else
        log(draft, "Twin Beacon Signal finds fewer than two ready units.", {
          seatId: ctx.controller,
        });
    },
  },
  {
    cardId: "RF-TRIAL-DAW-007",
    sourceText: "Deploy: Restore 2 damage from a friendly unit.",
    targeting: {
      count: 1,
      optional: true,
      description: "Remove 2 damage from a friendly unit.",
      candidates: (state, controller) =>
        unitsOf(state, controller)
          .filter((u) => u.damage > 0)
          .map((u) => u.instanceId),
    },
    onPlay: (draft, ctx) => {
      if (ctx.targetIds[0]) healUnit(draft, ctx.targetIds[0], 2);
    },
  },
  { cardId: "RF-TRIAL-DAW-008", sourceText: "Surge." },
  {
    cardId: "RF-TRIAL-DAW-009",
    sourceText: "Up to two friendly units get +1 ATK this turn.",
    targeting: {
      count: 2,
      optional: true,
      description: "Up to two friendly units get +1 ATK this turn.",
      candidates: (state, controller) => unitsOf(state, controller).map((u) => u.instanceId),
    },
    onPlay: (draft, ctx) => {
      ctx.targetIds.slice(0, 2).forEach((id) => addTurnAtk(draft, id, 1));
    },
  },
  { cardId: "RF-TRIAL-DAW-010", sourceText: "Surge." },
]);
