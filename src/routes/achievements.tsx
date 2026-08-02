import { createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePlayerData } from "@/hooks/use-player-data";
import { achievementStates, getCosmetic } from "@/progression/definitions";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Realmforge" },
      {
        name: "description",
        content:
          "Track Realmforge tutorial, cooperative, competitive, and mastery achievements. Cosmetic rewards only — never stat upgrades.",
      },
      { property: "og:title", content: "Achievements — Realmforge" },
      { property: "og:description", content: "Cosmetic-only rewards for playing Realmforge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Achievements,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

const CATEGORY_LABEL: Record<string, string> = {
  tutorial: "Tutorial",
  cooperative: "Cooperative",
  competitive: "Oathguard Trials",
  mastery: "Order mastery",
  collection: "Collection",
};

function Achievements() {
  const { data } = usePlayerData();
  const states = achievementStates(data);
  const unlocked = states.filter((s) => s.complete).length;
  const categories = [...new Set(states.map((s) => s.definition.category))];

  return (
    <RealmShell
      eyebrow="Progression"
      title="Achievements"
      description="Every reward here is cosmetic. No achievement changes a card, a cost, or a statistic."
      actions={<Badge variant="secondary">{unlocked}/{states.length} unlocked</Badge>}
    >
      {categories.map((category) => (
        <section key={category} className="mb-8">
          <h2 className="mb-3 font-display text-xs tracking-widest uppercase">
            {CATEGORY_LABEL[category] ?? category}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {states
              .filter((s) => s.definition.category === category)
              .map(({ definition, progress, complete, unlockedAt }) => (
                <li
                  key={definition.id}
                  className="rounded-xl border border-border/70 bg-card/60 p-4"
                  data-complete={complete ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm">{definition.name}</h3>
                    <Badge variant={complete ? "secondary" : "outline"}>
                      {complete ? "✓ Unlocked" : `${progress}/${definition.goal}`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
                  <Progress
                    className="mt-3 h-2"
                    value={(progress / definition.goal) * 100}
                    aria-label={`${definition.name}: ${progress} of ${definition.goal}`}
                  />
                  {definition.grants && definition.grants.length > 0 && (
                    <p className="mt-2 text-xs text-oath-cyan">
                      Reward: {definition.grants.map((g) => getCosmetic(g)?.name ?? g).join(", ")}
                    </p>
                  )}
                  {unlockedAt && (
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      Unlocked {new Date(unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </RealmShell>
  );
}
