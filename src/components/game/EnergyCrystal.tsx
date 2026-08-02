import { cn } from "@/lib/utils";

export interface EnergyCrystalProps {
  /** Face-up crystals are spendable; face-down crystals have already paid a cost. */
  state: "faceUp" | "faceDown" | "temporary" | "empty";
  /** Plays the charge animation when the crystal was just added or readied. */
  fresh?: boolean;
  className?: string;
}

export function EnergyCrystal({ state, fresh = false, className }: EnergyCrystalProps) {
  const label =
    state === "faceUp"
      ? "Face-up Energy crystal"
      : state === "faceDown"
        ? "Spent Energy crystal"
        : state === "temporary"
          ? "Temporary Energy crystal"
          : "Empty crystal slot";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-5 rotate-45 items-center justify-center rounded-[3px] border text-[0.55rem] transition-colors duration-300",
        state === "faceUp" && "border-oath-cyan bg-oath-cyan/75 crystal-glow",
        state === "faceDown" && "border-oath-silver/50 bg-muted",
        state === "temporary" && "border-oath-gold bg-oath-gold/60",
        state === "empty" && "border-dashed border-muted-foreground/45",
        fresh && "realm-rise",
        className,
      )}
    >
      {/* Non-color indicator so the state is readable without hue. */}
      <span className="-rotate-45 font-bold text-background/80" aria-hidden>
        {state === "faceUp" ? "" : state === "faceDown" ? "×" : state === "temporary" ? "+" : ""}
      </span>
    </span>
  );
}

export interface EnergyTrayProps {
  permanent: number;
  faceUp: number;
  temporary?: number;
  max?: number;
  /** Highlights the newest permanent crystal after Ready and Charge. */
  chargedIndex?: number | null;
  className?: string;
}

/** Ready and Charge adds one permanent crystal up to six and turns them all face-up. */
export function EnergyTray({
  permanent,
  faceUp,
  temporary = 0,
  max = 6,
  chargedIndex = null,
  className,
}: EnergyTrayProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2",
        className,
      )}
      aria-label={`Energy: ${faceUp} of ${permanent} crystals face-up${temporary > 0 ? `, ${temporary} temporary` : ""}`}
    >
      <span className="font-display text-xs tracking-widest uppercase">Energy</span>
      <span className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, index) => (
          <EnergyCrystal
            key={index}
            state={index >= permanent ? "empty" : index < faceUp ? "faceUp" : "faceDown"}
            fresh={chargedIndex === index}
          />
        ))}
        {Array.from({ length: temporary }, (_, index) => (
          <EnergyCrystal key={`temp-${index}`} state="temporary" fresh />
        ))}
      </span>
      <span className="ml-auto font-mono text-sm">
        {faceUp + temporary}/{permanent + temporary}
      </span>
    </div>
  );
}
