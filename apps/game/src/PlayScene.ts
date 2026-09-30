import Phaser from 'phaser';
import { Game, BOARD_W, BOARD_H, pieceCells, hashSeed, type ClearStep } from '@chainwell/core';
import { T } from './theme';

const CELL = 30, GAP = 2, STEP = CELL + GAP;
const BOARD_X = 20, BOARD_Y = 162;
const TICK_MS = 1000 / 60;

export class PlayScene extends Phaser.Scene {
  private game_!: Game;
  private gfx!: Phaser.GameObjects.Graphics;
  private acc = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private chainText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private popupUntil = 0;
  // drag state
  private dragStartX = 0; private dragStartY = 0; private dragStartT = 0;
  private dragColAcc = 0; private dragging = false; private moved = false;
  private seed = hashSeed(new Date().toISOString().slice(0, 10));

  constructor() { super('play'); }

  create() {
    this.game_ = new Game(this.seed, { gravityTicks: 48, lockDelayTicks: 30 });
    this.gfx = this.add.graphics();
    const style = { fontFamily: T.font, fontSize: '22px', color: T.textPrimary, fontStyle: 'bold' };
    this.add.text(20, 60, 'CHAINWELL', { ...style, fontSize: '14px', color: T.textMuted });
    this.scoreText = this.add.text(20, 84, '0', style);
    this.statusText = this.add.text(20, 116, 'seed ' + this.seed.toString(16), { ...style, fontSize: '11px', color: T.textMuted });
    this.chainText = this.add.text(BOARD_X + (BOARD_W * STEP) / 2, BOARD_Y + 180, '', { ...style, fontSize: '30px', color: T.textStrong, align: 'center' }).setOrigin(0.5).setDepth(10).setVisible(false);
    this.add.text(20, 720, '드래그 · 이동      탭 · 회전      플릭 ↓ · 드롭      R · 재시작', { ...style, fontSize: '12px', color: T.textMuted });

    // Keyboard (desktop)
    const k = this.input.keyboard!;
    k.on('keydown-LEFT', () => this.game_.input({ t: 'left' }));
    k.on('keydown-RIGHT', () => this.game_.input({ t: 'right' }));
    k.on('keydown-UP', () => this.game_.input({ t: 'rotate' }));
    k.on('keydown-X', () => this.game_.input({ t: 'rotate' }));
    k.on('keydown-DOWN', () => this.game_.input({ t: 'soft' }));
    k.on('keydown-SPACE', () => this.game_.input({ t: 'hard' }));
    k.on('keydown-C', () => this.game_.input({ t: 'hold' }));
    k.on('keydown-SHIFT', () => this.game_.input({ t: 'hold' }));
    k.on('keydown-R', () => this.scene.restart());

    // Touch / pointer: relative drag anywhere
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true; this.moved = false; this.dragColAcc = 0;
      this.dragStartX = p.x; this.dragStartY = p.y; this.dragStartT = p.downTime;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      // relative drag: every 0.8 cell of horizontal travel = one column
      const rel = p.x - this.dragStartX - this.dragColAcc * STEP;
      if (rel >= STEP * 0.8 && this.stepCol(1)) this.dragColAcc++;
      else if (rel <= -STEP * 0.8 && this.stepCol(-1)) this.dragColAcc--;
      if (Math.abs(p.x - this.dragStartX) > 8 || Math.abs(p.y - this.dragStartY) > 8) this.moved = true;
      // slow downward drag = soft drop, one row per cell of travel
      if (p.y - this.dragStartY > STEP * 1.2 && Math.abs(p.velocity.y) < 1.5) { this.game_.input({ t: 'soft' }); this.dragStartY = p.y; }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      const dt = p.upTime - this.dragStartT;
      const dy = p.y - this.dragStartY;
      if (dy > 60 && dt < 250) { this.game_.input({ t: 'hard' }); return; }
      if (!this.moved && dt < 300) {
        if (p.x > 320 && p.y > 600) this.game_.input({ t: 'hold' }); else this.game_.input({ t: 'rotate' });
      }
    });
  }

  private stepCol(dir: 1 | -1): boolean {
    const before = this.game_.piece.x;
    this.game_.input({ t: dir === 1 ? 'right' : 'left' });
    return this.game_.piece.x !== before;
  }

  update(_: number, delta: number) {
    const g = this.game_;
    this.acc += delta;
    const before = g.events.length;
    while (this.acc >= TICK_MS) { g.step(); this.acc -= TICK_MS; }
    for (let i = before; i < g.events.length; i++) {
      const e = g.events[i]!;
      if (e.kind === 'clear' && e.steps) this.showChain(e.steps);
      if (e.kind === 'over') this.statusText.setText('GAME OVER — R to restart');
    }
    this.draw();
  }

  private showChain(steps: ClearStep[]) {
    const last = steps[steps.length - 1]!;
    const pts = steps.reduce((a, s) => a + s.points, 0);
    const cross = steps.some(s => s.crossBonus);
    this.chainText.setText(`${last.chain} CHAIN\n+${pts.toLocaleString()}${cross ? '\nLINE + COLOR ×1.5' : ''}`).setVisible(true);
    this.popupUntil = this.time.now + 900;
    if ('vibrate' in navigator) navigator.vibrate?.(Math.min(10 * last.chain, 60));
  }

  private rect(x: number, y: number, w: number, h: number, color: number, r = 6, alpha = 1) {
    this.gfx.fillStyle(color, alpha); this.gfx.fillRoundedRect(x, y, w, h, r);
  }

  private draw() {
    const g = this.game_, G = this.gfx;
    G.clear();
    this.scoreText.setText(g.score.toLocaleString());
    if (this.time.now > this.popupUntil) this.chainText.setVisible(false);

    // well
    this.rect(BOARD_X - 4, BOARD_Y - 4, BOARD_W * STEP + 6, BOARD_H * STEP + 6, T.bgWell, 12);
    const ghost = g.ghost();
    const ghostCells = new Map(pieceCells(ghost).map(([x, y, c]) => [`${x},${y}`, c]));
    const active = new Set(pieceCells(g.piece).map(([x, y]) => `${x},${y}`));
    const will = new Set(g.previewClear().map(([x, y]) => `${x},${y}`));
    const laneCols = new Set(pieceCells(g.piece).map(([x]) => x));

    for (let y = 0; y < BOARD_H; y++) for (let x = 0; x < BOARD_W; x++) {
      const px = BOARD_X + x * STEP, py = BOARD_Y + y * STEP;
      const c = g.cellAt(x, y);
      const key = `${x},${y}`;
      if (c === 0) {
        const lane = laneCols.has(x) && y > g.piece.y && y < ghost.y;
        this.rect(px, py, CELL, CELL, lane ? T.cellLane : T.cellEmpty);
        const gc = ghostCells.get(key);
        if (gc !== undefined && !active.has(key)) {
          this.rect(px, py, CELL, CELL, T.block[gc]!, 6, 0.18);
          G.lineStyle(2, will.has(key) ? T.accent : T.block[gc]!, will.has(key) ? 1 : 0.9);
          G.strokeRoundedRect(px + 1, py + 1, CELL - 2, CELL - 2, 6);
        }
      } else {
        this.rect(px, py, CELL, CELL, T.block[c]!);
        G.fillStyle(0x000000, 0.22); G.fillRoundedRect(px, py + CELL - 3, CELL, 3, { tl: 0, tr: 0, bl: 6, br: 6 });
        G.fillStyle(0xffffff, 0.28); G.fillRoundedRect(px, py, CELL, 2, { tl: 6, tr: 6, bl: 0, br: 0 });
        if (c === 6) { G.lineStyle(2, 0x7a8093, 1); G.lineBetween(px + 10, py + 10, px + 20, py + 20); G.lineBetween(px + 20, py + 10, px + 10, py + 20); }
        if (will.has(key)) { G.lineStyle(2, T.accent, 1); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, 7); }
      }
    }
    // active piece
    for (const [x, y, c] of pieceCells(g.piece)) {
      if (y < 0) continue;
      const px = BOARD_X + x * STEP, py = BOARD_Y + y * STEP;
      this.rect(px, py, CELL, CELL, T.block[c]!);
      G.lineStyle(2, 0xffffff, 0.95); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, 7);
    }
    // side: next + hold
    const sx = BOARD_X + BOARD_W * STEP + 14;
    this.rect(sx, BOARD_Y, 84, 70, T.bgPanel, 12);
    const drawMini = (p: { kind: 'I3' | 'L3'; colors: readonly number[] }, ox: number, oy: number) => {
      const tmp = { ...p, rot: 0 as const, x: 1, y: 1, colors: p.colors as [any, any, any] };
      for (const [x, y, c] of pieceCells(tmp)) this.rect(ox + x * 16, oy + y * 16, 14, 14, T.block[c]!, 4);
    };
    const nx = g.next[0]; if (nx) drawMini(nx, sx + 12, BOARD_Y + 8);
    this.rect(sx, BOARD_Y + 80, 84, 70, T.bgPanel, 12);
    if (g.hold) drawMini(g.hold, sx + 12, BOARD_Y + 88);
    // hold button
    this.rect(320, 640, 60, 60, g.holdUsed ? T.fillInactive : T.bgPanel, 14);
    // column rail
    for (let x = 0; x < BOARD_W; x++) this.rect(BOARD_X + x * STEP, 690, CELL, 4, laneCols.has(x) ? T.accent : T.fillRail, 2);
  }
}
