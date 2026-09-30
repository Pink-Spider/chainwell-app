import Phaser from 'phaser';
import { CHARACTER_BY_ID, CHARACTERS, isUnlocked } from '@chainwell/core';
import { T } from './theme';
import { loadSave } from './save';
import { W, GUTTER, CW, caps, val, kr, panel, block, glyph, icon, iconButton, button, tag } from './ui';
import { CHARACTER_TEXT } from './perkText';

/** Figma: Menu / Home (20:139). */
export class HomeScene extends Phaser.Scene {
  constructor() { super('home'); }

  create() {
    const save = loadSave();
    const c = CHARACTER_BY_ID[save.character];
    const unlocked = CHARACTERS.filter((ch) => isUnlocked(ch, save)).length;
    const play = () => this.scene.start('play', { character: save.character });

    // TopBar: settings / shop (screens not built yet → disabled)
    iconButton(this, GUTTER, 50, 'settings', () => undefined, { disabled: true });
    iconButton(this, W - GUTTER - 44, 50, 'cart', () => undefined, { disabled: true });

    // Logo: 2×2 mark rotated 8°, wordmark, subtitle
    const mark = this.add.graphics();
    const cell = 28, gap = T.xs, half = cell + gap / 2;
    for (let i = 0; i < 4; i++) {
      const bx = (i % 2) * (cell + gap) - half, by = Math.floor(i / 2) * (cell + gap) - half;
      block(mark, bx, by, cell, T.block[i + 1]!, { radius: 7 });
      glyph(mark, bx + cell / 2, by + cell / 2, 12, (i + 1) as 1 | 2 | 3 | 4);
    }
    mark.setPosition(W / 2, 184).setAngle(8);
    val(this, W / 2, 252, 'CHAINWELL', 40, { color: T.textStrong, spacing: 3.2, origin: [0.5, 0.5] });
    caps(this, W / 2, 292, 'CHAIN BLOCK PUZZLE ROGUELIKE', { origin: [0.5, 0.5] });

    // Card/Best
    panel(this, GUTTER, 316, CW, 59);
    const cols: [string, string, number, number][] = [
      ['BEST SCORE', save.bestScore.toLocaleString(), GUTTER + 16, 0],
      ['DEEPEST', `${Math.min(save.bestStage + 1, 9)} / 8`, W / 2, 0.5],
      ['RUNS', String(save.runsPlayed), W - GUTTER - 16, 1],
    ];
    for (const [k, v, x, ox] of cols) { caps(this, x, 328, k, { origin: [ox, 0] }); val(this, x, 344, v, 16, { origin: [ox, 0] }); }

    // Button/Start Run (72px, glow)
    panel(this, GUTTER, 574, CW, 72, { fill: T.accent, stroke: null, radius: T.rPad, glow: true });
    button(this, GUTTER, 574, CW, 72, '런 시작', play, { primary: true, size: 18, icon: 'play', iconSize: 24, radius: T.rPad, sub: `CHARACTER: ${c.id.toUpperCase()}` });

    // Row/캐릭터
    this.row(662, 'trophy', '캐릭터', `${CHARACTER_TEXT[c.id].name} · ${unlocked} / ${CHARACTERS.length} 해금`, () => this.scene.start('character'));
    // Row/데일리 챌린지 (2차)
    this.row(744, 'lock', '데일리 챌린지', '전 세계가 같은 시드로 하루 한 판', null, 'SOON');

    this.input.keyboard?.once('keydown-ENTER', play);
    this.input.keyboard?.once('keydown-SPACE', play);
  }

  private row(y: number, ic: 'trophy' | 'lock', title: string, sub: string, onTap: (() => void) | null, soon?: string) {
    const h = 66, alpha = onTap ? 1 : 0.8;
    panel(this, GUTTER, y, CW, h).setAlpha(alpha);
    panel(this, GUTTER + 12, y + 13, 40, 40, { fill: T.bgPerk, stroke: T.borderPerk, radius: 10 }).setAlpha(alpha);
    icon(this, GUTTER + 32, y + 33, ic, 20, { alpha });
    const color = onTap ? T.textPrimary : T.textMuted;
    kr(this, GUTTER + 64, y + 19, title, { bold: true, color }).setAlpha(alpha);
    kr(this, GUTTER + 64, y + 35, sub).setAlpha(alpha);
    let right = W - GUTTER - 12;
    icon(this, right - 9, y + h / 2, 'chevron-right', 18, { alpha: alpha * 0.9 });
    right -= 18 + T.xl;
    if (soon) tag(this, right, y + h / 2, soon, { right: true });
    if (onTap) this.add.zone(GUTTER, y, CW, h).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', onTap);
  }
}
