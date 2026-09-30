import Phaser from 'phaser';
import type { Run } from '@chainwell/core';
import { T } from './theme';
import { PERK_TEXT } from './perkText';
import { backdrop, button, cap, W } from './ui';

/** Overlay: run cleared or lost. Retry (same character) or go home. */
export class ResultScene extends Phaser.Scene {
  constructor() { super('result'); }

  create(data: { run: Run; bestChain: number; isBest: boolean; onRestart: () => void; onHome: () => void }) {
    const { run, bestChain, isBest, onRestart, onHome } = data;
    const won = run.phase === 'won';
    backdrop(this, 0.85);

    const big = { fontFamily: T.font, fontSize: '30px', color: T.textStrong, fontStyle: 'bold' };
    this.add.text(W / 2, 200, won ? 'RUN CLEAR' : 'GAME OVER', { ...big, color: won ? T.accentCss : T.textStrong }).setOrigin(0.5);
    const reached = run.stage.boss ? 'BOSS' : `STAGE ${run.stageIndex + 1} / ${run.stages.length}`;
    this.add.text(W / 2, 238, won ? '우물 바닥에 닿았다' : `${reached}에서 멈춤`, cap).setOrigin(0.5);

    const rows: [string, string][] = [
      ['TOTAL' + (isBest ? '  ·  NEW BEST' : ''), run.score.toLocaleString()],
      ['BEST CHAIN', String(bestChain)],
      ['PERKS', run.perks.length ? run.perks.map((p) => PERK_TEXT[p].name).join(' · ') : '없음'],
    ];
    let y = 300;
    for (const [k, v] of rows) {
      this.add.text(40, y, k, { ...cap, color: k.includes('BEST') && isBest && k.startsWith('TOTAL') ? T.accentCss : T.textMuted });
      const perks = k === 'PERKS';
      this.add.text(40, y + 18, v, { fontFamily: T.font, fontSize: perks ? '14px' : '24px', color: T.textPrimary, fontStyle: 'bold', wordWrap: { width: W - 80 } });
      y += perks ? 84 : 64;
    }
    const close = (fn: () => void) => () => { this.scene.stop(); fn(); };
    this.time.delayedCall(350, () => {
      button(this, 40, 560, W - 80, 60, '다시 도전', close(onRestart), { primary: true, size: 18 });
      button(this, 40, 636, W - 80, 56, '홈으로', close(onHome));
      this.input.keyboard?.once('keydown-ENTER', close(onRestart));
    });
  }
}
