import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BattleStep {
  id: string;
  label: string;
}

export interface BattleCommandBarProps {
  round: number;
  currentStep: string;
  steps: readonly BattleStep[];
  summary: string;
  status?: string;
  children: ReactNode;
}

/**
 * Sticky, touch-friendly match controls shared by cooperative and competitive
 * battlefields. The phase rail keeps turn context visible after the page header
 * scrolls away on phones and tablets.
 */
export function BattleCommandBar({
  round,
  currentStep,
  steps,
  summary,
  status,
  children,
}: BattleCommandBarProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentStep),
  );

  return (
    <section
      aria-label="Turn controls"
      className="sticky top-2 z-30 mb-4 overflow-hidden rounded-2xl border border-oath-gold/55 bg-background/95 shadow-[var(--shadow-relic)] backdrop-blur-xl"
    >
      <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-display text-sm tracking-[0.18em] text-oath-gold uppercase">
              Round {round}
            </p>
            <p className="text-xs text-muted-foreground">{summary}</p>
            {status && (
              <span className="rounded-full border border-oath-cyan/40 bg-oath-cyan/10 px-2 py-0.5 text-[0.65rem] tracking-wider text-oath-cyan uppercase">
                {status}
              </span>
            )}
          </div>

          <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1">
            <ol className="flex min-w-max items-center gap-1" aria-label="Turn phases">
              {steps.map((step, index) => {
                const active = step.id === currentStep;
                const complete = index < activeIndex;
                return (
                  <li key={step.id} className="flex items-center gap-1">
                    <span
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "inline-flex min-h-8 items-center rounded-md border px-2.5 text-[0.65rem] font-semibold tracking-wider uppercase transition-colors",
                        active && "border-oath-gold bg-oath-gold/15 text-oath-gold forge-glow",
                        complete && "border-oath-cyan/45 bg-oath-cyan/10 text-oath-cyan",
                        !active && !complete && "border-border/70 bg-card/70 text-muted-foreground",
                      )}
                    >
                      {index + 1}. {step.label}
                    </span>
                    {index < steps.length - 1 && (
                      <span aria-hidden className="h-px w-2 bg-oath-gold/35 sm:w-4" />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 [&_button]:min-h-11">{children}</div>
      </div>
    </section>
  );
}
