/**
 * Card art registry. Maps a stable source card ID to CDN-hosted illustration art.
 * Cards with no entry fall back to the empty "Art pending" art window.
 *
 * IDs are the ones printed in the source databases, so the same illustration is
 * listed once per edition (cooperative `RF-OATH-*`, competitive `RF-TRIAL-*`).
 *
 * All art is hosted on Base44's public CDN and referenced directly by URL.
 */

import { quickPlayCardUniverse } from "./quickplay";
import type { CardDefinition } from "./schema";

/** Base44 CDN prefix for all generated card art */
const CDN = "https://media.base44.com/images/public/6a6b8eae93005c22992c5c72";

/** Central art URL map. Add new art here — both editions reference the same URL. */
const ART_URLS: Record<string, string> = {
  // ── Truthwardens (Basic) ──
  "RF-OATH-TRU-001": `${CDN}/c935c4d26_generated_image.png`, // Beacon Initiate
  "RF-OATH-TRU-002": `${CDN}/fb285432d_generated_image.png`, // Lens Sprite
  "RF-OATH-TRU-003": `${CDN}/d5b21fda4_generated_image.png`, // Hologlass Scribe
  "RF-OATH-TRU-004": `${CDN}/a1f07ebc1_generated_image.png`, // Clear Path Tactic
  "RF-OATH-TRU-005": `${CDN}/ac1605ada_generated_image.png`, // Tower Lookout
  // ── Truthwardens (Rare) ──
  "RF-OATH-TRU-006": `${CDN}/f7b27d624_generated_image.png`, // Unmask the Plot
  "RF-OATH-TRU-007": `${CDN}/44276a290_generated_image.png`, // Prism Archer
  "RF-OATH-TRU-008": `${CDN}/86c40b166_generated_image.png`, // Beacon Warder
  "RF-OATH-TRU-009": `${CDN}/2788627ae_generated_image.png`, // Lantern Array
  "RF-OATH-TRU-010": `${CDN}/75fe69014_generated_image.png`, // Verdict Seeker
  // ── Truthwardens (Epic) ──
  "RF-OATH-TRU-011": `${CDN}/a77e31a06_generated_image.png`, // Falsehood Falls
  "RF-OATH-TRU-012": `${CDN}/5000f37cb_generated_image.png`, // Mirror Sky Gryphon
  "RF-OATH-TRU-013": `${CDN}/7b04a6ad3_generated_image.png`, // Archive Guardian
  "RF-OATH-TRU-014": `${CDN}/ab9cc3bc6_generated_image.png`, // Beacon of Open Sight
  // ── Truthwardens (Legendary) ──
  "RF-OATH-TRU-015": `${CDN}/3557e9730_generated_image.png`, // Luminant Judge
  "RF-OATH-TRU-016": `${CDN}/9c5c4ab37_generated_image.png`, // Daybreak Verdict
  "RF-OATH-TRU-017": `${CDN}/cc6522ba2_generated_image.png`, // Marshal Verin, Light of Discernment

  // ── Honorbound (Basic) ──
  "RF-OATH-HON-001": `${CDN}/ba9f0d450_generated_image.png`, // Oath Page
  "RF-OATH-HON-002": `${CDN}/e5c132973_generated_image.png`, // Gate Pup
  "RF-OATH-HON-003": `${CDN}/a8a0717fb_generated_image.png`, // Banner Bearer
  "RF-OATH-HON-004": `${CDN}/86ec10b5c_generated_image.png`, // Patch the Ward
  "RF-OATH-HON-005": `${CDN}/a36027f8b_generated_image.png`, // Shieldhand Recruit
  // ── Honorbound (Rare) ──
  "RF-OATH-HON-006": `${CDN}/5db5ec4d0_generated_image.png`, // Interpose
  "RF-OATH-HON-007": `${CDN}/7effad9a5_generated_image.png`, // Goldwall Defender
  "RF-OATH-HON-008": `${CDN}/ee4f3c26c_generated_image.png`, // Standard of Courage
  "RF-OATH-HON-009": `${CDN}/fe50d52f8_generated_image.png`, // Brightarm Smith
  "RF-OATH-HON-010": `${CDN}/10bd0058b_generated_image.png`, // Vowsteel Sentinel
  // ── Honorbound (Epic) ──
  "RF-OATH-HON-011": `${CDN}/3a3876e41_generated_image.png`, // Repair the Breach
  "RF-OATH-HON-012": `${CDN}/b56bc3001_generated_image.png`, // Aegis Lion
  "RF-OATH-HON-013": `${CDN}/1888f23f5_generated_image.png`, // Gate Root Colossus
  "RF-OATH-HON-014": `${CDN}/6f1248b46_generated_image.png`, // Captain's Guard
  // ── Honorbound (Legendary) ──
  "RF-OATH-HON-015": `${CDN}/c47b86bfb_generated_image.png`, // Oath Renewed
  "RF-OATH-HON-016": `${CDN}/160dfea3b_generated_image.png`, // Wall of Living Light
  "RF-OATH-HON-017": `${CDN}/801354416_generated_image.png`, // Captain Soren, Shield of the Oath

  // ── Dawnwatch (Basic) ──
  "RF-OATH-DAW-001": `${CDN}/97bef62df_generated_image.png`, // Sunrunner Cadet
  "RF-OATH-DAW-002": `${CDN}/c9ae9486e_generated_image.png`, // Sparkwing Finch
  "RF-OATH-DAW-003": `${CDN}/57860dee6_generated_image.png`, // Dawn Courier
  "RF-OATH-DAW-004": `${CDN}/1a53706a4_generated_image.png`, // Quick Rally
  "RF-OATH-DAW-005": `${CDN}/80d4dd777_generated_image.png`, // Glider Scout
  // ── Dawnwatch (Rare) ──
  "RF-OATH-DAW-006": `${CDN}/ea8fa0bda_generated_image.png`, // Twin Beacon Signal
  "RF-OATH-DAW-007": `${CDN}/3ecc80d15_generated_image.png`, // First-Light Medic
  "RF-OATH-DAW-008": `${CDN}/889148ecb_generated_image.png`, // Skyline Skirmisher
  "RF-OATH-DAW-009": `${CDN}/552bba657_generated_image.png`, // Pack Formation
  "RF-OATH-DAW-010": `${CDN}/583c2028f_generated_image.png`, // Dawnback Stag
  // ── Dawnwatch (Epic) ──
  "RF-OATH-DAW-011": `${CDN}/eafbb04a1_generated_image.png`, // Shared Momentum
  "RF-OATH-DAW-012": `${CDN}/4c5ade71c_generated_image.png`, // Beacon Rail Charger
  "RF-OATH-DAW-013": `${CDN}/290b18ad6_generated_image.png`, // Wingbanner Captain
  "RF-OATH-DAW-014": `${CDN}/263e53aa2_generated_image.png`, // Aurora Lifters
  // ── Dawnwatch (Legendary) ──
  "RF-OATH-DAW-015": `${CDN}/9bd09dd44_generated_image.png`, // Race the Darkness
  "RF-OATH-DAW-016": `${CDN}/7b6141775_generated_image.png`, // All Beacons Forward
  "RF-OATH-DAW-017": `${CDN}/553b56be7_generated_image.png`, // Aren Cross, First Light Captain

  // ── Veilborn (Basic) ──
  "RF-HC-VEI-001": `${CDN}/3dc17f33b_generated_image.png`, // Maskling Sneak
  "RF-HC-VEI-002": `${CDN}/3fe164c99_generated_image.png`, // Fog Mote
  "RF-HC-VEI-003": `${CDN}/5d620817e_generated_image.png`, // Veil Runner
  "RF-HC-VEI-004": `${CDN}/8d069f526_generated_image.png`, // False Trail
  "RF-HC-VEI-005": `${CDN}/60cdbaf55_generated_image.png`, // Mirrormask Agent
  // ── Veilborn (Rare) ──
  "RF-HC-VEI-006": `${CDN}/07cb44a0c_generated_image.png`, // Mist Step
  "RF-HC-VEI-007": `${CDN}/00ad0ea26_generated_image.png`, // Blackglass Duelist
  "RF-HC-VEI-008": `${CDN}/ba9682aab_generated_image.png`, // Veiled Court Relic
  "RF-HC-VEI-009": `${CDN}/dfcf50728_generated_image.png`, // Moonroad Lurker
  "RF-HC-VEI-010": `${CDN}/882b92878_generated_image.png`, // Silver-Thread Trickster
  // ── Veilborn (Epic) ──
  "RF-HC-VEI-011": `${CDN}/73917538f_generated_image.png`, // Hidden Route
  "RF-HC-VEI-012": `${CDN}/01545ea4b_generated_image.png`, // Blackglass Prowler
  "RF-HC-VEI-013": `${CDN}/8c5caf260_generated_image.png`, // Court of Doubled Faces
  "RF-HC-VEI-014": `${CDN}/1bfa31f4b_generated_image.png`, // Veyr's Herald
  // ── Veilborn (Legendary) ──
  "RF-HC-VEI-015": `${CDN}/66a000304_generated_image.png`, // Hall of Shifting Doors
  "RF-HC-VEI-016": `${CDN}/a2cd7ef57_generated_image.png`, // The Unseen Advance
  "RF-HC-VEI-017": `${CDN}/5f3cf9a03_generated_image.png`, // Nhal, Mask of Many Roads

  // ── Whisper Court (Basic) ──
  "RF-HC-WHI-001": `${CDN}/84477985e_generated_image.png`, // Doubt Whisper
  "RF-HC-WHI-002": `${CDN}/7feeab87b_generated_image.png`, // Cinder Quill
  "RF-HC-WHI-003": `${CDN}/820a76269_generated_image.png`, // Court Page
  "RF-HC-WHI-004": `${CDN}/5e6a2a532_generated_image.png`, // Unsteady Thought
  "RF-HC-WHI-005": `${CDN}/8fa32dd4e_generated_image.png`, // Grayglass Advocate
  // ── Whisper Court (Rare) ──
  "RF-HC-WHI-006": `${CDN}/fa74e8efc_generated_image.png`, // Dimming Word
  "RF-HC-WHI-007": `${CDN}/5fb982325_generated_image.png`, // Broken-Crown Bailiff
  "RF-HC-WHI-008": `${CDN}/feff68207_generated_image.png`, // Chamber of Murmurs
  "RF-HC-WHI-009": `${CDN}/649d12c36_generated_image.png`, // Hushwing Shade
  "RF-HC-WHI-010": `${CDN}/1d0e11c3c_generated_image.png`, // Doubtbinder
  // ── Whisper Court (Epic) ──
  "RF-HC-WHI-011": `${CDN}/16e64385a_generated_image.png`, // Weight of Maybe
  "RF-HC-WHI-012": `${CDN}/5eaf6409b_generated_image.png`, // Mute Bell Construct
  "RF-HC-WHI-013": `${CDN}/dde489e07_generated_image.png`, // Throne of Second Guesses
  "RF-HC-WHI-014": `${CDN}/bf39f6ec1_generated_image.png`, // Malreth's Envoy
  // ── Whisper Court (Legendary) ──
  "RF-HC-WHI-015": `${CDN}/d58862649_generated_image.png`, // Still the Room
  "RF-HC-WHI-016": `${CDN}/e5df228e2_generated_image.png`, // Sentence of Silence
  "RF-HC-WHI-017": `${CDN}/682477bb8_generated_image.png`, // Oravax, Keeper of Doubt

  // ── Breakers (Basic) ──
  "RF-HC-BRK-001": `${CDN}/3dce48dbc_generated_image.png`, // Rubble Runner
  "RF-HC-BRK-002": `${CDN}/33f2d3d60_generated_image.png`, // Stonejaw Grub
  "RF-HC-BRK-003": `${CDN}/57080a246_generated_image.png`, // Hammer Cadet
  "RF-HC-BRK-004": `${CDN}/3dcb8dff7_generated_image.png`, // Crack the Mortar
  "RF-HC-BRK-005": `${CDN}/67e0493dc_generated_image.png`, // Siege-Line Brute
  // ── Breakers (Rare) ──
  "RF-HC-BRK-006": `${CDN}/7575859c2_generated_image.png`, // Falling Stone
  "RF-HC-BRK-007": `${CDN}/369fe1d98_generated_image.png`, // Bronze Ram Construct
  "RF-HC-BRK-008": `${CDN}/9b262fa87_generated_image.png`, // Ashfield Standard
  "RF-HC-BRK-009": `${CDN}/96ea4a959_generated_image.png`, // Breaker Sapper
  "RF-HC-BRK-010": `${CDN}/a343c5114_generated_image.png`, // Crown Mauler
  // ── Breakers (Epic) ──
  "RF-HC-BRK-011": `${CDN}/f9b1e0a23_generated_image.png`, // Splinter Barrage
  "RF-HC-BRK-012": `${CDN}/ea17ec8ad_generated_image.png`, // Obsidian Tortoise
  "RF-HC-BRK-013": `${CDN}/c2803eb45_generated_image.png`, // War Engine Igniter
  "RF-HC-BRK-014": `${CDN}/f4975d3c2_generated_image.png`, // Vorak's Banner
  "RF-HC-BRK-015": `${CDN}/1647494d2_generated_image.png`, // Gatefall Beast
  // ── Breakers (Legendary) ──
  "RF-HC-BRK-016": `${CDN}/03c9c07fc_generated_image.png`, // Collapse the Arch
  "RF-HC-BRK-017": `${CDN}/8c0605cd9_generated_image.png`, // Vorak's Siege Titan

  // ── Leaders ──
  "RF-SET-LEAD-001": `${CDN}/ed0914c2a_generated_image.png`, // Marshal Verin
  "RF-SET-LEAD-002": `${CDN}/dcf452fc8_generated_image.png`, // Captain Soren
  "RF-SET-LEAD-003": `${CDN}/9a75c5ddb_generated_image.png`, // Aren Cross
};

/**
 * Build the full art-by-card-id map, expanding the cooperative edition IDs
 * into the competitive (RF-TRIAL-*) edition so the same art is reused.
 */
function buildArtByCardId(): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};

  // Direct entries
  for (const [id, url] of Object.entries(ART_URLS)) {
    map[id] = url;
  }

  // Expand cooperative IDs into competitive edition
  // RF-OATH-TRU-001 -> RF-TRIAL-TRU-001, RF-OATH-HON-001 -> RF-TRIAL-HON-001, etc.
  for (const [id, url] of Object.entries(ART_URLS)) {
    if (id.startsWith("RF-OATH-")) {
      const trialId = id.replace("RF-OATH-", "RF-TRIAL-");
      map[trialId] = url;
    }
  }

  return map;
}

export const ART_BY_CARD_ID: Readonly<Record<string, string>> = buildArtByCardId();

/** Illustration for a card, resolved by stable ID. */
export function cardArtUrl(cardId: string): string | null {
  return ART_BY_CARD_ID[cardId] ?? null;
}

export function hasCardArt(cardId: string): boolean {
  return cardId in ART_BY_CARD_ID;
}

export interface ArtCoverageRow {
  readonly cardId: string;
  readonly name: string;
  readonly faction: string;
  readonly type: string;
  readonly hasArt: boolean;
}

export interface ArtCoverage {
  readonly rows: readonly ArtCoverageRow[];
  readonly imported: readonly ArtCoverageRow[];
  readonly pending: readonly ArtCoverageRow[];
  readonly total: number;
}

/** Art coverage across every card used by a QuickPlay deck, both editions. */
export function quickPlayArtCoverage(): ArtCoverage {
  const rows = quickPlayCardUniverse()
    .map((card: CardDefinition) => ({
      cardId: card.id,
      name: card.name,
      faction: card.faction,
      type: card.type,
      hasArt: hasCardArt(card.id),
    }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));

  return {
    rows,
    imported: rows.filter((r) => r.hasArt),
    pending: rows.filter((r) => !r.hasArt),
    total: rows.length,
  };
}
