import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { competitiveCatalog, cooperativeCatalog } from "@/game-data/load";
import { cardEffectStatus } from "@/game-engine/effect-status";

describe("digital effect coverage", () => {
  const cards = [...cooperativeCatalog.cards, ...competitiveCatalog.cards];

  it("leaves no source card reporting NOT IMPLEMENTED", () => {
    const missing = cards
      .filter((card) => cardEffectStatus(card) === "not-implemented")
      .map((card) => `${card.id} (${card.name})`);
    expect(missing).toEqual([]);
  });

  it("classifies setup, Gate and Boss records as needing no card effect", () => {
    const nonDeck = cards.filter((card) => ["Reference", "Gate", "Final Boss"].includes(card.type));
    expect(nonDeck.length).toBeGreaterThan(0);
    nonDeck.forEach((card) => expect(cardEffectStatus(card)).toBe("no-effect-required"));
  });

  it("keeps digital-effect registration modules from being tree-shaken in production", () => {
    expect(packageJson.sideEffects).not.toBe(false);
  });
});
