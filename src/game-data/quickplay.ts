/**
 * QuickPlay deck derivation.
 *
 * RULE: a QuickPlay deck is exactly 10 approved titles x 2 copies = 20 cards.
 *
 * The approved title lists must come from the QuickPlay rulebooks. Those rulebooks
 * are NOT among the uploaded sources (every uploaded rulebook describes the 30-card
 * standard edition), so every manifest below is `awaiting-source` with an empty
 * title list. No titles have been invented. The derivation, validation and
 * reporting code is complete and will produce real decks the moment approved
 * titles are supplied.
 */
import { getCatalog, getDeckCards } from "./load";
import { GameMode, NON_DECK_TYPES, type CardDefinition, type ValidationIssue } from "./schema";

export const QUICKPLAY_TITLES_PER_DECK = 10;
export const QUICKPLAY_COPIES_PER_TITLE = 2;
export const QUICKPLAY_DECK_SIZE = QUICKPLAY_TITLES_PER_DECK * QUICKPLAY_COPIES_PER_TITLE;

export type ManifestStatus = "approved" | "proposed" | "awaiting-source";

export interface QuickPlayDeckManifest {
  readonly deckId: string;
  readonly label: string;
  readonly faction: string;
  readonly mode: GameMode;
  /** The `deck` field in the source JSON this QuickPlay deck is cut from. */
  readonly sourceDeck: string;
  readonly status: ManifestStatus;
  /** Exactly QUICKPLAY_TITLES_PER_DECK approved titles once status is "approved". */
  readonly titles: readonly string[];
  /** Where the title list came from, or why it is missing. */
  readonly provenance: string;
}

const AWAITING =
  "Awaiting the QuickPlay rulebook. Uploaded sources describe the 30-card standard edition only; no titles inferred.";

/** The three Oathguard Orders a player can pick, in both modes. */
export const OATHGUARD_ORDERS = ["Truthwardens", "Honorbound", "Dawnwatch"] as const;
/** The three cooperative Hollow Crown encounter decks. */
export const ENCOUNTER_FACTIONS = ["Veilborn", "Whisper Court", "The Breakers"] as const;

export type OathguardOrder = (typeof OATHGUARD_ORDERS)[number];
export type EncounterFaction = (typeof ENCOUNTER_FACTIONS)[number];

const PROPOSED_COOP =
  "CONF-001 — proposed cut, awaiting approval. The uploaded sources contain no QuickPlay title list, so the ten lowest-cost non-Hero titles of the 30-card starter/encounter deck were taken in printed order. No card text, ID, or statistic was altered.";

const PROPOSED_TRIALS =
  "CONF-002 — proposed cut, awaiting approval. The uploaded Oathguard Trials database has no QuickPlay title list, so the same rule as CONF-001 was applied: the ten lowest-cost non-Hero titles of the 17-title Trials deck, in printed order. No card text, ID, or statistic was altered.";

export const QUICKPLAY_DECK_MANIFESTS: readonly QuickPlayDeckManifest[] = [
  {
    deckId: "coop-truthwardens",
    label: "Truthwardens",
    faction: "Truthwardens",
    mode: GameMode.Cooperative,
    sourceDeck: "Truthwardens Starter Deck",
    status: "proposed",
    titles: [
      "Beacon Initiate",
      "Lens Sprite",
      "Hologlass Scribe",
      "Clear Path Tactic",
      "Tower Lookout",
      "Unmask the Plot",
      "Prism Archer",
      "Beacon Warder",
      "Lantern Array",
      "Verdict Seeker",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "coop-veilborn",
    label: "Veilborn",
    faction: "Veilborn",
    mode: GameMode.Cooperative,
    sourceDeck: "Veilborn Encounter Deck",
    status: "proposed",
    titles: [
      "Maskling Sneak",
      "Fog Mote",
      "Veil Runner",
      "False Trail",
      "Mirrormask Agent",
      "Mist Step",
      "Blackglass Duelist",
      "Veiled Court Relic",
      "Moonroad Lurker",
      "Silver-Thread Trickster",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "coop-honorbound",
    label: "Honorbound",
    faction: "Honorbound",
    mode: GameMode.Cooperative,
    sourceDeck: "Honorbound Starter Deck",
    status: "proposed",
    titles: [
      "Oath Page",
      "Gate Pup",
      "Banner Bearer",
      "Patch the Ward",
      "Shieldhand Recruit",
      "Interpose",
      "Goldwall Defender",
      "Standard of Courage",
      "Brightarm Smith",
      "Vowsteel Sentinel",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "coop-dawnwatch",
    label: "Dawnwatch",
    faction: "Dawnwatch",
    mode: GameMode.Cooperative,
    sourceDeck: "Dawnwatch Starter Deck",
    status: "proposed",
    titles: [
      "Sunrunner Cadet",
      "Sparkwing Finch",
      "Dawn Courier",
      "Quick Rally",
      "Glider Scout",
      "Twin Beacon Signal",
      "First-Light Medic",
      "Skyline Skirmisher",
      "Pack Formation",
      "Dawnback Stag",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "coop-whisper-court",
    label: "Whisper Court",
    faction: "Whisper Court",
    mode: GameMode.Cooperative,
    sourceDeck: "Whisper Court Encounter Deck",
    status: "proposed",
    titles: [
      "Doubt Whisper",
      "Cinder Quill",
      "Court Page",
      "Unsteady Thought",
      "Grayglass Advocate",
      "Dimming Word",
      "Broken-Crown Bailiff",
      "Chamber of Murmurs",
      "Hushwing Shade",
      "Doubtbinder",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "coop-breakers",
    label: "The Breakers",
    faction: "The Breakers",
    mode: GameMode.Cooperative,
    sourceDeck: "The Breakers Encounter Deck",
    status: "proposed",
    titles: [
      "Rubble Runner",
      "Stonejaw Grub",
      "Hammer Cadet",
      "Crack the Mortar",
      "Siege-Line Brute",
      "Falling Stone",
      "Bronze Ram Construct",
      "Ashfield Standard",
      "Breaker Sapper",
      "Crown Mauler",
    ],
    provenance: PROPOSED_COOP,
  },
  {
    deckId: "trials-truthwardens",
    label: "Truthwardens",
    faction: "Truthwardens",
    mode: GameMode.Competitive,
    sourceDeck: "Truthwardens Trials Deck",
    status: "proposed",
    titles: [
      "Beacon Initiate",
      "Lens Sprite",
      "Hologlass Scribe",
      "Clear Path Tactic",
      "Tower Lookout",
      "Unmask the Plot",
      "Prism Archer",
      "Beacon Warder",
      "Lantern Array",
      "Verdict Seeker",
    ],
    provenance: PROPOSED_TRIALS,
  },
  {
    deckId: "trials-honorbound",
    label: "Honorbound",
    faction: "Honorbound",
    mode: GameMode.Competitive,
    sourceDeck: "Honorbound Trials Deck",
    status: "proposed",
    titles: [
      "Oath Page",
      "Gate Pup",
      "Banner Bearer",
      "Patch the Ward",
      "Shieldhand Recruit",
      "Interpose",
      "Goldwall Defender",
      "Standard of Courage",
      "Brightarm Smith",
      "Vowsteel Sentinel",
    ],
    provenance: PROPOSED_TRIALS,
  },
  {
    deckId: "trials-dawnwatch",
    label: "Dawnwatch",
    faction: "Dawnwatch",
    mode: GameMode.Competitive,
    sourceDeck: "Dawnwatch Trials Deck",
    status: "proposed",
    titles: [
      "Sunrunner Cadet",
      "Sparkwing Finch",
      "Dawn Courier",
      "Quick Rally",
      "Glider Scout",
      "Twin Beacon Signal",
      "First-Light Medic",
      "Skyline Skirmisher",
      "Pack Formation",
      "Dawnback Stag",
    ],
    provenance: PROPOSED_TRIALS,
  },
];

export interface QuickPlayDeckEntry {
  readonly card: CardDefinition;
  readonly copies: number;
}

export interface QuickPlayDeck {
  readonly manifest: QuickPlayDeckManifest;
  readonly entries: readonly QuickPlayDeckEntry[];
  /** Flattened 20-card list of stable source IDs, two per title. */
  readonly cardIds: readonly string[];
  readonly totalCards: number;
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

/** Titles available to cut from, for a given manifest. Non-deck records are excluded. */
export function candidateTitles(manifest: QuickPlayDeckManifest): CardDefinition[] {
  return getDeckCards(manifest.mode, manifest.sourceDeck).filter(
    (c) => !NON_DECK_TYPES.includes(c.type),
  );
}

/**
 * Builds a QuickPlay deck from a manifest. Pure and deterministic:
 * two copies of every listed title, in manifest order.
 */
export function buildQuickPlayDeck(manifest: QuickPlayDeckManifest): QuickPlayDeck {
  const issues: ValidationIssue[] = [];
  const pool = candidateTitles(manifest);
  const byTitle = new Map<string, CardDefinition[]>();
  for (const card of pool) {
    byTitle.set(card.name, [...(byTitle.get(card.name) ?? []), card]);
  }

  if (manifest.status === "awaiting-source") {
    issues.push({
      severity: "error",
      code: "deck-size",
      cardId: null,
      message: `${manifest.label} (${manifest.mode}): ${manifest.provenance}`,
    });
  }

  if (manifest.status === "proposed") {
    issues.push({
      severity: "warning",
      code: "ambiguous",
      cardId: null,
      message: `${manifest.label} (${manifest.mode}): ${manifest.provenance}`,
    });
  }

  const seen = new Set<string>();
  const entries: QuickPlayDeckEntry[] = [];

  for (const title of manifest.titles) {
    if (seen.has(title)) {
      issues.push({
        severity: "error",
        code: "duplicate-title",
        cardId: null,
        message: `"${title}" is listed twice in the ${manifest.deckId} manifest. Each title is listed once and supplies two copies.`,
      });
      continue;
    }
    seen.add(title);

    const matches = byTitle.get(title) ?? [];
    if (matches.length === 0) {
      issues.push({
        severity: "error",
        code: "schema",
        cardId: null,
        message: `No record named "${title}" in ${manifest.sourceDeck} (${manifest.mode}).`,
      });
      continue;
    }
    if (matches.length > 1) {
      issues.push({
        severity: "error",
        code: "ambiguous",
        cardId: matches[0].id,
        message: `"${title}" resolves to ${matches.length} records (${matches
          .map((m) => m.id)
          .join(", ")}). Approval required before it can be used.`,
      });
      continue;
    }
    entries.push({ card: matches[0], copies: QUICKPLAY_COPIES_PER_TITLE });
  }

  if (
    manifest.status !== "awaiting-source" &&
    manifest.titles.length !== QUICKPLAY_TITLES_PER_DECK
  ) {
    issues.push({
      severity: "error",
      code: "deck-size",
      cardId: null,
      message: `${manifest.deckId} lists ${manifest.titles.length} titles; QuickPlay requires exactly ${QUICKPLAY_TITLES_PER_DECK}.`,
    });
  }

  const cardIds = entries.flatMap((e) => Array.from({ length: e.copies }, () => e.card.id));

  if (manifest.status !== "awaiting-source" && cardIds.length !== QUICKPLAY_DECK_SIZE) {
    issues.push({
      severity: "error",
      code: "deck-size",
      cardId: null,
      message: `${manifest.deckId} built ${cardIds.length} cards; QuickPlay requires exactly ${QUICKPLAY_DECK_SIZE}.`,
    });
  }

  return {
    manifest,
    entries,
    cardIds,
    totalCards: cardIds.length,
    valid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}

export function buildAllQuickPlayDecks(): QuickPlayDeck[] {
  return QUICKPLAY_DECK_MANIFESTS.map(buildQuickPlayDeck);
}

export function getManifest(deckId: string): QuickPlayDeckManifest | undefined {
  return QUICKPLAY_DECK_MANIFESTS.find((m) => m.deckId === deckId);
}

export function manifestsForMode(mode: GameMode): QuickPlayDeckManifest[] {
  return QUICKPLAY_DECK_MANIFESTS.filter((m) => m.mode === mode);
}

export function isEncounterManifest(manifest: QuickPlayDeckManifest): boolean {
  return (ENCOUNTER_FACTIONS as readonly string[]).includes(manifest.faction);
}

/** The Oathguard Orders a player can choose in the given mode. */
export function oathguardManifests(mode: GameMode): QuickPlayDeckManifest[] {
  return manifestsForMode(mode).filter((m) => !isEncounterManifest(m));
}

/** The cooperative encounter decks the Hollow Crown can be built from. */
export function encounterManifests(): QuickPlayDeckManifest[] {
  return manifestsForMode(GameMode.Cooperative).filter(isEncounterManifest);
}

/** Every playable card referenced by any of the six QuickPlay decks. */
export function quickPlayCardUniverse(): CardDefinition[] {
  const out = new Map<string, CardDefinition>();
  for (const manifest of QUICKPLAY_DECK_MANIFESTS) {
    for (const card of candidateTitles(manifest)) out.set(`${card.mode}:${card.id}`, card);
  }
  return [...out.values()];
}

/** Sanity helper for the audit: catalogue-wide record counts. */
export function catalogCounts() {
  return {
    cooperative: getCatalog(GameMode.Cooperative).cards.length,
    competitive: getCatalog(GameMode.Competitive).cards.length,
  };
}
