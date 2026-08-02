/**
 * Web Audio playback for Realmforge.
 *
 * Nothing here touches game rules: cues are fire-and-forget and never gate a
 * state transition. The context stays suspended until the first user gesture,
 * which is what browsers require before audio may start.
 */
import { CUES, type AudioCategory, type CueDefinition, type CueId, type CueVoice } from "./cues";

export interface AudioLevels {
  master: number;
  music: number;
  effects: number;
  ambience: number;
  /** Master mute; individual categories mute by setting their level to 0. */
  muted: boolean;
}

const DEFAULT_LEVELS: AudioLevels = {
  master: 0.7,
  music: 0.5,
  effects: 0.8,
  ambience: 0.4,
  muted: false,
};

type CaptionListener = (caption: string) => void;

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const categoryGain = new Map<AudioCategory, GainNode>();
const beds = new Map<CueId, number>();
let levels: AudioLevels = { ...DEFAULT_LEVELS };
let unlocked = false;
const captionListeners = new Set<CaptionListener>();

function categoryLevel(category: AudioCategory): number {
  if (levels.muted) return 0;
  return levels[category] * levels.master;
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  context = new Ctor();
  masterGain = context.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(context.destination);

  for (const category of ["music", "effects", "ambience"] as AudioCategory[]) {
    const gain = context.createGain();
    gain.gain.value = categoryLevel(category);
    gain.connect(masterGain);
    categoryGain.set(category, gain);
  }

  const frames = Math.floor(context.sampleRate * 1.2);
  noiseBuffer = context.createBuffer(1, frames, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  return context;
}

/** Call from a click/keydown handler. Safe to call repeatedly. */
export function unlockAudio(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  unlocked = true;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function setAudioLevels(next: Partial<AudioLevels>): void {
  levels = { ...levels, ...next };
  for (const [category, gain] of categoryGain) {
    gain.gain.value = categoryLevel(category);
  }
}

export function getAudioLevels(): AudioLevels {
  return { ...levels };
}

export function onCaption(listener: CaptionListener): () => void {
  captionListeners.add(listener);
  return () => captionListeners.delete(listener);
}

function scheduleVoice(ctx: AudioContext, destination: GainNode, voice: CueVoice, at: number) {
  const start = at + (voice.delay ?? 0);
  const end = start + voice.duration;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(voice.gain, 0.0002),
    start + Math.min(0.03, voice.duration / 3),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  let tail: AudioNode = gain;
  if (voice.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = voice.lowpass;
    gain.connect(filter);
    tail = filter;
  }
  tail.connect(destination);

  if (voice.wave === "noise") {
    if (!noiseBuffer) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.connect(gain);
    source.start(start);
    source.stop(end);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(voice.from, start);
  if (voice.to && voice.to !== voice.from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(voice.to, 1), end);
  }
  osc.connect(gain);
  osc.start(start);
  osc.stop(end);
}

function emitCaption(definition: CueDefinition) {
  for (const listener of captionListeners) listener(definition.caption);
}

/**
 * Plays a one-shot cue. Always emits its caption, even when audio is muted or
 * blocked, so the text equivalent stays available.
 */
export function playCue(id: CueId): void {
  const definition = CUES[id];
  if (!definition) return;
  emitCaption(definition);

  if (!unlocked) return;
  const ctx = ensureContext();
  const destination = categoryGain.get(definition.category);
  if (!ctx || !destination || categoryLevel(definition.category) === 0) return;

  const at = ctx.currentTime + 0.01;
  for (const voice of definition.voices) scheduleVoice(ctx, destination, voice, at);
}

/** Starts a looping bed (ambience or music). Re-starting the same bed is a no-op. */
export function startBed(id: CueId): void {
  const definition = CUES[id];
  if (!definition?.loop || beds.has(id)) return;
  const ctx = ensureContext();
  const destination = categoryGain.get(definition.category);
  if (!unlocked || !ctx || !destination) return;

  const period = (definition.loopEvery ?? 6) * 1000;
  const cycle = () => {
    const now = ctx.currentTime + 0.05;
    if (categoryLevel(definition.category) > 0) {
      for (const voice of definition.voices) scheduleVoice(ctx, destination, voice, now);
    }
  };
  cycle();
  beds.set(id, window.setInterval(cycle, period));
}

export function stopBed(id: CueId): void {
  const handle = beds.get(id);
  if (handle === undefined) return;
  window.clearInterval(handle);
  beds.delete(id);
}

export function stopAllBeds(): void {
  for (const id of [...beds.keys()]) stopBed(id);
}
