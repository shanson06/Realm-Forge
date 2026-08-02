import { cn } from "@/lib/utils";
import type { Allegiance } from "./side";

export interface CrystalSpinnerProps {
  allegiance: Exclude<Allegiance, "neutral">;
  label: string;
  remaining: number;
  total?: number;
  /** Plays the shatter impact once after a crystal is lost. */
  impact?: boolean;
  className?: string;
}

/** Six crystals per side in QuickPlay. Reaching zero is a loss condition. */
export function CrystalSpinner({
  allegiance,
  label,
  remaining,
  total = 6,
  impact = false,
  className,
}: CrystalSpinnerProps) {
  const clamped = Math.max(0, Math.min(remaining, total));

  return (
    <section
      aria-label={`${label}: ${clamped} of ${total} crystals remaining`}
      className={cn(
        "rounded-lg border border-border/70 bg-card/70 px-3 py-2",
        impact && "realm-impact",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xs tracking-widest uppercase">{label}</span>
        <span className="font-mono text-sm">
          {clamped}/{total}
        </span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: total }, (_, index) => {
          const intact = index < clamped;
          return (
            <li
              key={index}
              className={cn(
                "size-3.5 rotate-45 rounded-[2px] border transition-all duration-300",
                intact
                  ? allegiance === "oathguard"
                    ? "border-oath-cyan bg-oath-cyan/70 crystal-glow"
                    : "border-hollow-violet-bright bg-hollow-violet/70"
                  : "border-dashed border-muted-foreground/50 bg-transparent",
              )}
            />
          );
        })}
      </ul>
    </section>
  );
}
