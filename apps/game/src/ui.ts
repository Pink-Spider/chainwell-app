import Phaser from 'phaser';
import { T } from './theme';
import type { PerkId, Cell } from '@chainwell/core';

export const W = 390, H = 844, GUTTER = T.gutter, CW = W - GUTTER * 2; // content width 358

type Scene = Phaser.Scene;
type Origin = [number, number];

// ── text ────────────────────────────────────────────────────────────────────
/** HUD/Label Caps: Chakra Petch SemiBold 11, tracking 1.54. */
export function caps(s: Scene, x: number, y: number, text: string, o: { color?: string; size?: number; spacing?: number; origin?: Origin; weight?: string } = {}) {
  const size = o.size ?? 11;
  const t = s.add.text(x, y, text, { fontFamily: T.font, fontSize: `${size}px`, fontStyle: o.weight ?? '600', color: o.color ?? T.textMuted, letterSpacing: o.spacing ?? size * 0.14 });
  if (o.origin) t.setOrigin(...o.origin);
  return t;
}
/** Value/*: Chakra Petch Bold. */
export function val(s: Scene, x: number, y: number, text: string, size: number, o: { color?: string; spacing?: number; origin?: Origin } = {}) {
  const t = s.add.text(x, y, text, { fontFamily: T.font, fontSize: `${size}px`, fontStyle: '700', color: o.color ?? T.textPrimary, letterSpacing: o.spacing ?? 0 });
  if (o.origin) t.setOrigin(...o.origin);
  return t;
}
/** KR/Caption(Bold): Noto Sans KR Medium/Bold 11. */
export function kr(s: Scene, x: number, y: number, text: string, o: { size?: number; bold?: boolean; color?: string; origin?: Origin; wrap?: number; align?: 'left' | 'center' | 'right' } = {}) {
  const st: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: T.fontKR, fontSize: `${o.size ?? 11}px`, fontStyle: o.bold ? '700' : '500', color: o.color ?? T.textMuted, align: o.align ?? 'left' };
  if (o.wrap) st.wordWrap = { width: o.wrap };
  const t = s.add.text(x, y, text, st);
  if (o.origin) t.setOrigin(...o.origin);
  return t;
}

// ── shapes ──────────────────────────────────────────────────────────────────
export interface PanelOpts { fill?: number; fillAlpha?: number; stroke?: number | null; strokeW?: number; radius?: number; glow?: boolean; dashed?: boolean; g?: Phaser.GameObjects.Graphics }
/** Rounded panel with optional 1px border, accent glow (Block/Clear Glow) or dashed border. */
export function panel(s: Scene, x: number, y: number, w: number, h: number, o: PanelOpts = {}) {
  const g = o.g ?? s.add.graphics();
  const r = o.radius ?? T.rPanel;
  if (o.glow) for (const [d, a] of [[2, 0.22], [5, 0.13], [9, 0.07], [14, 0.035]] as const) {
    g.lineStyle(3, T.accent, a); g.strokeRoundedRect(x - d, y - d, w + d * 2, h + d * 2, r + d);
  }
  g.fillStyle(o.fill ?? T.bgPanel, o.fillAlpha ?? 1); g.fillRoundedRect(x, y, w, h, r);
  if (o.stroke !== null) {
    g.lineStyle(o.strokeW ?? 1, o.stroke ?? T.border, 1);
    if (o.dashed) dashedRoundedRect(g, x, y, w, h, r); else g.strokeRoundedRect(x, y, w, h, r);
  }
  return g;
}
function dashedRoundedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number) {
  // approximate: dashes along the four straight edges, solid corners
  const dash = 3, gap = 3;
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    for (let d = 0; d < len; d += dash + gap) { const e = Math.min(d + dash, len); g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e); }
  };
  seg(x + r, y, x + w - r, y); seg(x + w, y + r, x + w, y + h - r); seg(x + w - r, y + h, x + r, y + h); seg(x, y + h - r, x, y + r);
  g.beginPath(); g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); g.strokePath();
  g.beginPath(); g.arc(x + w - r, y + r, r, Math.PI * 1.5, 0); g.strokePath();
  g.beginPath(); g.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5); g.strokePath();
  g.beginPath(); g.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI); g.strokePath();
}

/** Block cell with the Figma bevel (top highlight, bottom shade). */
export function block(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, o: { alpha?: number; radius?: number } = {}) {
  const r = o.radius ?? (size >= 24 ? T.rCell : T.rMini), a = o.alpha ?? 1;
  const hi = size >= 24 ? 2 : 1, lo = size >= 24 ? 3 : 2;
  g.fillStyle(color, a); g.fillRoundedRect(x, y, size, size, r);
  g.fillStyle(0xffffff, 0.28 * a); g.fillRoundedRect(x, y, size, hi, { tl: r, tr: r, bl: 0, br: 0 });
  g.fillStyle(0x000000, 0.22 * a); g.fillRoundedRect(x, y + size - lo, size, lo, { tl: 0, tr: 0, bl: r, br: r });
}
/** Color-blind glyph per color (Figma Block/Glyph): red ●, yellow ▲, blue ■, violet ◆, green ✚. */
export function glyph(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, c: Cell, alpha = 1) {
  const h = size / 2;
  g.fillStyle(0x000000, 0.35 * alpha); g.lineStyle(0, 0, 0);
  switch (c) {
    case 1: g.fillCircle(cx, cy, h * 0.9); break;
    case 2: g.fillTriangle(cx, cy - h, cx + h, cy + h * 0.8, cx - h, cy + h * 0.8); break;
    case 3: g.fillRoundedRect(cx - h * 0.85, cy - h * 0.85, h * 1.7, h * 1.7, 2); break;
    case 4: g.fillTriangle(cx, cy - h, cx + h, cy, cx, cy + h); g.fillTriangle(cx, cy - h, cx - h, cy, cx, cy + h); break;
    case 5: g.fillRect(cx - h * 0.3, cy - h, h * 0.6, size); g.fillRect(cx - h, cy - h * 0.3, size, h * 0.6); break;
  }
}
/** Gray garbage cross mark. */
export function cross(g: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, alpha = 1) {
  const h = size / 2;
  g.lineStyle(2, 0x7a8093, alpha); g.lineBetween(cx - h, cy - h, cx + h, cy + h); g.lineBetween(cx + h, cy - h, cx - h, cy + h);
}

// ── icons / tags / buttons ──────────────────────────────────────────────────
export const ICONS = ['pause', 'sound', 'boss', 'eye', 'hold', 'bomb', 'plus', 'drag', 'rotate', 'flick', 'home', 'settings', 'restart', 'cross', 'trophy', 'cart', 'play', 'chevron-right', 'chevron-left', 'lock', 'share'] as const;
export type IconKey = typeof ICONS[number];
export function icon(s: Scene, cx: number, cy: number, key: IconKey, size: number, o: { alpha?: number | undefined; tint?: number | undefined } = {}) {
  const im = s.add.image(cx, cy, `ic-${key}`).setDisplaySize(size, size);
  if (o.alpha !== undefined) im.setAlpha(o.alpha);
  if (o.tint !== undefined) im.setTint(o.tint);
  return im;
}

/** Pill tag (Tag component): 11 SemiBold tracking .66, px7 py2, well bg, 1px border. `x` is the left edge, or the right edge when `right`. */
export function tag(s: Scene, x: number, cy: number, text: string, o: { accent?: boolean; right?: boolean; icon?: IconKey } = {}) {
  const color = o.accent ? T.accentCss : T.textMuted;
  const t = s.add.text(0, 0, text, { fontFamily: T.font, fontSize: '11px', fontStyle: '600', color, letterSpacing: 0.66 }).setOrigin(0, 0.5);
  const iw = o.icon ? 12 + 4 : 0;
  const w = t.width + 14 + iw, h = 17;
  const left = o.right ? x - w : x;
  const g = s.add.graphics();
  g.fillStyle(T.bgWell, 1); g.fillRoundedRect(left, cy - h / 2, w, h, h / 2);
  g.lineStyle(1, o.accent ? T.accent : 0x9aa0b4, 1); g.strokeRoundedRect(left, cy - h / 2, w, h, h / 2);
  if (o.icon) icon(s, left + 7 + 6, cy, o.icon, 12, { tint: o.accent ? T.accent : undefined });
  t.setPosition(left + 7 + iw, cy);
  s.children.bringToTop(t); // the pill graphics was added after the (measured) text
  return { width: w, text: t, g };
}

export interface ButtonOpts { primary?: boolean; disabled?: boolean; size?: number; icon?: IconKey; iconSize?: number; radius?: number; sub?: string }
/** Button component: Primary = accent fill + dark label; Secondary = panel + strong border. Label in Noto Sans KR Bold. */
export function button(s: Scene, x: number, y: number, w: number, h: number, label: string, onTap: () => void, o: ButtonOpts = {}) {
  const alpha = o.disabled ? 0.4 : 1;
  const g = s.add.graphics();
  const r = o.radius ?? T.rPanel;
  if (o.primary) { g.fillStyle(T.accent, alpha); g.fillRoundedRect(x, y, w, h, r); }
  else { g.fillStyle(T.bgPanel, alpha); g.fillRoundedRect(x, y, w, h, r); g.lineStyle(1, T.borderStrong, alpha); g.strokeRoundedRect(x, y, w, h, r); }
  const size = o.size ?? 14;
  const color = o.primary ? T.textOnAccent : T.textPrimary;
  const t = s.add.text(0, 0, label, { fontFamily: T.fontKR, fontSize: `${size}px`, fontStyle: '700', color }).setAlpha(alpha);
  const sub = o.sub ? s.add.text(0, 0, o.sub, { fontFamily: T.font, fontSize: '11px', fontStyle: '600', color: o.primary ? T.textOnAccentMuted : T.textMuted, letterSpacing: 1.1 }).setAlpha(alpha) : null;
  const iconSize = o.iconSize ?? 18, gap = o.icon ? T.md + (o.sub ? 4 : 0) : 0;
  const textW = Math.max(t.width, sub?.width ?? 0);
  const total = (o.icon ? iconSize + gap : 0) + textW;
  let cx = x + (w - total) / 2;
  if (o.icon) { icon(s, cx + iconSize / 2, y + h / 2, o.icon, iconSize, { alpha, tint: o.primary ? 0x0a0b11 : undefined }); cx += iconSize + gap; }
  if (sub) { t.setPosition(cx, y + h / 2 - 1).setOrigin(0, 1); sub.setPosition(cx, y + h / 2 + 2).setOrigin(0, 0); }
  else t.setPosition(cx + textW / 2, y + h / 2).setOrigin(0.5);
  if (!o.disabled) {
    const z = s.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => g.setAlpha(0.75));
    z.on('pointerout', () => g.setAlpha(1));
    z.on('pointerup', () => { g.setAlpha(1); onTap(); });
  }
  return t;
}
/** 44px square icon button (Button/Settings, Button/Pause …). */
export function iconButton(s: Scene, x: number, y: number, key: IconKey, onTap: () => void, o: { size?: number; iconSize?: number; disabled?: boolean } = {}) {
  const size = o.size ?? 44, alpha = o.disabled ? 0.45 : 1;
  const g = panel(s, x, y, size, size); g.setAlpha(alpha);
  const im = icon(s, x + size / 2, y + size / 2, key, o.iconSize ?? 20, { alpha });
  if (!o.disabled) {
    const z = s.add.zone(x, y, size, size).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerup', onTap);
  }
  return im;
}

/** Stage track: 8 segments + boss icon. `stage` = current 0-based stage index (8 = boss). */
export function stageTrack(s: Scene, x: number, y: number, w: number, stage: number, o: { failed?: boolean; g?: Phaser.GameObjects.Graphics; segments?: number } = {}) {
  const n = o.segments ?? 8, iconSize = 18, gap = T.xs;
  const segW = (w - iconSize - gap * n) / n;
  const g = o.g ?? s.add.graphics();
  for (let i = 0; i < n; i++) {
    const sx = x + i * (segW + gap);
    const done = i < stage, cur = i === stage;
    const col = cur && o.failed ? T.block[1]! : done || cur ? T.accent : T.fillInactive;
    const h = cur && !o.failed ? 8 : 6;
    g.fillStyle(col, 1); g.fillRoundedRect(sx, y - h / 2, segW, h, h / 2);
  }
  icon(s, x + w - iconSize / 2, y, 'boss', iconSize, { alpha: stage >= n ? 1 : 0.55 });
  return g;
}

/** Dim scrim that also swallows taps for overlay scenes. */
export function scrim(s: Scene, alpha = 0.72) {
  const g = s.add.graphics(); g.fillStyle(T.scrim, alpha); g.fillRect(0, 0, W, H);
  s.add.zone(0, 0, W, H).setOrigin(0).setInteractive();
  return g;
}

/** Perk icon inside a slot (Perk/* components). Draws into `g` and adds text/image objects as needed. */
export function perkGlyph(s: Scene, g: Phaser.GameObjects.Graphics, cx: number, cy: number, id: PerkId, size: number, alpha = 1): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  const mini = Math.round(size * 0.44), fs = Math.round(size * 0.55);
  const txt = (t: string, x: number, color = T.textPrimary) => { const o = s.add.text(x, cy, t, { fontFamily: T.font, fontSize: `${fs}px`, fontStyle: '700', color }).setOrigin(0, 0.5).setAlpha(alpha); out.push(o); return o; };
  switch (id) {
    case 'red_x2': block(g, cx - mini - 1, cy - mini / 2, mini, T.block[1]!, { alpha, radius: 3 }); txt('×2', cx + 1); break;
    case 'blue_min3': block(g, cx - mini - 1, cy - mini / 2, mini, T.block[3]!, { alpha, radius: 3 }); txt('3', cx + 2); break;
    case 'chain_bonus': { const o = txt('+1', cx, T.accentCss); o.setOrigin(0.5); break; }
    case 'hold': out.push(icon(s, cx, cy, 'hold', size, { alpha })); break;
    case 'preview3': out.push(icon(s, cx, cy, 'eye', size, { alpha })); break;
    case 'slow_fall': out.push(icon(s, cx, cy, 'flick', size, { alpha })); break;
    case 'line_gray': block(g, cx - mini / 2, cy - mini / 2, mini, T.block[6]!, { alpha, radius: 3 }); cross(g, cx, cy, mini * 0.5, alpha); break;
  }
  return out;
}
