import { useCallback, useEffect, useRef, useState } from "react";

import type { CueId } from "@/audio/cues";
import {
  onCaption,
  playCue,
  startBed,
  stopAllBeds,
  stopBed,
  unlockAudio,
} from "@/audio/engine";

/** Unlocks audio on the first user gesture, as browsers require. */
export function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    for (const event of events) window.addEventListener(event, unlock, { once: false });
    return () => {
      for (const event of events) window.removeEventListener(event, unlock);
    };
  }, []);
}

/** Keeps a single looping bed alive while the component is mounted. */
export function useAudioBed(bed: CueId | null, enabled = true) {
  useEffect(() => {
    if (!bed || !enabled) return;
    startBed(bed);
    return () => stopBed(bed);
  }, [bed, enabled]);

  useEffect(() => () => stopAllBeds(), []);
}

export interface Caption {
  id: number;
  text: string;
}

/** Collects cue captions so important sounds always have a text equivalent. */
export function useSoundCaptions(enabled: boolean) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setCaptions([]);
      return;
    }
    return onCaption((text) => {
      const id = (nextId.current += 1);
      setCaptions((current) => [...current.slice(-2), { id, text }]);
      window.setTimeout(() => {
        setCaptions((current) => current.filter((caption) => caption.id !== id));
      }, 2600);
    });
  }, [enabled]);

  return captions;
}

/**
 * Maps new action-log lines to cues. Purely observational — the log is already
 * the resolved state, so audio can never influence a rules outcome.
 */
const LOG_CUES: readonly [RegExp, CueId][] = [
  [/gate .*broke|gate broken|breaks the/i, "gateBreak"],
  [/crystal.*(shatter|destroy|lost|damage)/i, "crystalDamage"],
  [/gate/i, "gateDamage"],
  [/boss .*(reveal|awaken)/i, "bossReveal"],
  [/defeated|destroyed|discarded from play/i, "unitDefeated"],
  [/restore/i, "restore"],
  [/shield matrix/i, "shieldMatrix"],
  [/surge/i, "surgeReady"],
  [/attack/i, "metalImpact"],
  [/play(s|ed)? /i, "cardPlay"],
  [/draw/i, "cardDraw"],
  [/ready and charge|charge/i, "crystalCharge"],
];

export function useLogCues(entries: readonly { sequence: number; summary: string }[]) {
  const lastSequence = useRef<number | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;
    const latest = entries[entries.length - 1];
    if (lastSequence.current === null) {
      lastSequence.current = latest.sequence;
      return;
    }
    if (latest.sequence === lastSequence.current) return;

    const fresh = entries.filter((entry) => entry.sequence > (lastSequence.current ?? 0)).slice(-4);
    lastSequence.current = latest.sequence;
    for (const entry of fresh) {
      const match = LOG_CUES.find(([pattern]) => pattern.test(entry.summary));
      if (match) playCue(match[1]);
    }
  }, [entries]);
}

export function useCuePlayer() {
  return useCallback((cue: CueId) => playCue(cue), []);
}