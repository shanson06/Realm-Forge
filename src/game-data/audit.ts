/**
 * Content audit report.
 *
 * Pure derivation over the loaded catalogues. Powers /dev/content-audit and is
 * directly unit-testable without React.
 */
import {
  competitiveCatalog,
  cooperativeCatalog,
  findIdCollisions,
  type SourceFileStatus,
} from "./load";
import { buildAllQuickPlayDecks, quickPlayCardUniverse, type QuickPlayDeck } from "./quickplay";
import { computeCardCoverage } from "@/game-engine/effect-status";
import type { EffectCoverage } from "@/game-engine/effects/registry";
import { GameMode, QUICKPLAY_CORE_KEYWORDS, type Keyword, type ValidationIssue } from "./schema";

export interface KeywordUsage {
  readonly keyword: Keyword;
  readonly mode: GameMode;
  readonly cardCount: number;
  readonly supported: boolean;
}

export interface ConflictRow {
  readonly id: string;
  readonly topic: string;
  readonly sourceA: string;
  readonly sourceB: string;
  readonly detail: string;
  readonly recommendation: string;
  readonly status: "awaiting-approval";
}

/**
 * Conflicts observed between the uploaded sources and the QuickPlay brief.
 * These are recorded, not resolved. Nothing here has been applied to the data.
 */
export const OPEN_CONFLICTS: readonly ConflictRow[] = [
  {
    id: "CONF-001",
    topic: "Edition / deck size",
    sourceA: "Both uploaded rulebooks + both JSON databases",
    sourceB: "QuickPlay brief",
    detail:
      "Every uploaded source describes the 30-card standard edition (17 titles per deck). The brief specifies 20-card QuickPlay decks of 10 titles x 2 copies.",
    recommendation:
      "Supply the QuickPlay rulebooks, or approve an explicit 10-title cut per deck. No titles have been inferred.",
    status: "awaiting-approval",
  },
  {
    id: "CONF-002",
    topic: "Turn structure",
    sourceA: "RF-SET-REF-001 — 'Ready, Gain Energy, Refill, Draw, Main, Attack, End'",
    sourceB: "QuickPlay brief — 'Ready and Charge, Play, Battle, Pass'",
    detail:
      "The source reference card uses a seven-step turn with separate Gain Energy and Refill actions. The brief locks a four-step turn with a single permanent-crystal Energy system.",
    recommendation:
      "Treat the four-step QuickPlay turn as authoritative for the digital app and keep the seven-step reference card as standard-edition content only.",
    status: "awaiting-approval",
  },
  {
    id: "CONF-003",
    topic: "Gate Ward and crystal counts",
    sourceA: "RF-SET-GATE-* — Oathguard Ward 16, Hollow Crown Ward 18",
    sourceB: "QuickPlay brief — both Gates 10 Ward, both Crystal Spinners 6",
    detail: "Setup values differ between the standard edition data and the QuickPlay brief.",
    recommendation:
      "Use the QuickPlay values (10 / 10 / 6 / 6) for QuickPlay matches and keep the source Gate records untouched for the standard edition.",
    status: "awaiting-approval",
  },
  {
    id: "CONF-004",
    topic: "Boss Health",
    sourceA: "Boss Set records store Health in the DEF field (18 / 20 / 22 / 26)",
    sourceB: "QuickPlay brief — 12 / 16 / 20 by player count",
    detail:
      "Standard boss Health is much higher than QuickPlay boss Health and is not player-count scaled in the source data.",
    recommendation:
      "Model boss Health as an explicit QuickPlay setup value rather than reading it from the card record.",
    status: "awaiting-approval",
  },
  {
    id: "CONF-005",
    topic: "Keyword naming",
    sourceA: "Competitive JSON keyword metadata uses 'Scan'",
    sourceB: "Competitive rules text uses 'Foresight'",
    detail:
      "The same mechanic is labelled two different ways inside a single source file (for example RF-TRIAL-TRU-001).",
    recommendation:
      "Pick one display term. Recommend 'Foresight' for rules text with 'Scan' retained as the internal keyword key.",
    status: "awaiting-approval",
  },
  {
    id: "CONF-006",
    topic: "Keyword scope",
    sourceA: "Source data uses Fracture, Response, Scan, Siphon, Static, Sync",
    sourceB: "QuickPlay brief core keywords: Aegis, Shield Matrix, Surge, Deploy, Echo, Restore X",
    detail: "Six keywords in the data fall outside the QuickPlay core keyword set.",
    recommendation:
      "Confirm whether QuickPlay drops these cards, drops the keywords, or extends the core set. Cards using them are flagged, not implemented.",
    status: "awaiting-approval",
  },
];

export interface AuditReport {
  readonly generatedAt: string;
  readonly sources: readonly SourceFileStatus[];
  readonly issues: readonly ValidationIssue[];
  readonly quickPlayDecks: readonly QuickPlayDeck[];
  readonly idCollisions: readonly { id: string; modes: GameMode[] }[];
  readonly missingArt: readonly { cardId: string; name: string; mode: GameMode }[];
  readonly effectCoverage: EffectCoverage;
  readonly keywordUsage: readonly KeywordUsage[];
  readonly conflicts: readonly ConflictRow[];
}

export function buildAuditReport(): AuditReport {
  const catalogs = [cooperativeCatalog, competitiveCatalog];
  const issues = catalogs.flatMap((c) => c.issues);

  const missingArt = catalogs
    .flatMap((c) => c.cards)
    .filter((c) => c.artUrl === null)
    .map((c) => ({ cardId: c.id, name: c.name, mode: c.mode }));

  const keywordCounts = new Map<string, KeywordUsage>();
  for (const catalog of catalogs) {
    for (const card of catalog.cards) {
      for (const keyword of card.keywords) {
        const k = `${catalog.mode}:${keyword}`;
        const prev = keywordCounts.get(k);
        keywordCounts.set(k, {
          keyword,
          mode: catalog.mode,
          cardCount: (prev?.cardCount ?? 0) + 1,
          supported: QUICKPLAY_CORE_KEYWORDS.includes(keyword),
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sources: [cooperativeCatalog.source, competitiveCatalog.source],
    issues,
    quickPlayDecks: buildAllQuickPlayDecks(),
    idCollisions: findIdCollisions(),
    missingArt,
    effectCoverage: computeCardCoverage(quickPlayCardUniverse()),
    keywordUsage: [...keywordCounts.values()].sort((a, b) =>
      a.keyword.localeCompare(b.keyword) || a.mode.localeCompare(b.mode),
    ),
    conflicts: OPEN_CONFLICTS,
  };
}