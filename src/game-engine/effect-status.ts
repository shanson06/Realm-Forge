/**
 * Mode-aware effect lookup for display code.
 *
 * Importing a bare registry module does NOT install any effects — registration
 * happens as a side effect of the two entry points imported below. Cooperative
 * and competitive cards live in separate tables, so display code must dispatch
 * on `card.mode` instead of reading one registry. UI that imported
 * `effects/registry` directly reported every card as NOT IMPLEMENTED.
 */
import type { CardDefinition } from "@/game-data/schema";
import { GameMode, NON_DECK_TYPES } from "@/game-data/schema";
import {
  getEffect,
  getEffectStatus,
  registeredEffectCount,
  type EffectCoverage,
} from "./effects";
import {
  getTrialsEffect,
  trialsEffectCount,
  trialsEffectStatus,
} from "./trials/effects";

export type CardEffectStatus = "implemented" | "not-implemented" | "no-effect-required";

export interface CardEffectSummary {
  readonly status: CardEffectStatus;
  /** Registry trigger, when one is registered. */
  readonly trigger?: string;
  readonly ambiguity?: string;
}

export function cardEffectStatus(card: CardDefinition): CardEffectStatus {
  // Setup, reference and Gate/Boss records are never played as cards. Their
  // numbers live in match setup and boss profiles, so they require no card effect.
  if (NON_DECK_TYPES.includes(card.type)) return "no-effect-required";
  return card.mode === GameMode.Competitive ? trialsEffectStatus(card) : getEffectStatus(card);
}

export function cardEffectSummary(card: CardDefinition): CardEffectSummary {
  if (NON_DECK_TYPES.includes(card.type)) {
    return { status: "no-effect-required" };
  }
  if (card.mode === GameMode.Competitive) {
    const effect = getTrialsEffect(card.id);
    // Competitive effects carry no single trigger field; describe the hooks used.
    const hooks = effect
      ? [
          effect.onPlay && "deploy",
          effect.attackBonus && "attack",
          effect.afterAttack && "after attack",
          effect.onHit && "on hit",
          effect.atkAura && "aura",
        ].filter(Boolean)
      : [];
    return {
      status: trialsEffectStatus(card),
      trigger: hooks.length > 0 ? hooks.join(" + ") : undefined,
      ambiguity: effect?.ambiguity,
    };
  }
  const effect = getEffect(card.mode, card.id);
  return {
    status: getEffectStatus(card),
    trigger: effect?.trigger,
    ambiguity: effect?.ambiguity,
  };
}

/** Total typed effects installed across both modes. */
export function totalRegisteredEffectCount(): number {
  return registeredEffectCount() + trialsEffectCount();
}

/** Mode-aware coverage across a mixed card list. Replaces the co-op-only version. */
export function computeCardCoverage(cards: readonly CardDefinition[]): EffectCoverage {
  const rows = cards.map((card) => ({
    cardId: card.id,
    name: card.name,
    mode: card.mode,
    deck: card.deck,
    status: cardEffectStatus(card),
    sourceText: card.rules_text,
  }));
  return {
    total: rows.length,
    implemented: rows.filter((r) => r.status === "implemented").length,
    notImplemented: rows.filter((r) => r.status === "not-implemented").length,
    rows,
  };
}
