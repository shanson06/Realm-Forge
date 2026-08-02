/**
 * Digital effect registry.
 *
 * Card behaviour is looked up by stable source ID. English rules text is NEVER
 * parsed at runtime. A card with no registry entry is reported as NOT IMPLEMENTED
 * and must not be made playable.
 */
import type { CardDefinition, GameMode, Keyword } from "@/game-data/schema";
import type { ActiveModifier, MatchDraft, MatchState, SideId, TargetRule } from "../types";

/** Declarative operations the Phase 3 resolver will execute. Data only — no logic here. */
export type EffectOp =
  | { readonly op: "dealDamage"; readonly amount: number; readonly targetRuleId: string }
  | { readonly op: "restoreWard"; readonly amount: number; readonly side: "friendly" | "enemy" }
  | { readonly op: "drawCards"; readonly amount: number }
  | { readonly op: "discardCards"; readonly amount: number }
  | {
      readonly op: "modifyAtk";
      readonly amount: number;
      readonly duration: "attack" | "turn" | "permanent";
      readonly targetRuleId: string;
    }
  | { readonly op: "grantKeyword"; readonly keyword: Keyword; readonly targetRuleId: string }
  | { readonly op: "gainTemporaryEnergy"; readonly amount: number };

export type EffectTrigger =
  | "deploy"
  | "onAttack"
  | "onHit"
  | "onDefeat"
  | "activated"
  | "static"
  | "echo";

/** Context handed to a typed effect handler. Never contains English rules text. */
export interface EffectContext {
  readonly selfId: string;
  readonly controllerId: SideId;
  readonly targetIds: readonly string[];
  /** Attack target when the trigger is onAttack. */
  readonly attackTargetId?: string;
}

export type EffectHandler = (draft: MatchDraft, ctx: EffectContext) => void;

/** Extra attack-time rules a card imposes, evaluated by the engine (never parsed). */
export type AttackTargetRule =
  | "lowest-remaining-def-unit"
  | "lowest-printed-def-unit"
  | "gate-if-able";

export type AegisRule =
  | "ignore-when-target-damaged"
  | "ignore-first-attack-each-game"
  | "always-ignore";

/**
 * A continuous ATK modifier contributed by a card in play.
 * Evaluated by `attackOf`, so the value is always visible in state-derived UI.
 */
export type AtkAura = (
  state: MatchState,
  targetInstanceId: string,
  sourceInstanceId: string,
) => number;

export interface EffectImplementation {
  readonly cardId: string;
  readonly mode: GameMode;
  /** Verbatim source text this implementation encodes, for auditability. */
  readonly sourceText: string;
  readonly trigger: EffectTrigger;
  readonly targets?: readonly TargetRule[];
  readonly ops?: readonly EffectOp[];
  /** Typed implementation. Absent for cards whose whole behaviour is a rule below. */
  readonly handler?: EffectHandler;
  /**
   * Resolves after this unit's own attack damage has been applied.
   * `ctx.attackTargetId` is the declared target.
   */
  readonly afterAttack?: EffectHandler;
  /** Resolves when this unit takes damage and survives. */
  readonly onHit?: EffectHandler;
  readonly attackTargetRule?: AttackTargetRule;
  readonly aegisRule?: AegisRule;
  readonly atkAura?: AtkAura;
  /** Extra ATK this card contributes when it attacks a Gate. */
  readonly gateAttackBonus?: number;
  /** Extra ATK every friendly unit contributes when attacking a Gate. */
  readonly gateAttackAura?: number;
  /**
   * A modifier this card re-applies at the start of every round while it is in play.
   * Used for "each round" relics so nothing has to be reset by UI code.
   */
  readonly roundStartModifier?: Omit<ActiveModifier, "id">;
  /** Set when a source wording could not be implemented without a decision. */
  readonly ambiguity?: string;
}

export type EffectStatus = "implemented" | "not-implemented" | "no-effect-required";

function key(mode: GameMode, cardId: string): string {
  return `${mode}:${cardId}`;
}

/**
 * INTENTIONALLY EMPTY IN PHASE 2.
 *
 * Effects are authored one at a time against approved QuickPlay rules text in Phase 3.
 * Nothing is inferred from `rules_text`.
 */
const IMPLEMENTATIONS = new Map<string, EffectImplementation>();

export function registerEffect(impl: EffectImplementation): void {
  // Idempotent so hot reloads and repeated imports cannot corrupt the table.
  IMPLEMENTATIONS.set(key(impl.mode, impl.cardId), impl);
}

export function registerEffects(impls: readonly EffectImplementation[]): void {
  impls.forEach(registerEffect);
}

export function getEffect(mode: GameMode, cardId: string): EffectImplementation | undefined {
  return IMPLEMENTATIONS.get(key(mode, cardId));
}

export function getEffectStatus(card: CardDefinition): EffectStatus {
  if (getEffect(card.mode, card.id)) return "implemented";
  if (card.rules_text.trim().length === 0) return "no-effect-required";
  return "not-implemented";
}

export function registeredEffectCount(): number {
  return IMPLEMENTATIONS.size;
}

export interface EffectCoverageRow {
  readonly cardId: string;
  readonly name: string;
  readonly mode: GameMode;
  readonly deck: string;
  readonly status: EffectStatus;
  readonly sourceText: string;
}

export interface EffectCoverage {
  readonly total: number;
  readonly implemented: number;
  readonly notImplemented: number;
  readonly rows: readonly EffectCoverageRow[];
}

export function computeCoverage(cards: readonly CardDefinition[]): EffectCoverage {
  const rows: EffectCoverageRow[] = cards.map((card) => ({
    cardId: card.id,
    name: card.name,
    mode: card.mode,
    deck: card.deck,
    status: getEffectStatus(card),
    sourceText: card.rules_text,
  }));
  return {
    total: rows.length,
    implemented: rows.filter((r) => r.status === "implemented").length,
    notImplemented: rows.filter((r) => r.status === "not-implemented").length,
    rows,
  };
}