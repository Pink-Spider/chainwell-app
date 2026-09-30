import Phaser from 'phaser';
import { PERK_BY_ID, type Run } from '@chainwell/core';
import { T } from './theme';
import { PERK_TEXT, CATEGORY_TEXT } from './perkText';

const W = 390, CARD_W = 330, CARD_H = 96, CARD_GAP = 14, CARD_X = (W - CARD_W) / 2;

/** Overlay: pick 1 of the run's offered perks. Resumes 'play' after the pick. */
export class PerkScene extends Phaser.Scene {
  constructor() { super('perk'); }

  create(data: { run: Run }) {
    const { run } = data;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.78); g.fillRect(0, 0, W, 844);

    const cap = { fontFamily: T.font, fontSize: '12px', color: T.textMuted, fontStyle: 'bold' };
    this.add.text(W / 2, 200, `STAGE ${run.stageIndex + 1} CLEAR`, { ...cap, color: T.accentCss }).setOrigin(0.5);
    this.add.text(W / 2, 232, '퍽 선택', { fontFamily: T.font, fontSize: '26px', color: T.textStrong, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 262, '셋 중 하나를 골라 다음 스테이지로', cap).setOrigin(0.5);

    const top = 300;
    run.offer.forEach((id, i) => {
      const y = top + i * (CARD_H + CARD_GAP);
      const def = PERK_BY_ID[id], txt = PERK_TEXT[id];
      const card = this.add.graphics();
      card.fillStyle(T.bgPerk, 1); card.fillRoundedRect(CARD_X, y, CARD_W, CARD_H, 14);
      card.lineStyle(1.5, T.accent, 0.7); card.strokeRoundedRect(CARD_X, y, CARD_W, CARD_H, 14);
      this.add.text(CARD_X + 18, y + 14, `${CATEGORY_TEXT[def.category]}  ·  ${i + 1}`, cap);
      this.add.text(CARD_X + 18, y + 34, txt.name, { fontFamily: T.font, fontSize: '20px', color: T.textStrong, fontStyle: 'bold' });
      this.add.text(CARD_X + 18, y + 62, txt.desc, { fontFamily: T.font, fontSize: '13px', color: T.textPrimary });
      const zone = this.add.zone(CARD_X, y, CARD_W, CARD_H).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.choose(run, i));
      this.input.keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, () => this.choose(run, i));
    });
  }

  private choose(run: Run, i: number) {
    run.pick(i);
    this.scene.stop();
    this.scene.resume('play');
  }
}
