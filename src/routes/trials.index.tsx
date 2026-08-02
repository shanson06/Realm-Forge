import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { RealmShell } from "@/components/game/RealmShell";
import { CoverBanner } from "@/components/game/CoverBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { oathguardManifests } from "@/game-data/quickplay";
import { GameMode } from "@/game-data/schema";
import { TRIALS_DIFFICULTIES } from "@/game-ai/trials";
import { validateTrialsSetup, type TrialsSeatConfig } from "@/game-engine/trials/setup";
import type { TrialsControllerKind, TrialsDifficulty } from "@/game-engine/trials/types";
import { createFreshTrialsMatch, useTrials } from "@/hooks/use-trials";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trials/")({
  head: () => ({
    meta: [
      { title: "Oathguard Trials — Competitive Setup" },
      {
        name: "description",
        content:
          "Set up a competitive Realmforge QuickPlay duel: pass-and-play on one device or a match against Initiate, Guardian or Champion.",
      },
      { property: "og:title", content: "Oathguard Trials — Competitive Setup" },
      {
        property: "og:description",
        content: "Choose your Order, your opponent and the difficulty, then duel for the Gate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrialsSetup,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6 text-sm">
      {error.message}
    </p>
  ),
});

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border border-oath-gold/35 bg-oath-blue-deep/50 p-3 text-left transition-colors hover:border-oath-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected && "border-oath-gold ring-2 ring-oath-cyan/70",
      )}
    >
      {children}
    </button>
  );
}

const DIFFICULTY_ORDER: readonly TrialsDifficulty[] = ["initiate", "guardian", "champion"];

function TrialsSetup() {
  const navigate = useNavigate();
  const { startNewMatch } = useTrials();
  const orders = useMemo(() => oathguardManifests(GameMode.Competitive), []);

  const [opponent, setOpponent] = useState<TrialsControllerKind>("ai");
  const [difficulty, setDifficulty] = useState<TrialsDifficulty>("guardian");
  const [deckOne, setDeckOne] = useState(orders[0]?.deckId ?? "");
  const [deckTwo, setDeckTwo] = useState(orders[1]?.deckId ?? orders[0]?.deckId ?? "");
  const [error, setError] = useState<string | null>(null);

  const seats: [TrialsSeatConfig, TrialsSeatConfig] = [
    { deckId: deckOne, controller: "human", displayName: "Player 1" },
    {
      deckId: deckTwo,
      controller: opponent,
      difficulty: opponent === "ai" ? difficulty : null,
      displayName:
        opponent === "ai" ? `Computer · ${TRIALS_DIFFICULTIES[difficulty].label}` : "Player 2",
    },
  ];
  const setupError = validateTrialsSetup(seats);

  const begin = () => {
    try {
      createFreshTrialsMatch({ seats });
      startNewMatch({ seats });
      void navigate({ to: "/trials/match" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The duel could not be created.");
    }
  };

  return (
    <RealmShell
      backTo="/modes"
      backLabel="Back to modes"
      eyebrow="Competitive QuickPlay"
      title="Oathguard Trials"
      description="Three unit spaces and one Support space per player. Both Gates start at 10 Ward and both Crystal Spinners at 6."
      actions={
        <Button size="lg" onClick={begin} disabled={setupError !== null}>
          Begin the duel
        </Button>
      }
    >
      <CoverBanner
        art="competitive"
        eyebrow="Oathguard Trials"
        title="Order against Order"
        tagline="Break the opposing Gate, reduce its six crystals to zero, or outlast a rival who must draw from an empty deck."
        className="mb-5"
      />
      {(error ?? setupError) && (
        <Alert className="mb-4 border-oath-gold/60" role="alert">
          <AlertTitle>Check your table</AlertTitle>
          <AlertDescription>{error ?? setupError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section aria-labelledby="opponent">
            <h2 id="opponent" className="font-display text-sm tracking-widest uppercase">
              Opponent
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Choice selected={opponent === "ai"} onClick={() => setOpponent("ai")}>
                <p className="font-display text-lg">Computer opponent</p>
                <p className="text-xs text-muted-foreground">
                  A rules-bound opponent that reads only public information and its own hand.
                </p>
              </Choice>
              <Choice selected={opponent === "human"} onClick={() => setOpponent("human")}>
                <p className="font-display text-lg">Two players, one device</p>
                <p className="text-xs text-muted-foreground">
                  Pass-and-play with a private handoff screen between every turn.
                </p>
              </Choice>
            </div>
          </section>

          {opponent === "ai" && (
            <section aria-labelledby="difficulty">
              <h2 id="difficulty" className="font-display text-sm tracking-widest uppercase">
                Difficulty
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {DIFFICULTY_ORDER.map((level) => (
                  <Choice
                    key={level}
                    selected={difficulty === level}
                    onClick={() => setDifficulty(level)}
                  >
                    <p className="font-display">{TRIALS_DIFFICULTIES[level].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIALS_DIFFICULTIES[level].description}
                    </p>
                  </Choice>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="decks">
            <h2 id="decks" className="font-display text-sm tracking-widest uppercase">
              Orders
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Mirror matches are allowed in the Trials — both sides may bring the same Order.
            </p>
            <div className="mt-3 space-y-4">
              {[
                { label: "Player 1", value: deckOne, set: setDeckOne },
                {
                  label: opponent === "ai" ? "Computer" : "Player 2",
                  value: deckTwo,
                  set: setDeckTwo,
                },
              ].map((seat) => (
                <div key={seat.label}>
                  <p className="mb-2 text-xs tracking-widest text-oath-silver/80 uppercase">
                    {seat.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {orders.map((manifest) => (
                      <Choice
                        key={manifest.deckId}
                        selected={seat.value === manifest.deckId}
                        onClick={() => seat.set(manifest.deckId)}
                      >
                        <p className="font-display">{manifest.label}</p>
                        <p className="text-xs text-muted-foreground">{manifest.provenance}</p>
                      </Choice>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-oath-gold/35 bg-oath-blue-deep/40 p-4">
          <Badge className="bg-oath-cyan/20 text-oath-cyan">Trials QuickPlay rules</Badge>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>Starting hand of four with one full-hand replacement.</li>
            <li>Ready and Charge, Play, Battle, Pass. Energy caps at six crystals.</li>
            <li>No more than two cards played per turn.</li>
            <li>The first player skips the Draw part of their first Ready and Charge.</li>
            <li>
              The second player holds one Reserve token: once during their first three turns it adds
              a face-up temporary crystal, removed during Pass.
            </li>
            <li>A ready Aegis unit protects other units, never the Gate.</li>
            <li>
              Win by breaking the opposing Gate and reducing its six crystals to zero, or when the
              opponent must draw from an empty deck.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            The first player is rolled at random and shown before the first turn.
          </p>
        </aside>
      </div>
    </RealmShell>
  );
}
