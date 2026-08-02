import { Archive } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CardDefinition } from "@/game-data/schema";

export interface DiscardPileProps {
  label?: string;
  cards: readonly CardDefinition[];
  onInspectTop?: (card: CardDefinition) => void;
  className?: string;
}

export function DiscardPile({ label = "Discard", cards, onInspectTop, className }: DiscardPileProps) {
  const top = cards.at(-1) ?? null;
  return (
    <button
      type="button"
      disabled={!top}
      onClick={() => top && onInspectTop?.(top)}
      aria-label={`${label}: ${cards.length} cards${top ? `, top card ${top.name}` : ""}`}
      className={cn(
        "flex w-20 flex-col items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2 py-2 text-center",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
        className,
      )}
    >
      <Archive className="size-5 text-oath-silver" aria-hidden />
      <span className="font-mono text-sm">{cards.length}</span>
      <span className="text-[0.6rem] tracking-widest uppercase">{label}</span>
      {top && <span className="line-clamp-2 text-[0.6rem] text-muted-foreground">{top.name}</span>}
    </button>
  );
}