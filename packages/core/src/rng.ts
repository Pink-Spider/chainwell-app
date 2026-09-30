/** Deterministic 32-bit PRNG (mulberry32). Integer-only state; identical on every platform. */
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** Returns an unsigned 32-bit integer. */
  nextU32(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** Integer in [0, n). */
  nextInt(n: number): number {
    return this.nextU32() % n;
  }
  getState(): number {
    return this.state;
  }
}

/** Hash a string (e.g. a date "2026-09-30") to a seed. FNV-1a 32-bit. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
