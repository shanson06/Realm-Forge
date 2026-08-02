import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CardInspectModal } from "@/components/game/CardInspectModal";
import { RealmCard } from "@/components/game/RealmCard";
import { RealmShell } from "@/components/game/RealmShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { competitiveCatalog, cooperativeCatalog } from "@/game-data/load";
import { QUICKPLAY_DECK_MANIFESTS } from "@/game-data/quickplay";
import { GameMode, type CardDefinition } from "@/game-data/schema";
import { usePlayerData } from "@/hooks/use-player-data";
import { cn } from "@/lib/utils";

type ModeFilter = "cooperative" | "competitive";

interface Search {
  mode: ModeFilter;
  q: string;
  side: string;
  faction: string;
  type: string;
  cost: string;
  keyword: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/collection")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    mode: search.mode === "competitive" ? "competitive" : "cooperative",
    q: str(search.q),
    side: str(search.side),
    faction: str(search.faction),
    type: str(search.type),
    cost: str(search.cost),
    keyword: str(search.keyword),
  }),
  head: () => ({
    meta: [
      { title: "Collection — Realmforge" },
      {
        name: "description",
        content:
          "Browse every Realmforge card record from the cooperative and competitive source databases. Filter by side, faction, type, cost, keyword, and name.",
      },
      { property: "og:title", content: "Collection — Realmforge" },
      { property: "og:description", content: "Every card record from both source databases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Collection,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6">
      {error.message}
    </p>
  ),
});

/** deckId list each card appears in, from the curated QuickPlay manifests. */
function deckUsage(card: CardDefinition): string[] {
  return QUICKPLAY_DECK_MANIFESTS.filter(
    (m) => m.mode === card.mode && m.titles.includes(card.name),
  ).map((m) => m.label);
}

function Collection() {
  const search = Route.useSearch();
  const { mode, q } = search;
  const navigate = Route.useNavigate();
  const { markAchievement } = usePlayerData();
  const [inspected, setInspected] = useState<CardDefinition | null>(null);

  const catalog = mode === "competitive" ? competitiveCatalog : cooperativeCatalog;

  const facets = useMemo(() => {
    const uniq = (values: string[]) => [...new Set(values)].sort();
    return {
      side: uniq(catalog.cards.map((c) => c.side)),
      faction: uniq(catalog.cards.map((c) => c.faction)),
      type: uniq(catalog.cards.map((c) => c.type)),
      cost: uniq(catalog.cards.map((c) => String(c.cost))).sort((a, b) => Number(a) - Number(b)),
      keyword: uniq(catalog.cards.flatMap((c) => c.keywords)),
    };
  }, [catalog]);

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.cards.filter((c) => {
      if (search.side && c.side !== search.side) return false;
      if (search.faction && c.faction !== search.faction) return false;
      if (search.type && c.type !== search.type) return false;
      if (search.cost && String(c.cost) !== search.cost) return false;
      if (search.keyword && !c.keywords.includes(search.keyword as never)) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.id.toLowerCase().includes(needle) ||
        c.rules_text.toLowerCase().includes(needle)
      );
    });
  }, [catalog, q, search]);

  const set = (patch: Partial<Search>) =>
    navigate({ to: ".", search: { ...search, ...patch }, replace: true });

  const filtered =
    search.side || search.faction || search.type || search.cost || search.keyword || q;

  const usage = inspected ? deckUsage(inspected) : [];

  return (
    <RealmShell
      eyebrow={`${GameMode.Cooperative === catalog.mode ? "Cooperative" : "Competitive"} edition`}
      title="Collection"
      description={`${cards.length} of ${catalog.cards.length} records shown. Every gameplay card is available from the start — nothing is behind packs or payments.`}
      wide
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 text-xs">
            {(["cooperative", "competitive"] as const).map((value) => (
              <Link
                key={value}
                to="/collection"
                search={{
                  ...search,
                  mode: value,
                  side: "",
                  faction: "",
                  type: "",
                  cost: "",
                  keyword: "",
                }}
                data-status={mode === value ? "active" : undefined}
                className="rounded-full border border-border/70 px-3 py-1 tracking-widest uppercase data-[status=active]:border-oath-gold data-[status=active]:text-oath-gold"
              >
                {value}
              </Link>
            ))}
          </div>
          <Input
            value={q}
            placeholder="Search name, ID, rules text…"
            aria-label="Search the collection"
            className="w-56"
            onChange={(event) => set({ q: event.target.value })}
          />
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Facet
          label="Side"
          value={search.side}
          options={facets.side}
          onChange={(v) => set({ side: v })}
        />
        <Facet
          label="Faction"
          value={search.faction}
          options={facets.faction}
          onChange={(v) => set({ faction: v })}
        />
        <Facet
          label="Type"
          value={search.type}
          options={facets.type}
          onChange={(v) => set({ type: v })}
        />
        <Facet
          label="Cost"
          value={search.cost}
          options={facets.cost}
          onChange={(v) => set({ cost: v })}
        />
        <Facet
          label="Keyword"
          value={search.keyword}
          options={facets.keyword}
          onChange={(v) => set({ keyword: v })}
        />
      </div>

      {filtered && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => set({ q: "", side: "", faction: "", type: "", cost: "", keyword: "" })}
        >
          Clear all filters
        </Button>
      )}

      {cards.length === 0 ? (
        <p className="rounded-xl border border-border/70 bg-card/60 p-8 text-center text-muted-foreground">
          No records match these filters.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
          {cards.map((card) => (
            <li key={card.id}>
              <RealmCard
                card={card}
                size="md"
                className="w-full"
                onInspect={(c) => {
                  setInspected(c);
                  markAchievement("ach-inspector");
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <CardInspectModal
        card={inspected}
        open={inspected !== null}
        onOpenChange={(open) => !open && setInspected(null)}
      />

      {inspected && (
        <p className="sr-only" aria-live="polite">
          {inspected.name} is legal in {inspected.mode} play
          {usage.length > 0 ? `, used in ${usage.join(", ")}` : ", not in a curated QuickPlay deck"}
          .
        </p>
      )}

      {inspected && (
        <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-oath-gold/40 bg-background/95 px-4 py-2 text-xs backdrop-blur">
          <span className="font-display">{inspected.name}</span>
          <span className="ml-2 text-muted-foreground">
            {inspected.mode} legality: {inspected.legality ?? "QuickPlay"} ·{" "}
            {usage.length > 0
              ? `In deck(s): ${usage.join(", ")}`
              : "Not part of a curated QuickPlay deck"}
          </span>
        </aside>
      )}
    </RealmShell>
  );
}

function Facet({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `facet-${label.toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id} className="text-[0.65rem] tracking-widest uppercase">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1 h-9 w-full rounded-md border border-border/70 bg-card/60 px-2 text-sm",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
