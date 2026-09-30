import Phaser from 'phaser';
import { T } from './theme';
import { backdrop, button, cap, W } from './ui';

/** Overlay over a paused 'play'. Resume / restart the run / back to home. */
export class PauseScene extends Phaser.Scene {
  constructor() { super('pause'); }

  create(data: { onResume: () => void; onRestart: () => void; onHome: () => void }) {
    backdrop(this, 0.75);
    this.add.text(W / 2, 300, '일시정지', { fontFamily: T.font, fontSize: '28px', color: T.textStrong, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(W / 2, 336, '런은 그대로 멈춰 있다', cap).setOrigin(0.5);
    const close = (fn: () => void) => () => { this.scene.stop(); fn(); };
    button(this, 40, 400, W - 80, 60, '계속하기', close(data.onResume), { primary: true, size: 18 });
    button(this, 40, 476, W - 80, 56, '새 런', close(data.onRestart));
    button(this, 40, 548, W - 80, 56, '홈으로', close(data.onHome));
    this.input.keyboard?.once('keydown-ESC', close(data.onResume));
    this.input.keyboard?.once('keydown-P', close(data.onResume));
  }
}
