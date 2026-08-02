import { useCallback, useEffect, useState } from "react";

import {
  clearPlayerData,
  createPlayerData,
  loadPlayerData,
  savePlayerData,
  type PlayerData,
} from "@/persistence/player-data";
import { reconcileProgression } from "@/progression/definitions";

export interface MatchOutcome {
  mode: "cooperative" | "competitive";
  won: boolean;
  order?: string;
  bossId?: string | null;
}

/**
 * Local, account-free player progress. Hydrated after mount so SSR and the
 * first client render agree; every write runs the achievement reconciler.
 */
export function usePlayerData() {
  const [data, setData] = useState<PlayerData>(() => createPlayerData());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(loadPlayerData());
    setHydrated(true);
  }, []);

  const mutate = useCallback((fn: (current: PlayerData) => PlayerData) => {
    setData((current) => {
      const next = reconcileProgression(fn(current));
      savePlayerData(next);
      return next;
    });
  }, []);

  const completeLesson = useCallback(
    (lessonId: string) =>
      mutate((d) => ({
        ...d,
        tutorial: {
          lastLessonId: lessonId,
          completedLessonIds: d.tutorial.completedLessonIds.includes(lessonId)
            ? d.tutorial.completedLessonIds
            : [...d.tutorial.completedLessonIds, lessonId],
        },
      })),
    [mutate],
  );

  const recordMatchStart = useCallback(
    (order?: string) =>
      mutate((d) => ({
        ...d,
        stats: {
          ...d.stats,
          matchesStarted: d.stats.matchesStarted + 1,
          orderPlays: order
            ? { ...d.stats.orderPlays, [order]: (d.stats.orderPlays[order] ?? 0) + 1 }
            : d.stats.orderPlays,
        },
      })),
    [mutate],
  );

  const recordMatchResult = useCallback(
    (outcome: MatchOutcome) =>
      mutate((d) => {
        const stats = { ...d.stats };
        if (outcome.mode === "cooperative") {
          if (outcome.won) stats.coopWins += 1;
          else stats.coopLosses += 1;
        } else if (outcome.won) {
          stats.trialsWins += 1;
        } else {
          stats.trialsLosses += 1;
        }

        if (outcome.won && outcome.order) {
          stats.orderWins = {
            ...stats.orderWins,
            [outcome.order]: (stats.orderWins[outcome.order] ?? 0) + 1,
          };
        }
        if (outcome.won && outcome.bossId) {
          stats.bossVictories = {
            ...stats.bossVictories,
            [outcome.bossId]: (stats.bossVictories[outcome.bossId] ?? 0) + 1,
          };
        }
        return { ...d, stats };
      }),
    [mutate],
  );

  /** Stamps an achievement that is driven by an action, not by a counter. */
  const markAchievement = useCallback(
    (id: string) =>
      mutate((d) =>
        d.achievements[id]
          ? d
          : { ...d, achievements: { ...d.achievements, [id]: new Date().toISOString() } },
      ),
    [mutate],
  );

  const selectCosmetic = useCallback(
    (kind: "cardback" | "theme" | "badge", id: string) =>
      mutate((d) => {
        if (!d.cosmetics.unlocked.includes(id)) return d;
        if (kind === "badge") return { ...d, profile: { ...d.profile, badgeId: id } };
        return {
          ...d,
          cosmetics: {
            ...d.cosmetics,
            ...(kind === "cardback" ? { selectedCardBack: id } : { selectedTheme: id }),
          },
        };
      }),
    [mutate],
  );

  const setDisplayName = useCallback(
    (displayName: string) => mutate((d) => ({ ...d, profile: { ...d.profile, displayName } })),
    [mutate],
  );

  const refresh = useCallback(() => setData(loadPlayerData()), []);

  const resetAll = useCallback(() => {
    clearPlayerData();
    setData(createPlayerData());
  }, []);

  return {
    data,
    hydrated,
    completeLesson,
    recordMatchStart,
    recordMatchResult,
    markAchievement,
    selectCosmetic,
    setDisplayName,
    refresh,
    resetAll,
  };
}
