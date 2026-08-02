import { createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QUICK_BOSSES } from "@/game-data/bosses";
import { OATHGUARD_ORDERS } from "@/game-data/quickplay";
import { usePlayerData } from "@/hooks/use-player-data";
import { MASTERY_THRESHOLDS, masteryNextGoal, masteryRank } from "@/progression/definitions";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics — Realmforge" },
      {
        name: "description",
        content:
          "Your local Realmforge record: cooperative and competitive results, Order mastery ranks, and boss victories.",
      },
      { property: "og:title", content: "Statistics — Realmforge" },
      { property: "og:description", content: "Local match record and Order mastery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Statistics,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6">
      {error.message}
    </p>
  ),
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <dt className="text-xs tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl">{value}</dd>
    </div>
  );
}

function Statistics() {
  const { data } = usePlayerData();
  const s = data.stats;
  const totalWins = s.coopWins + s.trialsWins;
  const totalGames = totalWins + s.coopLosses + s.trialsLosses;
  const rate = totalGames === 0 ? "—" : `${Math.round((totalWins / totalGames) * 100)}%`;

  return (
    <RealmShell
      eyebrow="Your record"
      title="Statistics"
      description="Recorded on this device only. Nothing is uploaded and no account is required."
    >
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Matches started" value={String(s.matchesStarted)} />
        <Stat label="Total wins" value={String(totalWins)} />
        <Stat label="Win rate" value={rate} />
        <Stat label="Tutorial lessons" value={String(data.tutorial.completedLessonIds.length)} />
        <Stat label="Cooperative W / L" value={`${s.coopWins} / ${s.coopLosses}`} />
        <Stat label="Trials W / L" value={`${s.trialsWins} / ${s.trialsLosses}`} />
        <Stat
          label="Bosses defeated"
          value={`${QUICK_BOSSES.filter((b) => (s.bossVictories[b.id] ?? 0) > 0).length}/${QUICK_BOSSES.length}`}
        />
        <Stat label="Achievements" value={String(Object.keys(data.achievements).length)} />
      </dl>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">Order mastery</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {OATHGUARD_ORDERS.map((order) => {
            const rank = masteryRank(data, order);
            const next = masteryNextGoal(data, order);
            const wins = s.orderWins[order] ?? 0;
            const goal = next ?? MASTERY_THRESHOLDS[MASTERY_THRESHOLDS.length - 1];
            return (
              <li key={order} className="rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm">{order}</h3>
                  <Badge variant="secondary">Rank {rank}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.orderPlays[order] ?? 0} played · {wins} won
                </p>
                <Progress
                  className="mt-3 h-2"
                  value={Math.min(100, (wins / goal) * 100)}
                  aria-label={`${order} mastery: ${wins} of ${goal} wins`}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {next === null
                    ? "Maximum rank reached."
                    : `${next - wins} more win(s) to rank ${rank + 1}.`}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xs tracking-widest uppercase">Boss victories</h2>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {QUICK_BOSSES.map((boss) => (
            <li key={boss.id} className="rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm">{boss.name}</h3>
                <Badge variant={(s.bossVictories[boss.id] ?? 0) > 0 ? "secondary" : "outline"}>
                  {s.bossVictories[boss.id] ?? 0}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{boss.id}</p>
            </li>
          ))}
        </ul>
      </section>
    </RealmShell>
  );
}
