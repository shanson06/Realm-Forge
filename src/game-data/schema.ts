/**
 * Realmforge source-data schema.
 *
 * These types describe the uploaded JSON databases EXACTLY as authored.
 * Stable source IDs (`id`, `source_card_id`) are never renamed or rewritten.
 */
import { z } from "zod";

/** Which edition a record belongs to. Enforced so co-op text can never leak into competitive. */
export const GameMode = {
  Cooperative: "cooperative",
  Competitive: "competitive",
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

/** Sides as spelled in the source data. */
export const CardSideSchema = z.enum([
  "Oathguard",
  "Hollow Crown",
  "Neutral Setup",
  "Trial Oathguard",
]);
export type CardSide = z.infer<typeof CardSideSchema>;

/** Card types as spelled in the source data. */
export const CardTypeSchema = z.enum([
  "Ally",
  "Creature",
  "Event",
  "Hero",
  "Item",
  "Spell",
  "Minion",
  "Relic",
  "Dark Event",
  "Shadow Spell",
  "Enemy Hero",
  "Final Boss",
  "Gate",
  "Reference",
]);
export type CardType = z.infer<typeof CardTypeSchema>;

/** Types that occupy a board space and can be played from hand. */
export const UNIT_TYPES: readonly CardType[] = ["Ally", "Creature", "Hero", "Minion", "Enemy Hero"];
export const SUPPORT_TYPES: readonly CardType[] = ["Item", "Relic"];
export const ONE_SHOT_TYPES: readonly CardType[] = ["Event", "Spell", "Dark Event", "Shadow Spell"];
/** Not shuffled into any deck — setup, reference, gates, bosses. */
export const NON_DECK_TYPES: readonly CardType[] = ["Reference", "Gate", "Final Boss"];

/** Keywords present anywhere in the two databases. */
export const KeywordSchema = z.enum([
  "Aegis",
  "Deploy",
  "Echo",
  "Fracture",
  "Response",
  "Restore",
  "Scan",
  "Shield Matrix",
  "Siphon",
  "Static",
  "Surge",
  "Sync",
]);
export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Keywords the QuickPlay brief lists as core.
 * Anything outside this set is reported as "unsupported keyword" in the content audit
 * rather than being silently implemented.
 */
export const QUICKPLAY_CORE_KEYWORDS: readonly Keyword[] = [
  "Aegis",
  "Shield Matrix",
  "Surge",
  "Deploy",
  "Echo",
  "Restore",
];

const BaseCardRecordSchema = z.object({
  id: z.string().min(1),
  side: CardSideSchema,
  faction: z.string().min(1),
  deck: z.string().min(1),
  name: z.string().min(1),
  rarity: z.string().min(1),
  type: CardTypeSchema,
  cost: z.number().int().min(0),
  atk: z.number().int().nullable(),
  def: z.number().int().nullable(),
  keywords: z.array(KeywordSchema),
  rules_text: z.string(),
  flavor_text: z.string(),
  art_brief: z.string(),
  art_prompt: z.string(),
  frame_notes: z.string(),
  copies_in_deck: z.number().int().min(0),
});

export const CooperativeCardRecordSchema = BaseCardRecordSchema;

export const CompetitiveCardRecordSchema = BaseCardRecordSchema.extend({
  edition: z.string().min(1),
  source_card_id: z.string().min(1),
  legality: z.string().min(1),
});

export type CooperativeCardRecord = z.infer<typeof CooperativeCardRecordSchema>;
export type CompetitiveCardRecord = z.infer<typeof CompetitiveCardRecordSchema>;
export type CardRecord =
  CooperativeCardRecord | (Partial<CompetitiveCardRecord> & CooperativeCardRecord);

/**
 * A validated card definition, tagged with its owning mode.
 * The `mode` tag is what makes cross-mode leakage a type error and a runtime error.
 */
export interface CardDefinition extends CooperativeCardRecord {
  readonly mode: GameMode;
  readonly edition?: string;
  readonly sourceCardId?: string;
  readonly legality?: string;
  /** Absolute or app-relative art URL. `null` until production art exists. */
  readonly artUrl: string | null;
}

export interface ValidationIssue {
  readonly severity: "error" | "warning" | "info";
  readonly code:
    | "schema"
    | "duplicate-id"
    | "duplicate-title"
    | "missing-stat"
    | "missing-art"
    | "unsupported-keyword"
    | "cross-mode"
    | "ambiguous"
    | "deck-size";
  readonly cardId: string | null;
  readonly message: string;
}
