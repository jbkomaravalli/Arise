/** Deterministic seeded RNG so daily quest selection is reproducible. */

/** FNV-1a style string hash → uint32. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle (Fisher–Yates) driven by a seed string. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deterministic pick of `count` distinct items. */
export function seededSample<T>(items: readonly T[], seed: string, count: number): T[] {
  return seededShuffle(items, seed).slice(0, Math.max(0, count));
}
