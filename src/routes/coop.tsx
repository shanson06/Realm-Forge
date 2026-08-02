import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { RealmShell } from "@/components/game/RealmShell";
import { CoverBanner } from "@/components/game/CoverBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUICK_BOSSES, bossHealthFor } from "@/game-data/bosses";
import { encounterManifests, getManifest, oathguardManifests } from "@/game-data/quickplay";
import { GameMode } from "@/game-data/schema";
import { validateSetup } from "@/game-engine/setup";
import { createFreshMatch, useMatch, type MatchConfig } from "@/hooks/use-match";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coop")({
  head: () => ({
    meta: [
      { title: "Rise of the Oathguard — Cooperative Setup" },
      {
        name: "description",
        content:
          "Choose one to three Oathguard Orders, an encounter deck and a Quick Boss, then raid the Hollow Crown together.",
      },
      { property: "og:title", content: "Rise of the Oathguard — Cooperative Setup" },
      {
        property: "og:description",
        content: "Pick your Orders, encounter deck and Quick Boss for a Realmforge QuickPlay raid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoopSetup,
  errorComponent: ({ error }) => (
    <p role="alert" className="p-6 text-sm">
      {error.message}
    </p>
  ),
});

const PLAYER_COUNTS = [1, 2, 3] as const;

function Choice({
  selected,
  onClick,
  disabled,
  children,
  tone = "oath",
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: "oath" | "hollow";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        tone === "oath"
          ? "border-oath-gold/35 bg-oath-blue-deep/50 hover:border-oath-gold"
          : "border-hollow-violet/40 bg-hollow-blackglass/70 hover:border-hollow-violet-bright",
        selected &&
          (tone === "oath"
            ? "border-oath-gold ring-2 ring-oath-cyan/70"
            : "border-hollow-violet-bright ring-2 ring-hollow-violet/70"),
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {children}
    </button>
  );
}

function CoopSetup() {
  const navigate = useNavigate();
  const { startNewMatch } = useMatch();

  const orders = useMemo(() => oathguardManifests(GameMode.Cooperative), []);
  const encounters = useMemo(() => encounterManifests(), []);

  const [playerCount, setPlayerCount] = useState<1 | 2 | 3>(1);
  const [orderDeckIds, setOrderDeckIds] = useState<string[]>([orders[0]?.deckId ?? ""]);
  const [encounterDeckId, setEncounterDeckId] = useState(encounters[0]?.deckId ?? "");
  const [bossId, setBossId] = useState(QUICK_BOSSES[0].id);
  const [error, setError] = useState<string | null>(null);

  const changeCount = (count: 1 | 2 | 3) => {
    setPlayerCount(count);
    setOrderDeckIds((current) => {
      const next = current.slice(0, count);
      while (next.length < count) {
        const free = orders.find((m) => !next.includes(m.deckId));
        if (!free) break;
        next.push(free.deckId);
      }
      return next;
    });
  };

  const setSeatOrder = (seatIndex: number, deckId: string) => {
    setOrderDeckIds((current) => {
      const next = [...current];
      const clash = next.indexOf(deckId);
      if (clash !== -1 && clash !== seatIndex) next[clash] = current[seatIndex];
      next[seatIndex] = deckId;
      return next;
    });
  };

  const config: MatchConfig = { playerCount, orderDeckIds, encounterDeckId, bossId };
  const setupError = validateSetup({ ...config, seed: "preview" });

  const begin = () => {
    try {
      // Fail before navigation if any deck cannot be built from the source data.
      createFreshMatch(config);
      startNewMatch(config);
      void navigate({ to: "/match" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The match could not be created.");
    }
  };

  const boss = QUICK_BOSSES.find((b) => b.id === bossId) ?? QUICK_BOSSES[0];
  const revealsPerTurn = playerCount === 1 ? 1 : 2;

  return (
    <RealmShell
      backTo="/modes"
      backLabel="Back to modes"
      eyebrow="Cooperative QuickPlay"
      title="Rise of the Oathguard"
      description="One to three locally controlled Orders share a Gate, a Crystal Spinner, four unit spaces and one Support space."
      actions={
        <Button size="lg" onClick={begin} disabled={setupError !== null}>
          Begin the raid
        </Button>
      }
    >
      <CoverBanner
        art="cooperative"
        eyebrow="Rise of the Oathguard"
        title="Hold the line"
        tagline="Stand together. Break the Hollow Crown Gate, shatter its six crystals, then face the Quick Boss."
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
          <section aria-labelledby="player-count">
            <h2 id="player-count" className="font-display text-sm tracking-widest uppercase">
              Players at this device
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Every seat is controlled locally, one turn at a time. Boss Health scales 12 / 16 / 20.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PLAYER_COUNTS.map((count) => (
                <Choice
                  key={count}
                  selected={playerCount === count}
                  onClick={() => changeCount(count)}
                >
                  <p className="font-display text-lg">
                    {count} {count === 1 ? "player" : "players"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Boss Health {bossHealthFor(count)} · {count === 1 ? "1" : "2"} encounter card
                    {count === 1 ? "" : "s"} per Hollow Crown turn
                  </p>
                </Choice>
              ))}
            </div>
          </section>

          <section aria-labelledby="orders">
            <h2 id="orders" className="font-display text-sm tracking-widest uppercase">
              Oathguard Orders
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each player must control a different Order.
            </p>
            <div className="mt-3 space-y-4">
              {Array.from({ length: playerCount }, (_, seatIndex) => (
                <div key={seatIndex}>
                  <p className="mb-2 text-xs tracking-widest text-oath-silver/80 uppercase">
                    Player {seatIndex + 1}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {orders.map((manifest) => {
                      const takenBy = orderDeckIds.indexOf(manifest.deckId);
                      return (
                        <Choice
                          key={manifest.deckId}
                          selected={orderDeckIds[seatIndex] === manifest.deckId}
                          onClick={() => setSeatOrder(seatIndex, manifest.deckId)}
                        >
                          <p className="font-display">{manifest.label}</p>
                          <p className="text-xs text-muted-foreground">{manifest.provenance}</p>
                          {takenBy !== -1 && takenBy !== seatIndex && (
                            <Badge className="mt-2 bg-oath-cyan/15 text-oath-cyan">
                              Player {takenBy + 1} — tap to swap
                            </Badge>
                          )}
                        </Choice>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="encounter">
            <h2 id="encounter" className="font-display text-sm tracking-widest uppercase">
              Hollow Crown encounter deck
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {encounters.map((manifest) => (
                <Choice
                  key={manifest.deckId}
                  tone="hollow"
                  selected={encounterDeckId === manifest.deckId}
                  onClick={() => setEncounterDeckId(manifest.deckId)}
                >
                  <p className="font-display">{manifest.label}</p>
                  <p className="text-xs text-muted-foreground">{manifest.provenance}</p>
                </Choice>
              ))}
            </div>
          </section>

          <section aria-labelledby="boss">
            <h2 id="boss" className="font-display text-sm tracking-widest uppercase">
              Quick Boss
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {QUICK_BOSSES.map((profile) => (
                <Choice
                  key={profile.id}
                  tone="hollow"
                  selected={bossId === profile.id}
                  onClick={() => setBossId(profile.id)}
                >
                  <p className="font-display">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.summary}</p>
                  <p className="mt-2 font-mono text-xs">
                    ATK {profile.atk} · Health {bossHealthFor(playerCount)}
                  </p>
                  {profile.suggestedEncounterDeckId === encounterDeckId && (
                    <Badge className="mt-2 bg-hollow-violet/25 text-hollow-violet-bright">
                      Matches your encounter deck
                    </Badge>
                  )}
                </Choice>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-oath-gold/35 bg-oath-blue-deep/60 p-4">
          <h2 className="font-display text-sm tracking-widest uppercase">Table summary</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Orders</dt>
              <dd>{orderDeckIds.map((id) => getManifest(id)?.label ?? id).join(" · ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Encounter deck</dt>
              <dd>{getManifest(encounterDeckId)?.label ?? encounterDeckId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Quick Boss</dt>
              <dd>
                {boss.name} — {boss.modifierLabel}
              </dd>
            </div>
          </dl>
          <div className="h-px bg-[image:var(--gradient-gilt)] opacity-50" aria-hidden />
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Both Gates start at 10 Ward; both Crystal Spinners start at 6.</li>
            <li>
              Boss Health {bossHealthFor(playerCount)}. He wakes once the Hollow crystals fall.
            </li>
            <li>
              {revealsPerTurn} encounter card{revealsPerTurn === 1 ? "" : "s"} revealed each Hollow
              Crown turn.
            </li>
            <li>
              Two cards per player turn. Units enter ready but cannot attack unless they have Surge.
            </li>
          </ul>
          <Button variant="outline" asChild className="w-full">
            <Link to="/learn">How QuickPlay works</Link>
          </Button>
        </aside>
      </div>
    </RealmShell>
  );
}
