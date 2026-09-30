import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Run, replayRun, RUN_BASE_CONFIG } from '../src/run';
import { applyPerks, PERKS, type PerkId } from '../src/perks';
import { STAGES, type StageDef } from '../src/stages';
import { createBoard, idx, resolveBoard, findClears, scoreStep } from '../src/board';
import { BOARD_W, BOARD_H, DEFAULT_RULES, GRAY } from '../src/types';
import type { Action, Cell } from '../src/types';

const ACTIONS: Action['t'][] = ['left', 'right', 'rotate', 'soft', 'hard', 'hold'];
const bottom = BOARD_H - 1;
const quick = (goal: StageDef['goal'], extra: Partial<StageDef> = {}): StageDef =>
  ({ goal, startGarbageRows: 0, garbageEveryTicks: 0, sealedColors: [], randomSealCount: 0, colorCount: 4, boss: false, ...extra });

/** Drive a run: at each tick apply scripted actions; whenever a pick is pending choose `pickIdx % offer`. */
function drive(run: Run, script: { tick: number; a: Action['t'] }[], ticks: number, pickIdx = 0): void {
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    if (run.phase === 'pick') run.pick(pickIdx % run.offer.length);
    if (run.phase === 'won' || run.phase === 'lost') return;
    while (i < script.length && script[i]!.tick <= t) { run.input({ t: script[i]!.a }); i++; }
    run.step();
  }
}

const SHORT: StageDef[] = [
  quick({ t: 'survive', ticks: 120 }),
  quick({ t: 'survive', ticks: 120 }, { startGarbageRows: 1 }),
  quick({ t: 'survive', ticks: 120 }, { garbageEveryTicks: 40 }),
];

describe('run structure', () => {
  it('default curve is 8 stages + boss', () => {
    expect(STAGES).toHaveLength(9);
    expect(STAGES.filter((s) => s.boss)).toHaveLength(1);
    expect(STAGES[STAGES.length - 1]!.boss).toBe(true);
  });
  it('survive goal → pick phase with 3 distinct unowned perks', () => {
    const r = new Run(1, { stages: SHORT });
    expect(r.game.cfg.holdEnabled).toBe(false);
    for (let i = 0; i < 120; i++) r.step();
    expect(r.phase).toBe('pick');
    expect(r.offer).toHaveLength(3);
    expect(new Set(r.offer).size).toBe(3);
    r.pick(1);
    expect(r.phase).toBe('stage');
    expect(r.stageIndex).toBe(1);
    expect(r.perks).toHaveLength(1);
    expect(r.game.tick).toBe(0);
  });
  it('picked perk is applied to the next stage config', () => {
    const r = new Run(3, { stages: SHORT });
    for (let i = 0; i < 120; i++) r.step();
    const i = r.offer.indexOf('hold');
    const idxPick = i >= 0 ? i : 0;
    const picked = r.offer[idxPick]!;
    r.pick(idxPick);
    const expected = applyPerks({ ...RUN_BASE_CONFIG }, [picked]);
    expect(r.game.cfg.holdEnabled).toBe(expected.holdEnabled);
    expect(r.game.cfg.previewCount).toBe(expected.previewCount);
    expect(r.game.cfg.rules).toEqual(expected.rules);
  });
  it('startGarbageRows pre-fills gray rows with one hole each', () => {
    const r = new Run(5, { stages: [quick({ t: 'gray', target: 1 }, { startGarbageRows: 2 })] });
    for (const y of [bottom, bottom - 1]) {
      const row = Array.from({ length: BOARD_W }, (_, x) => r.game.board[idx(x, y)]);
      expect(row.filter((c) => c === GRAY)).toHaveLength(BOARD_W - 1);
    }
  });
  it('boss garbage rises every N ticks', () => {
    const r = new Run(9, { stages: [quick({ t: 'survive', ticks: 1000 }, { garbageEveryTicks: 30, boss: true })] });
    for (let i = 0; i < 30; i++) r.step();
    const row = Array.from({ length: BOARD_W }, (_, x) => r.game.board[idx(x, bottom)]);
    expect(row.filter((c) => c === GRAY)).toHaveLength(BOARD_W - 1);
  });
  it('randomSealCount seals distinct in-range colors chosen by the run Rng', () => {
    const def = quick({ t: 'survive', ticks: 10 }, { randomSealCount: 2, colorCount: 5, sealedColors: [1] });
    const seen = new Set<number>();
    for (let seed = 0; seed < 20; seed++) {
      const r = new Run(seed, { stages: [def] });
      const s = r.game.cfg.rules.sealedColors;
      expect(s).toHaveLength(3);
      expect(new Set(s).size).toBe(3);
      for (const c of s) { expect(c).toBeGreaterThanOrEqual(1); expect(c).toBeLessThanOrEqual(5); }
      seen.add(s[1]!);
    }
    expect(seen.size).toBeGreaterThan(1); // actually varies by seed
    expect(new Run(7, { stages: [def] }).game.cfg.rules.sealedColors).toEqual(new Run(7, { stages: [def] }).game.cfg.rules.sealedColors);
  });
  it('last stage cleared → won; bankedScore accumulates', () => {
    const r = new Run(2, { stages: [quick({ t: 'survive', ticks: 10 })] });
    for (let i = 0; i < 10; i++) r.step();
    expect(r.phase).toBe('won');
    expect(r.bankedScore).toBe(r.game.score);
    expect(r.score).toBe(r.game.score); // banked once, not double counted
  });
  it('run score during a pick equals the banked total', () => {
    const r = new Run(1, { stages: SHORT });
    for (let i = 0; i < 120; i++) r.step();
    expect(r.phase).toBe('pick');
    expect(r.score).toBe(r.bankedScore);
  });
  it('game over inside a stage → lost', () => {
    const r = new Run(2, { stages: [quick({ t: 'score', target: 1_000_000 })] });
    for (let i = 0; i < 5000 && r.phase === 'stage'; i++) { r.input({ t: 'hard' }); r.step(); }
    expect(r.phase).toBe('lost');
  });
});

describe('skip and stats', () => {
  it('skip leaves the pick phase without adding a perk and replays', () => {
    const live = new Run(4, { stages: SHORT });
    while (live.phase === 'stage') { if (live.game.tick % 20 === 0) live.input({ t: 'hard' }); live.step(); }
    expect(live.phase).toBe('pick');
    live.skip();
    expect(live.phase).toBe('stage');
    expect(live.stageIndex).toBe(1);
    expect(live.perks).toEqual([]);
    for (let i = 0; i < 30; i++) live.step();
    const r = replayRun(4, live.log, { stages: SHORT }, live.game.tick);
    expect(r.stageIndex).toBe(1);
    expect(r.game.board).toEqual(live.game.board);
  });
  it('stats accumulate across stages and freeze during pick', () => {
    const r = new Run(4, { stages: SHORT });
    while (r.phase === 'stage') r.step();
    const atPick = r.stats();
    expect(atPick.ticks).toBe(120);
    r.pick(0);
    expect(r.stats().ticks).toBe(120);
    for (let i = 0; i < 10; i++) r.step();
    expect(r.stats().ticks).toBe(130);
  });
});

describe('run determinism', () => {
  it('same seed + same inputs + same picks → identical run', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 0xffffffff }),
      fc.array(fc.record({ tick: fc.integer({ min: 0, max: 400 }), a: fc.constantFrom(...ACTIONS) }), { maxLength: 80 }),
      fc.integer({ min: 0, max: 2 }),
      (seed, raw, pickIdx) => {
        const script = [...raw].sort((p, q) => p.tick - q.tick);
        const a = new Run(seed, { stages: SHORT }), b = new Run(seed, { stages: SHORT });
        drive(a, script, 400, pickIdx); drive(b, script, 400, pickIdx);
        expect(b.phase).toBe(a.phase);
        expect(b.stageIndex).toBe(a.stageIndex);
        expect(b.perks).toEqual(a.perks);
        expect(b.game.board).toEqual(a.game.board);
        expect(b.score).toBe(a.score);
      }
    ), { numRuns: 40 });
  });
  it('replayRun(seed, log) reproduces a live run across stage boundaries', () => {
    const seed = 0xc0ffee;
    const live = new Run(seed, { stages: SHORT });
    let k = 0;
    while (live.phase === 'stage' || live.phase === 'pick') {
      if (live.phase === 'pick') { live.pick(k % live.offer.length); continue; }
      if (live.game.tick % 5 === 0) live.input({ t: ACTIONS[(k++) % ACTIONS.length]! });
      live.step();
    }
    expect(live.stageIndex).toBeGreaterThan(0);
    const r = replayRun(seed, live.log, { stages: SHORT }, live.game.tick);
    expect(r.phase).toBe(live.phase);
    expect(r.stageIndex).toBe(live.stageIndex);
    expect(r.perks).toEqual(live.perks);
    expect(r.game.board).toEqual(live.game.board);
    expect(r.score).toBe(live.score);
  });
});

describe('perk rules', () => {
  const fill = (cells: [number, number, Cell][]) => { const b = createBoard(); for (const [x, y, c] of cells) b[idx(x, y)] = c; return b; };
  const cfgWith = (ids: PerkId[]) => applyPerks({ ...RUN_BASE_CONFIG }, ids);

  it('every perk id is unique and applies without throwing', () => {
    expect(new Set(PERKS.map((p) => p.id)).size).toBe(PERKS.length);
    for (const p of PERKS) expect(() => p.apply({ ...RUN_BASE_CONFIG })).not.toThrow();
  });
  it('blue_min3: a 3-group of blue clears, other colors still need 4', () => {
    const rules = cfgWith(['blue_min3']).rules;
    expect(findClears(fill([[0, bottom, 3], [1, bottom, 3], [2, bottom, 3]]), rules)!.colorCells).toHaveLength(3);
    expect(findClears(fill([[0, bottom, 1], [1, bottom, 1], [2, bottom, 1]]), rules)).toBeNull();
  });
  it('red_x2: red color-clear cells score double; a full row does not', () => {
    const rules = cfgWith(['red_x2']).rules;
    const red4 = () => fill([[0, bottom, 1], [1, bottom, 1], [2, bottom, 1], [3, bottom, 1]]);
    expect(resolveBoard(red4(), rules)[0]!.points).toBe(2 * resolveBoard(red4(), DEFAULT_RULES)[0]!.points);
    const row = () => { const b = createBoard(); for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = ((x % 3) + 1) as Cell; return b; };
    expect(resolveBoard(row(), rules)[0]!.points).toBe(resolveBoard(row(), DEFAULT_RULES)[0]!.points);
  });
  it('chain_bonus: multiplier +1 from chain 3 on', () => {
    const rules = cfgWith(['chain_bonus']).rules;
    // 4 cells: chain 1 → 40, chain 2 → 80, chain 3 → 4×10×(4+1) = 200
    expect(scoreStep(4, 1, false, rules.chainBonusFrom)).toBe(40);
    expect(scoreStep(4, 2, false, rules.chainBonusFrom)).toBe(80);
    expect(scoreStep(4, 3, false, rules.chainBonusFrom)).toBe(200);
  });
  it('line_gray: a full row removes one extra gray elsewhere', () => {
    const rules = cfgWith(['line_gray']).rules;
    const b = createBoard();
    for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = ((x % 2) + 1) as Cell;
    b[idx(0, bottom - 1)] = GRAY; b[idx(5, bottom - 1)] = GRAY;
    const f = findClears(b, rules)!;
    expect(f.lineCells).toHaveLength(BOARD_W);
    expect(f.grayCells).toEqual([[0, bottom - 1]]);
    expect(resolveBoard(b, rules)[0]!.grayCleared).toBe(1);
  });
  it('sealed color never color-clears but still counts for a row', () => {
    const rules = { ...DEFAULT_RULES, sealedColors: [4 as Cell] };
    expect(findClears(fill([[0, bottom, 4], [1, bottom, 4], [2, bottom, 4], [3, bottom, 4]]), rules)).toBeNull();
    const b = createBoard(); for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = 4;
    expect(findClears(b, rules)!.lineCells).toHaveLength(BOARD_W);
  });
  it('slow_fall keeps gravity an integer and slower', () => {
    const c = cfgWith(['slow_fall']);
    expect(Number.isInteger(c.gravityTicks)).toBe(true);
    expect(c.gravityTicks).toBeGreaterThan(RUN_BASE_CONFIG.gravityTicks);
  });
});
