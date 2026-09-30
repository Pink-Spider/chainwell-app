import Phaser from 'phaser';
import { CHARACTERS, isUnlocked } from '@chainwell/core';
import { T } from './theme';
import { loadSave, writeSave } from './save';
import { button, cap, W } from './ui';
import { CHARACTER_TEXT, PERK_TEXT, unlockText } from './perkText';

const CARD_W = W - 48, CARD_H = 92, GAP = 12, TOP = 130;

export class CharacterScene extends Phaser.Scene {
  constructor() { super('character'); }

  create() {
    const save = loadSave();
    let selected = save.character;
    this.add.text(24, 60, '캐릭터', { fontFamily: T.font, fontSize: '26px', color: T.textStrong, fontStyle: 'bold' });
    this.add.text(24, 96, '시작 퍽이 다르다. 해금은 플레이로만.', cap);

    const marks: Phaser.GameObjects.Graphics[] = [];
    const redraw = () => marks.forEach((m, i) => {
      const y = TOP + i * (CARD_H + GAP);
      m.clear();
      const on = CHARACTERS[i]!.id === selected;
      m.lineStyle(on ? 2 : 1, on ? T.accent : T.borderStrong, 1); m.strokeRoundedRect(24, y, CARD_W, CARD_H, 14);
    });

    CHARACTERS.forEach((c, i) => {
      const y = TOP + i * (CARD_H + GAP);
      const unlocked = isUnlocked(c, save);
      const txt = CHARACTER_TEXT[c.id];
      const g = this.add.graphics();
      g.fillStyle(T.bgPanel, unlocked ? 1 : 0.5); g.fillRoundedRect(24, y, CARD_W, CARD_H, 14);
      const m = this.add.graphics(); marks.push(m);
      const a = unlocked ? 1 : 0.45;
      this.add.text(44, y + 14, txt.name, { fontFamily: T.font, fontSize: '20px', color: T.textStrong, fontStyle: 'bold' }).setAlpha(a);
      this.add.text(44, y + 42, txt.tagline, { fontFamily: T.font, fontSize: '12px', color: T.textMuted }).setAlpha(a);
      const perk = c.startPerks.map(p => `${PERK_TEXT[p].name} — ${PERK_TEXT[p].desc}`).join(' / ');
      this.add.text(44, y + 64, unlocked ? perk : `🔒 ${unlockText(c.unlock)}`, { ...cap, color: unlocked ? T.accentCss : T.textMuted });
      if (unlocked) {
        const z = this.add.zone(24, y, CARD_W, CARD_H).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerup', () => { selected = c.id; writeSave({ character: selected }); redraw(); });
      }
    });
    redraw();

    button(this, 40, 700, W - 80, 56, '홈으로', () => this.scene.start('home'));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('home'));
  }
}
