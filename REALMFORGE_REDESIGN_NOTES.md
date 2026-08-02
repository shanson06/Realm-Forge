# Realmforge Visual Foundation — Pass 1

## Design direction

This pass establishes Realmforge's original **Relic-Tech Hopeful Fantasy** visual language without changing card data, game rules, AI behavior, persistence, progression, or route structure.

## Implemented

- Replaced stock faction icons with six original geometric SVG crests:
  - Truthwardens — Prism Eye
  - Honorbound — Vowshield
  - Dawnwatch — Winged Dawn
  - Veilborn — Split Mask
  - Whisper Court — Mute Crown
  - The Breakers — Fracture Maul
- Rebuilt the shared card presentation with:
  - Original chamfered outer frame
  - Energy/Threat resource badge
  - Geometric faction-crest collar
  - Trapezoidal relic-tech artwork window
  - Diamond ATK badge and shield DEF badge
  - Hologlass rules panel with faction watermark
  - Keyword capsules and edition gem
  - Oathguard and Hollow Crown material variants
- Added the shared world atmosphere:
  - Subtle hologlass grid
  - Forge sigil geometry
  - Oathguard and Hollow Crown ambient light fields
  - Mobile-safe background treatment
- Preserved reduced-motion behavior and non-color faction differentiation.

## Changed files

- `src/components/game/FactionCrest.tsx`
- `src/components/game/RealmCard.tsx`
- `src/components/game/RealmShell.tsx`
- `src/styles/realmforge-visual.css` (new)
- `src/styles.css`

## Verification

- Production build: passed
- Automated tests: 136 passed
- Targeted lint for changed TypeScript/TSX files: passed

The repository-wide lint command still reports pre-existing Prettier errors in untouched files. Those baseline formatting issues are unrelated to this redesign.
