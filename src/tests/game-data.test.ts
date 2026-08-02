import { describe, expect, it } from "vitest";

import {
  competitiveCatalog,
  cooperativeCatalog,
  findIdCollisions,
  getCard,
  requireCard,
} from "@/game-data/load";
import { GameMode } from "@/game-data/schema";
import {
  QUICKPLAY_DECK_MANIFESTS,
  QUICKPLAY_DECK_SIZE,
  buildAllQuickPlayDecks,
  buildQuickPlayDeck,
  encounterManifests,
  oathguardManifests,
  quickPlayCardUniverse,
} from "@/game-data/quickplay";
import { computeCardCoverage, cardEffectStatus } from "@/game-engine/effect-status";
import { buildAuditReport } from "@/game-data/audit";

describe("JSON loading", () => {
  it("loads both source databases", () => {
    expect(cooperativeCatalog.cards.length).toBeGreaterThan(0);
    expect(competitiveCatalog.cards.length).toBeGreaterThan(0);
  });

  it("accepts every record in each file", () => {
    expect(cooperativeCatalog.source.recordsRejected).toBe(0);
    expect(competitiveCatalog.source.recordsRejected).toBe(0);
  });
});

describe("stable ID uniqueness", () => {
  it("has no duplicate IDs inside a catalogue", () => {
    for (const catalog of [cooperativeCatalog, competitiveCatalog]) {
      expect(catalog.byId.size).toBe(catalog.cards.length);
    }
  });

  it("reports cross-edition ID collisions deterministically", () => {
    expect(findIdCollisions()).toEqual(findIdCollisions());
  });
});

describe("mode-specific data selection", () => {
  it("never returns a competitive record for a cooperative lookup", () => {
    const competitiveOnly = competitiveCatalog.cards.find(
      (c) => !cooperativeCatalog.byId.has(c.id),
    );
    expect(competitiveOnly).toBeDefined();
    expect(getCard(GameMode.Cooperative, competitiveOnly!.id)).toBeUndefined();
    expect(() => requireCard(GameMode.Cooperative, competitiveOnly!.id)).toThrow(/Cross-mode/);
  });
});

describe("QuickPlay deck construction", () => {
  it("defines three Oathguard Orders per mode plus three cooperative encounter decks", () => {
    expect(QUICKPLAY_DECK_MANIFESTS).toHaveLength(9);
    for (const mode of [GameMode.Cooperative, GameMode.Competitive]) {
      expect(oathguardManifests(mode).map((m) => m.faction)).toEqual([
        "Truthwardens",
        "Honorbound",
        "Dawnwatch",
      ]);
    }
    expect(encounterManifests().map((m) => m.faction)).toEqual([
      "Veilborn",
      "Whisper Court",
      "The Breakers",
    ]);
  });

  it("emits two copies per listed title and blocks manifests with no source", () => {
    for (const deck of buildAllQuickPlayDecks()) {
      expect(deck.totalCards).toBe(deck.entries.length * 2);
      if (deck.manifest.status === "awaiting-source") {
        expect(deck.valid).toBe(false);
        expect(deck.totalCards).toBe(0);
      } else {
        expect(deck.totalCards).toBe(QUICKPLAY_DECK_SIZE);
        expect(deck.valid).toBe(true);
      }
    }
  });

  it("is deterministic", () => {
    const first = buildQuickPlayDeck(QUICKPLAY_DECK_MANIFESTS[0]).cardIds;
    const second = buildQuickPlayDeck(QUICKPLAY_DECK_MANIFESTS[0]).cardIds;
    expect(first).toEqual(second);
  });
});

describe("effect registry completeness", () => {
  it("marks every unimplemented card explicitly, never silently playable", () => {
    const coverage = computeCardCoverage(quickPlayCardUniverse());
    expect(coverage.total).toBeGreaterThan(0);
    expect(coverage.implemented + coverage.notImplemented).toBeLessThanOrEqual(coverage.total);
    for (const card of quickPlayCardUniverse()) {
      expect(["implemented", "not-implemented", "no-effect-required"]).toContain(
        cardEffectStatus(card),
      );
    }
  });
});

describe("audit report", () => {
  it("builds without throwing and reports open conflicts", () => {
    const report = buildAuditReport();
    expect(report.sources).toHaveLength(2);
    expect(report.quickPlayDecks).toHaveLength(9);
    expect(report.conflicts.length).toBeGreaterThan(0);
  });
});
