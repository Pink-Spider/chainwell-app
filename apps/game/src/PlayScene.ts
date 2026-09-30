import Phaser from 'phaser';
import { Run, Game, BOARD_W, BOARD_H, pieceCells, hashSeed, type ClearStep, type Cell } from '@chainwell/core';
import { T } from './theme';
import { hapticChain, hapticLock } from './native';
import { goalText, PERK_TEXT } from './perkText';

const CELL = 30, GAP = 2, STEP = CELL + GAP;
const BOARD_X = 20, BOARD_Y = 162;
const BOARD_PW = BOARD_W * STEP - GAP;
const TICK_MS = 1000 / 60;
const SIDE_X = BOARD_X + BOARD_W * STEP + 14, SIDE_W = 84;
const HOLD_BTN = { x: 316, y: 736, w: 60, h: 60 };
const W = 390;

export class PlayScene extends Phaser.Scene {
  private run!: Run;
  private gfx!: Phaser.GameObjects.Graphics;
  private acc = 0;
  private stageText!: Phaser.GameObjects.Text;
  private totalText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private chainText!: Phaser.GameObjects.Text;
  private popupUntil = 0;
  private bestChainText!: Phaser.GameObjects.Text;
  private holdCap!: Phaser.GameObjects.Text;
  private holdLabel!: Phaser.GameObjects.Text;
  private perksText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  // event cursor: events live on the per-stage Game, so re-anchor when the stage changes
  private evGame: Game | null = null;
  private evIdx = 0;
  private runBestChain = 0;
  private overlayShown = false;
  // drag state
  private dragStartX = 0; private dragStartY = 0; private dragStartT = 0;
  private dragColAcc = 0; private dragging = false; private moved = false;
  private runNo = 0;

  constructor() { super('play'); }

  private newRun(): void {
    for (const key of ['perk', 'result']) if (this.scene.isActive(key)) this.scene.stop(key);
    const day = new Date().toISOString().slice(0, 10);
    this.run = new Run(hashSeed(this.runNo === 0 ? day : `${day}#${this.runNo}`));
    this.runNo++;
    this.evGame = null; this.evIdx = 0; this.runBestChain = 0; this.overlayShown = false; this.acc = 0;
    this.seedText.setText('seed ' + this.run.seed.toString(16));
  }

  create() {
    this.gfx = this.add.graphics();
    const style = { fontFamily: T.font, fontSize: '22px', color: T.textPrimary, fontStyle: 'bold' };
    const cap = { fontFamily: T.font, fontSize: '11px', color: T.textMuted, fontStyle: 'bold' };
    // header: stage / run total · stage score · goal + progress
    this.stageText = this.add.text(20, 52, '', { ...cap, fontSize: '13px', color: T.accentCss });
    this.totalText = this.add.text(W - 20, 52, '', { ...cap, fontSize: '13px' }).setOrigin(1, 0);
    this.scoreText = this.add.text(20, 72, '0', { ...style, fontSize: '28px' });
    this.goalText = this.add.text(20, 112, '', { ...cap, fontSize: '12px', color: T.textPrimary });
    this.progressText = this.add.text(20 + BOARD_PW, 112, '', { ...cap, fontSize: '12px' }).setOrigin(1, 0);
    this.seedText = this.add.text(W - 20, 72, '', { ...cap, fontSize: '10px' }).setOrigin(1, 0);
    this.chainText = this.add.text(BOARD_X + (BOARD_W * STEP) / 2, BOARD_Y + 180, '', { ...style, fontSize: '30px', color: T.textStrong, align: 'center' }).setOrigin(0.5).setDepth(10).setVisible(false);
    // side panel
    this.add.text(SIDE_X + 8, BOARD_Y + 8, 'NEXT', cap);
    this.holdCap = this.add.text(SIDE_X + 8, BOARD_Y + 138, 'HOLD', cap);
    this.add.text(SIDE_X + 8, BOARD_Y + 216, 'BEST', cap);
    this.bestChainText = this.add.text(SIDE_X + 8, BOARD_Y + 232, '0', { ...style, fontSize: '24px' });
    this.add.text(SIDE_X + 40, BOARD_Y + 244, 'CHAIN', cap);
    // footer
    this.add.text(20, 700, '드래그 · 이동     탭 · 회전     플릭 ↓ · 드롭', { ...style, fontSize: '12px', color: T.textMuted });
    this.perksText = this.add.text(20, 722, '', { ...cap, fontSize: '11px', wordWrap: { width: HOLD_BTN.x - 40 } });
    this.holdLabel = this.add.text(HOLD_BTN.x + HOLD_BTN.w / 2, HOLD_BTN.y + HOLD_BTN.h / 2, 'HOLD', { ...cap, color: T.textPrimary }).setOrigin(0.5).setDepth(5);

    this.newRun();

    // Keyboard (desktop)
    const k = this.input.keyboard!;
    k.on('keydown-LEFT', () => this.run.input({ t: 'left' }));
    k.on('keydown-RIGHT', () => this.run.input({ t: 'right' }));
    k.on('keydown-UP', () => this.run.input({ t: 'rotate' }));
    k.on('keydown-X', () => this.run.input({ t: 'rotate' }));
    k.on('keydown-DOWN', () => this.run.input({ t: 'soft' }));
    k.on('keydown-SPACE', () => this.run.input({ t: 'hard' }));
    k.on('keydown-C', () => this.run.input({ t: 'hold' }));
    k.on('keydown-SHIFT', () => this.run.input({ t: 'hold' }));
    k.on('keydown-R', () => this.newRun());

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
      if (p.y - this.dragStartY > STEP * 1.2 && Math.abs(p.velocity.y) < 1.5) { this.run.input({ t: 'soft' }); this.dragStartY = p.y; }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      const dt = p.upTime - this.dragStartT;
      const dy = p.y - this.dragStartY;
      if (dy > 60 && dt < 250) { this.run.input({ t: 'hard' }); return; }
      if (!this.moved && dt < 300) {
        const inHold = p.x >= HOLD_BTN.x && p.x <= HOLD_BTN.x + HOLD_BTN.w && p.y >= HOLD_BTN.y && p.y <= HOLD_BTN.y + HOLD_BTN.h;
        if (inHold) this.run.input({ t: 'hold' }); else this.run.input({ t: 'rotate' });
      }
    });
  }

  private stepCol(dir: 1 | -1): boolean {
    const before = this.run.game.piece.x;
    this.run.input({ t: dir === 1 ? 'right' : 'left' });
    return this.run.game.piece.x !== before;
  }

  update(_: number, delta: number) {
    const r = this.run;
    if (r.phase === 'stage') {
      this.acc += delta;
      while (this.acc >= TICK_MS && r.phase === 'stage') { r.step(); this.acc -= TICK_MS; }
    }
    this.drainEvents();
    this.draw();
    this.checkPhase();
  }

  private drainEvents() {
    const g = this.run.game;
    if (g !== this.evGame) { this.evGame = g; this.evIdx = 0; }
    for (; this.evIdx < g.events.length; this.evIdx++) {
      const e = g.events[this.evIdx]!;
      if (e.kind === 'lock') hapticLock();
      if (e.kind === 'clear' && e.steps) this.showChain(e.steps);
    }
    if (g.bestChain > this.runBestChain) this.runBestChain = g.bestChain;
  }

  /** Hand off to the perk / result overlays exactly once per phase change. */
  private checkPhase() {
    const r = this.run;
    if (r.phase === 'stage') { this.overlayShown = false; return; }
    if (this.overlayShown) return;
    this.overlayShown = true;
    this.dragging = false;
    this.chainText.setVisible(false);
    if (r.phase === 'pick') {
      this.scene.pause();
      this.scene.launch('perk', { run: r });
    } else {
      this.scene.launch('result', { run: r, bestChain: this.runBestChain, onRestart: () => this.newRun() });
    }
  }

  private showChain(steps: ClearStep[]) {
    const last = steps[steps.length - 1]!;
    const pts = steps.reduce((a, s) => a + s.points, 0);
    const cross = steps.some(s => s.crossBonus);
    this.chainText.setText(`${last.chain} CHAIN\n+${pts.toLocaleString()}${cross ? '\nLINE + COLOR ×1.5' : ''}`).setVisible(true);
    this.popupUntil = this.time.now + 900;
    hapticChain(last.chain);
  }

  private rect(x: number, y: number, w: number, h: number, color: number, r = 6, alpha = 1) {
    this.gfx.fillStyle(color, alpha); this.gfx.fillRoundedRect(x, y, w, h, r);
  }

  private drawHud() {
    const r = this.run, g = r.game;
    const n = r.stages.length;
    this.stageText.setText(r.stage.boss ? `BOSS  ·  ${r.stageIndex + 1}/${n}` : `STAGE ${r.stageIndex + 1}/${n}`);
    this.totalText.setText(`RUN ${r.score.toLocaleString()}`);
    this.scoreText.setText(g.score.toLocaleString());
    const goal = r.goal;
    const [cur, target] = r.progress();
    this.goalText.setText('목표  ' + goalText(goal));
    this.progressText.setText(goal.t === 'survive' ? `${Math.ceil((target - cur) / 60)}s` : `${cur.toLocaleString()} / ${target.toLocaleString()}`);
    // progress bar under the goal line
    const barY = 132, barH = 6;
    this.rect(20, barY, BOARD_PW, barH, T.fillRail, 3);
    if (target > 0) this.rect(20, barY, Math.max(barH, Math.floor(BOARD_PW * cur / target)), barH, T.accent, 3);
    // sealed colors: swatches next to the bar
    const sealed = g.cfg.rules.sealedColors;
    sealed.forEach((c, i) => {
      const x = 20 + BOARD_PW - 14 - i * 18, y = barY + 10;
      this.rect(x, y, 14, 14, T.block[c]!, 4, 0.5);
      this.gfx.lineStyle(2, 0xffffff, 0.9); this.gfx.lineBetween(x + 3, y + 3, x + 11, y + 11);
    });
    this.perksText.setText(r.perks.length ? '퍽  ' + r.perks.map(p => PERK_TEXT[p].name).join(' · ') : '');
  }

  private draw() {
    const g = this.run.game, G = this.gfx;
    G.clear();
    this.drawHud();
    if (this.time.now > this.popupUntil) this.chainText.setVisible(false);
    const sealed = new Set<Cell>(g.cfg.rules.sealedColors);

    // well
    this.rect(BOARD_X - 4, BOARD_Y - 4, BOARD_W * STEP + 6, BOARD_H * STEP + 6, T.bgWell, 12);
    const ghost = g.ghost();
    const ghostCells = new Map(pieceCells(ghost).map(([x, y, c]) => [`${x},${y}`, c]));
    const active = new Set(pieceCells(g.piece).map(([x, y]) => `${x},${y}`));
    const will = new Set(g.previewClear().map(([x, y]) => `${x},${y}`));
    const laneCols = new Set(pieceCells(g.piece).map(([x]) => x));

    const block = (px: number, py: number, c: Cell) => {
      this.rect(px, py, CELL, CELL, T.block[c]!, 6, sealed.has(c) ? 0.55 : 1);
      G.fillStyle(0x000000, 0.22); G.fillRoundedRect(px, py + CELL - 3, CELL, 3, { tl: 0, tr: 0, bl: 6, br: 6 });
      G.fillStyle(0xffffff, 0.28); G.fillRoundedRect(px, py, CELL, 2, { tl: 6, tr: 6, bl: 0, br: 0 });
      if (c === 6) { G.lineStyle(2, 0x7a8093, 1); G.lineBetween(px + 10, py + 10, px + 20, py + 20); G.lineBetween(px + 20, py + 10, px + 10, py + 20); }
      else if (sealed.has(c)) { G.lineStyle(2, 0xffffff, 0.7); G.lineBetween(px + 8, py + 22, px + 22, py + 8); }
    };

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
        block(px, py, c);
        if (will.has(key)) { G.lineStyle(2, T.accent, 1); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, 7); }
      }
    }
    // active piece
    for (const [x, y, c] of pieceCells(g.piece)) {
      if (y < 0) continue;
      const px = BOARD_X + x * STEP, py = BOARD_Y + y * STEP;
      block(px, py, c);
      G.lineStyle(2, 0xffffff, 0.95); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, 7);
    }
    // side panel: NEXT (as many as the config previews, up to 3), HOLD (perk), BEST
    this.bestChainText.setText(String(this.runBestChain));
    this.rect(SIDE_X, BOARD_Y, SIDE_W, 124, T.bgPanel, 12);
    const holdOn = g.cfg.holdEnabled;
    this.rect(SIDE_X, BOARD_Y + 130, SIDE_W, 76, T.bgPanel, 12, holdOn ? 1 : 0.35);
    this.holdCap.setAlpha(holdOn ? 1 : 0.35);
    this.rect(SIDE_X, BOARD_Y + 208, SIDE_W, 66, T.bgPanel, 12);
    const drawMini = (p: { kind: 'I3' | 'L3'; colors: readonly number[] }, cx: number, cy: number, size: number, alpha = 1) => {
      const tmp = { ...p, rot: 0 as const, x: 0, y: 0, colors: p.colors as [Cell, Cell, Cell] };
      const cells = pieceCells(tmp);
      const minX = Math.min(...cells.map(c => c[0])), minY = Math.min(...cells.map(c => c[1]));
      const w = (Math.max(...cells.map(c => c[0])) - minX + 1) * (size + 2), h = (Math.max(...cells.map(c => c[1])) - minY + 1) * (size + 2);
      for (const [x, y, c] of cells) this.rect(cx - w / 2 + (x - minX) * (size + 2), cy - h / 2 + (y - minY) * (size + 2), size, size, T.block[c]!, 4, sealed.has(c) ? alpha * 0.5 : alpha);
    };
    const nextSizes = [16, 12, 12], nextY = [BOARD_Y + 40, BOARD_Y + 74, BOARD_Y + 104], nextAlpha = [1, 0.75, 0.6];
    g.next.slice(0, Math.min(3, g.cfg.previewCount)).forEach((p, i) => drawMini(p, SIDE_X + SIDE_W / 2, nextY[i]!, nextSizes[i]!, nextAlpha[i]));
    if (holdOn && g.hold) drawMini(g.hold, SIDE_X + SIDE_W / 2, BOARD_Y + 174, 14, g.holdUsed ? 0.4 : 1);
    // hold button (only when the perk is owned)
    this.holdLabel.setVisible(holdOn);
    if (holdOn) {
      this.rect(HOLD_BTN.x, HOLD_BTN.y, HOLD_BTN.w, HOLD_BTN.h, T.bgPanel, 14, g.holdUsed ? 0.5 : 1);
      G.lineStyle(1, T.borderStrong, 1); G.strokeRoundedRect(HOLD_BTN.x, HOLD_BTN.y, HOLD_BTN.w, HOLD_BTN.h, 14);
      this.holdLabel.setAlpha(g.holdUsed ? 0.4 : 1);
    }
    // column rail
    for (let x = 0; x < BOARD_W; x++) this.rect(BOARD_X + x * STEP, 680, CELL, 4, laneCols.has(x) ? T.accent : T.fillRail, 2);
  }
}
