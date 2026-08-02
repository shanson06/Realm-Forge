/**
 * Plain-language strategy summaries for the curated QuickPlay decks.
 *
 * These are presentation copy only. They describe how a deck plays; they never
 * alter card text, statistics, or deck contents.
 */
export const DECK_STRATEGY: Record<string, string> = {
  "coop-truthwardens":
    "Cheap early bodies and Scan support. Hold the line with Beacon Warder's Aegis while Prism Archer chips the Gate, then swing with Mirror-Sky Gryphon's Surge.",
  "coop-honorbound":
    "Heavy defence. Stack high-DEF guardians, soak the Hollow Crown's biggest attacker, and repair your Gate rather than racing.",
  "coop-dawnwatch":
    "Fast pressure. Trade cheaply, keep the board wide, and break the enemy Gate before the encounter deck stacks up.",
  "coop-veilborn":
    "Encounter deck. Deceptive low-cost minions that flood spaces and punish an empty Oathguard line.",
  "coop-whisper-court":
    "Encounter deck. Control and suppression: it dampens your best unit and grinds your Gate down.",
  "coop-breakers":
    "Encounter deck. Direct Gate damage and fracture effects that race straight for your crystals.",
  "trials-truthwardens":
    "Competitive. Information and reach: Foresight sets your next draws while ranged attackers pick off the opposing line.",
  "trials-honorbound":
    "Competitive. Aegis walls and Shield Matrix. Win by outlasting, then convert a stalled board into Gate damage.",
  "trials-dawnwatch":
    "Competitive. Surge and tempo. Spend the early turns forcing trades, then finish the Gate before your opponent stabilises.",
};

export function deckStrategy(deckId: string): string {
  return DECK_STRATEGY[deckId] ?? "Strategy summary pending approval.";
}
