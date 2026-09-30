import { describe, it, expect } from 'vitest';
import { createBoard, idx, findClears, applyGravity, resolveBoard, scoreStep } from '../src/board';
import { BOARD_W, BOARD_H, GRAY } from '../src/types';
import type { Cell } from '../src/types';

const fill = (b: ReturnType<typeof createBoard>, cells: [number, number, Cell][]) => { for (const [x, y, c] of cells) b[idx(x, y)] = c; return b; };
const bottom = BOARD_H - 1;

describe('findClears', () => {
  it('clears a full row', () => {
    const b = createBoard();
    for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = ((x % 3) + 1) as Cell;
    const f = findClears(b)!;
    expect(f.lineCells).toHaveLength(BOARD_W);
    expect(f.colorCells).toHaveLength(0);
  });
  it('clears a 4-group of same color, not a 3-group', () => {
    const b = fill(createBoard(), [[0, bottom, 1], [1, bottom, 1], [2, bottom, 1]]);
    expect(findClears(b)).toBeNull();
    b[idx(3, bottom)] = 1;
    expect(findClears(b)!.colorCells).toHaveLength(4);
  });
  it('removes gray adjacent to a color clear but not by itself', () => {
    const b = fill(createBoard(), [[0, bottom, 1], [1, bottom, 1], [2, bottom, 1], [3, bottom, 1], [4, bottom, GRAY], [6, bottom, GRAY]]);
    const f = findClears(b)!;
    expect(f.grayCells).toEqual([[4, bottom]]);
  });
  it('gray inside a full row is cleared by the row', () => {
    const b = createBoard();
    for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = x === 2 ? GRAY : (((x % 2) + 1) as Cell);
    const f = findClears(b)!;
    expect(f.lineCells).toHaveLength(BOARD_W);
    expect(f.grayCells).toHaveLength(0);
  });
});

describe('gravity + chain', () => {
  it('cell-level gravity drops individual cells', () => {
    const b = fill(createBoard(), [[0, bottom - 3, 2], [0, bottom - 1, 3]]);
    applyGravity(b);
    expect(b[idx(0, bottom)]).toBe(3);
    expect(b[idx(0, bottom - 1)]).toBe(2);
  });
  it('chain: a color clear removes support and the fallen cells form a new group', () => {
    const b = createBoard();
    // 4 blues at bottom cols 0-3. Two reds stacked on col 3. Three reds at bottom cols 4-6.
    // After blues clear, the col-3 reds drop and join the bottom reds → 5-red group (chain 2).
    b[idx(0, bottom)] = 3; b[idx(1, bottom)] = 3; b[idx(2, bottom)] = 3; b[idx(3, bottom)] = 3;
    b[idx(3, bottom - 1)] = 1; b[idx(3, bottom - 2)] = 1;
    b[idx(4, bottom)] = 1; b[idx(5, bottom)] = 1; b[idx(6, bottom)] = 1;
    const steps = resolveBoard(b);
    expect(steps.length).toBe(2);
    expect(steps[0]!.colorCells).toHaveLength(4);
    expect(steps[1]!.chain).toBe(2);
    expect(steps[1]!.colorCells).toHaveLength(5);
    expect(steps[1]!.points).toBe(scoreStep(5, 2, false));
  });
  it('cross bonus when line and color clear in the same step', () => {
    const b = createBoard();
    for (let x = 0; x < BOARD_W; x++) b[idx(x, bottom)] = ((x % 2) + 2) as Cell;
    b[idx(0, bottom - 1)] = 1; b[idx(0, bottom - 2)] = 1; b[idx(0, bottom - 3)] = 1; b[idx(0, bottom - 4)] = 1;
    const steps = resolveBoard(b);
    expect(steps[0]!.crossBonus).toBe(true);
    expect(steps[0]!.points).toBe(scoreStep(12, 1, true));
  });
});
