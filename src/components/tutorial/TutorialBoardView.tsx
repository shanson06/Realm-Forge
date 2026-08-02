/**
 * Renders the scripted tutorial board.
 *
 * Only the target the current step asks for is interactive; everything else is
 * visibly dimmed and explains why it is unavailable. No hidden gestures.
 */
import { CrystalSpinner } from "@/components/game/CrystalSpinner";
import { EnergyCrystal } from "@/components/game/EnergyCrystal";
import { Gate } from "@/components/game/Gate";
import { RealmCard } from "@/components/game/RealmCard";
import { getCard } from "@/game-data/load";
import { GameMode, type CardDefinition } from "@/game-data/schema";
import { cn } from "@/lib/utils";
import type { TutorialBoard, TutorialStep, TutorialTarget } from "@/tutorial/script";

interface Props {
  readonly boardState: TutorialBoard;
  readonly step: TutorialStep | null;
  readonly onAct: (target: TutorialTarget, id?: string) => void;
  readonly onInspect: (card: CardDefinition) => void;
}

const card = (id: string) => getCard(GameMode.Cooperative, id) ?? null;

function Pointer({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-lg text-oath-gold motion-safe:animate-bounce"
    >
      ▼
    </span>
  );
}

export function TutorialBoardView({ boardState, step, onAct, onInspect }: Props) {
  const active = (target: TutorialTarget, id?: string) =>
    step?.target === target && (step.requireId === undefined || step.requireId === id);
  const clickable = (target: TutorialTarget) => step?.target === target;

  const zone = (isActive: boolean, isClickable: boolean) =>
    cn(
      "relative rounded-xl border p-3 transition-all",
      isActive
        ? "border-oath-gold ring-2 ring-oath-gold/70 shadow-[0_0_26px_-6px_var(--oath-gold)]"
        : "border-border/60",
      !isClickable && "opacity-70",
    );

  return (
    <div className="grid gap-3">
      {/* Hollow Crown side */}
      <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
        <div className={zone(step?.target === "enemyUnit", clickable("enemyUnit"))}>
          <p className="mb-2 text-[0.65rem] tracking-widest text-hollow-violet uppercase">
            Hollow Crown units
          </p>
          <div className="flex flex-wrap gap-2">
            {boardState.enemyUnits.length === 0 && (
              <p className="text-xs text-muted-foreground">No enemy units on the board.</p>
            )}
            {boardState.enemyUnits.map((u) => {
              const def = card(u.cardId);
              if (!def) return null;
              const isActive = active("enemyUnit", u.uid);
              return (
                <div key={u.uid} className="relative">
                  <Pointer show={isActive} />
                  <RealmCard
                    card={def}
                    size="sm"
                    damage={u.damage}
                    selected={isActive}
                    illegalReason={
                      clickable("enemyUnit") ? null : "Not part of this tutorial step."
                    }
                    onInspect={(c) => {
                      onInspect(c);
                      onAct("enemyUnit", u.uid);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onAct("enemyGate")}
            disabled={!clickable("enemyGate")}
            className={cn("text-left", zone(active("enemyGate"), clickable("enemyGate")))}
          >
            <Pointer show={active("enemyGate")} />
            <Gate allegiance="hollow" label="Hollow Crown Gate" ward={boardState.enemyGate} maxWard={10} />
          </button>
          <button
            type="button"
            onClick={() => onAct("enemyCrystals")}
            disabled={!clickable("enemyCrystals")}
            className={cn("text-left", zone(active("enemyCrystals"), clickable("enemyCrystals")))}
          >
            <Pointer show={active("enemyCrystals")} />
            <CrystalSpinner allegiance="hollow" label="Hollow Crown crystals" remaining={boardState.enemyCrystals} />
          </button>
        </div>
      </div>

      {/* Quick Boss */}
      <button
        type="button"
        onClick={() => onAct("boss")}
        disabled={!clickable("boss")}
        className={cn("text-left", zone(active("boss"), clickable("boss")))}
      >
        <Pointer show={active("boss")} />
        <p className="text-[0.65rem] tracking-widest text-hollow-violet uppercase">Quick Boss</p>
        <p className="font-display text-sm">
          {boardState.bossRevealed ? "Veyr — revealed" : "Face-down until the crystals fall"}
        </p>
        {boardState.bossRevealed && (
          <p className="font-mono text-xs text-muted-foreground">
            Health {Math.max(0, boardState.bossHealth - boardState.bossDamage)}/{boardState.bossHealth}
          </p>
        )}
      </button>

      {/* Oathguard side */}
      <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
        <div className={zone(step?.target === "friendlyUnit", clickable("friendlyUnit"))}>
          <p className="mb-2 text-[0.65rem] tracking-widest text-oath-cyan uppercase">
            Your units
          </p>
          <div className="flex flex-wrap gap-2">
            {boardState.units.length === 0 && (
              <p className="text-xs text-muted-foreground">No units yet.</p>
            )}
            {boardState.units.map((u) => {
              const def = card(u.cardId);
              if (!def) return null;
              const isActive = active("friendlyUnit", u.uid);
              return (
                <div key={u.uid} className="relative">
                  <Pointer show={isActive} />
                  <RealmCard
                    card={def}
                    size="sm"
                    damage={u.damage}
                    selected={isActive}
                    illegalReason={
                      clickable("friendlyUnit")
                        ? null
                        : u.ready
                          ? "Not part of this tutorial step."
                          : "Already used this turn."
                    }
                    onInspect={(c) => {
                      onInspect(c);
                      onAct("friendlyUnit", u.uid);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onAct("playerGate")}
            disabled={!clickable("playerGate")}
            className={cn("text-left", zone(active("playerGate"), clickable("playerGate")))}
          >
            <Pointer show={active("playerGate")} />
            <Gate allegiance="oathguard" label="Your Gate" ward={boardState.playerGate} maxWard={10} />
          </button>
          <CrystalSpinner allegiance="oathguard" label="Your crystals" remaining={boardState.playerCrystals} />
        </div>
      </div>

      {/* Energy + hand */}
      <div className={zone(active("energy"), clickable("energy"))}>
        <Pointer show={active("energy")} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.65rem] tracking-widest text-oath-cyan uppercase">Energy</p>
          <button
            type="button"
            onClick={() => onAct("charge")}
            disabled={!clickable("charge")}
            className={cn(
              "relative rounded-lg border px-3 py-1.5 text-xs tracking-widest uppercase",
              clickable("charge")
                ? "border-oath-gold text-oath-gold ring-2 ring-oath-gold/60"
                : "border-border/60 text-muted-foreground opacity-60",
            )}
          >
            <Pointer show={active("charge")} />
            Ready and Charge
          </button>
        </div>
        <button
          type="button"
          onClick={() => onAct("energy")}
          disabled={!clickable("energy")}
          aria-label="Turn a face-up crystal face-down"
          className="mt-2 flex flex-wrap gap-1"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <EnergyCrystal
              key={i}
              state={
                i < boardState.faceUp
                  ? "faceUp"
                  : i < boardState.energyTotal
                    ? "faceDown"
                    : "empty"
              }
            />
          ))}
        </button>
      </div>

      <div className={zone(step?.target === "hand", clickable("hand"))}>
        <p className="mb-2 text-[0.65rem] tracking-widest text-oath-cyan uppercase">Your hand</p>
        <div className="flex flex-wrap gap-2">
          {boardState.hand.length === 0 && (
            <p className="text-xs text-muted-foreground">Your hand is empty.</p>
          )}
          {boardState.hand.map((id, index) => {
            const def = card(id);
            if (!def) return null;
            const isActive = active("hand", id);
            return (
              <div key={`${id}-${index}`} className="relative">
                <Pointer show={isActive} />
                <RealmCard
                  card={def}
                  size="sm"
                  selected={isActive}
                  illegalReason={clickable("hand") ? null : "Not part of this tutorial step."}
                  onInspect={(c) => {
                    onInspect(c);
                    onAct("hand", id);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
