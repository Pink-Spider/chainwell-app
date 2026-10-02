import Phaser from 'phaser';
import { CHARACTERS, isUnlocked, type Run } from '@chainwell/core';
import { T } from './theme';
import { loadSave } from './save';
import { W, GUTTER, CW, caps, val, kr, panel, icon, iconButton, button, tag, stageTrack, fitCamera, toast } from './ui';
import { showRewarded, maybeShowInterstitial } from './monetize';
import { t, charName, unlockText } from './i18n';

/** Figma: Ingame / Run End (19:127). Full-screen; replaces 'play'. */
export class ResultScene extends Phaser.Scene {
  constructor() { super('result'); }

  /**
   * `onContinue` is present only when the run can still be revived (lost, continue unused);
   * `finalize` records the run and returns the lifetime run count, used for the interstitial cadence.
   */
  create(data: { run: Run; isBest: boolean; onRestart: () => void; onHome: () => void; onContinue?: () => void; finalize: () => number }) {
    fitCamera(this);
    const { run, isBest } = data;
    const won = run.phase === 'won', n = run.stages.length - 1;
    const st = run.stats();
    this.add.graphics().fillStyle(T.bgApp, 1).fillRect(0, 0, W, 844);

    iconButton(this, W - GUTTER - 44, 50, 'share', () => undefined, { disabled: true });

    // Title + subtitle + track
    val(this, W / 2, 123, won ? 'RUN CLEAR' : 'RUN OVER', 30, { color: won ? T.accentCss : T.textStrong, spacing: 1.2, origin: [0.5, 0.5] });
    const depth = run.stage.boss ? t('result.bossReached') : t('result.depth', { d: run.stageIndex + 1, n, left: n - run.stageIndex });
    kr(this, W / 2, 150, won ? t('result.cleared') : depth, { origin: [0.5, 0.5] });
    stageTrack(this, W / 2 - 120, 172, 240, won ? n + 1 : run.stageIndex, { failed: !won, segments: n });

    // Card/Score
    panel(this, GUTTER, 195, CW, 120, { radius: T.rPad });
    caps(this, W / 2, 211, 'FINAL SCORE', { origin: [0.5, 0] });
    val(this, W / 2, 246, run.score.toLocaleString(), 36, { spacing: 0.72, origin: [0.5, 0.5] });
    if (isBest) tag(this, W / 2 - 46, 285, 'NEW BEST', { accent: true, icon: 'trophy' });

    // Stats 2×2
    const mm = `${Math.floor(st.ticks / 3600)}:${String(Math.floor((st.ticks % 3600) / 60)).padStart(2, '0')}`;
    const stats: [string, string][] = [['BEST CHAIN', String(st.bestChain)], ['LINES', String(st.lines)], ['COLOR CLEARS', String(st.colorClears)], ['TIME', mm]];
    stats.forEach(([k, v], i) => {
      const x = GUTTER + (i % 2) * (175 + T.md), y = 329 + Math.floor(i / 2) * (47 + T.md);
      panel(this, x, y, 175, 47);
      caps(this, x + 12, y + 10, k); val(this, x + 12, y + 24, v, 16);
    });

    // Card/Unlock Progress: next locked character
    const save = loadSave();
    const next = CHARACTERS.find((c) => !isUnlocked(c, save));
    panel(this, GUTTER, 461, CW, 70);
    panel(this, 32, 476, 30, 30, { fill: T.bgPerk, stroke: T.borderPerk, radius: 8 });
    icon(this, 47, 491, next ? 'lock' : 'trophy', 16);
    if (next) {
      const u = next.unlock;
      const [cur, tgt] = u.t === 'runs' ? [save.runsPlayed, u.count] : u.t === 'stage' ? [save.bestStage, u.reach] : u.t === 'wins' ? [save.runsWon, u.count] : [1, 1];
      kr(this, 70, 476, t('result.nextUnlock', { name: charName(next.id) }), { bold: true, color: T.textPrimary });
      kr(this, 70, 491, unlockText(u));
      val(this, W - 32, 491, `${Math.min(cur, tgt)} / ${tgt}`, 16, { color: T.accentCss, origin: [1, 0.5] });
      const bg = this.add.graphics();
      bg.fillStyle(T.fillInactive, 1); bg.fillRoundedRect(32, 514, 100, 6, 3);
      bg.fillStyle(T.accent, 1); bg.fillRoundedRect(32, 514, Math.max(6, Math.min(100, Math.floor(100 * cur / tgt))), 6, 3);
    } else {
      kr(this, 70, 476, t('result.allUnlocked'), { bold: true, color: T.textPrimary });
      kr(this, 70, 491, t('result.allUnlockedSub'));
    }

    let busy = false;
    // Leaving the result screen ends the run for good: record it, then maybe an interstitial, then go.
    const close = (fn: () => void) => async () => {
      if (busy) return; busy = true;
      const runs = data.finalize();
      await maybeShowInterstitial(runs);
      if (!this.scene.isActive()) return;
      this.scene.stop(); fn();
    };
    const tryContinue = async () => {
      if (busy || !data.onContinue) return; busy = true;
      const loading = toast(this, t('ad.loading'), 60_000);
      const ok = await showRewarded('continue');
      loading.t.destroy(); loading.g.destroy();
      busy = false;
      if (!this.scene.isActive()) return;
      if (ok) { this.scene.stop(); data.onContinue(); } else toast(this, t('ad.failed'));
    };
    this.time.delayedCall(300, () => {
      const bw = (CW - T.xl) / 2;
      if (data.onContinue) {
        button(this, GUTTER, 626, CW, 52, t('result.continue'), tryContinue, { primary: true, sub: t('result.continueSub') });
        tag(this, W - GUTTER - 14, 652, 'AD', { accent: false, right: true });
        button(this, GUTTER, 692, CW, 52, t('result.newRun'), close(data.onRestart));
      } else {
        button(this, GUTTER, 692, CW, 52, t('result.newRun'), close(data.onRestart), { primary: true });
      }
      button(this, GUTTER, 758, bw, 52, t('result.home'), close(data.onHome));
      button(this, GUTTER + bw + T.xl, 758, bw, 52, t('result.replay'), () => undefined, { disabled: true });
      this.input.keyboard?.once('keydown-ENTER', data.onContinue ? tryContinue : close(data.onRestart));
    });
  }
}
