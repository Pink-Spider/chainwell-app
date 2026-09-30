import Phaser from 'phaser';
import { PERK_BY_ID, type Run } from '@chainwell/core';
import { T } from './theme';
import { W, GUTTER, CW, caps, val, kr, panel, icon, button, tag, stageTrack, perkGlyph } from './ui';
import { PERK_TEXT, CATEGORY_TEXT } from './perkText';

const MAX_PERKS = 6;

/** Figma: Ingame / Perk Select (14:109). Full-screen; 'play' is paused underneath. */
export class PerkScene extends Phaser.Scene {
  private selected = 0;
  private cardG!: Phaser.GameObjects.Graphics;
  private run!: Run;
  constructor() { super('perk'); }

  create(data: { run: Run }) {
    const run = this.run = data.run;
    this.selected = 0;
    this.add.graphics().fillStyle(T.bgApp, 1).fillRect(0, 0, W, 844);
    const n = run.stages.length - 1; // regular stages

    // Header + track
    caps(this, GUTTER, 50, `STAGE ${run.stageIndex + 1} CLEAR`, { size: 13, spacing: 1.3, color: T.accentCss, weight: '700' });
    const nextIdx = run.stageIndex + 1;
    caps(this, W - GUTTER, 51, nextIdx >= n ? 'NEXT: BOSS' : `NEXT: STAGE ${nextIdx + 1} / ${n}`, { origin: [1, 0] });
    stageTrack(this, GUTTER, 79, CW, run.stageIndex + 1, { segments: n });

    // Card/Stage Summary
    panel(this, GUTTER, 112, CW, 64);
    const st = run.stats();
    const cols: [string, string, number, number, string | undefined][] = [
      ['SCORE', run.score.toLocaleString(), GUTTER + 16, 0, undefined],
      ['BEST CHAIN', String(st.bestChain), W / 2, 0.5, undefined],
      ['STAGE', `+${run.game.score.toLocaleString()}`, W - GUTTER - 16, 1, T.accentCss],
    ];
    for (const [k, v, x, ox, col] of cols) { caps(this, x, 126, k, { origin: [ox, 0] }); val(this, x, 141, v, 16, col ? { origin: [ox, 0], color: col } : { origin: [ox, 0] }); }

    // Title
    val(this, W / 2, 219, 'CHOOSE A PERK', 30, { color: T.textStrong, spacing: 1.2, origin: [0.5, 0.5] });
    kr(this, W / 2, 247, '이번 런에서만 유지됩니다', { origin: [0.5, 0.5] });

    // Perk cards
    this.cardG = this.add.graphics();
    const detailG = this.add.graphics();
    run.offer.forEach((id, i) => {
      const y = 273 + i * (94 + T.xl), def = PERK_BY_ID[id], txt = PERK_TEXT[id];
      panel(this, 32, y + 21, 52, 52, { fill: T.bgPerk, stroke: T.borderPerk, g: detailG });
      perkGlyph(this, detailG, 58, y + 47, id, 28);
      kr(this, 96, y + 14, CATEGORY_TEXT[def.category]);
      tag(this, W - 32, y + 22, txt.rare ? 'RARE' : 'COMMON', { accent: txt.rare, right: true });
      kr(this, 96, y + 33, txt.name, { size: 15, bold: true, color: T.textStrong });
      kr(this, 96, y + 56, txt.desc, { wrap: W - 32 - 96 });
      this.add.zone(GUTTER, y, CW, 94).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.selected = i; this.drawCards(); });
      this.input.keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, () => { this.selected = i; this.drawCards(); });
    });
    this.drawCards();

    // Card/Current Perks
    panel(this, GUTTER, 599, CW, 52);
    const cur = caps(this, GUTTER + 14, 625, 'CURRENT', { origin: [0, 0.5] });
    const slotG = this.add.graphics();
    let sx = GUTTER + 14 + cur.width + T.md;
    for (let i = 0; i < MAX_PERKS; i++) {
      const p = run.perks[i];
      if (p) { panel(this, sx, 610, 30, 30, { fill: T.bgPerk, stroke: T.borderPerk, radius: 8, g: slotG }); perkGlyph(this, slotG, sx + 15, 625, p, 18); }
      else { panel(this, sx, 610, 30, 30, { fill: T.bgPanel, stroke: T.borderDashed, dashed: true, radius: 8, g: slotG }); icon(this, sx + 15, 625, 'plus', 12, { alpha: 0.6 }); }
      sx += 30 + T.md;
    }
    kr(this, W - GUTTER - 14, 625, `${run.perks.length} / ${MAX_PERKS}`, { origin: [1, 0.5] });

    // Actions
    const bw = (CW - T.xl) / 2;
    button(this, GUTTER, 723, bw, 52, '리롤', () => undefined, { disabled: true, icon: 'rotate', size: 11 });
    tag(this, GUTTER + bw - 14, 749, 'AD', { accent: true, right: true }).g.setAlpha(0.4);
    button(this, GUTTER + bw + T.xl, 723, bw, 52, '선택하고 계속', () => this.confirm(), { primary: true });
    const skip = kr(this, W / 2, 802, '퍽 없이 진행', { origin: [0.5, 0.5] });
    this.add.zone(skip.x - 60, skip.y - 14, 120, 28).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.leave(() => run.skip()));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
  }

  private drawCards() {
    const g = this.cardG; g.clear();
    this.run.offer.forEach((_, i) => {
      const y = 273 + i * (94 + T.xl), on = i === this.selected;
      panel(this, GUTTER, y, CW, 94, { radius: T.rPad, stroke: on ? T.accent : T.border, strokeW: on ? 2 : 1, glow: on, g });
    });
  }
  private confirm() { const i = this.selected; this.leave(() => this.run.pick(i)); }
  private leave(fn: () => void) { fn(); this.scene.stop(); this.scene.resume('play'); }
}
