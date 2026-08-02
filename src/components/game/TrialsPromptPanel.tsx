/**
 * Choice panel for competitive prompts.
 *
 * It renders only what the prompted player is allowed to see, and every option
 * it offers comes from the engine's own legal-target list.
 */
import { RealmCard } from "@/components/game/RealmCard";
import { Button } from "@/components/ui/button";
import { getCard } from "@/game-data/load";
import type { CardDefinition } from "@/game-data/schema";
import type { TrialsMatchState, TrialsPrompt } from "@/game-engine/trials/types";

interface Props {
  readonly prompt: TrialsPrompt;
  readonly state: TrialsMatchState;
  readonly onChoose: (effectId: string, targetIds: string[]) => void;
  readonly onKeepHand: () => void;
  readonly onReplaceHand: () => void;
  readonly onCancel: () => void;
  readonly onInspect?: (card: CardDefinition) => void;
}

export function TrialsPromptPanel({
  prompt,
  state,
  onChoose,
  onKeepHand,
  onReplaceHand,
  onCancel,
  onInspect,
}: Props) {
  const definition = (instanceId: string) =>
    getCard(state.mode, state.instances[instanceId]?.definitionId ?? "") ?? null;

  if (prompt.kind === "mulligan") {
    return (
      <section
        aria-label="Opening hand"
        className="space-y-3 rounded-xl border border-oath-gold/50 bg-oath-blue-deep/60 p-4"
      >
        <h2 className="font-display text-sm tracking-widest uppercase">{prompt.description}</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onKeepHand}>Keep this hand</Button>
          <Button variant="outline" onClick={onReplaceHand}>
            Replace all four cards
          </Button>
        </div>
      </section>
    );
  }

  const ids = prompt.kind === "foresight" ? prompt.revealedIds : prompt.legalTargetIds;

  return (
    <section
      aria-label="Choose"
      className="space-y-3 rounded-xl border border-oath-gold/50 bg-oath-blue-deep/60 p-4"
    >
      <h2 className="font-display text-sm tracking-widest uppercase">{prompt.description}</h2>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const card = definition(id);
          if (card) {
            return (
              <button key={id} type="button" onClick={() => onChoose(prompt.effectId, [id])}>
                <RealmCard card={card} size="sm" onInspect={onInspect} />
              </button>
            );
          }
          return (
            <Button key={id} variant="secondary" onClick={() => onChoose(prompt.effectId, [id])}>
              {id}
            </Button>
          );
        })}
        {ids.length === 0 && (
          <p className="text-sm text-muted-foreground">No legal choice is available.</p>
        )}
      </div>
      {("optional" in prompt ? prompt.optional : true) && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Skip this choice
        </Button>
      )}
    </section>
  );
}
