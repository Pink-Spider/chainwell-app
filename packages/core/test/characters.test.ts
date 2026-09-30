import { describe, it, expect } from 'vitest';
import { CHARACTERS, isUnlocked, EMPTY_STATS } from '../src/characters';
import { PERK_BY_ID } from '../src/perks';
import { Run, replayRun } from '../src/run';
import { STAGES, type StageDef } from '../src/stages';

const short: StageDef = { ...STAGES[3]!, goal: { t: 'survive', ticks: 120 } };

describe('characters', () => {
  it('ids unique, start perks valid, exactly one free character', () => {
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(CHARACTERS.length);
    for (const c of CHARACTERS) for (const p of c.startPerks) expect(PERK_BY_ID[p]).toBeDefined();
    expect(CHARACTERS.filter((c) => isUnlocked(c, EMPTY_STATS))).toHaveLength(1);
  });
  it('unlock rules respond to stats', () => {
    const all = { runsPlayed: 99, runsWon: 9, bestStage: 8 };
    for (const c of CHARACTERS) expect(isUnlocked(c, all)).toBe(true);
  });
  it('startPerks are owned from stage 1 and never re-offered', () => {
    const r = new Run(11, { startPerks: ['hold'], stages: [short, short] });
    expect(r.perks).toEqual(['hold']);
    expect(r.game.cfg.holdEnabled).toBe(true);
    while (r.phase === 'stage') r.step(); // survive goal: just wait it out
    expect(r.phase).toBe('pick');
    expect(r.offer).not.toContain('hold');
  });
  it('replayRun with the same startPerks reproduces the run', () => {
    const opts = { startPerks: ['slow_fall' as const], stages: [short, short] };
    const live = new Run(5, opts);
    for (let i = 0; i < 300 && live.phase !== 'lost'; i++) {
      if (live.phase === 'pick') live.pick(0);
      if (i % 30 === 0) live.input({ t: 'hard' });
      live.step();
    }
    expect(live.stageIndex).toBe(1);
    const r = replayRun(5, live.log, opts, live.game.tick);
    expect(r.game.board).toEqual(live.game.board);
    expect(r.score).toBe(live.score);
  });
});
