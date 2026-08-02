/**
 * Loads, validates and indexes the uploaded Realmforge JSON databases.
 *
 * Pure module — no React, no browser APIs. Safe to import from tests and SSR.
 */
import cooperativeJson from "./sources/cooperative-master.json";
import competitiveJson from "./sources/competitive-trials.json";
import {
  CompetitiveCardRecordSchema,
  CooperativeCardRecordSchema,
  GameMode,
  NON_DECK_TYPES,
  ONE_SHOT_TYPES,
  QUICKPLAY_CORE_KEYWORDS,
  SUPPORT_TYPES,
  UNIT_TYPES,
  type CardDefinition,
  type CardType,
  type Keyword,
  type ValidationIssue,
} from "./schema";

export interface SourceFileStatus {
  readonly fileName: string;
  readonly mode: GameMode;
  readonly recordsInFile: number;
  readonly recordsAccepted: number;
  readonly recordsRejected: number;
  readonly status: "ok" | "degraded" | "failed";
}

export interface LoadedCatalog {
  readonly mode: GameMode;
  readonly cards: readonly CardDefinition[];
  readonly byId: ReadonlyMap<string, CardDefinition>;
  readonly byDeck: ReadonlyMap<string, readonly CardDefinition[]>;
  readonly issues: readonly ValidationIssue[];
  readonly source: SourceFileStatus;
}

function requiredStatsFor(type: CardType): { atk: boolean; def: boolean } {
  if (UNIT_TYPES.includes(type) || type === "Final Boss") return { atk: true, def: true };
  if (type === "Gate") return { atk: false, def: true };
  return { atk: false, def: false };
}

function validateCard(card: CardDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const needs = requiredStatsFor(card.type);

  if (needs.atk && card.atk === null) {
    issues.push({
      severity: "error",
      code: "missing-stat",
      cardId: card.id,
      message: `${card.name} (${card.type}) is missing ATK.`,
    });
  }
  if (needs.def && card.def === null) {
    issues.push({
      severity: "error",
      code: "missing-stat",
      cardId: card.id,
      message: `${card.name} (${card.type}) is missing DEF.`,
    });
  }
  if (!needs.atk && !needs.def && card.atk !== null && card.def !== null) {
    issues.push({
      severity: "warning",
      code: "ambiguous",
      cardId: card.id,
      message: `${card.name} (${card.type}) carries ATK/DEF but is not a board unit.`,
    });
  }
  if (card.rules_text.trim().length === 0) {
    issues.push({
      severity: "error",
      code: "schema",
      cardId: card.id,
      message: `${card.name} has empty rules text.`,
    });
  }
  if (card.artUrl === null) {
    issues.push({
      severity: "info",
      code: "missing-art",
      cardId: card.id,
      message: `${card.name} has no production art. Art brief present: ${card.art_brief.length > 0}.`,
    });
  }
  for (const keyword of card.keywords) {
    if (!QUICKPLAY_CORE_KEYWORDS.includes(keyword)) {
      issues.push({
        severity: "warning",
        code: "unsupported-keyword",
        cardId: card.id,
        message: `${card.name} uses "${keyword}", which is outside the QuickPlay core keyword set.`,
      });
    }
  }
  return issues;
}

function buildCatalog(raw: unknown, mode: GameMode, fileName: string): LoadedCatalog {
  const rows = Array.isArray(raw) ? raw : [];
  const schema =
    mode === GameMode.Competitive ? CompetitiveCardRecordSchema : CooperativeCardRecordSchema;

  const issues: ValidationIssue[] = [];
  const cards: CardDefinition[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      const id =
        typeof (row as { id?: unknown })?.id === "string" ? (row as { id: string }).id : null;
      issues.push({
        severity: "error",
        code: "schema",
        cardId: id,
        message: `Row ${index} in ${fileName} failed validation: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      });
      return;
    }

    const record = parsed.data;
    const competitive = record as typeof record & {
      edition?: string;
      source_card_id?: string;
      legality?: string;
    };

    const card: CardDefinition = {
      ...record,
      mode,
      edition: competitive.edition,
      sourceCardId: competitive.source_card_id,
      legality: competitive.legality,
      artUrl: null,
    };

    if (seenIds.has(card.id)) {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        cardId: card.id,
        message: `Duplicate stable ID "${card.id}" in ${fileName}.`,
      });
      return;
    }
    seenIds.add(card.id);
    issues.push(...validateCard(card));
    cards.push(card);
  });

  // Duplicate titles within the same deck are ambiguous: the deck builder keys on title.
  const titlesPerDeck = new Map<string, Map<string, string[]>>();
  for (const card of cards) {
    if (NON_DECK_TYPES.includes(card.type)) continue;
    const deck = titlesPerDeck.get(card.deck) ?? new Map<string, string[]>();
    deck.set(card.name, [...(deck.get(card.name) ?? []), card.id]);
    titlesPerDeck.set(card.deck, deck);
  }
  for (const [deck, titles] of titlesPerDeck) {
    for (const [title, ids] of titles) {
      if (ids.length > 1) {
        issues.push({
          severity: "error",
          code: "duplicate-title",
          cardId: ids[0],
          message: `Title "${title}" appears ${ids.length} times in ${deck} (${ids.join(", ")}).`,
        });
      }
    }
  }

  const byId = new Map(cards.map((c) => [c.id, c]));
  const byDeck = new Map<string, CardDefinition[]>();
  for (const card of cards) {
    byDeck.set(card.deck, [...(byDeck.get(card.deck) ?? []), card]);
  }

  const rejected = rows.length - cards.length;
  const source: SourceFileStatus = {
    fileName,
    mode,
    recordsInFile: rows.length,
    recordsAccepted: cards.length,
    recordsRejected: rejected,
    status: cards.length === 0 ? "failed" : rejected > 0 ? "degraded" : "ok",
  };

  return { mode, cards, byId, byDeck, issues, source };
}

export const cooperativeCatalog: LoadedCatalog = buildCatalog(
  cooperativeJson,
  GameMode.Cooperative,
  "realmforge_master_database.json",
);

export const competitiveCatalog: LoadedCatalog = buildCatalog(
  competitiveJson,
  GameMode.Competitive,
  "realmforge_oathguard_trials_card_database.json",
);

export function getCatalog(mode: GameMode): LoadedCatalog {
  return mode === GameMode.Competitive ? competitiveCatalog : cooperativeCatalog;
}

/**
 * Mode-safe lookup. Returns `undefined` when the ID belongs to the other edition,
 * which is what prevents cooperative rules text from being rendered in a competitive
 * match (and vice versa).
 */
export function getCard(mode: GameMode, id: string): CardDefinition | undefined {
  return getCatalog(mode).byId.get(id);
}

/** Throws if an ID crosses the edition boundary. Use at every match-construction site. */
export function requireCard(mode: GameMode, id: string): CardDefinition {
  const card = getCard(mode, id);
  if (card) return card;
  const other = getCatalog(
    mode === GameMode.Competitive ? GameMode.Cooperative : GameMode.Competitive,
  );
  if (other.byId.has(id)) {
    throw new Error(
      `Cross-mode data access: "${id}" exists only in the ${other.mode} edition and must not be used in ${mode} mode.`,
    );
  }
  throw new Error(`Unknown card ID "${id}" for ${mode} mode.`);
}

export function listDecks(mode: GameMode): string[] {
  return [...getCatalog(mode).byDeck.keys()];
}

export function getDeckCards(mode: GameMode, deck: string): readonly CardDefinition[] {
  return getCatalog(mode).byDeck.get(deck) ?? [];
}

export function isUnit(card: CardDefinition): boolean {
  return UNIT_TYPES.includes(card.type);
}
export function isSupport(card: CardDefinition): boolean {
  return SUPPORT_TYPES.includes(card.type);
}
export function isOneShot(card: CardDefinition): boolean {
  return ONE_SHOT_TYPES.includes(card.type);
}
export function isPlayable(card: CardDefinition): boolean {
  return !NON_DECK_TYPES.includes(card.type);
}

/** Cross-mode ID collisions (same stable ID reused across editions). */
export function findIdCollisions(): { id: string; modes: GameMode[] }[] {
  const collisions: { id: string; modes: GameMode[] }[] = [];
  for (const id of cooperativeCatalog.byId.keys()) {
    if (competitiveCatalog.byId.has(id)) {
      collisions.push({ id, modes: [GameMode.Cooperative, GameMode.Competitive] });
    }
  }
  return collisions;
}

export function allKeywords(mode: GameMode): Keyword[] {
  const set = new Set<Keyword>();
  for (const card of getCatalog(mode).cards) card.keywords.forEach((k) => set.add(k));
  return [...set].sort();
}
