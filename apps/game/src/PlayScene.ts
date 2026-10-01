import Phaser from 'phaser';
import { Run, Game, BOARD_W, BOARD_H, pieceCells, hashSeed, CHARACTER_BY_ID, type ClearStep, type Cell, type CharacterId, type PerkId } from '@chainwell/core';
import { T } from './theme';
import { hapticChain, hapticLock } from './native';
import { sfx } from './audio';
import { goalLabel } from './perkText';
import { loadSave, recordRun, settings } from './save';
import { W, GUTTER, CW, caps, val, kr, panel, block, glyph, cross, icon, iconButton, stageTrack, perkGlyph } from './ui';

// ── Figma: Ingame / Run (6:2) geometry ──────────────────────────────────────
const CELL = 30, GAP = T.cellGap, STEP = CELL + GAP;
const BOARD = { x: GUTTER, y: 162, w: 262, h: 518 };           // Board frame (4px padding)
const BOARD_X = BOARD.x + 4, BOARD_Y = BOARD.y + 4;             // first cell
const SIDE = { x: BOARD.x + BOARD.w + T.xl, w: 84 };            // SidePanel
const CARD = { next: [162, 112], hold: [282, 82], perks: [372, 145], speed: [525, 62], best: [606, 74] } as const;
const PAD = { x: GUTTER, y: 690, w: 262, h: 120 };              // TouchPad
const HOLD_BTN = { x: SIDE.x, y: 708, w: 84, h: 84 };
const PAUSE_BTN = { x: GUTTER, y: 50, w: 44, h: 44 };
const SOUND_BTN = { x: W - GUTTER - 44, y: 50, w: 44, h: 44 };
const TICK_MS = 1000 / 60;
const inRect = (px: number, py: number, r: { x: number; y: number; w: number; h: number }) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
const MAX_PERK_SLOTS = 6;
const DRAG_CELLS = { low: 1.0, normal: 0.8, high: 0.6 } as const; // 드래그 감도: cells of travel per column

export class PlayScene extends Phaser.Scene {
  private run!: Run;
  private gfx!: Phaser.GameObjects.Graphics;      // per-frame: board, side previews, rails
  private hudG!: Phaser.GameObjects.Graphics;     // per-frame: goal bar, track, speed bars
  private stageG!: Phaser.GameObjects.Graphics;   // per-stage: perk slots
  private stageObjs: Phaser.GameObjects.GameObject[] = [];
  private acc = 0;
  private stageText!: Phaser.GameObjects.Text;
  private stageOfText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goalLabelText!: Phaser.GameObjects.Text;
  private goalValText!: Phaser.GameObjects.Text;
  private goalOfText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private bestChainText!: Phaser.GameObjects.Text;
  private holdCap!: Phaser.GameObjects.Text;
  private holdIcon!: Phaser.GameObjects.Image;
  private holdLabel!: Phaser.GameObjects.Text;
  private hintObjs: Phaser.GameObjects.GameObject[] = [];
  private popup!: Phaser.GameObjects.Container;
  private popupUntil = 0;
  private evGame: Game | null = null;
  private evIdx = 0;
  private runBestChain = 0;
  private overlayShown = false;
  private dragStartX = 0; private dragStartY = 0; private dragStartT = 0;
  private dragColAcc = 0; private dragging = false; private moved = false;
  private runNo = 0;
  private character: CharacterId = 'diver';

  constructor() { super('play'); }

  init(data: { character?: CharacterId }) {
    this.character = data.character ?? loadSave().character;
    this.runNo = 0;
  }

  private newRun(): void {
    for (const key of ['perk', 'result', 'pause']) if (this.scene.isActive(key)) this.scene.stop(key);
    if (this.scene.isPaused()) this.scene.resume();
    const day = new Date().toISOString().slice(0, 10);
    const seed = hashSeed(this.runNo === 0 ? day : `${day}#${this.runNo}`);
    this.run = new Run(seed, { startPerks: CHARACTER_BY_ID[this.character].startPerks });
    this.runNo++;
    this.evGame = null; this.evIdx = 0; this.runBestChain = 0; this.overlayShown = false; this.acc = 0;
  }

  create() {
    this.hudG = this.add.graphics();
    this.gfx = this.add.graphics();
    this.stageG = this.add.graphics();

    // TopBar
    iconButton(this, PAUSE_BTN.x, PAUSE_BTN.y, 'pause', () => this.pause());
    iconButton(this, SOUND_BTN.x, SOUND_BTN.y, 'sound', () => undefined, { disabled: true });
    const trackX = PAUSE_BTN.x + 44 + T.xl, trackW = SOUND_BTN.x - T.xl - trackX;
    this.stageText = caps(this, trackX, 58, '', { size: 13, spacing: 1.3, color: T.textPrimary, weight: '700' });
    this.stageOfText = caps(this, trackX + trackW, 59, '', { origin: [1, 0] });

    // Stats: Card/Score + Card/Goal
    const half = (CW - T.md) / 2;
    panel(this, GUTTER, 104, half, 48);
    caps(this, GUTTER + 12, 111, 'SCORE');
    this.scoreText = val(this, GUTTER + 12, 125, '0', 22, { spacing: 0.44 });
    const gx = GUTTER + half + T.md;
    panel(this, gx, 104, half, 48);
    this.goalLabelText = kr(this, gx + 12 + 12 + T.sm, 118, '', { origin: [0, 0.5] });
    this.goalOfText = val(this, gx + half - 12, 118, '', 14, { color: T.textMuted, origin: [1, 0.5] });
    this.goalValText = val(this, gx + half - 12, 118, '', 14, { origin: [1, 0.5] });

    // Board frame + side cards (static chrome)
    panel(this, BOARD.x, BOARD.y, BOARD.w, BOARD.h, { fill: T.bgWell });
    for (const [k, [y, h]] of Object.entries(CARD)) { panel(this, SIDE.x, y, SIDE.w, h); void k; }
    caps(this, SIDE.x + 8, CARD.next[0] + 10, 'NEXT');
    this.holdCap = caps(this, SIDE.x + 8, CARD.hold[0] + 10, 'HOLD');
    caps(this, SIDE.x + 8, CARD.perks[0] + 10, 'PERKS');
    caps(this, SIDE.x + 8, CARD.speed[0] + 10, 'SPEED');
    this.speedText = val(this, SIDE.x + 8, CARD.speed[0] + 52, 'Lv1', 16, { origin: [0, 1] });
    caps(this, SIDE.x + 8, CARD.best[0] + 10, 'BEST');
    this.bestChainText = val(this, SIDE.x + 8, CARD.best[0] + 54, '0', 26, { origin: [0, 1] });
    caps(this, SIDE.x + 8 + 34, CARD.best[0] + 52, 'CHAIN', { origin: [0, 1] });

    // Controls: TouchPad + Hold button
    panel(this, PAD.x, PAD.y, PAD.w, PAD.h, { fill: T.bgPad, radius: T.rPad });
    const hints: [('drag' | 'rotate' | 'flick'), string][] = [['drag', '드래그 · 이동'], ['rotate', '탭 · 회전'], ['flick', '플릭 · 드롭']];
    const hintCx = [PAD.x + 16 + 30, PAD.x + PAD.w / 2, PAD.x + PAD.w - 16 - 30];
    hints.forEach(([ic, label], i) => { this.hintObjs.push(icon(this, hintCx[i]!, 736, ic, 24, { alpha: 0.8 }), kr(this, hintCx[i]!, 762, label, { origin: [0.5, 0.5] })); });
    panel(this, HOLD_BTN.x, HOLD_BTN.y, HOLD_BTN.w, HOLD_BTN.h, { stroke: T.borderStrong, radius: T.rPad });
    this.holdIcon = icon(this, HOLD_BTN.x + 42, HOLD_BTN.y + 34, 'hold', 24);
    this.holdLabel = caps(this, HOLD_BTN.x + 42, HOLD_BTN.y + 62, 'HOLD', { color: T.textPrimary, weight: '700', origin: [0.5, 0.5] });

    // ChainPopup (11:132): centered over the board, rebuilt on each chain
    this.popup = this.add.container(BOARD.x + BOARD.w / 2, 364).setDepth(10).setVisible(false);

    // Dynamic layers sit above the static chrome (board frame, cards) they were created before.
    for (const g of [this.hudG, this.gfx, this.stageG]) this.children.bringToTop(g);

    this.newRun();
    this.applySettings();
    this.bindInput();
  }

  /** Route an action to the run and play the matching effect (only when the piece actually changed). */
  private act(t: 'left' | 'right' | 'rotate' | 'soft' | 'hard' | 'hold'): void {
    const g = this.run.game, before = { x: g.piece.x, y: g.piece.y, rot: g.piece.rot, hold: g.hold };
    this.run.input({ t });
    const after = this.run.game;
    if (after !== g) return; // stage changed; the stage-clear sound is handled in checkPhase
    switch (t) {
      case 'left': case 'right': if (after.piece.x !== before.x) sfx('move'); break;
      case 'rotate': if (after.piece.rot !== before.rot) sfx('rotate'); break;
      case 'soft': if (after.piece.y !== before.y) sfx('soft'); break;
      case 'hard': sfx('hard'); break;
      case 'hold': if (after.hold !== before.hold) sfx('hold'); break;
    }
  }

  private bindInput() {
    const k = this.input.keyboard!;
    k.on('keydown-LEFT', () => this.act('left'));
    k.on('keydown-RIGHT', () => this.act('right'));
    k.on('keydown-UP', () => this.act('rotate'));
    k.on('keydown-X', () => this.act('rotate'));
    k.on('keydown-DOWN', () => this.act('soft'));
    k.on('keydown-SPACE', () => this.act('hard'));
    k.on('keydown-C', () => this.act('hold'));
    k.on('keydown-SHIFT', () => this.act('hold'));
    k.on('keydown-R', () => this.newRun());
    k.on('keydown-ESC', () => this.pause());
    k.on('keydown-P', () => this.pause());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (inRect(p.x, p.y, PAUSE_BTN) || inRect(p.x, p.y, SOUND_BTN)) return;
      this.dragging = true; this.moved = false; this.dragColAcc = 0;
      this.dragStartX = p.x; this.dragStartY = p.y; this.dragStartT = p.downTime;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const th = STEP * DRAG_CELLS[settings().dragSensitivity];      // relative drag: N cells of travel per column
      const rel = p.x - this.dragStartX - this.dragColAcc * STEP;
      if (rel >= th && this.stepCol(1)) this.dragColAcc++;
      else if (rel <= -th && this.stepCol(-1)) this.dragColAcc--;
      if (Math.abs(p.x - this.dragStartX) > 8 || Math.abs(p.y - this.dragStartY) > 8) this.moved = true;
      if (p.y - this.dragStartY > STEP * 1.2 && Math.abs(p.velocity.y) < 1.5) { this.act('soft'); this.dragStartY = p.y; }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      const dt = p.upTime - this.dragStartT, dy = p.y - this.dragStartY;
      if (dy > 60 && dt < 250) { this.act('hard'); return; }
      if (!this.moved && dt < 300) { this.act(inRect(p.x, p.y, HOLD_BTN) ? 'hold' : 'rotate'); return; }
      if (this.moved && settings().dropOnRelease) this.act('hard');   // 손 떼면 드롭
    });
  }

  private pause(): void {
    if (this.run.phase !== 'stage' || this.scene.isPaused()) return;
    this.dragging = false;
    this.scene.pause();
    this.scene.launch('pause', {
      run: this.run,
      onResume: () => { this.acc = 0; this.applySettings(); this.scene.resume(); },
      onRestart: () => this.newRun(),
      onHome: () => this.goHome(),
    });
  }

  /** Settings that change static chrome (the rest are read per frame). */
  private applySettings(): void {
    const on = settings().hints;
    for (const o of this.hintObjs) (o as Phaser.GameObjects.Image).setVisible(on);
  }

  private goHome(): void {
    for (const key of ['perk', 'result', 'pause']) if (this.scene.isActive(key)) this.scene.stop(key);
    this.scene.start('home');
  }

  private stepCol(dir: 1 | -1): boolean {
    const before = this.run.game.piece.x;
    this.act(dir === 1 ? 'right' : 'left');
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
    if (g !== this.evGame) { this.evGame = g; this.evIdx = 0; this.onStageChange(); }
    for (; this.evIdx < g.events.length; this.evIdx++) {
      const e = g.events[this.evIdx]!;
      if (e.kind === 'lock') { hapticLock(); sfx('lock'); }
      if (e.kind === 'clear' && e.steps) { this.showChain(e.steps); this.playClear(e.steps); }
    }
    if (g.bestChain > this.runBestChain) this.runBestChain = g.bestChain;
  }

  /** Per-stage chrome: perk slots, stage label, hold availability, speed level. */
  private onStageChange() {
    const r = this.run, g = r.game, n = r.stages.length - 1;
    this.stageText.setText(r.stage.boss ? 'BOSS' : `STAGE ${r.stageIndex + 1}`);
    this.stageOfText.setText(r.stage.boss ? 'FINAL' : `/ ${n} + BOSS`);
    this.goalLabelText.setText(goalLabel(r.goal));
    for (const o of this.stageObjs) o.destroy();
    this.stageObjs = [];
    const sg = this.stageG; sg.clear();
    for (let i = 0; i < MAX_PERK_SLOTS; i++) {
      const x = SIDE.x + 8 + (i % 2) * (30 + T.md), y = CARD.perks[0] + 31 + Math.floor(i / 2) * (30 + T.md);
      const p: PerkId | undefined = r.perks[i];
      if (p) { panel(this, x, y, 30, 30, { fill: T.bgPerk, stroke: T.borderPerk, radius: T.rSm, g: sg }); this.stageObjs.push(...perkGlyph(this, sg, x + 15, y + 15, p, 18)); }
      else { panel(this, x, y, 30, 30, { fill: T.bgPanel, stroke: T.borderDashed, dashed: true, radius: T.rSm, g: sg }); this.stageObjs.push(icon(this, x + 15, y + 15, 'plus', 14, { alpha: 0.5 })); }
    }
    const holdOn = g.cfg.holdEnabled;
    this.holdCap.setAlpha(holdOn ? 1 : 0.35); this.holdIcon.setAlpha(holdOn ? 1 : 0.3); this.holdLabel.setAlpha(holdOn ? 1 : 0.3);
    const lv = Math.max(1, Math.min(5, 6 - Math.ceil(g.cfg.gravityTicks / 12)));
    this.speedText.setText(`Lv${lv}`);
    // speed bars are drawn per frame from cfg; label here
  }

  /** Clear steps resolve instantly in core; stagger their sounds so a chain is heard as a run of rising notes. */
  private playClear(steps: ClearStep[]) {
    steps.forEach((st, i) => this.time.delayedCall(i * 110, () => {
      if (st.lineCells.length) sfx('line');
      if (st.colorCells.length) sfx('color', { volume: st.chain > 1 ? 0.6 : 1 });
      if (st.grayCleared) sfx('gray', { volume: 0.7 });
      if (st.chain > 1) sfx('chain', { chain: st.chain });
      if (st.crossBonus) sfx('cross');
    }));
  }

  private showChain(steps: ClearStep[]) {
    const last = steps[steps.length - 1]!;
    const pts = steps.reduce((a, s) => a + s.points, 0);
    const cross_ = steps.some((s) => s.crossBonus);
    const c = this.popup; c.removeAll(true);
    const g = this.add.graphics();
    const t1 = val(this, 0, 0, `${last.chain} CHAIN`, 30, { color: T.textStrong, spacing: 1.2, origin: [0.5, 0] });
    const t2 = val(this, 0, 36, `+${pts.toLocaleString()}`, 16, { color: T.accentCss, origin: [0.5, 0] });
    const items: Phaser.GameObjects.GameObject[] = [g, t1, t2];
    let h = 12 + 30 + 6 + 16 + 12, w = Math.max(t1.width, t2.width) + 36;
    if (cross_) {
      const pill = this.add.text(0, 62, 'LINE + COLOR ×1.5', { fontFamily: T.font, fontSize: '11px', fontStyle: '600', color: T.accentCss, letterSpacing: 0.66 }).setOrigin(0.5, 0);
      g.fillStyle(T.bgWell, 1); g.fillRoundedRect(-pill.width / 2 - 8, 59, pill.width + 16, 19, 9.5);
      g.lineStyle(1, T.accent, 1); g.strokeRoundedRect(-pill.width / 2 - 8, 59, pill.width + 16, 19, 9.5);
      items.push(pill); h += 6 + 19; w = Math.max(w, pill.width + 52);
    }
    const bg = this.add.graphics();
    bg.fillStyle(T.bgWell, 0.96); bg.fillRoundedRect(-w / 2, -12, w, h, T.rPopup);
    bg.lineStyle(1, T.accent, 1); bg.strokeRoundedRect(-w / 2, -12, w, h, T.rPopup);
    c.add([bg, ...items]);
    c.setVisible(true);
    this.popupUntil = this.time.now + 900;
    hapticChain(last.chain);
  }

  /** Hand off to the perk / result screens exactly once per phase change. */
  private checkPhase() {
    const r = this.run;
    if (r.phase === 'stage') { this.overlayShown = false; return; }
    if (this.overlayShown) return;
    this.overlayShown = true;
    this.dragging = false;
    this.popup.setVisible(false);
    this.scene.pause();
    sfx(r.phase === 'lost' ? 'gameOver' : 'stageClear');
    if (r.phase === 'pick') this.scene.launch('perk', { run: r });
    else {
      const before = loadSave().bestScore;
      recordRun(r);
      this.scene.launch('result', { run: r, isBest: r.score > before, onRestart: () => this.newRun(), onHome: () => this.goHome() });
    }
  }

  private rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, r = 6, alpha = 1) {
    g.fillStyle(color, alpha); g.fillRoundedRect(x, y, w, h, r);
  }

  private drawHud() {
    const r = this.run, g = r.game, G = this.hudG, n = r.stages.length - 1;
    G.clear();
    this.scoreText.setText(g.score.toLocaleString());
    // stage track
    const trackX = PAUSE_BTN.x + 44 + T.xl, trackW = SOUND_BTN.x - T.xl - trackX;
    stageTrack(this, trackX, 82, trackW, r.stageIndex, { g: G, segments: n });
    // goal card: icon, value, progress
    const half = (CW - T.md) / 2, gx = GUTTER + half + T.md;
    const goal = r.goal, [cur, target] = r.progress();
    const ix = gx + 12, iy = 112;
    if (goal.t === 'gray') { block(G, ix, iy, 12, T.block[6]!, { radius: T.rMini }); cross(G, ix + 6, iy + 6, 5); }
    else if (goal.t === 'score') { block(G, ix, iy, 12, T.accent, { radius: T.rMini }); }
    else { G.lineStyle(2, 0x9aa0b4, 1); G.strokeCircle(ix + 6, iy + 6, 5); G.lineBetween(ix + 6, iy + 6, ix + 6, iy + 2.5); G.lineBetween(ix + 6, iy + 6, ix + 8.5, iy + 6); }
    if (goal.t === 'survive') { this.goalValText.setText(`${Math.ceil((target - cur) / 60)}s`); this.goalOfText.setText(''); }
    else { const of = ` / ${target.toLocaleString()}`; this.goalOfText.setText(of); this.goalValText.setText(cur.toLocaleString()).setX(gx + half - 12 - this.goalOfText.width); }
    const bw = half - 24;
    this.rect(G, gx + 12, 136, bw, 4, T.fillInactive, 2);
    if (target > 0) this.rect(G, gx + 12, 136, Math.max(4, Math.floor(bw * cur / target)), 4, T.accent, 2);
    // sealed colors (boss): swatches with a slash, right after the goal icon row
    g.cfg.rules.sealedColors.forEach((c, i) => { const x = ix + 16 + i * 14; block(G, x, iy, 12, T.block[c]!, { radius: T.rMini, alpha: 0.6 }); G.lineStyle(1.5, 0xffffff, 0.9); G.lineBetween(x + 2, iy + 10, x + 10, iy + 2); });
    // speed bars
    const lv = Math.max(1, Math.min(5, 6 - Math.ceil(g.cfg.gravityTicks / 12)));
    for (let i = 0; i < 5; i++) { const h = 5 + i * 3; this.rect(G, SIDE.x + SIDE.w - 8 - (5 - i) * 6 + 2, CARD.speed[0] + 52 - h, 4, h, i < lv ? T.accent : T.fillInactive, 1); }
    this.bestChainText.setText(String(this.runBestChain));
  }

  private draw() {
    const g = this.run.game, G = this.gfx;
    G.clear();
    this.drawHud();
    if (this.time.now > this.popupUntil) this.popup.setVisible(false);
    const sealed = new Set<Cell>(g.cfg.rules.sealedColors);
    const glyphs = settings().glyphs;

    const ghost = g.ghost();
    const ghostCells = new Map(pieceCells(ghost).map(([x, y, c]) => [`${x},${y}`, c]));
    const active = new Set(pieceCells(g.piece).map(([x, y]) => `${x},${y}`));
    const will = new Set(g.previewClear().map(([x, y]) => `${x},${y}`));
    const laneCols = new Set(pieceCells(g.piece).map(([x]) => x));

    const cellAt = (px: number, py: number, c: Cell) => {
      const a = sealed.has(c) ? 0.55 : 1;
      block(G, px, py, CELL, T.block[c]!, { alpha: a });
      if (c === 6) cross(G, px + CELL / 2, py + CELL / 2, 5);
      else { if (glyphs) glyph(G, px + CELL / 2, py + CELL / 2, 12, c, a); if (sealed.has(c)) { G.lineStyle(2, 0xffffff, 0.7); G.lineBetween(px + 8, py + 22, px + 22, py + 8); } }
    };
    for (let y = 0; y < BOARD_H; y++) for (let x = 0; x < BOARD_W; x++) {
      const px = BOARD_X + x * STEP, py = BOARD_Y + y * STEP;
      const c = g.cellAt(x, y), key = `${x},${y}`;
      if (c === 0) {
        const lane = laneCols.has(x) && y > g.piece.y && y < ghost.y;
        this.rect(G, px, py, CELL, CELL, lane ? T.cellLane : T.cellEmpty);
        const gc = ghostCells.get(key);
        if (gc !== undefined && !active.has(key)) {   // Ghost: dashed-looking ring in the block color
          this.rect(G, px, py, CELL, CELL, T.block[gc]!, T.rCell, 0.18);
          G.lineStyle(2, will.has(key) ? T.accent : T.block[gc]!, will.has(key) ? 1 : 0.9);
          G.strokeRoundedRect(px + 1, py + 1, CELL - 2, CELL - 2, T.rCell);
        }
      } else {
        cellAt(px, py, c);
        if (will.has(key)) {   // WillClear: accent ring + glow
          G.lineStyle(2, T.accent, 0.35); G.strokeRoundedRect(px - 3, py - 3, CELL + 6, CELL + 6, T.rCell + 2);
          G.lineStyle(2, T.accent, 1); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, T.rCell + 1);
        }
      }
    }
    for (const [x, y, c] of pieceCells(g.piece)) {   // Active: white ring
      if (y < 0) continue;
      const px = BOARD_X + x * STEP, py = BOARD_Y + y * STEP;
      cellAt(px, py, c);
      G.lineStyle(2, 0xffffff, 0.95); G.strokeRoundedRect(px - 1, py - 1, CELL + 2, CELL + 2, T.rCell + 1);
    }

    // NEXT (16 / 12 / 12 px minis) + HOLD (14 px)
    const drawMini = (p: { kind: 'I3' | 'L3'; colors: readonly number[] }, cx: number, cy: number, size: number, alpha = 1) => {
      const cells = pieceCells({ ...p, rot: 0, x: 0, y: 0, colors: p.colors as [Cell, Cell, Cell] });
      const minX = Math.min(...cells.map((c) => c[0])), minY = Math.min(...cells.map((c) => c[1]));
      const w = (Math.max(...cells.map((c) => c[0])) - minX + 1) * (size + GAP) - GAP, h = (Math.max(...cells.map((c) => c[1])) - minY + 1) * (size + GAP) - GAP;
      for (const [x, y, c] of cells) block(G, cx - w / 2 + (x - minX) * (size + GAP), cy - h / 2 + (y - minY) * (size + GAP), size, T.block[c]!, { alpha: sealed.has(c) ? alpha * 0.5 : alpha, radius: T.rMini });
    };
    const nextSizes = [16, 12, 12], nextY = [CARD.next[0] + 40, CARD.next[0] + 72, CARD.next[0] + 98], nextAlpha = [1, 0.75, 0.6];
    g.next.slice(0, Math.min(3, g.cfg.previewCount)).forEach((p, i) => drawMini(p, SIDE.x + SIDE.w / 2, nextY[i]!, nextSizes[i]!, nextAlpha[i]));
    if (g.cfg.holdEnabled && g.hold) drawMini(g.hold, SIDE.x + SIDE.w / 2, CARD.hold[0] + 50, 14, g.holdUsed ? 0.4 : 1);
    if (g.cfg.holdEnabled) { this.holdIcon.setAlpha(g.holdUsed ? 0.4 : 1); this.holdLabel.setAlpha(g.holdUsed ? 0.4 : 1); }

    // Column rail (TouchPad)
    const railW = (PAD.w - 6 - GAP * (BOARD_W - 1)) / BOARD_W;
    for (let x = 0; x < BOARD_W; x++) this.rect(G, PAD.x + 3 + x * (railW + GAP), PAD.y + 10, railW, 4, laneCols.has(x) ? T.accent : T.fillRail, 2);
  }
}
