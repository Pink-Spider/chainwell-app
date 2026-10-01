import Phaser from 'phaser';
import type { Run } from '@chainwell/core';
import { T } from './theme';
import { W, H, caps, val, kr, panel, scrim, button, icon, perkGlyph, fitCamera } from './ui';
import { PERK_TEXT } from './perkText';

/** Figma: Ingame / Paused → Pause Sheet (22:543). Overlay over a paused 'play'. */
export class PauseScene extends Phaser.Scene {
  constructor() { super('pause'); }

  create(data: { run: Run; onResume: () => void; onRestart: () => void; onHome: () => void }) {
    fitCamera(this);
    const { run } = data;
    scrim(this, 0.72);
    const sw = 326, sx = (W - sw) / 2, pad = 16;
    const perks = run.perks;
    const rows = Math.max(1, perks.length);
    const sh = 20 + 26 + 14 + 11 + 14 + (4 + 11 + 8 + rows * 44 + (rows - 1) * 8) + 14 + 52 + 14 + 62 + 14 + 11 + 20;
    const sy = Math.round((H - sh) / 2);
    const g = panel(this, sx, sy, sw, sh, { stroke: T.borderStrong, radius: T.rPad });
    g.fillStyle(0x000000, 0.5); // drop shadow hint under the sheet
    let y = sy + 20;
    val(this, W / 2, y + 13, 'PAUSED', 26, { color: T.textStrong, spacing: 1.04, origin: [0.5, 0.5] }); y += 26 + 14;
    caps(this, W / 2, y + 5, `STAGE ${run.stageIndex + 1} / ${run.stages.length} · ${run.score.toLocaleString()} PTS`, { origin: [0.5, 0.5] }); y += 11 + 14 + 4;
    caps(this, sx + pad, y, 'CURRENT PERKS'); y += 11 + 8;
    const rg = this.add.graphics();
    if (!perks.length) {
      panel(this, sx + pad, y, sw - pad * 2, 44, { fill: T.bgWell, dashed: true, stroke: T.borderDashed, g: rg });
      kr(this, W / 2, y + 22, '아직 없음 · 스테이지를 클리어하면 선택', { origin: [0.5, 0.5] });
      y += 44;
    } else for (const p of perks) {
      panel(this, sx + pad, y, sw - pad * 2, 44, { fill: T.bgWell, g: rg });
      panel(this, sx + pad + 12, y + 8, 28, 28, { fill: T.bgPerk, stroke: T.borderPerk, radius: 8, g: rg });
      perkGlyph(this, rg, sx + pad + 26, y + 22, p, 16);
      kr(this, sx + pad + 52, y + 10, PERK_TEXT[p].name, { bold: true, color: T.textPrimary });
      kr(this, sx + pad + 52, y + 24, PERK_TEXT[p].desc);
      y += 44 + 8;
    }
    if (perks.length) y -= 8;
    y += 14;
    const close = (fn: () => void) => () => { this.scene.stop(); fn(); };
    button(this, sx + pad, y, sw - pad * 2, 52, '계속하기', close(data.onResume), { primary: true }); y += 52 + 14;
    const bw = (sw - pad * 2 - 16) / 3;
    const sq = (i: number, ic: 'restart' | 'settings' | 'home', label: string, fn: (() => void) | null) => {
      const x = sx + pad + i * (bw + 8), alpha = fn ? 1 : 0.45;
      panel(this, x, y, bw, 62, { fill: T.bgWell, stroke: T.borderStrong }).setAlpha(alpha);
      icon(this, x + bw / 2, y + 20, ic, 20, { alpha });
      kr(this, x + bw / 2, y + 44, label, { color: T.textPrimary, origin: [0.5, 0.5] }).setAlpha(alpha);
      if (fn) this.add.zone(x, y, bw, 62).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', close(fn));
    };
    sq(0, 'restart', '다시 시작', data.onRestart);
    // A ScenePlugin ignores launch() of its own key, so re-open the sheet through the play scene's plugin.
    sq(1, 'settings', '설정', () => this.scene.launch('settings', { onBack: () => this.scene.get('play').scene.launch('pause', data) }));
    sq(2, 'home', '나가기', data.onHome);
    y += 62 + 14;
    kr(this, W / 2, y + 5, '나가면 현재 런의 진행이 사라집니다', { origin: [0.5, 0.5] });

    this.input.keyboard?.once('keydown-ESC', close(data.onResume));
    this.input.keyboard?.once('keydown-P', close(data.onResume));
  }
}
