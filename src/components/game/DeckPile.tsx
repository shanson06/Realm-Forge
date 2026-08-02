import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Allegiance } from "./side";

export interface DeckPileProps {
  label?: string;
  count: number;
  allegiance?: Exclude<Allegiance, "neutral">;
  /** Drawing from an empty deck is a loss condition in competitive play. */
  warnWhenEmpty?: boolean;
  className?: string;
}

export function DeckPile({
  label = "Deck",
  count,
  allegiance = "oathguard",
  warnWhenEmpty = true,
  className,
}: DeckPileProps) {
  const empty = count <= 0;
  return (
    <div
      aria-label={`${label}: ${count} cards remaining`}
      className={cn(
        "flex w-20 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center",
        allegiance === "oathguard"
          ? "border-oath-gold/40 bg-oath-blue-deep/60"
          : "border-hollow-violet/40 bg-hollow-blackglass/70",
        empty && warnWhenEmpty && "border-realm-danger/70",
        className,
      )}
    >
      <Layers className="size-5 text-oath-silver" aria-hidden />
      <span className="font-mono text-sm">{count}</span>
      <span className="text-[0.6rem] tracking-widest uppercase">{label}</span>
      {empty && warnWhenEmpty && (
        <span className="text-[0.6rem] font-semibold text-realm-danger uppercase">Empty</span>
      )}
    </div>
  );
}
