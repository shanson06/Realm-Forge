/**
 * Progression definitions.
 *
 * Pure data + pure evaluation. Nothing here grants a statistical advantage:
 * every gameplay deck and card is available from the first launch, and the
 * only rewards are badges, titles, and cosmetic placeholders.
 */
import { QUICK_BOSSES } from "@/game-data/bosses";
import { OATHGUARD_ORDERS, type OathguardOrder } from "@/game-data/quickplay";
import type { PlayerData } from "@/persistence/player-data";

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: "tutorial" | "cooperative" | "competitive" | "mastery" | "collection";
  /** Current progress toward `goal`. */
  readonly progress: (data: PlayerData) => number;
  readonly goal: number;
  /** Cosmetic ids granted when the achievement completes. */
  readonly grants?: readonly string[];
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "ach-first-lesson",
    name: "First Light",
    description: "Finish any tutorial lesson.",
    category: "tutorial",
    progress: (d) => d.tutorial.completedLessonIds.length,
    goal: 1,
  },
  {
    id: "ach-tutorial-complete",
    name: "Sworn In",
    description: "Finish the full eleven-step cooperative tutorial.",
    category: "tutorial",
    progress: (d) => d.tutorial.completedLessonIds.filter((id) => id.startsWith("core-")).length,
    goal: 11,
    grants: ["cardback-beacon", "badge-sworn-in"],
  },
  {
    id: "ach-mini-lessons",
    name: "Keyword Scholar",
    description: "Finish every optional mini-lesson.",
    category: "tutorial",
    progress: (d) => d.tutorial.completedLessonIds.filter((id) => id.startsWith("mini-")).length,
    goal: 9,
    grants: ["theme-archive"],
  },
  {
    id: "ach-first-coop-win",
    name: "Hold the Gate",
    description: "Win your first cooperative match.",
    category: "cooperative",
    progress: (d) => d.stats.coopWins,
    goal: 1,
    grants: ["badge-gatekeeper"],
  },
  {
    id: "ach-coop-five",
    name: "Raid Veteran",
    description: "Win five cooperative matches.",
    category: "cooperative",
    progress: (d) => d.stats.coopWins,
    goal: 5,
  },
  {
    id: "ach-all-bosses",
    name: "Crown Breaker",
    description: "Defeat every Quick Boss at least once.",
    category: "cooperative",
    progress: (d) => QUICK_BOSSES.filter((b) => (d.stats.bossVictories[b.id] ?? 0) > 0).length,
    goal: QUICK_BOSSES.length,
    grants: ["cardback-hollow-crown", "badge-crown-breaker"],
  },
  {
    id: "ach-first-trials-win",
    name: "Trial by Oath",
    description: "Win your first Oathguard Trials match.",
    category: "competitive",
    progress: (d) => d.stats.trialsWins,
    goal: 1,
    grants: ["badge-duellist"],
  },
  {
    id: "ach-trials-five",
    name: "Proven in the Trials",
    description: "Win five Oathguard Trials matches.",
    category: "competitive",
    progress: (d) => d.stats.trialsWins,
    goal: 5,
    grants: ["theme-dawnwatch"],
  },
  {
    id: "ach-every-order",
    name: "Three Oaths",
    description: "Play at least one match with each of the three Orders.",
    category: "mastery",
    progress: (d) => OATHGUARD_ORDERS.filter((o) => (d.stats.orderPlays[o] ?? 0) > 0).length,
    goal: OATHGUARD_ORDERS.length,
  },
  {
    id: "ach-order-mastery",
    name: "Order Master",
    description: "Reach mastery rank 3 with any single Order.",
    category: "mastery",
    progress: (d) => Math.max(0, ...OATHGUARD_ORDERS.map((o) => masteryRank(d, o))),
    goal: 3,
    grants: ["cardback-gilded-oath"],
  },
  {
    id: "ach-inspector",
    name: "Archivist",
    description: "Open the Collection and inspect a card record.",
    category: "collection",
    progress: (d) => (d.achievements["ach-inspector"] ? 1 : 0),
    goal: 1,
  },
];

/** Wins required for mastery ranks 1–5 with a single Order. */
export const MASTERY_THRESHOLDS = [1, 3, 6, 10, 15] as const;

export function masteryRank(data: PlayerData, order: OathguardOrder | string): number {
  const wins = data.stats.orderWins[order] ?? 0;
  return MASTERY_THRESHOLDS.filter((t) => wins >= t).length;
}

export function masteryNextGoal(data: PlayerData, order: OathguardOrder | string): number | null {
  const wins = data.stats.orderWins[order] ?? 0;
  return MASTERY_THRESHOLDS.find((t) => wins < t) ?? null;
}

export interface CosmeticDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: "cardback" | "theme" | "badge";
  readonly description: string;
  /** Placeholder swatch — production art is not yet approved. */
  readonly swatch: string;
}

export const COSMETICS: readonly CosmeticDefinition[] = [
  {
    id: "cardback-oathguard-standard",
    name: "Oathguard Standard",
    kind: "cardback",
    description: "Royal blue with a gold sigil.",
    swatch: "from-oath-blue to-oath-blue-deep",
  },
  {
    id: "cardback-beacon",
    name: "Beacon Weave",
    kind: "cardback",
    description: "Cyan crystal light through relic glass.",
    swatch: "from-oath-cyan to-oath-blue",
  },
  {
    id: "cardback-hollow-crown",
    name: "Fractured Crown",
    kind: "cardback",
    description: "Blackglass with a violet fracture.",
    swatch: "from-hollow-violet to-hollow-black",
  },
  {
    id: "cardback-gilded-oath",
    name: "Gilded Oath",
    kind: "cardback",
    description: "Silver filigree over deep gold.",
    swatch: "from-oath-gold to-oath-silver",
  },
  {
    id: "theme-oathguard",
    name: "Oathguard Hall",
    kind: "theme",
    description: "The default hopeful, high-contrast theme.",
    swatch: "from-oath-blue-deep to-background",
  },
  {
    id: "theme-archive",
    name: "Truthwarden Archive",
    kind: "theme",
    description: "Lantern-lit reading room tones.",
    swatch: "from-oath-cyan to-oath-blue-deep",
  },
  {
    id: "theme-dawnwatch",
    name: "Dawnwatch Ridge",
    kind: "theme",
    description: "First-light gold over cold stone.",
    swatch: "from-oath-gold to-oath-blue-deep",
  },
  {
    id: "badge-sworn-in",
    name: "Sworn In",
    kind: "badge",
    description: "Completed the full tutorial.",
    swatch: "from-oath-cyan to-oath-gold",
  },
  {
    id: "badge-gatekeeper",
    name: "Gatekeeper",
    kind: "badge",
    description: "Won a cooperative match.",
    swatch: "from-oath-blue to-oath-cyan",
  },
  {
    id: "badge-duellist",
    name: "Duellist",
    kind: "badge",
    description: "Won an Oathguard Trials match.",
    swatch: "from-oath-gold to-oath-cyan",
  },
  {
    id: "badge-crown-breaker",
    name: "Crown Breaker",
    kind: "badge",
    description: "Defeated every Quick Boss.",
    swatch: "from-hollow-violet to-oath-gold",
  },
];

export function getCosmetic(id: string): CosmeticDefinition | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export interface AchievementState {
  readonly definition: AchievementDefinition;
  readonly progress: number;
  readonly complete: boolean;
  readonly unlockedAt: string | null;
}

export function achievementStates(data: PlayerData): AchievementState[] {
  return ACHIEVEMENTS.map((definition) => {
    const progress = Math.min(definition.progress(data), definition.goal);
    return {
      definition,
      progress,
      complete: progress >= definition.goal,
      unlockedAt: data.achievements[definition.id] ?? null,
    };
  });
}

/**
 * Returns a copy of `data` with newly completed achievements stamped and any
 * cosmetics they grant unlocked. Pure — callers persist the result.
 */
export function reconcileProgression(data: PlayerData, now = new Date().toISOString()): PlayerData {
  const achievements = { ...data.achievements };
  const unlocked = new Set(data.cosmetics.unlocked);
  let changed = false;

  for (const state of achievementStates(data)) {
    if (!state.complete || achievements[state.definition.id]) continue;
    achievements[state.definition.id] = now;
    changed = true;
    for (const grant of state.definition.grants ?? []) unlocked.add(grant);
  }
  if (!changed) return data;
  return {
    ...data,
    achievements,
    cosmetics: { ...data.cosmetics, unlocked: [...unlocked] },
  };
}
