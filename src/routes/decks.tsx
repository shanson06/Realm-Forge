import { Link, createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GameMode } from "@/game-data/schema";
import { deckStrategy } from "@/game-data/deck-strategy";
import {
  QUICKPLAY_DECK_SIZE,
  buildAllQuickPlayDecks,
  candidateTitles,
} from "@/game-data/quickplay";

type ModeFilter = "cooperative" | "competitive" | "all";

export const Route = createFileRoute("/decks")({
  validateSearch: (search: Record<string, unknown>): { mode: ModeFilter } => {
    const raw = search.mode;
    return {
      mode: raw === "cooperative" || raw === "competitive" ? raw : "all",
    };
  },
  head: () => ({
    meta: [
      { title: "Deck Selection — Realmforge" },
      {
        name: "description",
        content:
          "Review the six Realmforge QuickPlay decks, their source deck, title counts, and validation state.",
      },
      { property: "og:title", content: "Deck Selection — Realmforge" },
      { property: "og:description", content: "The six QuickPlay decks and their validation state." },
    ],
  }),
  component: DeckSelection,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
  notFoundComponent: () => <p className="p-6">No decks found.</p>,
});

function DeckSelection() {
  const { mode } = Route.useSearch();
  const decks = buildAllQuickPlayDecks().filter((deck) =>
    mode === "all"
      ? true
      : deck.manifest.mode ===
        (mode === "cooperative" ? GameMode.Cooperative : GameMode.Competitive),
  );
  const blocked = decks.filter((d) => !d.valid).length;

  return (
    <RealmShell
      eyebrow="Deck selection"
      title="QuickPlay decks"
      description={`Each QuickPlay deck is exactly ${QUICKPLAY_DECK_SIZE} cards: 10 approved titles, two copies each.`}
      actions={
        <nav className="flex gap-2 text-xs">
          {(["all", "cooperative", "competitive"] as const).map((value) => (
            <Link
              key={value}
              to="/decks"
              search={{ mode: value }}
              className="rounded-full border border-border/70 px-3 py-1 tracking-widest uppercase data-[status=active]:border-oath-gold data-[status=active]:text-oath-gold"
              activeProps={{}}
              data-status={mode === value ? "active" : undefined}
            >
              {value}
            </Link>
          ))}
        </nav>
      }
    >
      {blocked > 0 && (
        <Alert className="mb-6 border-realm-danger/60">
          <AlertTitle>{blocked} deck(s) cannot be built yet</AlertTitle>
          <AlertDescription>
            The approved 10-title QuickPlay lists are not present in the uploaded sources. Nothing
            has been inferred; supply the QuickPlay rulebooks to unlock these decks.
          </AlertDescription>
        </Alert>
      )}

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => {
          const pool = candidateTitles(deck.manifest).length;
          return (
            <li key={deck.manifest.deckId}>
              <Link
                to="/deck/$deckId"
                params={{ deckId: deck.manifest.deckId }}
                className="flex h-full flex-col rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-oath-cyan/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display">{deck.manifest.label}</h2>
                  <Badge variant={deck.valid ? "secondary" : "destructive"}>
                    {deck.valid ? "Ready" : "Awaiting source"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs tracking-widest text-oath-cyan uppercase">
                  {deck.manifest.mode}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{deck.manifest.sourceDeck}</p>
                <p className="mt-2 text-sm">{deckStrategy(deck.manifest.deckId)}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat label="Titles" value={`${deck.entries.length}/10`} />
                  <Stat label="Cards" value={`${deck.totalCards}/${QUICKPLAY_DECK_SIZE}`} />
                  <Stat label="Pool" value={String(pool)} />
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </RealmShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 py-2">
      <dt className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}