import type { Cell, ClearStep, Rules } from './types';
import { BOARD_W, BOARD_H, DEFAULT_RULES, EMPTY, GRAY } from './types';

export type Board = Cell[]; // row-major, length BOARD_W * BOARD_H, row 0 = top

export function createBoard(): Board {
  return new Array<Cell>(BOARD_W * BOARD_H).fill(EMPTY);
}
export const idx = (x: number, y: number) => y * BOARD_W + x;
export const inBounds = (x: number, y: number) => x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H;
export const get = (b: Board, x: number, y: number): Cell => (inBounds(x, y) ? b[idx(x, y)]! : GRAY);

export type Found = Omit<ClearStep, 'chain' | 'points' | 'crossBonus' | 'grayCleared'>;

/** Find full rows and same-color orthogonal groups (size per `rules`). Returns one ClearStep fragment or null if nothing clears. */
export function findClears(b: Board, rules: Rules = DEFAULT_RULES): Found | null {
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
    if (rules.sealedColors.includes(c)) { seen[i] = 1; continue; }
    const minGroup = rules.minGroupByColor[c] ?? rules.minGroup;
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
  // perk: each full row also removes N extra gray cells, lowest rows first, left to right
  if (lineCells.length && rules.lineExtraGray > 0) {
    let budget = (lineCells.length / BOARD_W) * rules.lineExtraGray;
    for (let y = BOARD_H - 1; y >= 0 && budget > 0; y--) for (let x = 0; x < BOARD_W && budget > 0; x++) {
      const k = idx(x, y);
      if (b[k] === GRAY && !mark[k] && !graySeen[k]) { graySeen[k] = 1; grayCells.push([x, y]); budget--; }
    }
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

/**
 * Points for one step from a cleared-cell count in tenths (a plain cell = 10), so per-color
 * weights stay integer. Chain multiplier 1,2,4,8… plus an optional +1 from `chainBonusFrom`.
 */
export function scoreTenths(weightedTenths: number, chain: number, cross: boolean, chainBonusFrom = 0): number {
  let mult = 1 << Math.min(chain - 1, 10);
  if (chainBonusFrom > 0 && chain >= chainBonusFrom) mult += 1;
  const base = weightedTenths * mult; // (cells × 10) × mult
  return cross ? Math.floor(base * 3 / 2) : base;
}

/** Points for one step: cleared cells × 10 × chain multiplier (×1.5 on a cross clear). */
export function scoreStep(cleared: number, chain: number, cross: boolean, chainBonusFrom = 0): number {
  return scoreTenths(cleared * 10, chain, cross, chainBonusFrom);
}

/** Cleared cells weighted by color perks, in tenths of a cell. */
function weighTenths(b: Board, f: Found, rules: Rules): number {
  let w = (f.lineCells.length + f.grayCells.length) * 10;
  for (const [x, y] of f.colorCells) w += rules.colorWeightTenths[b[idx(x, y)]!] ?? 10;
  return w;
}

/** Run the full clear→gravity loop until stable. Mutates board. Returns steps in order. */
export function resolveBoard(b: Board, rules: Rules = DEFAULT_RULES): ClearStep[] {
  const steps: ClearStep[] = [];
  let chain = 0;
  for (;;) {
    const f = findClears(b, rules);
    if (!f) break;
    chain++;
    const cross = f.lineCells.length > 0 && f.colorCells.length > 0;
    const points = scoreTenths(weighTenths(b, f, rules), chain, cross, rules.chainBonusFrom);
    let grayCleared = f.grayCells.length;
    for (const [x, y] of f.lineCells) if (b[idx(x, y)] === GRAY) grayCleared++;
    removeCells(b, f.lineCells); removeCells(b, f.colorCells); removeCells(b, f.grayCells);
    applyGravity(b);
    steps.push({ ...f, chain, points, crossBonus: cross, grayCleared });
    if (chain > 64) break; // safety
  }
  return steps;
}
