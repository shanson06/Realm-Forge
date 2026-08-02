import { Gem } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CardDefinition } from "@/game-data/schema";
import { RealmCard } from "./RealmCard";
import type { Allegiance } from "./side";

export interface SupportSlotProps {
  allegiance: Exclude<Allegiance, "neutral">;
  label?: string;
  card?: CardDefinition | null;
  highlighted?: boolean;
  illegalReason?: string | null;
  onSelect?: () => void;
  onInspect?: (card: CardDefinition) => void;
}

/** One shared Support space per side. Items and Relics live here. */
export function SupportSlot({
  allegiance,
  label = "Support",
  card = null,
  highlighted = false,
  illegalReason = null,
  onSelect,
  onInspect,
}: SupportSlotProps) {
  return (
    <div
      className={cn(
        "flex min-h-44 items-center justify-center rounded-xl border-2 border-dashed p-1",
        allegiance === "oathguard" ? "border-oath-gold/35" : "border-hollow-violet/35",
        highlighted && "border-solid border-oath-cyan bg-oath-cyan/10",
      )}
    >
      {card ? (
        <RealmCard card={card} size="sm" illegalReason={illegalReason} onInspect={onInspect} />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Empty ${label} space`}
          className="flex size-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Gem className="size-5" aria-hidden />
          <span className="text-[0.65rem] tracking-widest uppercase">{label}</span>
        </button>
      )}
    </div>
  );
}
