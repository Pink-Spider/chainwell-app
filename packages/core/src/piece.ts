import type { Piece, PieceKind, Cell } from './types';
import { BOARD_W } from './types';
import type { Rng } from './rng';

/** Cell offsets per rotation. Index into `colors` is preserved (cell i keeps its color when rotating). */
const SHAPES: Record<PieceKind, [number, number][][]> = {
  // I3: horizontal / vertical, pivot on middle cell
  I3: [
    [[-1, 0], [0, 0], [1, 0]],
    [[0, -1], [0, 0], [0, 1]],
    [[1, 0], [0, 0], [-1, 0]],
    [[0, 1], [0, 0], [0, -1]],
  ],
  // L3: corner piece, pivot on corner cell
  L3: [
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [0, 1], [-1, 0]],
    [[0, 0], [-1, 0], [0, -1]],
    [[0, 0], [0, -1], [1, 0]],
  ],
};

export function pieceCells(p: Piece): [number, number, Cell][] {
  const shape = SHAPES[p.kind][p.rot]!;
  return shape.map(([dx, dy], i) => [p.x + dx, p.y + dy, p.colors[i]!] as [number, number, Cell]);
}

export function spawnPiece(rng: Rng, colorCount: number): Piece {
  const kind: PieceKind = rng.nextInt(2) === 0 ? 'I3' : 'L3';
  const c = (): Cell => (1 + rng.nextInt(colorCount)) as Cell;
  return { kind, colors: [c(), c(), c()], rot: 0, x: Math.floor(BOARD_W / 2) - 1, y: kind === 'I3' ? 0 : 0 };
}

/** Simple wall kicks: try in place, then ±1, ±2 horizontally, then up 1. */
export const KICKS: [number, number][] = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
