/**
 * Bottom-anchored feedback for a refused action.
 *
 * The battlefield header scrolls off-screen on a phone, so refusals surface
 * next to the player's thumbs instead of at the top of the page.
 */
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface MatchNoticeProps {
  message: string | null;
  onDismiss: () => void;
}

export function MatchNotice({ message, onDismiss }: MatchNoticeProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="realm-rise pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border-2 border-oath-gold/70 bg-oath-blue-deep/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
        <span className="flex-1">{message}</span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0"
          aria-label="Dismiss message"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
