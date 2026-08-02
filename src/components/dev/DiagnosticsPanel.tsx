import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { competitiveCatalog, cooperativeCatalog } from "@/game-data/load";
import { totalRegisteredEffectCount } from "@/game-engine/effect-status";
import { QUICKPLAY_DECK_MANIFESTS } from "@/game-data/quickplay";
import { storageAvailable } from "@/persistence/local-store";

/**
 * Development diagnostics. Rendered only when the app is running in dev mode.
 */
export function DiagnosticsPanel() {
  const [storage, setStorage] = useState<"checking" | "ok" | "unavailable">("checking");

  useEffect(() => {
    let active = true;
    storageAvailable().then((ok) => {
      if (active) setStorage(ok ? "ok" : "unavailable");
    });
    return () => {
      active = false;
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  const errors = [...cooperativeCatalog.issues, ...competitiveCatalog.issues].filter(
    (i) => i.severity === "error",
  ).length;
  const pendingDecks = QUICKPLAY_DECK_MANIFESTS.filter((m) => m.status !== "approved").length;

  return (
    <Collapsible className="fixed right-3 bottom-3 z-50 w-64 rounded-lg border border-oath-gold/40 bg-card/95 text-xs shadow-[var(--shadow-relic)] backdrop-blur">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 font-display tracking-widest uppercase">
        <Activity className="size-3.5 text-oath-cyan" aria-hidden />
        Diagnostics
        {errors > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {errors}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 border-t border-border/60 px-3 py-2">
        <Row label="Co-op records" value={String(cooperativeCatalog.cards.length)} />
        <Row label="Trials records" value={String(competitiveCatalog.cards.length)} />
        <Row label="Validation errors" value={String(errors)} />
        <Row label="Registered effects" value={String(totalRegisteredEffectCount())} />
        <Row label="Decks awaiting source" value={`${pendingDecks}/${QUICKPLAY_DECK_MANIFESTS.length}`} />
        <Row label="IndexedDB" value={storage} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}