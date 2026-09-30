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
  /** Total gray cells removed this step (in rows, by adjacency, or by perk). */
  grayCleared: number;
}

/** Clear/score rules. Perks and boss modifiers change these; the board resolver reads them. */
export interface Rules {
  /** Default minimum orthogonal group size for a color clear. */
  minGroup: number;
  /** Per-color override of minGroup (e.g. blue clears at 3). */
  minGroupByColor: Partial<Record<Cell, number>>;
  /** Colors that can never color-clear (boss modifier). They still count for line clears. */
  sealedColors: Cell[];
  /** Per-color score weight in tenths (10 = ×1, 20 = ×2). Applies to color-cleared cells only. */
  colorWeightTenths: Partial<Record<Cell, number>>;
  /** From this chain count on, add +1 to the chain multiplier (0 = off). */
  chainBonusFrom: number;
  /** Extra gray cells removed per full row cleared. */
  lineExtraGray: number;
}

export const DEFAULT_RULES: Rules = {
  minGroup: 4,
  minGroupByColor: {},
  sealedColors: [],
  colorWeightTenths: {},
  chainBonusFrom: 0,
  lineExtraGray: 0,
};

export interface Config {
  colorCount: 4 | 5;
  /** Ticks between automatic 1-cell drops. */
  gravityTicks: number;
  /** Ticks a piece may rest on the ground before locking. */
  lockDelayTicks: number;
  holdEnabled: boolean;
  previewCount: number;
  rules: Rules;
}

export const DEFAULT_CONFIG: Config = {
  colorCount: 4,
  gravityTicks: 48,
  lockDelayTicks: 30,
  holdEnabled: true,
  previewCount: 1,
  rules: DEFAULT_RULES,
};
