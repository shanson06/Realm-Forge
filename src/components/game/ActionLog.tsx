import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/game-engine/types";

export interface ActionLogProps {
  entries: readonly LogEntry[];
  className?: string;
}

/** Always-visible action history. Undo is only offered on rules-safe entries. */
export function ActionLog({ entries, className }: ActionLogProps) {
  return (
    <section
      aria-label="Action history"
      className={cn(
        "flex min-h-0 flex-col rounded-lg border border-border/70 bg-card/60",
        className,
      )}
    >
      <h2 className="border-b border-border/70 px-3 py-2 font-display text-xs tracking-widest uppercase">
        Action history
      </h2>
      <ScrollArea className="h-full max-h-64">
        <ol className="divide-y divide-border/50 text-xs">
          {entries.length === 0 && (
            <li className="px-3 py-3 text-muted-foreground">No actions recorded yet.</li>
          )}
          {entries.map((entry) => (
            <li key={entry.sequence} className="flex gap-2 px-3 py-2">
              <span className="font-mono text-muted-foreground">R{entry.round}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{entry.summary}</span>
                {entry.detail && (
                  <span className="block text-muted-foreground">{entry.detail}</span>
                )}
              </span>
              {entry.undoSafe && (
                <span className="shrink-0 self-start rounded-sm border border-oath-cyan/50 px-1 text-[0.6rem] text-oath-cyan uppercase">
                  Undo safe
                </span>
              )}
            </li>
          ))}
        </ol>
      </ScrollArea>
    </section>
  );
}
