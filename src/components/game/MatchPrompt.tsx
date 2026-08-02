import { Button } from "@/components/ui/button";
import { getCard } from "@/game-data/load";
import type { GameMode } from "@/game-data/schema";
import type { MatchState, Prompt } from "@/game-engine/types";

export interface MatchPromptProps {
  prompt: Prompt;
  state: MatchState;
  onChoose: (effectId: string, targetIds: string[]) => void;
  onKeepHand: () => void;
  onReplaceHand: () => void;
  onCancel: () => void;
}

function label(state: MatchState, instanceId: string, mode: GameMode): string {
  const inst = state.board.instances[instanceId];
  if (!inst) return instanceId;
  return getCard(mode, inst.definitionId)?.name ?? inst.definitionId;
}

/** Renders the decision the engine is waiting on. It never invents a choice. */
export function MatchPrompt({
  prompt,
  state,
  onChoose,
  onKeepHand,
  onReplaceHand,
  onCancel,
}: MatchPromptProps) {
  if (prompt.kind === "mulligan") {
    return (
      <section
        aria-label="Opening hand"
        className="rounded-xl border border-oath-gold/50 bg-card/80 p-4"
      >
        <h2 className="font-display text-sm tracking-widest uppercase">Opening hand</h2>
        <p className="mt-1 text-sm text-muted-foreground">{prompt.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={onKeepHand}>Keep these four</Button>
          <Button variant="outline" onClick={onReplaceHand}>
            Replace all four
          </Button>
        </div>
      </section>
    );
  }

  const ids = prompt.kind === "encounterOrder" ? prompt.revealedIds : prompt.legalTargetIds;

  return (
    <section
      aria-label="Choice required"
      className="rounded-xl border border-oath-cyan/60 bg-card/80 p-4"
    >
      <h2 className="font-display text-sm tracking-widest uppercase">Choose</h2>
      <p className="mt-1 text-sm text-muted-foreground">{prompt.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            onClick={() => onChoose(prompt.effectId, [id])}
          >
            {label(state, id, state.mode)}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Skip
        </Button>
      </div>
    </section>
  );
}
