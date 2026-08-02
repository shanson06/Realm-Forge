import { useEffect, useMemo, useRef, useState } from "react";

import type { AnimationCue, AnimationEvent } from "@/game-engine/types";

/**
 * Plays the engine's animation cues as short, interruptible screen effects.
 *
 * Purely presentational: the reducer has already resolved the state before a cue
 * is emitted, so nothing here can change a rules outcome. Every effect also has
 * a text equivalent in the action log, and motion is removed by the
 * reduced-motion / animation-speed controls.
 */
export interface MatchFxLayerProps {
  animations: readonly AnimationEvent[];
  /** Suppresses the flash overlay entirely; captions and log text remain. */
  disabled?: boolean;
}

interface FxStyle {
  readonly label: string;
  readonly tint: string;
  readonly shake: boolean;
}

const FX: Record<AnimationCue, FxStyle> = {
  draw: { label: "Card drawn", tint: "var(--oath-cyan)", shake: false },
  charge: { label: "Crystals charged", tint: "var(--oath-cyan)", shake: false },
  spend: { label: "Energy spent", tint: "var(--oath-gold)", shake: false },
  play: { label: "Card played", tint: "var(--oath-gold)", shake: false },
  attack: { label: "Attack", tint: "var(--oath-gold)", shake: false },
  damage: { label: "Impact", tint: "var(--hollow-violet-bright)", shake: true },
  effect: { label: "Effect resolves", tint: "var(--oath-cyan)", shake: false },
  restore: { label: "Ward restored", tint: "var(--oath-cyan)", shake: false },
  "gate-break": { label: "Gate broken", tint: "var(--hollow-violet-bright)", shake: true },
  "crystal-damage": { label: "Crystal shattered", tint: "var(--hollow-violet-bright)", shake: true },
  "boss-reveal": { label: "Boss revealed", tint: "var(--hollow-violet-bright)", shake: true },
  victory: { label: "Victory", tint: "var(--oath-gold)", shake: false },
  defeat: { label: "Defeat", tint: "var(--hollow-violet-bright)", shake: true },
};

export function MatchFxLayer({ animations, disabled = false }: MatchFxLayerProps) {
  const [active, setActive] = useState<AnimationEvent | null>(null);
  const lastId = useRef(0);

  const latest = useMemo(
    () => (animations.length > 0 ? animations[animations.length - 1] : null),
    [animations],
  );

  useEffect(() => {
    if (!latest || latest.id === lastId.current) return;
    lastId.current = latest.id;
    setActive(latest);
    // Short and interruptible: a newer cue simply replaces the running one.
    const timer = window.setTimeout(() => setActive(null), 620);
    return () => window.clearTimeout(timer);
  }, [latest]);

  if (disabled || !active) return null;
  const style = FX[active.cue];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div
        key={active.id}
        className={`realm-fx-flash${style.shake ? " realm-impact" : ""}`}
        style={{ ["--realm-fx-tint" as string]: style.tint }}
      />
      <span className="sr-only" role="status">
        {style.label}
      </span>
    </div>
  );
}

export function fxLabel(cue: AnimationCue): string {
  return FX[cue].label;
}