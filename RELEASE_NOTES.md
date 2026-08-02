# Realmforge — Release Candidate Notes

**Build:** QuickPlay edition, cooperative + competitive, installable PWA
**Date:** 2026-07-29
**Status:** NOT READY (see "Blocking items")

## What ships in this candidate

### Cooperative QuickPlay — Rise of the Oathguard
- One to three locally controlled Oathguard seats; boss health scales 12 / 16 / 20.
- Three Oathguard Orders (Truthwardens, Honorbound, Dawnwatch) and three encounter decks
  (Veilborn, Whisper Court, The Breakers), each exactly 20 cards: ten titles, two copies.
- Four bosses — Veyr, Malreth, Vorak, and The Hollow Crown Awakened — with boss-specific
  modifiers and 50% enrage thresholds.
- Automated Hollow Crown turn: highest-ATK attack order, then lowest-DEF Aegis, lowest-DEF
  other unit, Gate, crystals.
- Win order: break the Hollow Crown Gate, reduce its six crystals, defeat the Quick Boss.
  Loss when the Oathguard Crystal Spinner reaches zero.

### Competitive QuickPlay — Oathguard Trials
- Local pass-and-play with a privacy handoff screen, or three heuristic opponents
  (Initiate, Guardian, Champion) that read only public information.
- First player skips the first Draw; second player receives one Reserve token.
- Aegis protects units, never the Gate. Deck-out is a loss condition.

### Shared systems
- Four-step turn: Ready and Charge, Play, Battle, Pass. One permanent crystal per turn to a
  maximum of six, all permanent crystals turned face-up, then one draw. Costs are paid by
  turning crystals face-down. There is no separate Gain/Refill action and no
  Current/Maximum energy counter.
- Two cards per turn unless a card effect says otherwise.
- Deterministic pure-TypeScript rules engine: typed `MatchState`, explicit legal actions, a
  reducer, a deterministic effect queue, and seeded randomization.
- Every playable card resolves through a typed effect keyed by its stable source ID. No
  English card text is parsed at runtime.
- Interactive tutorial, collection and deck viewer, achievements, statistics, and
  local-first persistence with versioned migrations plus JSON export/import.
- Installable PWA with offline guest play, a non-blocking offline indicator, and an
  update prompt that never replaces an active match.

## Fixed in this candidate
- **Effect-coverage test was not enforcing coverage.** The previous check accepted
  `not-implemented` as a valid status and read only the cooperative registry, so a card with
  no typed effect could ship silently. Replaced by `src/tests/release-audit.test.ts`, which
  asserts per deck that every title resolves to `implemented` or `no-effect-required` in the
  registry for its own mode. All nine deck builds now pass this assertion.

## Blocking items
- Offline reload and PWA standalone layout are **Not Verified** against a deployed build.
  The local run reached the harness time limit, and the single offline navigation attempted
  happened on a first-ever load, before the service worker takes control.

## Verification summary
- Automated: 133 tests across 5 files, all passing (`bunx vitest run`).
- Typecheck: clean (`tsgo --noEmit`).
- Dependency scan: no high or critical vulnerabilities.
- Layout: no horizontal overflow and no console errors across small/large iPhone portrait
  and landscape, iPad portrait and landscape, and desktop.