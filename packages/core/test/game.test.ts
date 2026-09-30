import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Game, replay } from '../src/game';
import { hashSeed } from '../src/rng';
import type { Action } from '../src/types';

const ACTIONS: Action['t'][] = ['left', 'right', 'rotate', 'soft', 'hard', 'hold'];

function play(seed: number, script: { tick: number; a: Action['t'] }[], ticks: number): Game {
  const g = new Game(seed);
  let i = 0;
  for (let t = 0; t < ticks && g.phase === 'playing'; t++) {
    while (i < script.length && script[i]!.tick === g.tick) { g.input({ t: script[i]!.a }); i++; }
    g.step();
  }
  return g;
}

describe('determinism', () => {
  it('same seed + same inputs → identical board, score, tick', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 0xffffffff }),
      fc.array(fc.record({ tick: fc.integer({ min: 0, max: 2000 }), a: fc.constantFrom(...ACTIONS) }), { maxLength: 200 }),
      (seed, raw) => {
        const script = [...raw].sort((p, q) => p.tick - q.tick);
        const a = play(seed, script, 2000), b = play(seed, script, 2000);
        expect(b.board).toEqual(a.board);
        expect(b.score).toBe(a.score);
        expect(b.tick).toBe(a.tick);
        expect(b.phase).toBe(a.phase);
      }
    ), { numRuns: 60 });
  });
  it('replay(seed, log) reproduces a live game', () => {
    const seed = hashSeed('2026-09-30');
    const g = new Game(seed);
    let k = 0;
    while (g.phase === 'playing' && g.tick < 3000) {
      if (g.tick % 7 === 0) g.input({ t: ACTIONS[(k++) % ACTIONS.length]! });
      g.step();
    }
    const r = replay(seed, g.log, {}, g.tick);
    expect(r.board).toEqual(g.board);
    expect(r.score).toBe(g.score);
    expect(r.phase).toBe(g.phase);
  });
  it('eventually ends with hard drops only', () => {
    const g = new Game(42);
    for (let i = 0; i < 5000 && g.phase === 'playing'; i++) { g.input({ t: 'hard' }); g.step(); }
    expect(g.phase).toBe('over');
  });
  it('ghost is at or below the piece and fits', () => {
    const g = new Game(7);
    const gh = g.ghost();
    expect(gh.y).toBeGreaterThanOrEqual(g.piece.y);
    expect(g.fits(gh)).toBe(true);
  });
});
