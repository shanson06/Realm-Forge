import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/hooks/use-pwa";

/**
 * Update-available prompt.
 *
 * A new build is downloaded in the background but never activated on its own —
 * swapping the shell mid-turn would tear down an active match. The player
 * chooses when to reload. Matches, settings, and progress live in IndexedDB and
 * localStorage, which the service worker never touches, so they survive the
 * update either way.
 */
export function UpdatePrompt() {
  const { updateReady, applyUpdate, dismiss } = useServiceWorkerUpdate();
  if (!updateReady || !applyUpdate) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-[calc(0.75rem+env(safe-area-inset-right))] z-40 max-w-[22rem] rounded-xl border border-oath-gold/50 bg-background/95 p-4 shadow-xl backdrop-blur"
    >
      <p className="flex items-center gap-2 font-display text-sm text-oath-gold">
        <RefreshCw aria-hidden className="size-4" />A new version of Realmforge is ready
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your saved matches, decks, and settings are kept. Finish your turn first — the update
        applies only when you choose.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => void applyUpdate()}>
          Update now
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Later
        </Button>
      </div>
    </div>
  );
}
