import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { CardInspectModal } from "@/components/game/CardInspectModal";
import { RealmCard } from "@/components/game/RealmCard";
import { RealmShell } from "@/components/game/RealmShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { CardDefinition } from "@/game-data/schema";
import { deckStrategy } from "@/game-data/deck-strategy";
import { buildQuickPlayDeck, candidateTitles, getManifest } from "@/game-data/quickplay";

export const Route = createFileRoute("/deck/$deckId")({
  loader: ({ params }) => {
    const manifest = getManifest(params.deckId);
    if (!manifest) throw notFound();
    return { deckId: params.deckId };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.deckId} — Realmforge Deck Viewer` },
      {
        name: "description",
        content: `Inspect every card, cost, and effect status in the Realmforge QuickPlay deck ${params.deckId}.`,
      },
      { property: "og:title", content: `${params.deckId} — Realmforge Deck Viewer` },
      { property: "og:description", content: "Card-by-card deck inspection with effect status." },
    ],
  }),
  component: DeckViewer,
  pendingComponent: () => <p className="p-6 text-muted-foreground">Loading deck…</p>,
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
  notFoundComponent: () => {
    const { deckId } = Route.useParams();
    return <p className="p-6">No QuickPlay deck named “{deckId}”.</p>;
  },
});

function DeckViewer() {
  const { deckId } = Route.useParams();
  const [inspected, setInspected] = useState<CardDefinition | null>(null);
  const manifest = getManifest(deckId)!;
  const deck = buildQuickPlayDeck(manifest);
  const pool = candidateTitles(manifest);
  const shown = deck.entries.length > 0 ? deck.entries.map((e) => e.card) : pool;

  return (
    <RealmShell
      backTo="/decks"
      backLabel="Deck selection"
      eyebrow={`${manifest.mode} · ${manifest.sourceDeck}`}
      title={manifest.label}
      description={manifest.provenance}
      actions={
        <Badge variant={deck.valid ? "secondary" : "destructive"}>
          {deck.totalCards} / 20 cards
        </Badge>
      }
      wide
    >
      <section className="mb-6 rounded-xl border border-oath-cyan/40 bg-card/60 p-4">
        <h2 className="font-display text-xs tracking-widest uppercase">How this deck plays</h2>
        <p className="mt-2 text-sm text-muted-foreground">{deckStrategy(deckId)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          QuickPlay uses curated decks, so this list is fixed. Freeform deck building is not
          enabled.
        </p>
      </section>

      {!deck.valid && (
        <Alert className="mb-6 border-realm-danger/60">
          <AlertTitle>Deck not built</AlertTitle>
          <AlertDescription>
            Showing the full {pool.length}-card source pool for reference. These are candidate
            titles from the standard edition, not an approved QuickPlay cut.
          </AlertDescription>
        </Alert>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
        {shown.map((card) => (
          <li key={card.id}>
            <RealmCard card={card} size="md" onInspect={setInspected} className="w-full" />
          </li>
        ))}
      </ul>

      <CardInspectModal
        card={inspected}
        open={inspected !== null}
        onOpenChange={(open) => !open && setInspected(null)}
      />
    </RealmShell>
  );
}