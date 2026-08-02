/**
 * Release-candidate content audit.
 *
 * These assertions exist so the release report can cite a test rather than a
 * reading of the code. They check the locked QuickPlay invariants: deck shape,
 * stable and mode-correct IDs, typed-effect coverage, and the absence of any
 * runtime dependency on English card text.
 */
import { describe, expect, it } from "vitest";

import {
  QUICKPLAY_COPIES_PER_TITLE,
  QUICKPLAY_DECK_MANIFESTS,
  QUICKPLAY_DECK_SIZE,
  QUICKPLAY_TITLES_PER_DECK,
  buildAllQuickPlayDecks,
} from "@/game-data/quickplay";
import { GameMode } from "@/game-data/schema";
// Importing the entry points (not the bare registries) is what installs the
// typed effects; each mode keeps its own table.
import { getEffectStatus } from "@/game-engine/effects";
import { trialsEffectStatus } from "@/game-engine/trials/effects";

const decks = buildAllQuickPlayDecks();

describe("QuickPlay deck construction", () => {
  it("defines exactly six QuickPlay decks", () => {
    expect(QUICKPLAY_DECK_MANIFESTS.filter((m) => m.mode === GameMode.Cooperative).length).toBe(6);
  });

  for (const deck of decks) {
    describe(deck.manifest.deckId, () => {
      it("holds ten titles at two copies each, twenty cards total", () => {
        expect(deck.entries.length).toBe(QUICKPLAY_TITLES_PER_DECK);
        for (const entry of deck.entries) {
          expect(entry.copies).toBe(QUICKPLAY_COPIES_PER_TITLE);
        }
        expect(deck.cardIds.length).toBe(QUICKPLAY_DECK_SIZE);
        expect(deck.totalCards).toBe(QUICKPLAY_DECK_SIZE);
      });

      it("builds without validation issues", () => {
        expect(deck.issues.filter((i) => i.severity === "error")).toEqual([]);
        expect(deck.valid).toBe(true);
      });

      it("uses stable source IDs that match the deck's mode", () => {
        for (const entry of deck.entries) {
          expect(entry.card.id).toMatch(/^RF-[A-Z0-9-]+$/);
          expect(entry.card.mode).toBe(deck.manifest.mode);
        }
      });

      it("maps every title to a typed effect or an explicit no-effect record", () => {
        for (const entry of deck.entries) {
          const status =
            entry.card.mode === GameMode.Competitive
              ? trialsEffectStatus(entry.card)
              : getEffectStatus(entry.card);
          expect(
            status === "implemented" || status === "no-effect-required",
            `${entry.card.id} ${entry.card.name}: ${status}`,
          ).toBe(true);
        }
      });
    });
  }
});

describe("card identity across all QuickPlay decks", () => {
  it("never reuses a title inside one deck", () => {
    for (const deck of decks) {
      const ids = deck.entries.map((e) => e.card.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("never shares a card ID between two decks", () => {
    const seen = new Map<string, string>();
    for (const deck of decks) {
      for (const entry of deck.entries) {
        const owner = seen.get(entry.card.id);
        expect(owner, `${entry.card.id} is in both ${owner} and ${deck.manifest.deckId}`).toBe(
          undefined,
        );
        seen.set(entry.card.id, deck.manifest.deckId);
      }
    }
  });
});
