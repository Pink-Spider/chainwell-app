import Phaser from 'phaser';
import { T } from './theme';

export const W = 390, H = 844;
export const cap = { fontFamily: T.font, fontSize: '12px', color: T.textMuted, fontStyle: 'bold' } as const;
export const title = { fontFamily: T.font, fontSize: '30px', color: T.textStrong, fontStyle: 'bold' } as const;

export interface ButtonOpts { primary?: boolean; disabled?: boolean; size?: number }

/** Rounded button: filled accent (primary) or panel outline. Returns the text object for later updates. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onTap: () => void, o: ButtonOpts = {}) {
  const g = scene.add.graphics();
  const alpha = o.disabled ? 0.4 : 1;
  if (o.primary) { g.fillStyle(T.accent, alpha); g.fillRoundedRect(x, y, w, h, 14); }
  else { g.fillStyle(T.bgPanel, alpha); g.fillRoundedRect(x, y, w, h, 14); g.lineStyle(1, T.borderStrong, alpha); g.strokeRoundedRect(x, y, w, h, 14); }
  const t = scene.add.text(x + w / 2, y + h / 2, label, { fontFamily: T.font, fontSize: `${o.size ?? 16}px`, color: o.primary ? '#0E0F16' : T.textPrimary, fontStyle: 'bold' }).setOrigin(0.5).setAlpha(alpha);
  if (!o.disabled) {
    const z = scene.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => g.setAlpha(0.7));
    z.on('pointerout', () => g.setAlpha(1));
    z.on('pointerup', () => { g.setAlpha(1); onTap(); });
  }
  return t;
}

/** Dim backdrop for overlay scenes. */
export function backdrop(scene: Phaser.Scene, alpha = 0.8) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, alpha); g.fillRect(0, 0, W, H);
  // swallow taps so the scene below never sees them
  scene.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
  return g;
}
