# Realmforge Pre-Build Audit (Phase 1) — revised with Volume 3

No code written. Every claim below was read from the uploaded files. Volume 3 has now been received, which closes the one inventory gap and independently confirms several audit findings.

---

## 1. File inventory

| # | File | Type | Verified contents | Controls |
|---|---|---|---|---|
| 1 | `Realmforge_Rise_of_the_Oathguard_Cooperative_Rulebook.pdf` | PDF, 10 pp | 18 sections, full co-op rules | Cooperative standard rules |
| 2 | `..._Cooperative_Rulebook.docx` | DOCX | Editable twin of #1 | Same (PDF used as the read source) |
| 3 | `Realmforge_Oathguard_Trials_Competitive_Rulebook.pdf` | PDF, 10 pp | 21 sections, full duel rules | Competitive standard rules |
| 4 | `..._Competitive_Rulebook.docx` | DOCX | Editable twin of #3 | Same |
| 5 | `realmforge_master_database.json` | JSON, 123 records | 102 draw-pile + 21 setup | Co-op cards, Gates, leaders, 4 Final Bosses |
| 6 | `realmforge_oathguard_trials_card_database.json` | JSON, 51 records | 3 decks x 17 designs | Competitive card data |
| 7 | `Realmforge_Oathguard_Trials_Competitive_Card_Set.md` | MD, 95 lines | 51 duel-text rows | Human-readable competitive decklists |
| 8 | `Realmforge_Volume_1_Foundation.md` | MD, 859 lines | Foundation, difficulty, terminology | Co-op design foundation |
| 9 | `Realmforge_Volume_2_Cards_and_Decks.md` | MD, 477 lines | 102 card rows + 4 boss spec tables | Co-op decks and boss behavior |
| 10 | `Realmforge_Volume_3_Structured_Data.md` | MD, 139 lines | Schema, validation report, ID audit | Database schema contract and QA baseline |
| 11 | `Realmforge_Two_Edition_README.md` | MD, 30 lines | Edition boundaries, file guide | Edition scope |

**Inventory now complete** against the README's file guide. **Still not uploaded:** any visual reference image. Visual identity is currently derivable only from the `frame_notes` and `art_brief` text fields.

Volume 3 also names Volumes 4–7 as future work (CSV/data QA, and the Volume 6 production art pack). Nothing in the build depends on them.

---

## 2. Mode summaries (as written in the uploaded rulebooks)

**Cooperative — Rise of the Oathguard.** 1–3 players, ages 10+, 20–40 min. One shared Battle Line; up to 5 Oathguard units, 3 Items, 2 Mods per unit, mirrored for the Hollow Crown (Relics instead of Items). Both Crystal Spinners start at 12. Standard Gates: Oathguard 16 Ward, Hollow Crown 18 Ward. Starting hand 5, hand limit 8, Max Energy cap 10, both Energy values start at 0.

Oathguard turn is **seven steps**: Ready → Gain Energy (+1 Max, cap 10) → Refill (Current = Max, unspent lost) → Draw 1 → Main (any number of affordable cards) → Attack (any number of ready units) → End (discard to 8). Hollow Crown turn is six steps: Reveal → Deploy left-to-right → Attack → Resolve → Ready → Advance.

Win in three ordered stages: break the Hollow Crown Gate → turn its Spinner 12→0 → reveal and defeat the Final Boss. Lose when the Oathguard Spinner reaches 0. Simultaneous = Sacrificial Victory.

**Competitive — Oathguard Trials.** 2 players, alternating complete turns, same seven steps. Both Gates 18 Ward, both Spinners 12. First player skips the turn-1 Draw; second player gets one Reserve token (+1 Current Energy once during their first three turns). Win by breaking the opposing Gate then reducing its Spinner to 0, or by opponent deck-out. Adds a **Response system** (alternating priority, resolve newest-to-oldest, prototype cap of 3 unresolved) and **seven balance safeguards** (Gate Restore ≤3/turn, non-attack crystal damage ≤4/turn, a unit attacks ≤2x/turn, Current ≤ Max+3, ≤4 extra draws/turn, ≤2 ready Aegis units). Aegis is redefined: a **ready** Aegis unit forces attacks that could target a unit to target a ready Aegis unit, and does not protect the Gate.

---

## 3. Source-of-truth hierarchy (applied)

1. The two rulebook PDFs — all procedural rules, per edition.
2. `realmforge_oathguard_trials_card_database.json` — competitive card wording.
3. `realmforge_master_database.json` — cooperative content, encounters, bosses.
4. `Realmforge_Two_Edition_README.md` — edition boundaries.
5. Visual references — **absent**; `frame_notes` used as interim substitute.

Volumes 1–3 are not in your stated hierarchy but contain rules and contracts the rulebooks omit: boss Enrage thresholds and effects, boss attack order, boss target priority, Health scaling (Vol 1–2), and the database schema and validation baseline (Vol 3). Volume 3 explicitly declares itself the *canonical* structured-data pass for `realmforge_master_database.json`.

Recommended: insert Volumes 1–3 at **priority 3.5 — supplement, binding only where the rulebooks are silent**. Awaiting approval.

---

## 4. Conflict table

| # | Subject | Source A | Source B | Severity |
|---|---|---|---|---|
| C1 | **QuickPlay does not exist** | Your brief: QuickPlay, 20-card decks, 6 crystals, 10 Ward, 4-step turn, 2-card limit, ages 8+ | All 11 files: 30-card decks, 12 crystals, 16/18 Ward, 7-step turn, no card limit, ages 10+. The literal string "QuickPlay" appears **0 times** across every uploaded file | **BLOCKING** |
| C2 | **Energy model** | Your brief: one permanent-crystal pool, cap 6, turn crystals face-down to pay | Both rulebooks §8: separate Max and Current Energy, cap 10, refill each turn, unspent lost | **BLOCKING** |
| C3 | **Board spaces** | Your brief: 4 unit spaces + 1 Support space per side | Co-op §4 and competitive §4: up to 5 units, up to 3 Items/Relics, no Support space | **BLOCKING** |
| C4 | **Boss Health** | Your brief: 12 / 16 / 20 by player count | Vol 2 §9 + master DB: 18 / 20 / 22 / 26 base, +6 per extra player, −4 Tutorial | **BLOCKING** |
| C5 | **Enemy attack order** | Your brief: highest ATK only | Co-op §10: highest ATK → highest Threat → lowest remaining DEF → leftmost | Medium |
| C6 | **Encounter reveal** | Your brief: 1 solo / 2 for two or three players | Co-op §9: solo 1; **two players reveal 1**, and only from round 4 a second if the first has Threat ≤2; three players reveal 2 | Medium |
| C7 | **Core keyword list** | Your brief lists 6 core keywords, omitting Mod | Both rulebooks §13: 7 core keywords including Mod | Low |
| C8 | **Foresight vs Scan** | Competitive rulebook §14: "Foresight replaces Scan" | Competitive JSON `keywords` array still reads `"Scan"` on RF-TRIAL-TRU-009 and RF-TRIAL-TRU-014, while their `rules_text` correctly says Foresight | Low (metadata only) |
| C9 | **Enrage undefined in rulebook** | Boss cards reference "Enrage at N Health" | Neither rulebook defines Enrage; only Vol 2 §9 does | Medium |
| C10 | **Boss Health stored in `def`** | Master DB uses `def` for Boss Health | Vol 3 §3 and §10 acknowledge this explicitly and recommend a dedicated field before production | Low — **now source-backed, no longer an assumption** |
| C11 | **Aegis differs by edition** | Co-op: enemy-priority targeting | Competitive §9: "replaces the cooperative meaning" | Not a conflict — intentional; needs two engine variants |

**Clean cross-checks, run programmatically:**

- All 102 cooperative rows in Volume 2 match `realmforge_master_database.json` exactly on name, cost, ATK/DEF, rules text, and copies — 0 differences.
- All 51 competitive rows in the Card Set MD match the competitive JSON exactly on all fields — 0 differences.
- My independent re-run of Volume 3's audits reproduces its published results: 123 records, 102 draw-pile, 21 setup, 0 duplicate IDs, every deck 30 physical / 17 distinct. **Volume 3's validation report is accurate.**

---

## 5. Deck derivations

**Verified from the databases (30-card editions):**

| Deck | Distinct designs | Physical cards | Copy pattern |
|---|---:|---:|---|
| Truthwardens Starter | 17 | 30 | 13 titles x2 + 4 Unique x1 |
| Honorbound Starter | 17 | 30 | same |
| Dawnwatch Starter | 17 | 30 | same |
| Veilborn Encounter | 17 | 30 | same |
| Whisper Court Encounter | 17 | 30 | same |
| The Breakers Encounter | 17 | 30 | same |
| Truthwardens Trials | 17 | 30 | same |
| Honorbound Trials | 17 | 30 | same |
| Dawnwatch Trials | 17 | 30 | same |

Every deck also satisfies the locked curve 8/10/6/4/1/1 across cost bands 1–2, 3–4, 5–6, 7–8, 9, 10. **Status: Passed.**

**20-card QuickPlay derivations: BLOCKED.** A 20-card deck of 10 titles x2 cannot be derived from a 17-design/30-card list without deciding which 7 designs to cut and promoting the 4 Unique singletons to 2 copies — the latter also violating Volume 2's rule that Unique cards are exactly 1 copy. No uploaded file specifies that selection. Producing one would be inventing deck contents. **Status: Blocked.**

---

## 6. Card-effect compatibility matrix

**Status: Blocked for QuickPlay; structurally Passed for the 30-card set.** The requested matrix covers "every card used by the six QuickPlay decks" — those decks do not exist (C1, item 5). The identical matrix for the nine 30-card decks (153 distinct designs) can be produced immediately on approval.

Full classification pass over both databases:

| Effect family | Distinct designs | Difficulty | Ambiguity |
|---|---:|---|---|
| Vanilla stats, no text | ~15 | Trivial | None |
| `Deploy:` on-enter triggers | 24 co-op / 10 competitive | Low — one `onEnter` hook | None |
| Conditional attack-time ATK buffs | ~18 | Low | None |
| Keyworded combat flags (Aegis, Shield Matrix, Surge, Unshaken) | 31 | Low | Aegis needs two mode-specific implementations (C11) |
| `Restore X` on units and Gates | 5 tagged, more in text | Low | Competitive caps Gate Restore at 3/turn |
| `Echo:` on-death triggers | 5 | Medium — fires after discard | Ordering on simultaneous deaths |
| Deck manipulation (Scan / Foresight, top/bottom) | ~12 | Medium — needs reveal/reorder prompt | Co-op targets the **encounter** deck; competitive targets **your own** deck |
| Player-choice damage division | 3 | Medium | Needs an allocation UI |
| Ongoing-effect removal | ~4 | **High** | "Ongoing effect" is never defined in either rulebook — genuine ambiguity |
| Energy manipulation (Overclock, Siphon) | ~6 | Medium | Siphon has different cross-turn wording per edition |
| Phase Shift | ~3 | Medium | "exactly as stated" — per-card, no generic rule |
| Response-timed abilities | 1 tagged + boss interactions | **High** | Competitive only; needs the priority-window state machine |

Encoding: a typed effect registry keyed by the stable printed ID. Never runtime text parsing.

---

## 7. Final Boss implementation table

The sources call these **Final Bosses**, not Quick Bosses. Verified from Vol 2 §9 and the master database (Boss Health in `def`, per Vol 3 §3).

| Boss | ID | ATK | Health | Reveal | Main ability | Attack order | Target priority | Boss-turn behavior | Enrage | Enrage effect |
|---|---|---:|---:|---|---|---|---|---|---:|---|
| Veyr, the Hidden Lie | RF-HC-BOSS-001 | 7 | 18 | Damaged Oathguard units lose Aegis until end of round | First attack each round ignores Aegis | After HC units | Damaged unit, lowest remaining DEF → normal | After attacking, move leftmost HC unit to rightmost | ≤9 | If first revealed encounter has Threat ≤3, reveal one more |
| Malreth, Voice of Doubt | RF-HC-BOSS-002 | 6 | 20 | Remove temporary Oathguard ATK bonuses; each player −1 Current Energy next turn | At HC Resolve, highest-ATK Oathguard unit gets −2 ATK until next round | After HC units | Highest-ATK unit → normal | If no Oathguard unit has an ATK penalty, deal 2 Ward to the Oathguard Gate | ≤10 | First card each player plays each round costs +1 |
| Vorak, Crown Breaker | RF-HC-BOSS-003 | 8 | 22 | Fracture 4; if the Oathguard Gate is already broken, destroy 2 crystals instead | Attacks the Oathguard Gate if unbroken | Before HC units while Enraged, else after | Gate → Aegis unit → normal | On damaging a Gate, deal 1 damage to each Oathguard unit | ≤11 | +2 ATK and attacks before HC units |
| The Hollow Crown Awakened | RF-HC-BOSS-004 | 9 | 26 | Global Threat +1, then reveal one encounter card | First Dark Event or Relic each round gives the boss +1 ATK that round | After HC units | Highest-DEF Aegis unit → Gate → normal | At HC Resolve, if no Relic is in play, return the highest-Threat Relic from discard | ≤13 | Reveal one additional encounter card each HC turn |

Scaling: +6 Health for two players, +12 for three; Tutorial −4; Veteran Enrage threshold +2 (triggers earlier). The reveal pauses the current resolution, resolves, then resumes.

---

## 8. Typed data model (proposed)

```text
CardDefinition   id, name, edition, side, faction, deck, rarity, type,
                 cost, atk|null, def|null, keywords[], rulesText,
                 copiesInDeck, bossHealth|null, effects: EffectSpec[]
CardInstance     instanceId, defId, controllerId, ownerId, zone, slotIndex,
                 ready, damage, mods[], tempAtk, tempFlags, enteredOnTurn
PlayerState      id, kind: human|ai, order, leaderId, gateWard, gateMax,
                 crystals, maxEnergy, currentEnergy, hand[], deck[], discard[],
                 attacksThisTurn, reserveTokenAvailable, drawsThisTurn
BoardState       units: (CardInstance|null)[], items[], relics[],
                 encounterDeck[], encounterDiscard[], boss: BossState|null,
                 globalThreat, round
MatchState       matchId, mode: coop|trials, difficulty, seed, rngCursor,
                 players[], board, activePlayerId, phase, step,
                 pendingPrompt|null, effectQueue: QueuedEffect[],
                 history: GameAction[], result: MatchResult|null, version
GameAction       PlayCard | Attack | UseAbility | ResolvePrompt |
                 EndStep | EndTurn | Concede | SpendReserve
QueuedEffect     id, sourceInstanceId, kind, payload,
                 timing: replacement|triggered|delayed, order,
                 requiresTargets: TargetRule[]
TargetRule       scope, side, zone, filters (type/keyword/damaged/cost/DEF),
                 count, optional, tieBreak
MatchResult      outcome: win|loss|draw|sacrificialVictory, reason,
                 rounds, seed, finishedAt
BossState        defId, health, damage, revealed, enraged
```

Per Volume 3 §11's own open question, `bossHealth` becomes a dedicated field at import time; the `def` overload stays confined to the raw source JSON.

## 9. Rules-engine architecture

```text
src/game/            pure TypeScript, zero React imports
  types.ts           the model above
  cards/manifest.ts  stable printed ID -> typed EffectSpec[]
  cards/import.ts    raw JSON -> CardDefinition, with Vol 3 schema validation
  rng.ts             seeded PRNG, cursor stored in MatchState
  reducer.ts         (MatchState, GameAction) -> MatchState  (pure, immutable)
  legality.ts        listLegalActions(state) + machine-readable illegality reasons
  targeting.ts       TargetRule evaluation
  queue.ts           deterministic effect queue with timing tiers
  modes/coop.ts      HC automation, encounter reveal, bosses, Global Threat
  modes/trials.ts    Response windows, balance safeguards, Reserve token
  ai/                difficulty policies, read-only over public state
src/ui/              React; dispatches GameActions, renders snapshots
src/anim/            animation driven by diffing consecutive snapshots
```

No rule lives in a component. No LLM chooses actions. No runtime text parsing.

## 10. Route and screen map

`/` title · `/menu` · `/tutorial` · `/play` mode selection · `/play/decks` deck selection · `/match/$matchId` battlefield (pause and results are overlays, not routes) · `/collection` · `/collection/$deckId` deck viewer · `/card/$cardId` inspector · `/profile` · `/settings` · `/settings/accessibility` · `/audit` content audit, showing per-card source-vs-implementation status.

`/` replaces the template placeholder, and every route gets its own `head()`.

## 11. Component map

`BattlefieldLayout` (landscape-optimised, portrait-safe) → `SideRail` x2 → `GateMeter`, `CrystalSpinner`, `EnergyTray`, `LeaderBadge` · `UnitSlotRow` → `UnitSlot` → `CardTile` · `ItemArea` / `RelicArea` (the sources use Item and Relic areas, not a single Support slot) · `EncounterZone` · `BossPanel` · `HandFan` → `HandCard` · `ActionHistoryDrawer` · `TargetingLayer` (highlights legal targets, dims illegal ones with a reason) · `PromptOverlay` (reveal-and-reorder, damage allocation, discard-to-limit, Response window) · `PauseSheet`, `ResultsSheet`, `CardInspector`.

## 12. Hollow Crown automation

Printed priorities only, no heuristics. Reveal count per the §9 scaling table including the round-4 two-player clause → Deploy left to right → attack order: highest ATK, then highest Threat, then lowest remaining DEF, then leftmost → target: lowest-DEF eligible Aegis unit, then lowest-DEF other unit, then Gate, then crystals once the Gate is broken → ties by lowest printed DEF, then lowest ATK, then a team prompt. Deck exhaustion reshuffles and raises Global Threat by 1, permanently granting +1 ATK per level to every enemy unit. Boss overrides replace the defaults per section 7.

## 13. Competitive AI

Identical public information and identical legality checks to a human: the AI calls `listLegalActions` and selects. **Initiate** — greedy: highest-cost affordable card, attack the Gate, no lookahead. **Guardian** — one-turn evaluation over a weighted board score (tempo, Aegis coverage, Gate pressure, crystal proximity), respecting Aegis and all safeguards. **Champion** — two-ply search with a fixed node budget, plus mulligan policy and Response-window evaluation. Deterministic under a fixed seed.

## 14. Save, offline, PWA, cloud

IndexedDB stores match snapshots (full `MatchState` plus the action log, enabling replay and rules-safe undo); settings in `localStorage`; schema-versioned with migrations. Manifest-only PWA first (installable, app icon). Only if you explicitly want offline play do we add `vite-plugin-pwa` with `generateSW` and a guarded registration wrapper. Cloud sync is deferred until local save is proven, then added opt-in.

## 15. Testing plan

Vitest across: reducer purity and determinism (same seed + same action log = identical state hash); a data-integrity suite that re-runs Volume 3's published checks plus my cross-format checks against the shipped JSON on every build; per-card effect tests generated from the compatibility matrix; target-legality tables; AI determinism and legal-actions-only enforcement; save/restore round-trips including mid-prompt states; axe accessibility scans per route; Playwright screenshots at portrait and landscape breakpoints; PWA install and offline checks against a production build only.

## 16. Vertical slice scope

Solo cooperative, Tutorial difficulty, Truthwardens vs. Veilborn, Veyr as the boss. Full seven-step Oathguard turn, full six-step Hollow Crown turn, both Gates, both Spinners, encounter reveal, complete automation priorities, all three victory stages, the defeat condition, tap-to-inspect and tap-to-target, action history, IndexedDB save and resume. Excluded: competitive mode, Responses, other decks, collection, profile, cloud.

## 17. Roadmap (Prompts 2–9)

2 — data ingestion, typed model, card manifest skeleton, integrity tests. 3 — reducer, legality, targeting, effect queue, seeded RNG. 4 — cooperative automation and bosses. 5 — battlefield UI and the vertical slice end to end. 6 — remaining cooperative decks and full effect coverage. 7 — competitive mode, Responses, safeguards. 8 — AI difficulties. 9 — save, offline, PWA, accessibility, polish.

---

## Recommended assumptions (awaiting approval, non-blocking)

- Insert Volumes 1–3 at priority 3.5, binding only where the rulebooks are silent — otherwise Enrage, boss attack order, boss Health scaling, and the schema contract have no source at all.
- Treat C8 (`"Scan"` in the competitive JSON keyword arrays) as a metadata typo; the printed `rules_text` and rulebook §14 both say Foresight, and printed text governs.
- Promote Boss Health to a dedicated field at import, per Volume 3's own recommendation.
- Ship `/audit` as a real screen so every card's implementation status stays inspectable rather than asserted.
- Derive the visual system from `frame_notes` (Oathguard: royal-blue base, gold trim, silver inner lines, cyan crystal accents; Hollow Crown: purple crest, dark steel, crystal-break borders) until reference images arrive.

## Blocking decision — one question

Conflicts **C1–C4** remain unresolved and Volume 3 does not touch them. Your brief specifies a QuickPlay format — 20-card decks, 6 crystals, 10 Ward Gates, a four-step turn, a permanent face-up/face-down crystal Energy system, a two-card-per-turn limit, 4+1 board spaces, and 12/16/20 boss Health. **None of that appears in any of the eleven uploaded files.** They describe only the full 30-card edition.

- **A — Upload the QuickPlay rulebooks.** If they exist, they are authority 1 and every blocked section completes with zero invention.
- **B — Build the 30-card edition exactly as written.** Fully unblocked today; QuickPlay becomes a later derived mode.
- **C — Authorise me to draft QuickPlay.** I would deliver a written QuickPlay specification — deck cuts, Energy conversion, board reduction, boss rescaling — for your approval *before* any code, since it means creating rules the sources do not contain.

I recommend **A** if those files exist, otherwise **B**.

---

**BLOCKED** — Volume 3 closed the inventory gap and independently confirmed the database findings, but the QuickPlay rulebooks are still absent and all eleven uploaded sources describe the 30-card edition, so audit items 5, 6, and 16 cannot be completed as specified without inventing rules and deck contents. Sections 1–4 and 7–15 are complete and verified. Choose A, B, or C and I will proceed.
