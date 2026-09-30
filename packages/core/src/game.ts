import type { Action, Cell, ClearStep, Config, InputEvent, Piece } from './types';
import { BOARD_H, BOARD_W, DEFAULT_CONFIG, EMPTY, GRAY } from './types';
import { Rng } from './rng';
import { type Board, createBoard, get, idx, resolveBoard } from './board';
import { KICKS, pieceCells, spawnPiece } from './piece';

export type Phase = 'playing' | 'resolving' | 'over';

export interface GameEvent {
  tick: number;
  kind: 'lock' | 'clear' | 'over' | 'spawn';
  steps?: ClearStep[];
}

export class Game {
  readonly cfg: Config;
  readonly board: Board;
  readonly rng: Rng;
  tick = 0;
  score = 0;
  bestChain = 0;
  linesCleared = 0;
  colorClears = 0;
  grayCleared = 0;
  piece: Piece;
  next: Piece[] = [];
  hold: Piece | null = null;
  holdUsed = false;
  phase: Phase = 'playing';
  private gravityAcc = 0;
  private lockAcc = 0;
  readonly log: InputEvent[] = [];
  readonly events: GameEvent[] = [];

  constructor(seed: number, cfg: Partial<Config> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.rng = new Rng(seed);
    this.board = createBoard();
    for (let i = 0; i < this.cfg.previewCount + 1; i++) this.next.push(spawnPiece(this.rng, this.cfg.colorCount));
    this.piece = this.next.shift()!;
    this.next.push(spawnPiece(this.rng, this.cfg.colorCount));
  }

  /** Apply an input at the current tick. Recorded to the log for replay. */
  input(action: Action): void {
    if (this.phase !== 'playing') return;
    this.log.push({ tick: this.tick, action });
    this.apply(action);
  }

  /** Apply without logging (used by replay). */
  apply(a: Action): void {
    switch (a.t) {
      case 'left': this.tryMove(-1, 0); break;
      case 'right': this.tryMove(1, 0); break;
      case 'soft': if (!this.tryMove(0, 1)) this.lock(); else this.gravityAcc = 0; break;
      case 'hard': while (this.tryMove(0, 1)); this.lock(); break;
      case 'rotate': this.tryRotate(); break;
      case 'hold': this.doHold(); break;
    }
  }

  /** Advance one fixed tick. */
  step(): void {
    if (this.phase !== 'playing') return;
    this.tick++;
    if (this.onGround()) {
      this.lockAcc++;
      if (this.lockAcc >= this.cfg.lockDelayTicks) this.lock();
      return;
    }
    this.lockAcc = 0;
    this.gravityAcc++;
    if (this.gravityAcc >= this.cfg.gravityTicks) { this.gravityAcc = 0; this.tryMove(0, 1); }
  }

  fits(p: Piece): boolean {
    for (const [x, y] of pieceCells(p)) {
      if (x < 0 || x >= BOARD_W || y >= BOARD_H) return false;
      if (y < 0) continue;
      if (this.board[idx(x, y)] !== EMPTY) return false;
    }
    return true;
  }

  onGround(): boolean {
    return !this.fits({ ...this.piece, y: this.piece.y + 1 });
  }

  /** Landing position for the current piece (ghost). */
  ghost(): Piece {
    const g = { ...this.piece };
    while (this.fits({ ...g, y: g.y + 1 })) g.y++;
    return g;
  }

  /** Cells that would clear if the piece landed at its ghost position (for the will-clear highlight). */
  previewClear(): [number, number][] {
    const b = this.board.slice() as Board;
    for (const [x, y, c] of pieceCells(this.ghost())) if (y >= 0) b[idx(x, y)] = c;
    const steps = resolveBoard(b, this.cfg.rules);
    const first = steps[0];
    if (!first) return [];
    return [...first.lineCells, ...first.colorCells, ...first.grayCells];
  }

  private tryMove(dx: number, dy: number): boolean {
    const p = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (!this.fits(p)) return false;
    this.piece = p;
    return true;
  }

  private tryRotate(): boolean {
    const rot = ((this.piece.rot + 1) % 4) as Piece['rot'];
    for (const [kx, ky] of KICKS) {
      const p = { ...this.piece, rot, x: this.piece.x + kx, y: this.piece.y + ky };
      if (this.fits(p)) { this.piece = p; return true; }
    }
    return false;
  }

  private doHold(): void {
    if (!this.cfg.holdEnabled || this.holdUsed) return;
    const cur: Piece = { ...this.piece, rot: 0, x: Math.floor(BOARD_W / 2) - 1, y: 0 };
    if (this.hold) { this.piece = { ...this.hold }; this.hold = cur; }
    else { this.hold = cur; this.spawn(); }
    this.holdUsed = true;
    this.gravityAcc = 0; this.lockAcc = 0;
    if (!this.fits(this.piece)) this.gameOver();
  }

  private lock(): void {
    for (const [x, y, c] of pieceCells(this.piece)) {
      if (y < 0) { this.gameOver(); return; }
      this.board[idx(x, y)] = c;
    }
    this.events.push({ tick: this.tick, kind: 'lock' });
    const steps = resolveBoard(this.board, this.cfg.rules);
    if (steps.length) {
      for (const s of steps) {
        this.score += s.points;
        this.linesCleared += s.lineCells.length / BOARD_W;
        if (s.colorCells.length) this.colorClears++;
        this.grayCleared += s.grayCleared;
      }
      const chain = steps[steps.length - 1]!.chain;
      if (chain > this.bestChain) this.bestChain = chain;
      this.events.push({ tick: this.tick, kind: 'clear', steps });
    }
    this.holdUsed = false;
    this.spawn();
    if (!this.fits(this.piece)) this.gameOver();
  }

  private spawn(): void {
    this.piece = this.next.shift()!;
    this.next.push(spawnPiece(this.rng, this.cfg.colorCount));
    this.gravityAcc = 0; this.lockAcc = 0;
    this.events.push({ tick: this.tick, kind: 'spawn' });
  }

  private gameOver(): void {
    this.phase = 'over';
    this.events.push({ tick: this.tick, kind: 'over' });
  }

  /**
   * Inject a garbage row at the bottom (boss / attack). The falling piece is pushed up if it would overlap.
   * Overflow at the top ends the game. Returns false if the row could not be inserted.
   */
  pushGarbageRow(holeX: number): boolean {
    if (this.phase !== 'playing') return false;
    for (let x = 0; x < BOARD_W; x++) if (this.board[idx(x, 0)] !== EMPTY) { this.gameOver(); return false; }
    for (let y = 0; y < BOARD_H - 1; y++) for (let x = 0; x < BOARD_W; x++) this.board[idx(x, y)] = this.board[idx(x, y + 1)]!;
    for (let x = 0; x < BOARD_W; x++) this.board[idx(x, BOARD_H - 1)] = x === holeX ? EMPTY : GRAY;
    if (!this.fits(this.piece)) {
      const up = { ...this.piece, y: this.piece.y - 1 };
      if (this.fits(up)) this.piece = up; else this.gameOver();
    }
    return true;
  }

  cellAt(x: number, y: number): Cell { return get(this.board, x, y); }
}

/** Re-simulate a run from seed + input log. Returns the final game. */
export function replay(seed: number, log: InputEvent[], cfg: Partial<Config> = {}, untilTick?: number): Game {
  const g = new Game(seed, cfg);
  let i = 0;
  const end = untilTick ?? (log.length ? log[log.length - 1]!.tick : 0);
  while (g.tick < end || i < log.length) {
    while (i < log.length && log[i]!.tick === g.tick) { g.apply(log[i]!.action); i++; }
    if (g.phase !== 'playing') break;
    if (g.tick >= end && i >= log.length) break;
    g.step();
  }
  return g;
}
