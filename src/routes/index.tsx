import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { CoverBanner } from "@/components/game/CoverBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Realmforge — Fantasy Strategy Card Game" },
      {
        name: "description",
        content:
          "Take up the Oathguard banner. Realmforge is a family-friendly fantasy card game with cooperative and head-to-head QuickPlay matches.",
      },
      { property: "og:title", content: "Realmforge — Fantasy Strategy Card Game" },
      {
        property: "og:description",
        content:
          "Cooperative raids against the Hollow Crown and head-to-head Oathguard Trials.",
      },
    ],
  }),
  component: TitleScreen,
});

function TitleScreen() {
  return (
    <main className="safe-shell relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(900px_520px_at_50%_10%,color-mix(in_oklab,var(--oath-blue)_45%,transparent),transparent_70%),radial-gradient(700px_420px_at_80%_90%,color-mix(in_oklab,var(--hollow-violet)_28%,transparent),transparent_70%)]"
      />
      <div className="relative w-full max-w-5xl">
        <CoverBanner art="cooperative" hero className="mb-8" />
        <p className="text-xs tracking-[0.5em] text-oath-cyan uppercase">Rise of the Oathguard</p>
        <h1 className="mt-4 text-5xl leading-none font-bold sm:text-7xl">
          <span className="text-gilt">REALMFORGE</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
          Spend your crystals, hold the Gate, and break the Hollow Crown. Two QuickPlay editions,
          one banner.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="min-w-52 font-display tracking-widest uppercase">
            <Link to="/menu">Enter the Realm</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="min-w-52 border-oath-gold/50 font-display tracking-widest uppercase"
          >
            <Link to="/learn">Learn to Play</Link>
          </Button>
        </div>

        <p className="mt-10 text-[0.7rem] tracking-widest text-muted-foreground uppercase">
          Ages 8+ · 15–25 minute matches · Plays offline
        </p>
      </div>
    </main>
  );
}