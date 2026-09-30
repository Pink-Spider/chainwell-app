import Phaser from 'phaser';
import { CHARACTER_BY_ID } from '@chainwell/core';
import { T } from './theme';
import { loadSave } from './save';
import { button, cap, W } from './ui';
import { CHARACTER_TEXT, PERK_TEXT } from './perkText';

export class HomeScene extends Phaser.Scene {
  constructor() { super('home'); }

  create() {
    const save = loadSave();
    const c = CHARACTER_BY_ID[save.character];
    this.add.text(W / 2, 250, 'CHAINWELL', { fontFamily: T.font, fontSize: '40px', color: T.textStrong, fontStyle: 'bold', letterSpacing: 4 }).setOrigin(0.5);
    this.add.text(W / 2, 292, 'CHAIN BLOCK PUZZLE ROGUELIKE', { ...cap, color: T.accentCss }).setOrigin(0.5);
    // well glyph
    const g = this.add.graphics();
    g.fillStyle(T.bgWell, 1); g.fillRoundedRect(W / 2 - 40, 330, 80, 120, 12);
    for (let i = 0; i < 4; i++) { g.fillStyle(T.block[i + 1]!, 1); g.fillRoundedRect(W / 2 - 30 + (i % 2) * 32, 400 - Math.floor(i / 2) * 32, 28, 28, 6); }

    this.add.text(W / 2, 480, save.bestScore ? `BEST ${save.bestScore.toLocaleString()}` : '', cap).setOrigin(0.5);

    button(this, 40, 540, W - 80, 64, 'PLAY', () => this.scene.start('play', { character: save.character }), { primary: true, size: 20 });
    button(this, 40, 620, W - 80, 56, `${CHARACTER_TEXT[c.id].name}  ·  ${c.startPerks.map(p => PERK_TEXT[p].name).join(', ')}`, () => this.scene.start('character'), { size: 14 });
    this.add.text(W / 2, 700, '캐릭터 변경은 위 카드', cap).setOrigin(0.5);
    this.add.text(W / 2, 800, `runs ${save.runsPlayed}  ·  won ${save.runsWon}  ·  stage ${save.bestStage + 1}`, { ...cap, fontSize: '10px' }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('play', { character: save.character }));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('play', { character: save.character }));
  }
}
