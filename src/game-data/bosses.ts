/**
 * Quick Boss profiles for cooperative QuickPlay.
 *
 * Health scales 12 / 16 / 20 by player count exactly as the QuickPlay brief states.
 * Every other value is taken verbatim from the four source boss cards in
 * `cooperative-master.json`. Nothing here is invented:
 *
 *  - `atk` is the printed ATK.
 *  - Reveal abilities live in `revealBoss()` in the engine, keyed by stable ID.
 *  - `enrageRatio` is the printed Enrage threshold divided by printed Health
 *    (9/18, 10/20, 11/22, 13/26 — all exactly one half), applied to the scaled
 *    QuickPlay Health so the Enrage moment lands at the same point in the fight.
 *
 * The three continuous modifier fields exist so that boss rules are DATA in
 * `MatchState`, never logic hidden inside a React component. They are all zero /
 * false today because no source boss card grants a continuous modifier; only
 * Veyr's "first boss attack each round ignores Aegis" is continuous, and that is
 * handled by the existing per-round attack counter.
 */
export interface QuickBossProfile {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly faction: string;
  /** Encounter deck this boss is thematically paired with. Any pairing is allowed. */
  readonly suggestedEncounterDeckId: string;
  /** Printed ATK from the source card. */
  readonly atk: number;
  readonly printedHealth: number;
  readonly printedEnrage: number;
  /** Every attack ignores Aegis (no source boss does this; Veyr is first-attack only). */
  readonly ignoresAegis: boolean;
  /** Extra Ward damage when this boss attacks a Gate. */
  readonly gateWardBonus: number;
  /** ATK granted to every other Hollow Crown unit while this boss is revealed. */
  readonly allyAtkBonus: number;
  /** Face-up crystals turned face-down after every seat charges. */
  readonly chargeDrain: number;
  readonly revealText: string;
  readonly summary: string;
  readonly modifierLabel: string;
}

export const HEALTH_BY_PLAYER_COUNT = [12, 16, 20] as const;

export const QUICK_BOSSES: readonly QuickBossProfile[] = [
  {
    id: "RF-HC-BOSS-001",
    name: "Veyr, the Hidden Lie",
    shortName: "Veyr",
    faction: "Veilborn",
    suggestedEncounterDeckId: "coop-veilborn",
    atk: 7,
    printedHealth: 18,
    printedEnrage: 9,
    ignoresAegis: false,
    gateWardBonus: 0,
    allyAtkBonus: 0,
    chargeDrain: 0,
    revealText:
      "Reveal: Until end of round, damaged Oathguard units lose Aegis. First boss attack each round ignores Aegis.",
    summary: "Truth-eater. Wounded guards cannot hold the line against him.",
    modifierLabel: "First attack each round ignores Aegis",
  },
  {
    id: "RF-HC-BOSS-002",
    name: "Malreth, Voice of Doubt",
    shortName: "Malreth",
    faction: "Whisper Court",
    suggestedEncounterDeckId: "coop-whisper-court",
    atk: 6,
    printedHealth: 20,
    printedEnrage: 10,
    ignoresAegis: false,
    gateWardBonus: 0,
    allyAtkBonus: 0,
    chargeDrain: 0,
    revealText:
      "Reveal: Remove temporary Oathguard ATK bonuses; each player has 1 less Energy next turn.",
    summary: "Drains conviction. Every Order charges one crystal short after he wakes.",
    modifierLabel: "Reveal drains 1 Energy from every Order",
  },
  {
    id: "RF-HC-BOSS-003",
    name: "Vorak, Crown Breaker",
    shortName: "Vorak",
    faction: "The Breakers",
    suggestedEncounterDeckId: "coop-breakers",
    atk: 8,
    printedHealth: 22,
    printedEnrage: 11,
    ignoresAegis: false,
    gateWardBonus: 0,
    allyAtkBonus: 0,
    chargeDrain: 0,
    revealText:
      "Reveal: Fracture 4, or destroy 2 crystals if the Oathguard Gate is broken.",
    summary: "Built to break walls. His waking blow lands straight on your defences.",
    modifierLabel: "Reveal: Fracture 4 (or 2 crystals)",
  },
  {
    id: "RF-HC-BOSS-004",
    name: "The Hollow Crown Awakened",
    shortName: "The Awakened",
    faction: "Hollow Crown",
    suggestedEncounterDeckId: "coop-whisper-court",
    atk: 9,
    printedHealth: 26,
    printedEnrage: 13,
    ignoresAegis: false,
    gateWardBonus: 0,
    allyAtkBonus: 0,
    chargeDrain: 0,
    revealText: "Reveal: Increase Global Threat Level by 1, then reveal one encounter card.",
    summary: "The crown itself. Its presence sharpens every servant on the field.",
    modifierLabel: "Reveal: +1 Global Threat and an extra encounter card",
  },
];

export function getBossProfile(id: string): QuickBossProfile {
  const boss = QUICK_BOSSES.find((b) => b.id === id);
  if (!boss) throw new Error(`Unknown Quick Boss "${id}".`);
  return boss;
}

export function bossHealthFor(playerCount: 1 | 2 | 3): number {
  return HEALTH_BY_PLAYER_COUNT[playerCount - 1];
}

/** Scaled Enrage threshold, preserving each boss's printed half-Health ratio. */
export function bossEnrageFor(profile: QuickBossProfile, health: number): number {
  return Math.max(1, Math.round((profile.printedEnrage / profile.printedHealth) * health));
}
