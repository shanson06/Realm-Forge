import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CardDefinition } from "@/game-data/schema";
import { RealmCard } from "./RealmCard";
import type { Allegiance } from "./side";

export interface UnitSlotProps {
  index: number;
  allegiance: Exclude<Allegiance, "neutral">;
  card?: CardDefinition | null;
  damage?: number;
  exhausted?: boolean;
  /** Highlighted as a legal drop or attack target. */
  highlighted?: boolean;
  illegalReason?: string | null;
  /** Plays the arrival animation for a newly deployed unit. */
  entering?: boolean;
  onSelect?: (index: number) => void;
  onInspect?: (card: CardDefinition) => void;
}

export function UnitSlot({
  index,
  allegiance,
  card = null,
  damage = 0,
  exhausted = false,
  highlighted = false,
  illegalReason = null,
  entering = false,
  onSelect,
  onInspect,
}: UnitSlotProps) {
  return (
    <div
      data-slot-index={index}
      className={cn(
        "relative flex min-h-48 items-center justify-center rounded-lg border-2 p-1.5 transition-colors",
        allegiance === "oathguard"
          ? "border-oath-gold/35 [background:linear-gradient(180deg,color-mix(in_oklab,var(--oath-blue-deep)_45%,transparent),transparent)]"
          : "border-hollow-violet/35 [background:linear-gradient(180deg,color-mix(in_oklab,var(--hollow-blackglass)_60%,transparent),transparent)]",
        highlighted && "realm-target-glow border-solid border-oath-cyan bg-oath-cyan/10",
        exhausted && "opacity-70",
      )}
    >
      {card ? (
        <>
          <RealmCard
            card={card}
            size="sm"
            damage={damage}
            illegalReason={illegalReason}
            entering={entering}
            onInspect={onInspect}
            className={cn(exhausted && "rotate-3")}
          />
          {exhausted && (
            <span className="absolute top-1 right-1 rounded-sm bg-background/85 px-1 text-[0.6rem] tracking-wide uppercase">
              Used
            </span>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => onSelect?.(index)}
          aria-label={`Empty unit space ${index + 1}`}
          className="flex size-full flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-5" aria-hidden />
          <span className="text-[0.65rem] tracking-widest uppercase">Unit {index + 1}</span>
        </button>
      )}
    </div>
  );
}
