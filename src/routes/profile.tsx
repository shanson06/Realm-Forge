import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { RealmShell } from "@/components/game/RealmShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OATHGUARD_ORDERS } from "@/game-data/quickplay";
import { usePlayerData } from "@/hooks/use-player-data";
import { listMatches } from "@/persistence/local-store";
import { COSMETICS, achievementStates, getCosmetic, masteryRank } from "@/progression/definitions";
import { CORE_LESSONS } from "@/tutorial/script";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Realmforge" },
      {
        name: "description",
        content:
          "Your local Realmforge profile: badge, Order mastery, tutorial progress, and cosmetic card backs. No account required.",
      },
      { property: "og:title", content: "Profile — Realmforge" },
      { property: "og:description", content: "Local badge, mastery, and cosmetics." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6">
      {error.message}
    </p>
  ),
});

function Profile() {
  const { data, setDisplayName, selectCosmetic } = usePlayerData();
  const [matches, setMatches] = useState<number | null>(null);
  const [name, setName] = useState(data.profile.displayName);

  useEffect(() => setName(data.profile.displayName), [data.profile.displayName]);
  useEffect(() => {
    let active = true;
    listMatches()
      .then((m) => active && setMatches(m.length))
      .catch(() => active && setMatches(null));
    return () => {
      active = false;
    };
  }, []);

  const unlockedAchievements = achievementStates(data).filter((s) => s.complete).length;
  const coreDone = CORE_LESSONS.filter((l) =>
    data.tutorial.completedLessonIds.includes(l.id),
  ).length;
  const badge = data.profile.badgeId ? getCosmetic(data.profile.badgeId) : null;

  return (
    <RealmShell
      eyebrow="Local profile"
      title={data.profile.displayName}
      description="Everything is stored on this device. Cloud sync is not enabled."
      actions={badge ? <Badge variant="secondary">{badge.name}</Badge> : undefined}
    >
      <Alert className="mb-6 border-oath-gold/50">
        <AlertTitle>Guest play</AlertTitle>
        <AlertDescription>
          Solo, cooperative, Trials, and pass-and-play all work without signing in. Every gameplay
          deck is available from the start.
        </AlertDescription>
      </Alert>

      <dl className="grid gap-3 sm:grid-cols-4">
        <Stat label="Saved matches" value={matches === null ? "—" : String(matches)} />
        <Stat label="Achievements" value={`${unlockedAchievements}`} />
        <Stat label="Tutorial" value={`${coreDone}/${CORE_LESSONS.length}`} />
        <Stat label="Cloud sync" value="Off" />
      </dl>

      <section className="mt-8 max-w-md">
        <Label htmlFor="display-name">Display name</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="display-name"
            value={name}
            maxLength={32}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            onClick={() => setDisplayName(name.trim() || "Guest Oathguard")}
            disabled={name.trim() === data.profile.displayName}
          >
            Save
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">Order mastery</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {OATHGUARD_ORDERS.map((order) => (
            <li key={order} className="rounded-xl border border-border/70 bg-card/60 p-4">
              <h3 className="font-display text-sm">{order}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Rank {masteryRank(data, order)} · {data.stats.orderWins[order] ?? 0} wins
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">
          Cosmetics (placeholder art)
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COSMETICS.map((cosmetic) => {
            const unlocked = data.cosmetics.unlocked.includes(cosmetic.id);
            const selected =
              data.cosmetics.selectedCardBack === cosmetic.id ||
              data.cosmetics.selectedTheme === cosmetic.id ||
              data.profile.badgeId === cosmetic.id;
            return (
              <li key={cosmetic.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => selectCosmetic(cosmetic.kind, cosmetic.id)}
                  aria-disabled={!unlocked}
                  title={unlocked ? undefined : "Locked — earn the matching achievement."}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    selected ? "border-oath-gold" : "border-border/70",
                    !unlocked && "opacity-50",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("block h-10 rounded-md bg-gradient-to-br", cosmetic.swatch)}
                  />
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-display text-sm">{cosmetic.name}</span>
                    <Badge variant={selected ? "secondary" : "outline"}>
                      {selected ? "Selected" : unlocked ? cosmetic.kind : "Locked"}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {cosmetic.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <nav className="mt-8 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/achievements">Achievements</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/statistics">Statistics</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/data">Data management</Link>
        </Button>
      </nav>
    </RealmShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl">{value}</dd>
    </div>
  );
}
