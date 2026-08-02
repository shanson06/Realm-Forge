import { Link, createFileRoute } from "@tanstack/react-router";

import { RealmShell } from "@/components/game/RealmShell";
import { Badge } from "@/components/ui/badge";

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
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error.message}</p>,
});

function ModeSelect() {
  return (
    <RealmShell
      eyebrow="Mode selection"
      title="Choose your battle"
      description="Both modes are QuickPlay: 20-card decks, six crystals, and 10-Ward Gates."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/coop"
          className="group flex flex-col rounded-2xl border border-oath-gold/50 bg-oath-blue-deep/70 p-6 transition-colors hover:border-oath-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Badge className="w-fit bg-oath-cyan/20 text-oath-cyan">Cooperative · 1–3 players</Badge>
          <h2 className="mt-3 font-display text-xl">Rise of the Oathguard</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stand together against the automated Hollow Crown. Break the enemy Gate, shatter six
            crystals, then bring down the Quick Boss.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            <li>Four shared Oathguard unit spaces and one Support space</li>
            <li>Boss Health 12 / 16 / 20 by player count</li>
            <li>Enemy acts on published priority rules only — no hidden logic</li>
          </ul>
        </Link>

        <Link
          to="/trials"
          className="group flex flex-col rounded-2xl border border-hollow-violet/50 bg-hollow-blackglass/80 p-6 transition-colors hover:border-hollow-violet-bright focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Badge className="w-fit bg-hollow-violet/25 text-hollow-violet-bright">
            Competitive · 2 players
          </Badge>
          <h2 className="mt-3 font-display text-xl">Oathguard Trials</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Face another Order locally or a computer-controlled Oathguard. Three unit spaces and
            one Support space per side.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            <li>First player skips the first Draw</li>
            <li>Second player receives one Reserve token</li>
            <li>Initiate, Guardian, and Champion difficulty</li>
          </ul>
        </Link>
      </div>
    </RealmShell>
  );
}