import { createNoise2D } from 'simplex-noise';

/**
 * Mulberry32 — a fast 32-bit seeded PRNG.
 * Returns a function that produces values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a seeded 2D Simplex noise function.
 * Deterministic: same seed always produces same noise values.
 */
export function createSeededNoise(seed: number) {
  const rng = mulberry32(seed);
  return createNoise2D(rng);
}
