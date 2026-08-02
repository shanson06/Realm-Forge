/**
 * Deterministic RNG.
 *
 * The whole engine is reproducible from `rngSeed` + `rngCursor`, so a match can be
 * exported, re-imported and replayed exactly. Tests pass a fixed seed.
 */

/** xmur3 string hash -> 32-bit seed. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32, advanced `cursor` times. Pure: same (seed, cursor) -> same value. */
export function randomAt(seed: string, cursor: number): number {
  let a = (hashSeed(seed) + Math.imul(cursor + 1, 0x6d2b79f5)) >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface ShuffleResult<T> {
  readonly items: T[];
  readonly cursor: number;
}

/** Fisher-Yates driven by the seeded stream. Returns the advanced cursor. */
export function seededShuffle<T>(items: readonly T[], seed: string, cursor: number): ShuffleResult<T> {
  const out = [...items];
  let next = cursor;
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomAt(seed, next) * (i + 1));
    next += 1;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { items: out, cursor: next };
}

export function makeSeed(): string {
  // Not used in tests; production matches get a fresh seed per match.
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}