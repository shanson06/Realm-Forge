import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-pwa";

/**
 * Small, non-blocking connectivity badge.
 *
 * It is pinned to the bottom-left above the safe area and is pointer-transparent
 * so it can never intercept a tap on the battlefield. Everything in Realmforge's
 * core loop is local, so this is informational only.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] z-30 flex items-center gap-2 rounded-full border border-oath-gold/40 bg-background/85 px-3 py-1.5 text-xs text-oath-silver shadow-lg backdrop-blur"
    >
      <WifiOff aria-hidden className="size-3.5 text-oath-gold" />
      <span>Offline — local play continues</span>
    </div>
  );
}