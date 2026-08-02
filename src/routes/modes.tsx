import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, Clock3, ShieldCheck, Swords, Users } from "lucide-react";

import { CoverBanner } from "@/components/game/CoverBanner";
import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/modes")({
  head: () => ({
    meta: [
      { title: "Choose a Mode — Realmforge" },
      {
        name: "description",
        content:
          "Play Rise of the Oathguard cooperatively against the Hollow Crown, or face another Order in Oathguard Trials.",
      },
      { property: "og:title", content: "Choose a Mode — Realmforge" },
      {
        property: "og:description",
        content: "Cooperative Hollow Crown raid or competitive Oathguard Trials.",
      },
    ],
  }),
  component: ModeSelect,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6">
      {error.message}
    </p>
  ),
});

const SHARED_RULES = ["20-card decks", "10-Ward Gates", "Six crystals", "Four-step turns"];

function ModeSelect() {
  return (
    <RealmShell
      eyebrow="Choose your battle"
      title="Two ways to enter the Forge"
      description="Both editions use the same fast QuickPlay foundation. Choose whether your table fights together or tests Order against Order."
    >
      <section
        aria-label="Shared QuickPlay rules"
        className="mb-5 rounded-2xl border border-oath-gold/35 bg-card/55 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm tracking-[0.18em] text-oath-gold uppercase">
              QuickPlay foundation
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Easy to start, tactical enough to replay, and designed for one shared device.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Rules shared by both modes">
            {SHARED_RULES.map((rule) => (
              <li key={rule}>
                <Badge variant="outline" className="border-oath-cyan/40 text-oath-silver">
                  {rule}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-oath-gold/55 bg-oath-blue-deep/55 shadow-[var(--shadow-relic)]">
          <CoverBanner
            art="cooperative"
            eyebrow="Cooperative QuickPlay"
            title="Rise of the Oathguard"
            tagline="Stand together against the automated Hollow Crown."
            className="rounded-none border-x-0 border-t-0"
          />

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Fact icon={Users}>1–3 local players</Fact>
              <Fact icon={Clock3}>15–25 minutes</Fact>
              <Fact icon={Bot}>Automated enemy</Fact>
            </div>

            <div>
              <h2 className="font-display text-sm tracking-widest uppercase">Best for</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo play, family teams, and players who enjoy solving a shared tactical puzzle.
              </p>
            </div>

            <ol
              className="space-y-2 text-sm text-muted-foreground"
              aria-label="Cooperative win path"
            >
              <PathStep number="1" text="Break the Hollow Crown Gate." />
              <PathStep number="2" text="Shatter its six crystals." />
              <PathStep number="3" text="Defeat the revealed Quick Boss." />
            </ol>

            <Button
              asChild
              size="lg"
              className="min-h-12 w-full font-display tracking-wider uppercase"
            >
              <Link to="/coop">
                <ShieldCheck className="size-4" aria-hidden />
                Set up a cooperative raid
              </Link>
            </Button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-hollow-violet/60 bg-hollow-blackglass/70 shadow-[var(--shadow-relic)]">
          <CoverBanner
            art="competitive"
            eyebrow="Competitive QuickPlay"
            title="Oathguard Trials"
            tagline="Challenge another Order or a rules-bound computer rival."
            className="rounded-none border-x-0 border-t-0 border-hollow-violet/60"
          />

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Fact icon={Users}>1–2 local players</Fact>
              <Fact icon={Clock3}>15–25 minutes</Fact>
              <Fact icon={Bot}>Three AI levels</Fact>
            </div>

            <div>
              <h2 className="font-display text-sm tracking-widest uppercase">Best for</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Direct duels, pass-and-play rivalry, and practicing against escalating AI
                difficulty.
              </p>
            </div>

            <ol
              className="space-y-2 text-sm text-muted-foreground"
              aria-label="Competitive win path"
            >
              <PathStep number="1" text="Break the opposing Gate." />
              <PathStep number="2" text="Reduce its crystals to zero." />
              <PathStep number="3" text="Or win when your rival cannot draw." />
            </ol>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="min-h-12 w-full border border-hollow-violet/50 font-display tracking-wider uppercase"
            >
              <Link to="/trials">
                <Swords className="size-4" aria-hidden />
                Set up an Oathguard Trial
              </Link>
            </Button>
          </div>
        </article>
      </div>

      <aside className="mt-5 rounded-xl border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
        New to Realmforge? The interactive tutorial teaches deployment, crystals, combat, Aegis,
        Support cards, and victory conditions in short guided lessons.{" "}
        <Link
          to="/tutorial"
          className="font-semibold text-oath-cyan underline-offset-4 hover:underline"
        >
          Start the tutorial
        </Link>
        .
      </aside>
    </RealmShell>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border/70 bg-card/65 px-3 text-xs text-oath-silver">
      <Icon className="size-3.5 text-oath-cyan" aria-hidden />
      {children}
    </span>
  );
}

function PathStep({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-oath-gold/45 bg-oath-gold/10 font-mono text-xs text-oath-gold">
        {number}
      </span>
      <span>{text}</span>
    </li>
  );
}
