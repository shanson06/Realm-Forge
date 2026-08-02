/**
 * Scripted tutorial content.
 *
 * This is a *teaching sandbox*, not the match engine: it is a tiny,
 * deterministic board that only ever accepts the one action the current step
 * asks for. It never touches `src/game-engine`, so no tested match rule can
 * change because of a tutorial edit. Every card shown is a real record from
 * the cooperative source database, referenced by its stable source id.
 */

export type TutorialTarget =
  | "hand"
  | "charge"
  | "energy"
  | "friendlyUnit"
  | "enemyUnit"
  | "enemyGate"
  | "playerGate"
  | "enemyCrystals"
  | "boss"
  | "continue";

export interface TutorialUnit {
  readonly uid: string;
  readonly cardId: string;
  readonly damage: number;
  readonly ready: boolean;
}

export interface TutorialBoard {
  readonly energyTotal: number;
  readonly faceUp: number;
  readonly hand: readonly string[];
  readonly units: readonly TutorialUnit[];
  readonly enemyUnits: readonly TutorialUnit[];
  readonly playerGate: number;
  readonly enemyGate: number;
  readonly playerCrystals: number;
  readonly enemyCrystals: number;
  readonly bossRevealed: boolean;
  readonly bossDamage: number;
  readonly bossHealth: number;
  readonly log: readonly string[];
}

export interface TutorialStep {
  readonly instruction: string;
  readonly target: TutorialTarget;
  /** When set, only this card/unit id satisfies the step. */
  readonly requireId?: string;
  /** Message shown when the player picks a different, illegal target. */
  readonly wrongTargetHint?: string;
  readonly apply: (board: TutorialBoard) => TutorialBoard;
}

export interface TutorialLesson {
  readonly id: string;
  readonly kind: "core" | "mini";
  readonly order: number;
  readonly title: string;
  readonly teaches: string;
  readonly takeaway: string;
  readonly initial: TutorialBoard;
  readonly steps: readonly TutorialStep[];
}

const EMPTY: TutorialBoard = {
  energyTotal: 0,
  faceUp: 0,
  hand: [],
  units: [],
  enemyUnits: [],
  playerGate: 10,
  enemyGate: 10,
  playerCrystals: 6,
  enemyCrystals: 6,
  bossRevealed: false,
  bossDamage: 0,
  bossHealth: 12,
  log: [],
};

const board = (patch: Partial<TutorialBoard>): TutorialBoard => ({ ...EMPTY, ...patch });
const log = (b: TutorialBoard, line: string): TutorialBoard => ({ ...b, log: [...b.log, line] });

const unit = (uid: string, cardId: string, patch: Partial<TutorialUnit> = {}): TutorialUnit => ({
  uid,
  cardId,
  damage: 0,
  ready: true,
  ...patch,
});

/* Real cooperative source ids used by the tutorial. */
const BEACON_INITIATE = "RF-OATH-TRU-001";
const LENS_SPRITE = "RF-OATH-TRU-002";
const TOWER_LOOKOUT = "RF-OATH-TRU-005";
const PRISM_ARCHER = "RF-OATH-TRU-007";
const BEACON_WARDER = "RF-OATH-TRU-008";
const MIRROR_SKY_GRYPHON = "RF-OATH-TRU-012";
const ARCHIVE_GUARDIAN = "RF-OATH-TRU-013";
const HOLOGLASS_SCRIBE = "RF-OATH-TRU-003";
const MASKLING = "RF-HC-VEI-001";
const VEIL_RUNNER = "RF-HC-VEI-003";
const MIRRORMASK = "RF-HC-VEI-005";
const BOSS_VEYR = "RF-HC-BOSS-001";

export const CORE_LESSONS: readonly TutorialLesson[] = [
  {
    id: "core-01-inspect",
    kind: "core",
    order: 1,
    title: "Inspect a card",
    teaches: "Tap any card to read it.",
    takeaway: "Tapping never commits you to anything. You can read a card at any time.",
    initial: board({ hand: [BEACON_INITIATE, LENS_SPRITE] }),
    steps: [
      {
        instruction: "Tap Beacon Initiate in your hand to read it.",
        target: "hand",
        requireId: BEACON_INITIATE,
        wrongTargetHint: "This lesson wants Beacon Initiate — the left-hand card.",
        apply: (b) => log(b, "Inspected Beacon Initiate."),
      },
    ],
  },
  {
    id: "core-02-ready-charge",
    kind: "core",
    order: 2,
    title: "Ready and Charge",
    teaches: "Start your turn: ready, add a crystal, turn them face-up, draw.",
    takeaway:
      "Ready and Charge is one step: ready your cards, add one permanent crystal up to six, turn every permanent crystal face-up, then draw one card.",
    initial: board({ energyTotal: 1, faceUp: 0, hand: [BEACON_INITIATE] }),
    steps: [
      {
        instruction: "Press Ready and Charge to begin your turn.",
        target: "charge",
        apply: (b) =>
          log(
            { ...b, energyTotal: b.energyTotal + 1, faceUp: b.energyTotal + 1, hand: [...b.hand, LENS_SPRITE] },
            "Ready and Charge: +1 permanent crystal, all crystals face-up, drew Lens Sprite.",
          ),
      },
    ],
  },
  {
    id: "core-03-pay",
    kind: "core",
    order: 3,
    title: "Pay with a crystal",
    teaches: "Turning a face-up crystal face-down is how you pay.",
    takeaway:
      "You never lose crystals by paying. They return face-up at your next Ready and Charge.",
    initial: board({ energyTotal: 2, faceUp: 2, hand: [BEACON_INITIATE] }),
    steps: [
      {
        instruction: "Tap a face-up crystal to turn it face-down and pay one Energy.",
        target: "energy",
        apply: (b) => log({ ...b, faceUp: b.faceUp - 1 }, "Turned one crystal face-down."),
      },
    ],
  },
  {
    id: "core-04-play-unit",
    kind: "core",
    order: 4,
    title: "Play a unit",
    teaches: "Spend Energy to put a unit on the board.",
    takeaway:
      "A unit enters ready but cannot attack the turn it arrives — unless it has Surge. You may play at most two cards per turn.",
    initial: board({ energyTotal: 3, faceUp: 3, hand: [BEACON_INITIATE, LENS_SPRITE] }),
    steps: [
      {
        instruction: "Play Lens Sprite from your hand. It costs 1.",
        target: "hand",
        requireId: LENS_SPRITE,
        wrongTargetHint: "Beacon Initiate also costs 1, but this lesson uses Lens Sprite.",
        apply: (b) =>
          log(
            {
              ...b,
              faceUp: b.faceUp - 1,
              hand: b.hand.filter((id) => id !== LENS_SPRITE),
              units: [...b.units, unit("u1", LENS_SPRITE, { ready: false })],
            },
            "Played Lens Sprite for 1 Energy.",
          ),
      },
    ],
  },
  {
    id: "core-05-atk-def",
    kind: "core",
    order: 5,
    title: "ATK and DEF",
    teaches: "The two numbers on every unit.",
    takeaway:
      "ATK is the damage a unit deals. DEF is how much damage it can hold before it is discarded.",
    initial: board({ units: [unit("u1", PRISM_ARCHER)], enemyUnits: [unit("e1", MIRRORMASK)] }),
    steps: [
      {
        instruction: "Tap your Prism Archer and compare its ATK 4 with the enemy's DEF 4.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Prism Archer: ATK 4, DEF 3."),
      },
      {
        instruction: "Now tap Mirrormask Agent to read the defender's numbers.",
        target: "enemyUnit",
        requireId: "e1",
        apply: (b) => log(b, "Mirrormask Agent: ATK 3, DEF 4."),
      },
    ],
  },
  {
    id: "core-06-attack",
    kind: "core",
    order: 6,
    title: "Attack a legal target",
    teaches: "Tap an attacker, then tap a highlighted target.",
    takeaway: "Defenders never retaliate. Only the attacker deals damage.",
    initial: board({ units: [unit("u1", PRISM_ARCHER)], enemyUnits: [unit("e1", VEIL_RUNNER)] }),
    steps: [
      {
        instruction: "Tap Prism Archer to select it as your attacker.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Selected Prism Archer as the attacker."),
      },
      {
        instruction: "Tap Veil Runner, the highlighted legal target.",
        target: "enemyUnit",
        requireId: "e1",
        apply: (b) =>
          log(
            { ...b, units: b.units.map((u) => ({ ...u, ready: false })), enemyUnits: [] },
            "Prism Archer dealt 4 damage to Veil Runner (DEF 2). It was discarded.",
          ),
      },
    ],
  },
  {
    id: "core-07-persistent-damage",
    kind: "core",
    order: 7,
    title: "Damage stays",
    teaches: "Damage remains on a unit between turns.",
    takeaway:
      "Damage does not heal at end of turn. A unit is discarded the moment its damage equals or exceeds its DEF.",
    initial: board({
      units: [unit("u1", TOWER_LOOKOUT, { damage: 2 })],
      enemyUnits: [unit("e1", MASKLING)],
    }),
    steps: [
      {
        instruction: "Tower Lookout already holds 2 damage of its 4 DEF. Attack Maskling Sneak with it.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Selected Tower Lookout (2 damage held)."),
      },
      {
        instruction: "Tap Maskling Sneak.",
        target: "enemyUnit",
        requireId: "e1",
        apply: (b) =>
          log(
            { ...b, units: b.units.map((u) => ({ ...u, ready: false })), enemyUnits: [] },
            "Maskling Sneak discarded. Tower Lookout still holds its 2 damage.",
          ),
      },
    ],
  },
  {
    id: "core-08-gate",
    kind: "core",
    order: 8,
    title: "Protect and repair your Gate",
    teaches: "Your Gate shields your crystals. Restore puts Ward back.",
    takeaway:
      "Your Gate is the wall in front of your six crystals. Restore X returns X Ward, never above its starting 10.",
    initial: board({
      playerGate: 6,
      energyTotal: 4,
      faceUp: 4,
      hand: [HOLOGLASS_SCRIBE],
      units: [unit("u1", BEACON_WARDER)],
    }),
    steps: [
      {
        instruction: "Tap your Gate to see its remaining Ward.",
        target: "playerGate",
        apply: (b) => log(b, "Oathguard Gate: 6 of 10 Ward remaining."),
      },
      {
        instruction: "Play Hologlass Scribe to repair 2 Ward.",
        target: "hand",
        requireId: HOLOGLASS_SCRIBE,
        apply: (b) =>
          log(
            {
              ...b,
              faceUp: b.faceUp - 2,
              hand: [],
              playerGate: Math.min(10, b.playerGate + 2),
              units: [...b.units, unit("u2", HOLOGLASS_SCRIBE, { ready: false })],
            },
            "Restore 2: Oathguard Gate back to 8 Ward.",
          ),
      },
    ],
  },
  {
    id: "core-09-break-gate",
    kind: "core",
    order: 9,
    title: "Break the enemy Gate",
    teaches: "Attack the Gate once no defender blocks you.",
    takeaway:
      "Excess Gate damage is lost. It never spills into crystals — you need a separate attack for those.",
    initial: board({ enemyGate: 3, units: [unit("u1", MIRROR_SKY_GRYPHON)] }),
    steps: [
      {
        instruction: "Tap Mirror-Sky Gryphon (ATK 5).",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Selected Mirror-Sky Gryphon."),
      },
      {
        instruction: "Attack the Hollow Crown Gate. It has 3 Ward left.",
        target: "enemyGate",
        apply: (b) =>
          log(
            { ...b, enemyGate: 0, units: b.units.map((u) => ({ ...u, ready: false })) },
            "Hollow Crown Gate broken. The extra 2 damage was lost, not carried to crystals.",
          ),
      },
    ],
  },
  {
    id: "core-10-crystals",
    kind: "core",
    order: 10,
    title: "Damage the crystals",
    teaches: "With the Gate broken, crystals become legal targets.",
    takeaway: "Reduce all six Hollow Crown crystals to zero before the boss can be challenged.",
    initial: board({ enemyGate: 0, enemyCrystals: 2, units: [unit("u1", PRISM_ARCHER)] }),
    steps: [
      {
        instruction: "Tap Prism Archer.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Selected Prism Archer."),
      },
      {
        instruction: "Attack the Hollow Crown Crystal Spinner.",
        target: "enemyCrystals",
        apply: (b) =>
          log(
            { ...b, enemyCrystals: 0, units: b.units.map((u) => ({ ...u, ready: false })) },
            "Hollow Crown crystals reduced to zero.",
          ),
      },
    ],
  },
  {
    id: "core-11-boss",
    kind: "core",
    order: 11,
    title: "Reveal and defeat the boss",
    teaches: "The Quick Boss appears only after the crystals fall.",
    takeaway:
      "Win order is fixed: break the Gate, empty the crystals, then defeat the Quick Boss. You lose if your own Crystal Spinner reaches zero.",
    initial: board({
      enemyGate: 0,
      enemyCrystals: 0,
      bossRevealed: false,
      bossHealth: 12,
      bossDamage: 8,
      units: [unit("u1", ARCHIVE_GUARDIAN), unit("u2", MIRROR_SKY_GRYPHON)],
    }),
    steps: [
      {
        instruction: "Tap the Quick Boss card to reveal Veyr.",
        target: "boss",
        apply: (b) => log({ ...b, bossRevealed: true }, "Veyr, the Quick Boss, is revealed."),
      },
      {
        instruction: "Attack Veyr with Mirror-Sky Gryphon (ATK 5) for the win.",
        target: "friendlyUnit",
        requireId: "u2",
        wrongTargetHint: "Archive Guardian only has ATK 4 — that leaves Veyr alive.",
        apply: (b) =>
          log(
            { ...b, bossDamage: b.bossHealth, units: b.units.map((u) => ({ ...u, ready: false })) },
            "Veyr defeated. The Oathguard hold the realm.",
          ),
      },
    ],
  },
];

export const MINI_LESSONS: readonly TutorialLesson[] = [
  {
    id: "mini-aegis",
    kind: "mini",
    order: 1,
    title: "Aegis",
    teaches: "A ready Aegis unit protects your other units.",
    takeaway:
      "A used Aegis unit does not guard. In competitive play, Aegis never protects the Gate.",
    initial: board({
      units: [unit("u1", BEACON_WARDER), unit("u2", LENS_SPRITE)],
      enemyUnits: [unit("e1", MIRRORMASK)],
    }),
    steps: [
      {
        instruction: "Tap Beacon Warder — the ready Aegis unit shielding your line.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "While Beacon Warder is ready, Lens Sprite cannot be attacked."),
      },
    ],
  },
  {
    id: "mini-shield-matrix",
    kind: "mini",
    order: 2,
    title: "Shield Matrix",
    teaches: "Reduce incoming damage as printed.",
    takeaway: "Shield Matrix reduces each instance of damage, so small hits can be shrugged off entirely.",
    initial: board({ units: [unit("u1", ARCHIVE_GUARDIAN)], enemyUnits: [unit("e1", MASKLING)] }),
    steps: [
      {
        instruction: "Tap Archive Guardian to see how printed damage reduction is applied.",
        target: "friendlyUnit",
        requireId: "u1",
        apply: (b) => log(b, "Damage is reduced before it is written onto the unit."),
      },
    ],
  },
  {
    id: "mini-surge",
    kind: "mini",
    order: 3,
    title: "Surge",
    teaches: "Attack the turn a unit arrives.",
    takeaway: "Only Surge units may attack on the turn they enter play.",
    initial: board({ energyTotal: 6, faceUp: 6, hand: [MIRROR_SKY_GRYPHON] }),
    steps: [
      {
        instruction: "Play Mirror-Sky Gryphon. It has Surge.",
        target: "hand",
        requireId: MIRROR_SKY_GRYPHON,
        apply: (b) =>
          log(
            { ...b, faceUp: 0, hand: [], units: [unit("u1", MIRROR_SKY_GRYPHON, { ready: true })] },
            "Surge: the Gryphon entered ready and may attack immediately.",
          ),
      },
    ],
  },
  {
    id: "mini-deploy",
    kind: "mini",
    order: 4,
    title: "Deploy",
    teaches: "A one-time effect when a card enters play.",
    takeaway: "Deploy triggers exactly once, as the card arrives.",
    initial: board({ energyTotal: 2, faceUp: 2, hand: [BEACON_INITIATE] }),
    steps: [
      {
        instruction: "Play Beacon Initiate to trigger its Deploy effect.",
        target: "hand",
        requireId: BEACON_INITIATE,
        apply: (b) =>
          log(
            { ...b, faceUp: 1, hand: [], units: [unit("u1", BEACON_INITIATE, { ready: false })] },
            "Deploy resolved as the card entered play.",
          ),
      },
    ],
  },
  {
    id: "mini-echo",
    kind: "mini",
    order: 5,
    title: "Echo",
    teaches: "A printed effect that repeats under its stated condition.",
    takeaway: "Echo only repeats when the card's own condition is met — read the card.",
    initial: board({ enemyUnits: [unit("e1", "RF-HC-VEI-009")] }),
    steps: [
      {
        instruction: "Tap Moonroad Lurker to read its Echo condition.",
        target: "enemyUnit",
        requireId: "e1",
        apply: (b) => log(b, "Echo repeats the printed effect when the condition is met."),
      },
    ],
  },
  {
    id: "mini-restore",
    kind: "mini",
    order: 6,
    title: "Restore X",
    teaches: "Put Ward back or remove damage.",
    takeaway: "Restore never exceeds a Gate's starting Ward or a unit's printed DEF.",
    initial: board({ playerGate: 7, energyTotal: 3, faceUp: 3, hand: [HOLOGLASS_SCRIBE] }),
    steps: [
      {
        instruction: "Play Hologlass Scribe and watch your Gate Ward rise.",
        target: "hand",
        requireId: HOLOGLASS_SCRIBE,
        apply: (b) =>
          log(
            { ...b, faceUp: 1, hand: [], playerGate: Math.min(10, b.playerGate + 2), units: [unit("u1", HOLOGLASS_SCRIBE, { ready: false })] },
            "Restore 2 applied to the Oathguard Gate.",
          ),
      },
    ],
  },
  {
    id: "mini-hollow-crown",
    kind: "mini",
    order: 7,
    title: "Hollow Crown automation",
    teaches: "The enemy turn resolves by fixed priority, never by guesswork.",
    takeaway:
      "Enemies attack highest ATK first and target: lowest-DEF Aegis unit, then lowest-DEF other unit, then your Gate, then your crystals once the Gate is broken.",
    initial: board({
      units: [unit("u1", LENS_SPRITE), unit("u2", BEACON_WARDER)],
      enemyUnits: [unit("e1", MIRRORMASK), unit("e2", VEIL_RUNNER)],
    }),
    steps: [
      {
        instruction: "Tap Beacon Warder — the lowest-DEF Aegis unit, so it is targeted first.",
        target: "friendlyUnit",
        requireId: "u2",
        wrongTargetHint: "Aegis units are always chosen before non-Aegis units.",
        apply: (b) => log(b, "Priority confirmed: Aegis first, by lowest DEF."),
      },
    ],
  },
  {
    id: "mini-competitive-targeting",
    kind: "mini",
    order: 8,
    title: "Competitive targeting",
    teaches: "How Oathguard Trials differs from the cooperative raid.",
    takeaway:
      "In Trials you have three unit spaces and one Support space. Crystals only become legal targets after the opposing Gate breaks, and Aegis never shields the Gate.",
    initial: board({ enemyGate: 4, units: [unit("u1", PRISM_ARCHER)], enemyUnits: [unit("e1", MIRRORMASK)] }),
    steps: [
      {
        instruction: "Tap the opposing Gate: it is legal even while an enemy unit stands, because Aegis does not shield Gates.",
        target: "enemyGate",
        apply: (b) => log(b, "The Gate is a legal target while its Ward remains."),
      },
    ],
  },
  {
    id: "mini-reserve",
    kind: "mini",
    order: 9,
    title: "Reserve token",
    teaches: "The second player's one-time catch-up crystal.",
    takeaway:
      "Once during their first three turns the second player may spend the Reserve token for one face-up temporary crystal. It is removed during Pass.",
    initial: board({ energyTotal: 2, faceUp: 2 }),
    steps: [
      {
        instruction: "Tap a crystal to spend the Reserve token and add a temporary face-up crystal.",
        target: "energy",
        apply: (b) =>
          log({ ...b, faceUp: b.faceUp + 1 }, "Temporary crystal added. It is removed during Pass."),
      },
    ],
  },
];

export const ALL_LESSONS: readonly TutorialLesson[] = [...CORE_LESSONS, ...MINI_LESSONS];

export function getLesson(id: string): TutorialLesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function nextLessonId(id: string): string | null {
  const index = ALL_LESSONS.findIndex((l) => l.id === id);
  if (index < 0 || index + 1 >= ALL_LESSONS.length) return null;
  return ALL_LESSONS[index + 1].id;
}