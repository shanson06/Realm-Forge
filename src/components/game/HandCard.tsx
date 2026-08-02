/**
 * Hand card with explicit tap-to-play controls.
 *
 * Presentation only: legality comes from the engine and is passed in.
 * Tapping the card art always inspects; playing is a separate, clearly
 * labelled control so a first-time player never has to guess a gesture.
 */
import { Button } from "@/components/ui/button";
import type { CardDefinition } from "@/game-data/schema";
import { cn } from "@/lib/utils";
import { RealmCard } from "./RealmCard";

export interface HandCardProps {
  card: CardDefinition;
  instanceId: string;
  legal: boolean;
  /** Plain-language explanation shown when the card cannot be played. */
  reason?: string | null;
  /** True when this card is waiting for the player to choose a space. */
  selected?: boolean;
  /** Unit cards ask for a space; everything else resolves immediately. */
  needsSpace: boolean;
  onInspect: (card: CardDefinition) => void;
  onPlay: (instanceId: string) => void;
  onCancel: () => void;
}

export function HandCard({
  card,
  instanceId,
  legal,
  reason = null,
  selected = false,
  needsSpace,
  onInspect,
  onPlay,
  onCancel,
}: HandCardProps) {
  const label = selected ? "Cancel" : needsSpace ? "Play — choose a space" : "Play";
  // Energy shortfall is by far the most common refusal, so name it on the button
  // itself instead of a generic "Can't play".
  const shortOfEnergy = !legal && Boolean(reason?.includes("Energy and you have"));
  const blockedLabel = shortOfEnergy ? `Needs ${card.cost} Energy` : "Can't play";

  return (
    <div
      className={cn(
        "w-[8.5rem] shrink-0 rounded-lg p-1 transition-colors sm:w-36",
        selected && "bg-oath-cyan/10 ring-2 ring-oath-cyan",
      )}
      draggable={legal}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", instanceId)}
      onDoubleClick={() => legal && onPlay(instanceId)}
    >
      <RealmCard
        card={card}
        size="sm"
        selected={selected}
        illegalReason={legal ? null : reason}
        onInspect={onInspect}
        className="w-full"
      />
      <Button
        size="sm"
        variant={selected ? "default" : legal ? "secondary" : "ghost"}
        className="mt-1 w-full text-xs"
        aria-disabled={!legal}
        title={legal ? undefined : (reason ?? undefined)}
        onClick={() => (selected ? onCancel() : onPlay(instanceId))}
      >
        {legal ? label : blockedLabel}
      </Button>
      {!legal && reason && (
        <p className="mt-1 text-[0.68rem] leading-snug text-muted-foreground">{reason}</p>
      )}
    </div>
  );
}
