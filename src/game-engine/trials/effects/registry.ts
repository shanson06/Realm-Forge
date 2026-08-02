/**
 * Competitive digital effect registry.
 *
 * Behaviour is looked up by stable source ID from
 * realmforge_oathguard_trials_card_database.json. English rules text is NEVER
 * parsed at runtime; `sourceText` is stored only so a human can audit the mapping.
 * A card with no entry is reported NOT IMPLEMENTED and cannot be played.
 */
import type { CardDefinition } from "@/game-data/schema";
import type { TrialsDraft, TrialsMatchState, TrialsSeatId } from "../types";

export interface TrialsEffectContext {
  readonly selfId: string;
  readonly controller: TrialsSeatId;
  readonly targetIds: readonly string[];
}

export interface TrialsTargeting {
  readonly count: number;
  readonly optional: boolean;
  readonly description: string;
  /** Legal target instance IDs, computed from state only. */
  readonly candidates: (
    state: TrialsMatchState,
    controller: TrialsSeatId,
    selfId: string,
  ) => string[];
}

export interface TrialsEffect {
  readonly cardId: string;
  /** Verbatim source wording this implementation encodes, for auditability. */
  readonly sourceText: string;
  /** Targets chosen before the effect resolves. */
  readonly targeting?: TrialsTargeting;
  /** Deploy / play resolution for units, Items and one-shots. */
  readonly onPlay?: (draft: TrialsDraft, ctx: TrialsEffectContext) => void;
  /** Extra ATK for one attack against a specific target. */
  readonly attackBonus?: (state: TrialsMatchState, selfId: string, targetId: string) => number;
  /** Resolves after this unit's attack damage is applied. */
  readonly afterAttack?: (draft: TrialsDraft, selfId: string, targetId: string) => void;
  /** Resolves when this unit takes damage and survives. */
  readonly onHit?: (draft: TrialsDraft, selfId: string) => void;
  /** Continuous ATK modifier contributed by a card in play. */
  readonly atkAura?: (
    state: TrialsMatchState,
    targetInstanceId: string,
    sourceInstanceId: string,
  ) => number;
  /**
   * Follow-up prompt resolvers keyed by a stable string. The engine calls
   * `resolvers[key]` when the player answers a prompt this card opened.
   */
  readonly resolvers?: Readonly<
    Record<string, (draft: TrialsDraft, targetIds: readonly string[], selfId: string) => void>
  >;
  /** Recorded when a wording needed a documented interpretation. */
  readonly ambiguity?: string;
}

const IMPLEMENTATIONS = new Map<string, TrialsEffect>();

export function registerTrialsEffect(effect: TrialsEffect): void {
  IMPLEMENTATIONS.set(effect.cardId, effect);
}

export function registerTrialsEffects(effects: readonly TrialsEffect[]): void {
  effects.forEach(registerTrialsEffect);
}

export function getTrialsEffect(cardId: string): TrialsEffect | undefined {
  return IMPLEMENTATIONS.get(cardId);
}

export function trialsEffectCount(): number {
  return IMPLEMENTATIONS.size;
}

export type TrialsEffectStatus = "implemented" | "not-implemented" | "no-effect-required";

export function trialsEffectStatus(card: CardDefinition): TrialsEffectStatus {
  if (IMPLEMENTATIONS.has(card.id)) return "implemented";
  if (card.rules_text.trim().length === 0) return "no-effect-required";
  return "not-implemented";
}
