import type { Cell, ClearStep } from './types';
import { BOARD_W, BOARD_H, EMPTY, GRAY } from './types';

export type Board = Cell[]; // row-major, length BOARD_W * BOARD_H, row 0 = top

export function createBoard(): Board {
  return new Array<Cell>(BOARD_W * BOARD_H).fill(EMPTY);
}
export const idx = (x: number, y: number) => y * BOARD_W + x;
export const inBounds = (x: number, y: number) => x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H;
export const get = (b: Board, x: number, y: number): Cell => (inBounds(x, y) ? b[idx(x, y)]! : GRAY);

/** Find full rows and 4+ same-color orthogonal groups. Returns one ClearStep (without chain/points) or null if nothing clears. */
export function findClears(b: Board, minGroup = 4): Omit<ClearStep, 'chain' | 'points' | 'crossBonus'> | null {
  const lineCells: [number, number][] = [];
  const colorCells: [number, number][] = [];
  const mark = new Uint8Array(BOARD_W * BOARD_H); // 1 = line, 2 = color

  for (let y = 0; y < BOARD_H; y++) {
    let full = true;
    for (let x = 0; x < BOARD_W; x++) if (b[idx(x, y)] === EMPTY) { full = false; break; }
    if (full) for (let x = 0; x < BOARD_W; x++) { mark[idx(x, y)] = 1; lineCells.push([x, y]); }
  }

  const seen = new Uint8Array(BOARD_W * BOARD_H);
  const stack: number[] = [];
  for (let y = 0; y < BOARD_H; y++) for (let x = 0; x < BOARD_W; x++) {
    const i = idx(x, y);
    const c = b[i]!;
    if (c === EMPTY || c === GRAY || seen[i]) continue;
    const group: number[] = [];
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      group.push(j);
      const jx = j % BOARD_W, jy = (j - jx) / BOARD_W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = jx + dx, ny = jy + dy;
        if (!inBounds(nx, ny)) continue;
        const k = idx(nx, ny);
        if (!seen[k] && b[k] === c) { seen[k] = 1; stack.push(k); }
      }
    }
    if (group.length >= minGroup) for (const j of group) { if (mark[j] !== 1) mark[j] = 2; colorCells.push([j % BOARD_W, (j - (j % BOARD_W)) / BOARD_W]); }
  }

  if (!lineCells.length && !colorCells.length) return null;

  // gray adjacent to a color clear is removed
  const grayCells: [number, number][] = [];
  const graySeen = new Uint8Array(BOARD_W * BOARD_H);
  for (const [x, y] of colorCells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    const k = idx(nx, ny);
    if (b[k] === GRAY && !mark[k] && !graySeen[k]) { graySeen[k] = 1; grayCells.push([nx, ny]); }
  }
  return { lineCells, colorCells: colorCells.filter(([x, y]) => mark[idx(x, y)] === 2), grayCells };
}

export function removeCells(b: Board, cells: [number, number][]): void {
  for (const [x, y] of cells) b[idx(x, y)] = EMPTY;
}

/** Cell-level gravity: every cell falls straight down as far as it can. Returns true if anything moved. */
export function applyGravity(b: Board): boolean {
  let moved = false;
  for (let x = 0; x < BOARD_W; x++) {
    let write = BOARD_H - 1;
    for (let y = BOARD_H - 1; y >= 0; y--) {
      const c = b[idx(x, y)]!;
      if (c !== EMPTY) {
        if (write !== y) { b[idx(x, write)] = c; b[idx(x, y)] = EMPTY; moved = true; }
        write--;
      }
    }
  }
  return moved;
}

export function scoreStep(cleared: number, chain: number, cross: boolean): number {
  const mult = 1 << Math.min(chain - 1, 10); // 1,2,4,8...
  const base = cleared * 10 * mult;
  return cross ? Math.floor(base * 3 / 2) : base;
}

/** Run the full clear→gravity loop until stable. Mutates board. Returns steps in order. */
export function resolveBoard(b: Board): ClearStep[] {
  const steps: ClearStep[] = [];
  let chain = 0;
  for (;;) {
    const f = findClears(b);
    if (!f) break;
    chain++;
    const cross = f.lineCells.length > 0 && f.colorCells.length > 0;
    const cleared = f.lineCells.length + f.colorCells.length + f.grayCells.length;
    const points = scoreStep(cleared, chain, cross);
    removeCells(b, f.lineCells); removeCells(b, f.colorCells); removeCells(b, f.grayCells);
    applyGravity(b);
    steps.push({ ...f, chain, points, crossBonus: cross });
    if (chain > 64) break; // safety
  }
  return steps;
}
