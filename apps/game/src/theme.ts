/** Mirrors the Figma variables (Chainwell file, Components page). Keep in sync with the design tokens. */
export const T = {
  // color / bg
  bgApp: 0x0e0f16, bgPanel: 0x171925, bgWell: 0x0a0b11, bgPad: 0x131520, bgPerk: 0x20233a,
  cellEmpty: 0x161826, cellLane: 0x1b1e2f, fillInactive: 0x2a2d40, fillRail: 0x262a3c,
  border: 0x25283a, borderStrong: 0x2a2d40, borderPerk: 0x2e3250, borderDashed: 0x34384f,
  textPrimary: '#ECEDF3', textMuted: '#9AA0B4', textStrong: '#FFFFFF', textOnAccent: '#0A0B11', textOnAccentMuted: 'rgba(10,11,17,0.7)',
  accent: 0x5ce1e6, accentCss: '#5CE1E6', scrim: 0x0a0b11,
  block: { 1: 0xf2555a, 2: 0xf5c542, 3: 0x4f7cff, 4: 0xa66bff, 5: 0x3ddc97, 6: 0x4a4f60 } as Record<number, number>,
  blockCss: { 1: '#F2555A', 2: '#F5C542', 3: '#4F7CFF', 4: '#A66BFF', 5: '#3DDC97', 6: '#4A4F60' } as Record<number, string>,
  // radius
  rCell: 6, rMini: 4, rSm: 8, rPanel: 12, rPopup: 14, rPad: 18,
  // spacing
  gutter: 16, xl: 12, lg: 10, md: 8, sm: 6, xs: 4, cellGap: 2,
  // type
  font: '"Chakra Petch", sans-serif',
  fontKR: '"Noto Sans KR", "Chakra Petch", sans-serif',
};
