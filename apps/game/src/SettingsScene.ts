import Phaser from 'phaser';
import { T } from './theme';
import { settings, setSetting, type Settings, type DragSensitivity } from './save';
import { t, sensitivityText, type Key } from './i18n';
import { W, GUTTER, CW, caps, val, kr, panel, block, glyph, icon, iconButton, toggle, fitCamera } from './ui';

const ROW_H = 44, ROW_H2 = 50; // one-line / two-line rows (py 10 + 11 [+2+11])
const SENS_NEXT: Record<DragSensitivity, DragSensitivity> = { low: 'normal', normal: 'high', high: 'low' };
const LANG_NEXT: Record<Settings['lang'], Settings['lang']> = { system: 'ko', ko: 'en', en: 'system' };

type Row =
  | { t: 'toggle'; key: keyof Settings; title: string; sub?: string; disabled?: boolean }
  | { t: 'link'; title: string; sub?: string; value?: () => string; onTap?: () => void; preview?: boolean };

/** Figma: Menu / Settings (24:326). `onBack` returns to wherever we came from (home or the pause sheet). */
export class SettingsScene extends Phaser.Scene {
  constructor() { super('settings'); }

  create(data: { onBack: () => void }) {
    fitCamera(this);
    this.add.graphics().fillStyle(T.bgApp, 1).fillRect(0, 0, W, 844);
    const back = () => { this.scene.stop(); data.onBack(); };
    iconButton(this, GUTTER, 50, 'chevron-right', back).setFlipX(true);
    val(this, 72, 72, t('settings.title'), 16, { spacing: 1.6, origin: [0, 0.5] });

    let y = 106;
    const groups: [string, Row[]][] = [
      ['SOUND', [
        { t: 'toggle', key: 'sfx', title: t('settings.sfx') },
        { t: 'toggle', key: 'music', title: t('settings.music') },
        { t: 'toggle', key: 'haptics', title: t('settings.haptics'), sub: t('settings.hapticsSub') },
      ]],
      ['ACCESSIBILITY', [
        { t: 'toggle', key: 'glyphs', title: t('settings.glyphs'), sub: t('settings.glyphsSub') },
        { t: 'link', title: t('settings.palette'), preview: true },
        { t: 'toggle', key: 'bigText', title: t('settings.bigText') },
      ]],
      ['CONTROLS', [
        { t: 'toggle', key: 'dropOnRelease', title: t('settings.dropOnRelease'), sub: t('settings.dropOnReleaseSub') },
        { t: 'toggle', key: 'hints', title: t('settings.hints'), sub: t('settings.hintsSub') },
        { t: 'link', title: t('settings.sensitivity'), value: () => sensitivityText(settings().dragSensitivity), onTap: () => setSetting('dragSensitivity', SENS_NEXT[settings().dragSensitivity]) },
      ]],
      ['GENERAL', [
        { t: 'link', title: t('settings.language'), value: () => t(`lang.${settings().lang}` as Key), onTap: () => { setSetting('lang', LANG_NEXT[settings().lang]); this.scene.restart(data); } },
        { t: 'link', title: t('settings.privacy'), sub: t('settings.privacySub') },
        { t: 'link', title: t('settings.restore') },
      ]],
    ];
    for (const [name, rows] of groups) {
      caps(this, GUTTER, y, name); y += 11 + T.sm;
      const h = rows.reduce((a, r) => a + (r.sub ? ROW_H2 : ROW_H), 0);
      panel(this, GUTTER, y, CW, h);
      const div = this.add.graphics(); div.lineStyle(1, T.border, 1);
      let ry = y;
      rows.forEach((r, i) => {
        const rh = r.sub ? ROW_H2 : ROW_H, cy = ry + rh / 2;
        if (i > 0) div.lineBetween(GUTTER + 1, ry, GUTTER + CW - 1, ry);
        const enabled = r.t === 'toggle' ? !r.disabled : !!(r.onTap);
        const a = enabled || r.t === 'toggle' ? 1 : 0.5;
        if (r.sub) { kr(this, GUTTER + 12, ry + 10, r.title, { bold: true, color: T.textPrimary }).setAlpha(a); kr(this, GUTTER + 12, ry + 26, r.sub).setAlpha(a); }
        else kr(this, GUTTER + 12, cy, r.title, { bold: true, color: T.textPrimary, origin: [0, 0.5] }).setAlpha(a);
        if (r.t === 'toggle') {
          const key = r.key;
          toggle(this, W - GUTTER - 12 - 44, cy, settings()[key] as boolean, (v) => setSetting(key, v as never), { disabled: !!r.disabled });
        } else {
          let rx = W - GUTTER - 12;
          icon(this, rx - 9, cy, 'chevron-right', 18, { alpha: a });
          rx -= 18 + T.xl;
          if (r.value) {
            const vt = kr(this, rx, cy, r.value(), { origin: [1, 0.5] }).setAlpha(a);
            if (r.onTap) { const tap = r.onTap, valueOf = r.value; this.add.zone(GUTTER, ry, CW, rh).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => { tap(); vt.setText(valueOf()); }); }
          }
          if (r.preview) {
            const pg = this.add.graphics();
            for (let c = 4; c >= 1; c--) { rx -= 18; block(pg, rx, cy - 9, 18, T.block[c]!, { radius: 5, alpha: a }); glyph(pg, rx + 9, cy, 8, c as 1 | 2 | 3 | 4, a); rx -= T.cellGap; }
          }
        }
        ry += rh;
      });
      y += h + T.xl;
    }
    caps(this, W / 2, 803, 'CHAINWELL v0.1.0 · PINK SPIDER', { origin: [0.5, 0.5] });
    this.input.keyboard?.once('keydown-ESC', back);
  }
}
