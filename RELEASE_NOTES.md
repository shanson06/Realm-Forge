# Realmforge — Release Candidate Notes

**Build:** QuickPlay edition, cooperative + competitive, installable PWA
**Date:** 2026-08-01
**Status:** SOURCE READY FOR OWNER REVIEW

The source build passes its complete automated release gate. Public launch still requires the
owner's QuickPlay deck-list approval and a short installed-device/offline smoke test.

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
  turning crystals face-down.
- Two cards per turn unless a card effect says otherwise.
- Deterministic pure-TypeScript rules engine with typed state, explicit legal actions, a
  reducer, deterministic effect queues, and seeded randomization.
- Every playable card resolves through a typed effect keyed by its stable source ID. English
  card text is never parsed at runtime.
- Interactive tutorial, collection and deck viewer, achievements, statistics, and local-first
  persistence with versioned migrations plus JSON export/import.
- Installable PWA with offline guest play, a non-blocking offline indicator, and an update prompt
  that never replaces an active match.

## Realmforge finish pass

- Applied the original Relic-Tech Hopeful Fantasy visual system across the title, navigation,
  cards, setup screens, and gameplay surfaces.
- Rebuilt mode selection with illustrated cooperative/competitive choices, player counts,
  match length, opponent type, recommended use, and explicit victory paths.
- Added one shared sticky battle command bar to both game modes so round, phase, card limit,
  active side, and primary actions remain visible on phones and tablets.
- Corrected the PWA output path: Workbox now precaches 74+ client-shell assets instead of zero,
  and `sw.js` is emitted into the public directory served by TanStack Start/Nitro.
- Removed development diagnostics from the production menu and blocked the content-audit route
  outside development builds.
- Normalized source formatting and established a clean ESLint baseline.
- Added `npm run check` as the single release gate for lint, typecheck, tests, and build.

## Verification summary

- Lint: clean, with zero errors and zero warnings.
- Typecheck: clean (`tsc --noEmit`).
- Automated: 136 tests across 6 files, all passing (`vitest run`).
- Production build: successful (`vite build`).
- PWA build: worker emitted to `.output/public/sw.js`; 74+ app-shell entries precached.
- Gameplay logic: unchanged by the visual and navigation finish pass.

## Final owner checks

- Approve the six curated 20-card QuickPlay deck lists as canonical.
- On the deployed build, complete one portrait-phone match and one desktop match.
- Install the PWA, launch once online, close it, disable the network, and confirm offline reload.
