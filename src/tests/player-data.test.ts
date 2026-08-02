import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  PLAYER_DATA_VERSION,
  createPlayerData,
  loadPlayerData,
  migratePlayerData,
  savePlayerData,
} from "@/persistence/player-data";
import {
  ACHIEVEMENTS,
  achievementStates,
  masteryRank,
  reconcileProgression,
} from "@/progression/definitions";
import { ALL_LESSONS, CORE_LESSONS, MINI_LESSONS, getLesson } from "@/tutorial/script";
import { getCard } from "@/game-data/load";
import { GameMode } from "@/game-data/schema";

describe("player data schema and migrations", () => {
  // The engine tests run in a node environment, so provide the minimal
  // localStorage surface the store guards on.
  beforeAll(() => {
    if (typeof globalThis.window === "undefined") {
      const store = new Map<string, string>();
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
          clear: () => store.clear(),
        },
      };
    }
  });

  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  it("creates a fresh profile at the current version", () => {
    const data = createPlayerData();
    expect(data.version).toBe(PLAYER_DATA_VERSION);
    expect(data.tutorial.completedLessonIds).toEqual([]);
    expect(data.cosmetics.unlocked.length).toBeGreaterThan(0);
  });

  it("migrates an unversioned (v0) save without losing progress", () => {
    const legacy = { stats: { coopWins: 3 }, achievements: { "ach-first-coop-win": "2026-01-01" } };
    const result = migratePlayerData(legacy);
    expect(result.recovered).toBe(false);
    expect(result.migrated).toBe(true);
    expect(result.data.version).toBe(PLAYER_DATA_VERSION);
    expect(result.data.stats.coopWins).toBe(3);
    expect(result.data.achievements["ach-first-coop-win"]).toBe("2026-01-01");
  });

  it("migrates a v1 save with a numeric boss counter", () => {
    const v1 = { version: 1, stats: { coopWins: 1, bossVictories: 2 } };
    const result = migratePlayerData(v1);
    expect(result.data.version).toBe(PLAYER_DATA_VERSION);
    expect(result.data.stats.bossVictories).toEqual({ legacy: 2 });
    expect(result.data.cosmetics.selectedCardBack).toBeTruthy();
  });

  it("keeps a save from a newer app version rather than discarding it", () => {
    const future = {
      ...createPlayerData(),
      version: 99,
      stats: { ...createPlayerData().stats, coopWins: 7 },
    };
    const result = migratePlayerData(future);
    expect(result.data.version).toBe(99);
    expect(result.data.stats.coopWins).toBe(7);
  });

  it("recovers from unusable payloads instead of throwing", () => {
    expect(migratePlayerData(null).recovered).toBe(true);
    expect(migratePlayerData("nonsense").recovered).toBe(true);
    expect(migratePlayerData(42).data.version).toBe(PLAYER_DATA_VERSION);
  });

  it("round-trips through localStorage", () => {
    const data = createPlayerData();
    data.stats.trialsWins = 4;
    savePlayerData(data);
    expect(loadPlayerData().stats.trialsWins).toBe(4);
  });

  it("loads defaults when nothing is stored (guest first launch)", () => {
    expect(loadPlayerData().stats.matchesStarted).toBe(0);
  });
});

describe("progression rules", () => {
  it("has unique achievement ids and positive goals", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) expect(a.goal).toBeGreaterThan(0);
  });

  it("grants no achievement on a fresh profile", () => {
    expect(achievementStates(createPlayerData()).filter((s) => s.complete)).toHaveLength(0);
  });

  it("stamps achievements and unlocks their cosmetics", () => {
    const data = createPlayerData();
    data.stats.coopWins = 1;
    const next = reconcileProgression(data, "2026-07-29T00:00:00.000Z");
    expect(next.achievements["ach-first-coop-win"]).toBe("2026-07-29T00:00:00.000Z");
    expect(next.cosmetics.unlocked).toContain("badge-gatekeeper");
  });

  it("does not re-stamp an already unlocked achievement", () => {
    const data = reconcileProgression(
      { ...createPlayerData(), stats: { ...createPlayerData().stats, coopWins: 1 } },
      "A",
    );
    const again = reconcileProgression({ ...data, stats: { ...data.stats, coopWins: 5 } }, "B");
    expect(again.achievements["ach-first-coop-win"]).toBe("A");
  });

  it("computes Order mastery ranks from wins only", () => {
    const data = createPlayerData();
    data.stats.orderWins = { Truthwardens: 6 };
    expect(masteryRank(data, "Truthwardens")).toBe(3);
    expect(masteryRank(data, "Honorbound")).toBe(0);
  });

  it("never awards a gameplay advantage: no achievement grants a non-cosmetic id", () => {
    for (const a of ACHIEVEMENTS) {
      for (const grant of a.grants ?? []) {
        expect(grant).toMatch(/^(cardback|theme|badge)-/);
      }
    }
  });
});

describe("tutorial script", () => {
  it("has the eleven required core lessons in order", () => {
    expect(CORE_LESSONS).toHaveLength(11);
    expect(CORE_LESSONS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("has nine optional mini-lessons", () => {
    expect(MINI_LESSONS).toHaveLength(9);
  });

  it("uses unique lesson ids resolvable by getLesson", () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getLesson(id)).toBeDefined();
  });

  it("references only real cooperative source card ids", () => {
    for (const lesson of ALL_LESSONS) {
      const ids = [
        ...lesson.initial.hand,
        ...lesson.initial.units.map((u) => u.cardId),
        ...lesson.initial.enemyUnits.map((u) => u.cardId),
      ];
      for (const id of ids) {
        expect(getCard(GameMode.Cooperative, id), `${lesson.id} → ${id}`).toBeDefined();
      }
    }
  });

  it("every step is reachable and applies deterministically", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.steps.length).toBeGreaterThan(0);
      let board = lesson.initial;
      for (const step of lesson.steps) {
        const a = step.apply(board);
        const b = step.apply(board);
        expect(a).toEqual(b);
        board = a;
      }
      expect(board.log.length).toBeGreaterThan(0);
    }
  });

  it("never lets a Gate repair exceed its starting Ward", () => {
    for (const lesson of ALL_LESSONS) {
      let board = lesson.initial;
      for (const step of lesson.steps) board = step.apply(board);
      expect(board.playerGate).toBeLessThanOrEqual(10);
      expect(board.enemyGate).toBeGreaterThanOrEqual(0);
    }
  });
});
