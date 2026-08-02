import { createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn to Play — Realmforge" },
      {
        name: "description",
        content:
          "The Realmforge QuickPlay turn in four steps: Ready and Charge, Play, Battle, Pass. Energy, Gates, crystals, and keywords explained.",
      },
      { property: "og:title", content: "Learn to Play — Realmforge" },
      {
        property: "og:description",
        content: "Ready and Charge, Play, Battle, Pass — the QuickPlay turn explained.",
      },
    ],
  }),
  component: LearnToPlay,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

const STEPS = [
  {
    name: "Ready and Charge",
    body: "Ready your cards, add one permanent Energy crystal (maximum six), turn every permanent crystal face-up, then draw one card.",
  },
  { name: "Play", body: "Play up to two cards. Turn face-up crystals face-down to pay their cost. Units enter ready but cannot attack this turn unless they have Surge." },
  { name: "Battle", body: "Attack with ready units. Defenders do not retaliate. Damage stays on units; discard a unit when damage equals or exceeds its DEF." },
  { name: "Pass", body: "End your turn and hand play to the next Oathguard or to the Hollow Crown." },
] as const;

const KEYWORDS = [
  { name: "Aegis", body: "A ready Aegis unit protects other units. A used Aegis unit does not guard." },
  { name: "Shield Matrix", body: "Reduces incoming damage as printed on the card." },
  { name: "Surge", body: "This unit may attack on the turn it enters play." },
  { name: "Deploy", body: "Triggers once, when the card enters play." },
  { name: "Echo", body: "Repeats a printed effect under the card's stated condition." },
  { name: "Restore X", body: "Restores X Ward or removes X damage as printed." },
] as const;

function LearnToPlay() {
  return (
    <RealmShell
      eyebrow="QuickPlay"
      title="Learn to Play"
      description="A full QuickPlay match runs 15–25 minutes and is designed for ages 8 and up."
    >
      <Alert className="mb-6 border-oath-gold/50">
        <AlertTitle>Rules text is pending approval</AlertTitle>
        <AlertDescription>
          The summaries below restate the locked QuickPlay brief. Detailed per-card walkthroughs
          are added once the QuickPlay rulebooks are supplied — nothing here is invented from the
          30-card standard edition.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="turn-heading" className="mb-8">
        <h2 id="turn-heading" className="mb-3 font-display text-lg tracking-wide">
          The turn, in four steps
        </h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.name} className="rounded-xl border border-border/70 bg-card/60 p-4">
              <span className="text-xs tracking-[0.3em] text-oath-cyan uppercase">
                Step {index + 1}
              </span>
              <h3 className="mt-1 font-display">{step.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="board-heading" className="mb-8">
        <h2 id="board-heading" className="mb-3 font-display text-lg tracking-wide">
          Winning and losing
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-oath-gold/40 bg-oath-blue-deep/60 p-4">
            <h3 className="font-display">Cooperative</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Break the Hollow Crown Gate, reduce its six crystals to zero, then defeat the Quick
              Boss — in that order. You lose if the Oathguard Crystal Spinner reaches zero.
            </p>
          </article>
          <article className="rounded-xl border border-hollow-violet/40 bg-hollow-blackglass/70 p-4">
            <h3 className="font-display">Oathguard Trials</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Break the opposing Gate and reduce its six crystals to zero, or win when your
              opponent must draw from an empty deck.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="keyword-heading">
        <h2 id="keyword-heading" className="mb-3 font-display text-lg tracking-wide">
          Core keywords
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KEYWORDS.map((keyword) => (
            <div key={keyword.name} className="rounded-xl border border-border/70 bg-card/60 p-4">
              <dt className="font-display text-oath-gold">{keyword.name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{keyword.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </RealmShell>
  );
}