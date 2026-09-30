import Phaser from 'phaser';
import { T } from './theme';
import { settings, setSetting, type Settings, type DragSensitivity } from './save';
import { W, GUTTER, CW, caps, val, kr, panel, block, glyph, icon, iconButton, toggle } from './ui';

const ROW_H = 44, ROW_H2 = 50; // one-line / two-line rows (py 10 + 11 [+2+11])
const SENS_LABEL: Record<DragSensitivity, string> = { low: '낮음', normal: '보통', high: '높음' };
const SENS_NEXT: Record<DragSensitivity, DragSensitivity> = { low: 'normal', normal: 'high', high: 'low' };

type Row =
  | { t: 'toggle'; key: keyof Settings; title: string; sub?: string; disabled?: boolean }
  | { t: 'link'; title: string; sub?: string; value?: () => string; onTap?: () => void; preview?: boolean };

/** Figma: Menu / Settings (24:326). `onBack` returns to wherever we came from (home or the pause sheet). */
export class SettingsScene extends Phaser.Scene {
  constructor() { super('settings'); }

  create(data: { onBack: () => void }) {
    this.add.graphics().fillStyle(T.bgApp, 1).fillRect(0, 0, W, 844);
    const back = () => { this.scene.stop(); data.onBack(); };
    iconButton(this, GUTTER, 50, 'chevron-right', back).setFlipX(true);
    val(this, 72, 72, 'SETTINGS', 16, { spacing: 1.6, origin: [0, 0.5] });

    let y = 106;
    const groups: [string, Row[]][] = [
      ['SOUND', [
        { t: 'toggle', key: 'sfx', title: '효과음' },
        { t: 'toggle', key: 'music', title: '음악' },
        { t: 'toggle', key: 'haptics', title: '햅틱', sub: '연쇄·착지 진동' },
      ]],
      ['ACCESSIBILITY', [
        { t: 'toggle', key: 'glyphs', title: '색 기호 표시', sub: '블록에 원·세모·네모·마름모 표시' },
        { t: 'link', title: '색상 팔레트', preview: true },
        { t: 'toggle', key: 'bigText', title: '큰 글씨' },
      ]],
      ['CONTROLS', [
        { t: 'toggle', key: 'dropOnRelease', title: '손 떼면 드롭', sub: '드래그 후 손을 떼면 즉시 하드드롭' },
        { t: 'toggle', key: 'hints', title: '조작 힌트 표시', sub: '터치 패드 위 제스처 안내' },
        { t: 'link', title: '드래그 감도', value: () => SENS_LABEL[settings().dragSensitivity], onTap: () => setSetting('dragSensitivity', SENS_NEXT[settings().dragSensitivity]) },
      ]],
      ['GENERAL', [
        { t: 'link', title: '언어', value: () => '한국어' },
        { t: 'link', title: '개인정보 설정', sub: '광고 개인화 동의 변경' },
        { t: 'link', title: '구매 복원' },
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
