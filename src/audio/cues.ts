/**
 * Realmforge audio cue catalogue.
 *
 * Every cue is synthesised at runtime from oscillators and shaped noise, so the
 * project ships no third-party or copyrighted audio. Each cue carries a caption
 * so the sound has a text equivalent for players who cannot hear it.
 */

export type AudioCategory = "music" | "effects" | "ambience";

export type CueId =
  | "menuAmbience"
  | "battleOathguard"
  | "battleCompetitive"
  | "battleBoss"
  | "cardDraw"
  | "cardInspect"
  | "cardPlay"
  | "crystalCharge"
  | "crystalSpend"
  | "crystalTemporary"
  | "unitArrive"
  | "surgeReady"
  | "metalImpact"
  | "unitDefeated"
  | "restore"
  | "shieldMatrix"
  | "gateDamage"
  | "gateBreak"
  | "crystalDamage"
  | "bossReveal"
  | "victory"
  | "defeat"
  | "illegal";

export interface CueVoice {
  /** Oscillator shape, or shaped noise for impacts. */
  wave: OscillatorType | "noise";
  /** Start frequency in Hz (ignored for noise). */
  from: number;
  /** End frequency in Hz; equals `from` for steady tones. */
  to?: number;
  /** Seconds before this voice starts, relative to the cue. */
  delay?: number;
  /** Seconds the voice sounds for. */
  duration: number;
  /** Peak gain 0–1 before the category and master volumes apply. */
  gain: number;
  /** Optional low-pass cutoff, used to keep impacts from sounding harsh. */
  lowpass?: number;
}

export interface CueDefinition {
  category: AudioCategory;
  /** Text equivalent shown when sound captions are on. */
  caption: string;
  voices: readonly CueVoice[];
  /** Ambience and music beds loop until stopped. */
  loop?: boolean;
  /** Seconds between loop repeats for bed cues. */
  loopEvery?: number;
}

const tone = (
  wave: OscillatorType,
  from: number,
  to: number,
  duration: number,
  gain: number,
  delay = 0,
): CueVoice => ({ wave, from, to, duration, gain, delay });

const hit = (duration: number, gain: number, lowpass: number, delay = 0): CueVoice => ({
  wave: "noise",
  from: 0,
  duration,
  gain,
  lowpass,
  delay,
});

export const CUES: Record<CueId, CueDefinition> = {
  /* --- Beds --- */
  menuAmbience: {
    category: "ambience",
    caption: "Hall ambience",
    loop: true,
    loopEvery: 6,
    voices: [
      tone("sine", 110, 116, 5.5, 0.06),
      tone("sine", 220, 214, 5.5, 0.03, 0.4),
      tone("triangle", 330, 336, 4, 0.02, 1.2),
    ],
  },
  battleOathguard: {
    category: "music",
    caption: "Oathguard battle theme",
    loop: true,
    loopEvery: 8,
    voices: [
      tone("triangle", 147, 147, 1.4, 0.05),
      tone("triangle", 196, 196, 1.4, 0.045, 1.5),
      tone("triangle", 220, 220, 1.4, 0.045, 3),
      tone("sine", 294, 294, 2.4, 0.035, 4.5),
    ],
  },
  battleCompetitive: {
    category: "music",
    caption: "Trials duel theme",
    loop: true,
    loopEvery: 8,
    voices: [
      tone("sawtooth", 131, 131, 1.1, 0.035),
      tone("triangle", 175, 175, 1.1, 0.04, 1.2),
      tone("triangle", 233, 233, 1.1, 0.04, 2.4),
      tone("sine", 262, 262, 2, 0.03, 3.8),
    ],
  },
  battleBoss: {
    category: "music",
    caption: "Boss battle theme",
    loop: true,
    loopEvery: 7,
    voices: [
      tone("sawtooth", 82, 78, 2.2, 0.05),
      tone("triangle", 110, 104, 2.2, 0.04, 1.8),
      tone("sine", 165, 155, 2.6, 0.03, 3.6),
    ],
  },

  /* --- Interface --- */
  cardDraw: {
    category: "effects",
    caption: "Card drawn",
    voices: [hit(0.16, 0.16, 3200), tone("triangle", 660, 880, 0.12, 0.05)],
  },
  cardInspect: {
    category: "effects",
    caption: "Card inspected",
    voices: [tone("sine", 520, 720, 0.1, 0.05)],
  },
  cardPlay: {
    category: "effects",
    caption: "Card played",
    voices: [tone("triangle", 392, 523, 0.16, 0.09), hit(0.1, 0.1, 2400, 0.05)],
  },
  illegal: {
    category: "effects",
    caption: "Action not allowed",
    voices: [tone("square", 180, 120, 0.14, 0.05)],
  },

  /* --- Energy --- */
  crystalCharge: {
    category: "effects",
    caption: "Crystal charged",
    voices: [tone("sine", 740, 1180, 0.22, 0.07), tone("sine", 1480, 1760, 0.18, 0.03, 0.06)],
  },
  crystalSpend: {
    category: "effects",
    caption: "Crystal spent",
    voices: [tone("sine", 1180, 620, 0.16, 0.06)],
  },
  crystalTemporary: {
    category: "effects",
    caption: "Temporary crystal added",
    voices: [tone("triangle", 880, 1320, 0.2, 0.06), tone("sine", 1320, 1320, 0.14, 0.03, 0.1)],
  },

  /* --- Board --- */
  unitArrive: {
    category: "effects",
    caption: "Unit deployed",
    voices: [hit(0.18, 0.18, 1400), tone("triangle", 220, 330, 0.2, 0.06)],
  },
  surgeReady: {
    category: "effects",
    caption: "Surge — unit can attack now",
    voices: [tone("sawtooth", 440, 990, 0.18, 0.05), tone("sine", 990, 1320, 0.14, 0.03, 0.08)],
  },
  metalImpact: {
    category: "effects",
    caption: "Attack — metal impact",
    voices: [hit(0.22, 0.24, 2600), tone("square", 160, 90, 0.14, 0.05)],
  },
  unitDefeated: {
    category: "effects",
    caption: "Unit defeated",
    voices: [tone("sawtooth", 260, 70, 0.4, 0.07), hit(0.3, 0.12, 900, 0.05)],
  },
  restore: {
    category: "effects",
    caption: "Restore — damage healed",
    voices: [tone("sine", 523, 784, 0.3, 0.06), tone("sine", 784, 1046, 0.26, 0.04, 0.12)],
  },
  shieldMatrix: {
    category: "effects",
    caption: "Shield Matrix absorbed the hit",
    voices: [tone("triangle", 330, 330, 0.26, 0.06), tone("sine", 660, 620, 0.22, 0.04, 0.05)],
  },
  gateDamage: {
    category: "effects",
    caption: "Gate damaged",
    voices: [hit(0.3, 0.22, 1100), tone("square", 120, 80, 0.24, 0.06)],
  },
  gateBreak: {
    category: "effects",
    caption: "Gate broken",
    voices: [hit(0.7, 0.3, 1800), tone("sawtooth", 180, 55, 0.6, 0.09), tone("sine", 90, 60, 0.7, 0.05, 0.1)],
  },
  crystalDamage: {
    category: "effects",
    caption: "Crystal shattered",
    voices: [hit(0.26, 0.2, 5200), tone("sine", 1760, 520, 0.3, 0.06)],
  },
  bossReveal: {
    category: "effects",
    caption: "The Quick Boss awakens",
    voices: [
      tone("sawtooth", 70, 55, 1.1, 0.09),
      tone("triangle", 138, 110, 1, 0.06, 0.15),
      hit(0.6, 0.14, 700, 0.3),
    ],
  },
  victory: {
    category: "effects",
    caption: "Victory fanfare",
    voices: [
      tone("triangle", 523, 523, 0.24, 0.09),
      tone("triangle", 659, 659, 0.24, 0.09, 0.2),
      tone("triangle", 784, 784, 0.24, 0.09, 0.4),
      tone("sine", 1046, 1046, 0.6, 0.07, 0.6),
    ],
  },
  defeat: {
    category: "effects",
    caption: "Defeat",
    voices: [
      tone("sawtooth", 330, 330, 0.3, 0.07),
      tone("sawtooth", 262, 262, 0.32, 0.07, 0.26),
      tone("sine", 165, 130, 0.9, 0.06, 0.55),
    ],
  },
};

export const CUE_IDS = Object.keys(CUES) as CueId[];