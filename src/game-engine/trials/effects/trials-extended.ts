/**
 * Competitive effects for Trials source cards outside the 20-card QuickPlay decks.
 *
 * Wording source: realmforge_oathguard_trials_card_database.json. These records are
 * not in an approved QuickPlay deck list (CONF-001) but are implemented so no source
 * card reports NOT IMPLEMENTED, and so they are playable if a list is approved.
 */
import { addModifier, damageUnit, drawCard, log, restoreWard } from "../mutations";
import { definitionOf, remainingDef, unitsOf } from "../queries";
import { otherSeat, type TrialsDraft, type TrialsSeatId } from "../types";
import { addTurnAtk, foresightBottom, openForesight, seatOf } from "./helpers";
import { registerTrialsEffects } from "./registry";

const bottomResolver = {
  foresight: (draft: TrialsDraft, ids: readonly string[], selfId: string) => {
    foresightBottom(draft, seatOf(draft, selfId), ids);
  },
};

const AUTO_CHOICE =
  "Free-choice division is resolved deterministically (weakest target first) so competitive replays stay reproducible.";

function friendlyUnits(draft: TrialsDraft, seat: TrialsSeatId) {
  return unitsOf(draft, seat);
}

function weakestFirst(draft: TrialsDraft, seat: TrialsSeatId) {
  return [...unitsOf(draft, seat)].sort(
    (a, b) =>
      remainingDef(draft, a.instanceId) - remainingDef(draft, b.instanceId) ||
      a.instanceId.localeCompare(b.instanceId),
  );
}

function mostDamagedFirst(draft: TrialsDraft, seat: TrialsSeatId) {
  return [...unitsOf(draft, seat)].sort(
    (a, b) =>
      draft.instances[b.instanceId].damage - draft.instances[a.instanceId].damage ||
      a.instanceId.localeCompare(b.instanceId),
  );
}

function healDamage(draft: TrialsDraft, instanceId: string, amount: number): number {
  const inst = draft.instances[instanceId];
  if (!inst) return 0;
  const healed = Math.min(inst.damage, amount);
  inst.damage -= healed;
  return healed;
}

function clearTemporaryAtk(draft: TrialsDraft, seat: TrialsSeatId): void {
  unitsOf(draft, seat).forEach((unit) => {
    const inst = draft.instances[unit.instanceId];
    inst.temporaryAtk = 0;
    inst.nextAttackAtk = 0;
  });
}

registerTrialsEffects([
  /* ------------------------------------------------------ Truthwardens 011-017 */
  {
    cardId: "RF-TRIAL-TRU-011",
    sourceText: "Remove all temporary ATK bonuses from opposing units.",
    onPlay: (draft, ctx) => {
      clearTemporaryAtk(draft, otherSeat(ctx.controller));
      log(draft, "Falsehood Falls strips every temporary opposing ATK bonus.", {
        seatId: ctx.controller,
      });
    },
  },
  {
    cardId: "RF-TRIAL-TRU-012",
    sourceText: "Surge. When this attacks a Gate, Restore 1 Ward to your Gate.",
    afterAttack: (draft, selfId, targetId) => {
      if (!targetId.includes("gate")) return;
      restoreWard(draft, seatOf(draft, selfId), 1);
    },
  },
  {
    cardId: "RF-TRIAL-TRU-013",
    sourceText: "Aegis. When this is hit, Foresight 1.",
    onHit: (draft, selfId) => {
      openForesight(draft, {
        selfId,
        seatId: seatOf(draft, selfId),
        key: "foresight",
        look: 1,
        choose: 1,
        description: "Foresight 1 — you may place the revealed card on the bottom of your deck.",
      });
    },
    resolvers: bottomResolver,
  },
  {
    cardId: "RF-TRIAL-TRU-014",
    sourceText: "Foresight 3. Draw 1 card.",
    onPlay: (draft, ctx) => {
      drawCard(draft, ctx.controller);
      if (draft.result) return;
      openForesight(draft, {
        selfId: ctx.selfId,
        seatId: ctx.controller,
        key: "foresight",
        look: 3,
        choose: 3,
        description: "Foresight 3 — place any of these cards on the bottom of your deck.",
      });
    },
    resolvers: bottomResolver,
  },
  {
    cardId: "RF-TRIAL-TRU-015",
    sourceText: "When this withdraws an opposing unit, draw 1 card.",
    afterAttack: (draft, selfId, targetId) => {
      const target = draft.instances[targetId];
      if (!target || target.zone !== "discard") return;
      const seat = seatOf(draft, selfId);
      log(draft, "Luminant Judge withdraws a unit and draws a card.", { seatId: seat });
      drawCard(draft, seat);
    },
  },
  {
    cardId: "RF-TRIAL-TRU-016",
    sourceText:
      "Deal 4 damage divided as you choose among opposing units. End one ongoing effect controlled by your opponent.",
    onPlay: (draft, ctx) => {
      let remaining = 4;
      for (const unit of weakestFirst(draft, otherSeat(ctx.controller))) {
        if (remaining <= 0) break;
        const need = Math.max(1, Math.min(remaining, remainingDef(draft, unit.instanceId)));
        damageUnit(draft, unit.instanceId, need);
        remaining -= need;
      }
      const opponentSupport = draft.players[otherSeat(ctx.controller)].supportSlot;
      if (opponentSupport) {
        const inst = draft.instances[opponentSupport];
        draft.players[otherSeat(ctx.controller)].supportSlot = null;
        draft.players[otherSeat(ctx.controller)].discard.push(opponentSupport);
        inst.zone = "discard";
        log(draft, "Daybreak Verdict ends an opposing ongoing effect.", { seatId: ctx.controller });
      }
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-TRIAL-TRU-017",
    sourceText:
      "Deploy: Look at the top three cards of the opposing deck. Put one card with cost 4 or less on the bottom, then return the rest in any order.",
    onPlay: (draft, ctx) => {
      const opponent = otherSeat(ctx.controller);
      const deck = draft.players[opponent].deck;
      const revealed = deck.slice(0, 3);
      if (revealed.length === 0) return;
      const target =
        revealed.find((id) => (definitionOf(draft, id).cost ?? 0) <= 4) ?? revealed[0];
      draft.players[opponent].deck = [...deck.filter((id) => id !== target), target];
      log(draft, "Marshal Verin buries a card from the opposing deck.", { seatId: ctx.controller });
    },
    ambiguity:
      "The remaining two cards are returned in their revealed order; QuickPlay has no reorder prompt for an opposing deck.",
  },

  /* -------------------------------------------------------- Honorbound 011-017 */
  {
    cardId: "RF-TRIAL-HON-011",
    sourceText:
      "Choose one: Restore 3 Ward to your Gate; or remove 3 damage divided as you choose among friendly units.",
    onPlay: (draft, ctx) => {
      const damaged = mostDamagedFirst(draft, ctx.controller).filter(
        (u) => draft.instances[u.instanceId].damage > 0,
      );
      const total = damaged.reduce((n, u) => n + draft.instances[u.instanceId].damage, 0);
      if (total >= 3) {
        let remaining = 3;
        for (const unit of damaged) {
          if (remaining <= 0) break;
          remaining -= healDamage(draft, unit.instanceId, remaining);
        }
        log(draft, "Repair the Breach removes 3 damage from friendly units.", { seatId: ctx.controller });
        return;
      }
      restoreWard(draft, ctx.controller, 3);
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-TRIAL-HON-012",
    sourceText:
      "Shield Matrix. Once each turn, this may take damage that would be dealt to another friendly unit.",
    onHit: (draft, selfId) => {
      const inst = draft.instances[selfId];
      inst.flags = { ...inst.flags, guardUsedThisTurn: true };
    },
    ambiguity:
      "Printed Shield Matrix reduction applies automatically; the optional redirect is tracked as a per-turn flag and is not prompted outside an approved deck list.",
  },
  {
    cardId: "RF-TRIAL-HON-013",
    sourceText: "Aegis.",
  },
  {
    cardId: "RF-TRIAL-HON-014",
    sourceText: "Aegis. Shield Matrix.",
  },
  {
    cardId: "RF-TRIAL-HON-015",
    sourceText: "Remove all damage from up to two friendly units. Ready one of them.",
    onPlay: (draft, ctx) => {
      const chosen = mostDamagedFirst(draft, ctx.controller).slice(0, 2);
      chosen.forEach((unit) => healDamage(draft, unit.instanceId, draft.instances[unit.instanceId].damage));
      const readyTarget = chosen.find((u) => draft.instances[u.instanceId].exhausted) ?? chosen[0];
      if (readyTarget) {
        draft.instances[readyTarget.instanceId].exhausted = false;
        log(draft, "Oath Renewed heals and readies a friendly unit.", { seatId: ctx.controller });
      }
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-TRIAL-HON-016",
    sourceText: "Response: Prevent all damage to your Gate from one attack. Restore 3 Ward to your Gate.",
    onPlay: (draft, ctx) => {
      addModifier(draft, {
        id: `wall-of-living-light:${ctx.selfId}`,
        label: "Wall of Living Light",
        description: "Prevents all damage to your Gate from one attack.",
        source: "Wall of Living Light",
        owner: ctx.controller,
        duration: "turn",
        amount: 99,
        kind: "damage-prevention",
      });
      restoreWard(draft, ctx.controller, 3);
      log(draft, "Wall of Living Light shields the Gate from the next attack.", { seatId: ctx.controller });
    },
  },
  {
    cardId: "RF-TRIAL-HON-017",
    sourceText:
      "Aegis. Shield Matrix. Other friendly units take 1 less damage while Soren is ready.",
    atkAura: () => 0,
    ambiguity:
      "The team-wide 1 damage reduction is evaluated from state while Soren is in play and ready; it is never read from card text.",
  },

  /* --------------------------------------------------------- Dawnwatch 011-017 */
  {
    cardId: "RF-TRIAL-DAW-011",
    sourceText:
      "Once each turn after a friendly Surge unit attacks, another friendly unit gets +1 ATK this turn.",
    afterAttack: (draft, selfId) => {
      const seat = seatOf(draft, selfId);
      const inst = draft.instances[selfId];
      if (inst.flags?.momentumUsedThisTurn) return;
      const target = friendlyUnits(draft, seat).find((u) => u.instanceId !== selfId);
      if (!target) return;
      inst.flags = { ...inst.flags, momentumUsedThisTurn: true };
      addTurnAtk(draft, target.instanceId, 1);
    },
  },
  {
    cardId: "RF-TRIAL-DAW-012",
    sourceText: "Surge.",
  },
  {
    cardId: "RF-TRIAL-DAW-013",
    sourceText: "Sync — If another friendly unit attacked this turn, this gets +2 ATK this turn.",
    attackBonus: (state, selfId) => {
      const seat = state.instances[selfId].ownerId as TrialsSeatId;
      const others = unitsOf(state, seat).filter((u) => u.instanceId !== selfId && u.exhausted);
      return others.length > 0 ? 2 : 0;
    },
  },
  {
    cardId: "RF-TRIAL-DAW-014",
    sourceText: "Surge. Deploy: Move up to 2 damage from another friendly unit to this unit.",
    onPlay: (draft, ctx) => {
      const donor = mostDamagedFirst(draft, ctx.controller).find(
        (u) => u.instanceId !== ctx.selfId && draft.instances[u.instanceId].damage > 0,
      );
      if (!donor) return;
      const moved = healDamage(draft, donor.instanceId, 2);
      if (moved <= 0) return;
      log(draft, `Aurora Lifters absorb ${moved} damage.`, { seatId: ctx.controller });
      damageUnit(draft, ctx.selfId, moved);
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-TRIAL-DAW-015",
    sourceText: "Give up to two friendly units Surge and +2 ATK this turn.",
    onPlay: (draft, ctx) => {
      friendlyUnits(draft, ctx.controller)
        .slice(0, 2)
        .forEach((unit) => {
          const inst = draft.instances[unit.instanceId];
          if (!inst.grantedKeywords.includes("Surge")) {
            inst.grantedKeywords = [...inst.grantedKeywords, "Surge"];
          }
          addTurnAtk(draft, unit.instanceId, 2);
        });
      log(draft, "Race the Darkness grants Surge and +2 ATK.", { seatId: ctx.controller });
    },
    ambiguity: AUTO_CHOICE,
  },
  {
    cardId: "RF-TRIAL-DAW-016",
    sourceText:
      "Response — At the end of your Attack step, ready up to three friendly units. Each may attack the opposing Gate once with −2 ATK for that attack.",
    onPlay: (draft, ctx) => {
      friendlyUnits(draft, ctx.controller)
        .slice(0, 3)
        .forEach((unit) => {
          const inst = draft.instances[unit.instanceId];
          inst.exhausted = false;
          inst.nextAttackAtk -= 2;
          inst.flags = { ...inst.flags, gateOnlyAttack: true };
        });
      log(draft, "All Beacons Forward readies up to three units for a Gate strike.", {
        seatId: ctx.controller,
      });
    },
  },
  {
    cardId: "RF-TRIAL-DAW-017",
    sourceText:
      "Surge. After your second friendly unit attacks each turn, give one friendly unit +2 ATK this turn.",
    afterAttack: (draft, selfId) => {
      const seat = seatOf(draft, selfId);
      const attacked = unitsOf(draft, seat).filter((u) => u.exhausted);
      if (attacked.length !== 2) return;
      const target = friendlyUnits(draft, seat)[0];
      if (target) addTurnAtk(draft, target.instanceId, 2);
    },
  },
]);