import { cn } from "@/lib/utils";
import type { Allegiance } from "./side";

export interface GateProps {
  allegiance: Exclude<Allegiance, "neutral">;
  label: string;
  ward: number;
  maxWard: number;
  /** Plays the impact animation once after the Gate takes damage. */
  impact?: boolean;
  className?: string;
}

/**
 * Gates protect crystals. Excess Gate damage never carries into crystals,
 * so the bar clamps at zero and reports "Broken" with a non-color indicator.
 */
export function Gate({ allegiance, label, ward, maxWard, impact = false, className }: GateProps) {
  const clamped = Math.max(0, Math.min(ward, maxWard));
  const pct = maxWard === 0 ? 0 : (clamped / maxWard) * 100;
  const broken = clamped === 0;
  const oath = allegiance === "oathguard";

  return (
    <section
      aria-label={`${label}: ${clamped} of ${maxWard} Ward${broken ? ", broken" : ""}`}
      className={cn(
        "relative overflow-hidden rounded-t-[1.6rem] rounded-b-lg border-2 px-3 py-2 transition-colors",
        oath
          ? "layer-metal edge-double-gilt border-oath-gold/55"
          : "layer-blackglass edge-double-hollow border-hollow-violet/55",
        impact && "realm-impact",
        broken && "border-realm-danger/70",
        className,
      )}
    >
      {/* Arch light along the top edge, echoing the printed Gate panels. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-6 top-0 h-px",
          oath
            ? "bg-gradient-to-r from-transparent via-oath-gold/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-hollow-violet-bright/70 to-transparent",
        )}
      />
      <div className="relative flex items-baseline justify-between gap-2">
        <span className="font-display text-xs tracking-widest uppercase">{label}</span>
        <span className="font-mono text-sm">
          {clamped}/{maxWard}
          {broken && <span className="ml-1 text-realm-danger">✕ Broken</span>}
        </span>
      </div>
      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full border border-oath-gold/30 bg-background/70">
        <div
          className={cn(
            "h-full transition-[width] duration-500 ease-out",
            oath ? "crystal-glow bg-oath-cyan" : "bg-hollow-violet-bright",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Ward pips give a non-colour reading of remaining Ward. */}
      <div aria-hidden className="relative mt-1 flex flex-wrap gap-0.5">
        {Array.from({ length: maxWard }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-2 rounded-[1px]",
              i < clamped
                ? oath
                  ? "bg-oath-cyan"
                  : "bg-hollow-violet-bright"
                : "bg-foreground/15",
            )}
          />
        ))}
      </div>
    </section>
  );
}
