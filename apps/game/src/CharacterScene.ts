import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_BY_ID, isUnlocked, type CharacterId } from '@chainwell/core';
import { T } from './theme';
import { loadSave, writeSave } from './save';
import { W, GUTTER, CW, caps, val, kr, panel, icon, iconButton, button, tag, perkGlyph } from './ui';
import { CHARACTER_TEXT, PERK_TEXT, unlockText } from './perkText';

/** Figma: Menu / Character Select (21:160). Tapping a row re-renders with that character selected. */
export class CharacterScene extends Phaser.Scene {
  constructor() { super('character'); }

  create() {
    const save = loadSave();
    const sel = CHARACTER_BY_ID[save.character];
    const selText = CHARACTER_TEXT[sel.id];
    const unlockedCount = CHARACTERS.filter((c) => isUnlocked(c, save)).length;
    const select = (id: CharacterId) => { writeSave({ character: id }); this.scene.restart(); };
    const home = () => this.scene.start('home');

    // Header
    iconButton(this, GUTTER, 50, 'chevron-right', home).setFlipX(true); // exported chevron points right
    val(this, 72, 72, 'CHARACTERS', 16, { spacing: 1.6, origin: [0, 0.5] });
    caps(this, W - GUTTER, 72, `${unlockedCount} / ${CHARACTERS.length}`, { origin: [1, 0.5] });

    // Card/Selected Character
    const cy = 108, ch = 216;
    panel(this, GUTTER, cy, CW, ch, { stroke: T.accent, strokeW: 2, radius: T.rPad, glow: true });
    panel(this, 32, cy + 16, 64, 64, { fill: T.bgWell, stroke: T.accent });
    val(this, 64, cy + 48, selText.letter, 26, { color: T.accentCss, origin: [0.5, 0.5] });
    kr(this, 108, cy + 25, selText.name, { size: 18, bold: true, color: T.textStrong });
    kr(this, 108, cy + 52, selText.tagline);
    tag(this, W - 32, cy + 48, 'SELECTED', { accent: true, right: true });
    caps(this, 32, cy + 92, 'STARTING PERKS');
    let px = 32;
    const chipG = this.add.graphics();
    for (const p of sel.startPerks) {
      const label = this.add.text(0, 0, PERK_TEXT[p].name, { fontFamily: T.fontKR, fontSize: '11px', fontStyle: '500', color: T.textPrimary }).setOrigin(0, 0.5);
      const w = 8 + 18 + 8 + label.width + 12, y = cy + 115;
      panel(this, px, y, w, 34, { fill: T.bgPerk, stroke: T.borderPerk, g: chipG });
      perkGlyph(this, chipG, px + 8 + 9, y + 17, p, 18);
      label.setPosition(px + 8 + 18 + 8, y + 17);
      px += w + T.md;
    }
    caps(this, 32, cy + 161, 'PASSIVE');
    kr(this, 32, cy + 176, sel.startPerks.map((p) => PERK_TEXT[p].desc).join(' · '), { color: T.textPrimary, wrap: CW - 32 });

    // Character List (everyone but the selected one)
    let y = 338;
    for (const c of CHARACTERS) {
      if (c.id === sel.id) continue;
      const t = CHARACTER_TEXT[c.id], on = isUnlocked(c, save), alpha = on ? 1 : 0.75;
      panel(this, GUTTER, y, CW, 60).setAlpha(alpha);
      const portraitColor = T.block[(CHARACTERS.indexOf(c) % 4) + 1]!;
      panel(this, 28, y + 10, 40, 40, { fill: T.bgWell, stroke: on ? portraitColor : T.borderPerk, radius: 10 }).setAlpha(alpha);
      if (on) val(this, 48, y + 30, t.letter, 18, { color: `#${portraitColor.toString(16).padStart(6, '0')}`, origin: [0.5, 0.5] });
      else icon(this, 48, y + 30, 'lock', 16, { alpha });
      kr(this, 80, y + 16, t.name, { bold: true, color: on ? T.textPrimary : T.textMuted }).setAlpha(alpha);
      kr(this, 80, y + 33, on ? `${t.tagline} · ${c.startPerks.map((p) => PERK_TEXT[p].name).join(', ')}` : `해금 조건: ${unlockText(c.unlock)}`).setAlpha(alpha);
      if (on) {
        icon(this, W - GUTTER - 12 - 9, y + 30, 'chevron-right', 18);
        this.add.zone(GUTTER, y, CW, 60).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => select(c.id));
      } else tag(this, W - GUTTER - 12, y + 30, 'LOCKED', { right: true });
      y += 60 + T.md;
    }

    button(this, GUTTER, 758, CW, 52, `${selText.name}로 런 시작`, () => this.scene.start('play', { character: sel.id }), { primary: true });
    this.input.keyboard?.once('keydown-ESC', home);
  }
}
