import Phaser from 'phaser';
import type { Run } from '@chainwell/core';
import { T } from './theme';
import { PERK_TEXT } from './perkText';

const W = 390;

/** Overlay: run cleared or lost. Tap / Enter to start a new run. */
export class ResultScene extends Phaser.Scene {
  constructor() { super('result'); }

  create(data: { run: Run; bestChain: number; onRestart: () => void }) {
    const { run, bestChain, onRestart } = data;
    const won = run.phase === 'won';
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.82); g.fillRect(0, 0, W, 844);

    const cap = { fontFamily: T.font, fontSize: '12px', color: T.textMuted, fontStyle: 'bold' };
    const big = { fontFamily: T.font, fontSize: '30px', color: T.textStrong, fontStyle: 'bold' };
    this.add.text(W / 2, 220, won ? 'RUN CLEAR' : 'GAME OVER', { ...big, color: won ? T.accentCss : T.textStrong }).setOrigin(0.5);
    const reached = run.stage.boss ? 'BOSS' : `STAGE ${run.stageIndex + 1} / ${run.stages.length}`;
    this.add.text(W / 2, 258, won ? '우물 바닥에 닿았다' : `${reached}에서 멈춤`, cap).setOrigin(0.5);

    const rows: [string, string][] = [
      ['TOTAL', run.score.toLocaleString()],
      ['BEST CHAIN', String(bestChain)],
      ['PERKS', run.perks.length ? run.perks.map((p) => PERK_TEXT[p].name).join(' · ') : '없음'],
    ];
    let y = 330;
    for (const [k, v] of rows) {
      this.add.text(40, y, k, cap);
      this.add.text(40, y + 18, v, { fontFamily: T.font, fontSize: k === 'PERKS' ? '14px' : '24px', color: T.textPrimary, fontStyle: 'bold', wordWrap: { width: W - 80 } });
      y += k === 'PERKS' ? 70 : 64;
    }
    this.add.text(W / 2, 640, '탭하여 새 런 시작', { ...cap, color: T.accentCss }).setOrigin(0.5);

    const go = () => { this.scene.stop(); onRestart(); };
    this.time.delayedCall(400, () => {
      this.input.once('pointerup', go);
      this.input.keyboard?.once('keydown-ENTER', go);
    });
  }
}
