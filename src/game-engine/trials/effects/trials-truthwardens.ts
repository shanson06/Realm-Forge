/**
 * Truthwardens Trials QuickPlay effects.
 * Wording source: realmforge_oathguard_trials_card_database.json (Truthwardens Trials Deck).
 */
import { drawCard, damageUnit, discardFromHand, moveToDiscard, log, restoreWard } from "../mutations";
import { definitionOf, remainingDef, unitsOf } from "../queries";
import { otherSeat, type TrialsDraft, type TrialsMatchState, type TrialsSeatId } from "../types";
import {
  addNextAttackAtk,
  foresightBottom,
  openForesight,
  openDiscard,
  openSelect,
  seatOf,
} from "./helpers";
import { registerTrialsEffects } from "./registry";

const bottomResolver = {
  foresight: (draft: TrialsDraft, ids: readonly string[], selfId: string) => {
    foresightBottom(draft, seatOf(draft, selfId), ids);
  },
};

function enemyUnits(state: TrialsMatchState, controller: TrialsSeatId) {
  return unitsOf(state, otherSeat(controller));
}

registerTrialsEffects([
  {
    cardId: "RF-TRIAL-TRU-001",
    sourceText: "Deploy — Foresight 1.",
    onPlay: (draft, ctx) => {
      openForesight(draft, {
        selfId: ctx.selfId,
        seatId: ctx.controller,
        key: "foresight",
        look: 1,
        choose: 1,
        description: "Foresight 1 — you may place the revealed card on the bottom of your deck.",
      });
    },
    resolvers: bottomResolver,
  },
  {
    cardId: "RF-TRIAL-TRU-002",
    sourceText: "When this attacks a damaged opposing unit, it gets +1 ATK for that attack.",
    attackBonus: (state, _selfId, targetId) => {
      const target = state.instances[targetId];
      return target && target.zone === "unitSlot" && target.damage > 0 ? 1 : 0;
    },
  },
  {
    cardId: "RF-TRIAL-TRU-003",
    sourceText: "Deploy: Draw 1 card, then discard 1 card.",
    onPlay: (draft, ctx) => {
      drawCard(draft, ctx.controller);
      if (draft.result) return;
      openDiscard(draft, {
        selfId: ctx.selfId,
        seatId: ctx.controller,
        key: "discard",
        description: "Choose one card to discard.",
      });
    },
    resolvers: {
      discard: (draft, ids, selfId) => {
        const seat = seatOf(draft, selfId);
        if (ids[0]) discardFromHand(draft, seat, ids[0]);
      },
    },
  },
  {
    cardId: "RF-TRIAL-TRU-004",
    sourceText: "Look at the top two cards of your deck. Put one on the bottom and one on top.",
    onPlay: (draft, ctx) => {
      openForesight(draft, {
        selfId: ctx.selfId,
        seatId: ctx.controller,
        key: "foresight",
        look: 2,
        choose: 1,
        description:
          "Look at the top two cards. Choose one to place on the bottom; the other stays on top.",
      });
    },
    resolvers: bottomResolver,
  },
  {
    cardId: "RF-TRIAL-TRU-005",
    sourceText: "When this attacks, look at the top card of your deck. You may place it on the bottom.",
    afterAttack: (draft, selfId) => {
      openForesight(draft, {
        selfId,
        seatId: seatOf(draft, selfId),
        key: "foresight",
        look: 1,
        choose: 1,
        description: "You may place the revealed card on the bottom of your deck.",
      });
    },
    resolvers: bottomResolver,
  },
  {
    cardId: "RF-TRIAL-TRU-006",
    sourceText:
      "Discard an opposing Item with cost 3 or less, or end one opposing ongoing effect created by a card with cost 3 or less.",
    targeting: {
      count: 1,
      optional: true,
      description: "Choose an opposing Support card with cost 3 or less to discard.",
      candidates: (state, controller) => {
        const support = state.players[otherSeat(controller)].supportSlot;
        if (!support) return [];
        return definitionOf(state, support).cost <= 3 ? [support] : [];
      },
    },
    onPlay: (draft, ctx) => {
      const target = ctx.targetIds[0];
      if (!target) {
        log(draft, "Unmask the Plot finds no qualifying opposing Support card.", {
          seatId: ctx.controller,
        });
        return;
      }
      log(draft, `Unmask the Plot discards ${definitionOf(draft, target).name}.`, {
        seatId: ctx.controller,
      });
      moveToDiscard(draft, target);
    },
    ambiguity:
      "QuickPlay has no separate ongoing-effect zone, so this implements the Item clause only.",
  },
  {
    cardId: "RF-TRIAL-TRU-007",
    sourceText:
      "When this attacks an opposing unit that has the lowest remaining DEF among opposing units, it gets +1 ATK for that attack.",
    attackBonus: (state, selfId, targetId) => {
      const self = state.instances[selfId];
      const target = state.instances[targetId];
      if (!self || !target || target.zone !== "unitSlot") return 0;
      const pool = enemyUnits(state, self.ownerId as TrialsSeatId);
      if (pool.length === 0) return 0;
      const lowest = Math.min(...pool.map((u) => remainingDef(state, u.instanceId)));
      return remainingDef(state, targetId) === lowest ? 1 : 0;
    },
  },
  {
    cardId: "RF-TRIAL-TRU-008",
    sourceText: "Aegis. Deploy: Restore 1 Ward to your Gate.",
    onPlay: (draft, ctx) => restoreWard(draft, ctx.controller, 1),
  },
  {
    cardId: "RF-TRIAL-TRU-009",
    sourceText:
      "Foresight 2. Once each turn after you use Foresight, one friendly unit gets +1 ATK for its next attack this turn.",
    onPlay: (draft, ctx) => {
      openForesight(draft, {
        selfId: ctx.selfId,
        seatId: ctx.controller,
        key: "foresight",
        look: 2,
        choose: 2,
        description: "Foresight 2 — choose any of these cards to place on the bottom.",
      });
    },
    resolvers: {
      foresight: (draft, ids, selfId) => {
        const seat = seatOf(draft, selfId);
        foresightBottom(draft, seat, ids);
        openSelect(draft, {
          selfId,
          seatId: seat,
          key: "boost",
          candidates: unitsOf(draft, seat).map((u) => u.instanceId),
          count: 1,
          optional: true,
          description: "One friendly unit gets +1 ATK for its next attack this turn.",
        });
      },
      boost: (draft, ids) => {
        if (ids[0]) addNextAttackAtk(draft, ids[0], 1);
      },
    },
    ambiguity:
      "QuickPlay resolves the Item's Foresight when it is played; the once-each-turn bonus follows that use.",
  },
  {
    cardId: "RF-TRIAL-TRU-010",
    sourceText:
      "Deploy: Deal 1 damage to an opposing unit that entered play since the end of your last turn.",
    targeting: {
      count: 1,
      optional: true,
      description: "Deal 1 damage to an opposing unit that entered play since your last turn.",
      candidates: (state, controller) =>
        unitsOf(state, otherSeat(controller))
          .filter((u) => u.enteredOnRound >= state.turnSequence - 1)
          .map((u) => u.instanceId),
    },
    onPlay: (draft, ctx) => {
      if (ctx.targetIds[0]) damageUnit(draft, ctx.targetIds[0], 1);
    },
  },
]);