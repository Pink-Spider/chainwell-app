export const BOARD_W = 8;
export const BOARD_H = 16;

/** 0 = empty, 1..5 = colors, 6 = gray garbage */
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const EMPTY: Cell = 0;
export const GRAY: Cell = 6;

export type PieceKind = 'I3' | 'L3';

export interface Piece {
  kind: PieceKind;
  /** Colors for each of the 3 cells, in canonical cell order. */
  colors: [Cell, Cell, Cell];
  rot: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

export type Action =
  | { t: 'left' }
  | { t: 'right' }
  | { t: 'rotate' }
  | { t: 'soft' }
  | { t: 'hard' }
  | { t: 'hold' };

export interface InputEvent {
  tick: number;
  action: Action;
}

export interface ClearStep {
  /** Cells cleared by full rows this step. */
  lineCells: [number, number][];
  /** Cells cleared by color groups this step. */
  colorCells: [number, number][];
  /** Gray cells removed by adjacency this step. */
  grayCells: [number, number][];
  chain: number;
  points: number;
  crossBonus: boolean;
}

export interface Config {
  colorCount: 4 | 5;
  /** Ticks between automatic 1-cell drops. */
  gravityTicks: number;
  /** Ticks a piece may rest on the ground before locking. */
  lockDelayTicks: number;
  holdEnabled: boolean;
  previewCount: number;
}

export const DEFAULT_CONFIG: Config = {
  colorCount: 4,
  gravityTicks: 48,
  lockDelayTicks: 30,
  holdEnabled: true,
  previewCount: 1,
};
