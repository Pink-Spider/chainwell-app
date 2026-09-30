// Icon concept sheet: A = current mark, B = "well" (blocks stacked in a dark well, chain glow), C = single bevelled block + chain link.
import sharp from 'sharp';
const C = { bg: '#0E0F16', well: '#0A0B11', panel: '#171925', red: '#F2555A', yellow: '#F5C542', blue: '#4F7CFF', violet: '#A66BFF', accent: '#5CE1E6' };
const cols = [C.red, C.yellow, C.blue, C.violet];
const bevel = (x, y, s, r) => `<path d="M${x + r} ${y} h${s - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${s * 0.08} h-${s} v-${s * 0.08} a${r} ${r} 0 0 1 ${r} -${r} z" fill="#fff" opacity=".28"/><path d="M${x} ${y + s - s * 0.1} h${s} v${s * 0.1 - r} a${r} ${r} 0 0 1 -${r} ${r} h-${s - 2 * r} a${r} ${r} 0 0 1 -${r} -${r} z" fill="#000" opacity=".22"/>`;
const blk = (x, y, s, c, r = s * 0.22) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${c}"/>${bevel(x, y, s, r)}`;
const glyph = (i, gx, gy, g) => [`<circle cx="${gx}" cy="${gy}" r="${g * 0.9}"/>`, `<polygon points="${gx},${gy - g} ${gx + g},${gy + g * 0.8} ${gx - g},${gy + g * 0.8}"/>`, `<rect x="${gx - g * 0.85}" y="${gy - g * 0.85}" width="${g * 1.7}" height="${g * 1.7}" rx="${g * 0.15}"/>`, `<polygon points="${gx},${gy - g} ${gx + g},${gy} ${gx},${gy + g} ${gx - g},${gy}"/>`][i];

function conceptB(S) { // well: 4 columns of stacked blocks rising from the bottom, accent glow on the chain group
  const cell = S * 0.15, gap = S * 0.018, cols4 = 4, w = cols4 * cell + (cols4 - 1) * gap, x0 = (S - w) / 2, bottom = S * 0.86;
  const heights = [2, 4, 3, 1], colors = [[C.blue, C.red], [C.yellow, C.violet, C.violet, C.violet], [C.red, C.violet, C.blue], [C.yellow]];
  let s = `<rect width="${S}" height="${S}" fill="${C.bg}"/>`;
  s += `<rect x="${S * 0.12}" y="${S * 0.08}" width="${S * 0.76}" height="${S * 0.82}" rx="${S * 0.09}" fill="${C.well}" stroke="#25283A" stroke-width="${S * 0.012}"/>`;
  s += `<defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${S * 0.03}"/></filter></defs>`;
  for (let c = 0; c < cols4; c++) for (let r = 0; r < heights[c]; r++) {
    const x = x0 + c * (cell + gap), y = bottom - (r + 1) * cell - r * gap, col = colors[c][r];
    if (col === C.violet && c === 1) s += `<rect x="${x - S * 0.02}" y="${y - S * 0.02}" width="${cell + S * 0.04}" height="${cell + S * 0.04}" rx="${cell * 0.3}" fill="${C.accent}" opacity=".55" filter="url(#g)"/>`;
    s += blk(x, y, cell, col);
    if (col === C.violet && c === 1) s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${cell * 0.22}" fill="none" stroke="${C.accent}" stroke-width="${S * 0.012}"/>`;
  }
  return s;
}
function conceptC(S) { // one big bevelled violet block with a chain-link mark, accent ring
  let s = `<rect width="${S}" height="${S}" fill="${C.bg}"/>`;
  const b = S * 0.62, x = (S - b) / 2, y = (S - b) / 2;
  s += `<defs><filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${S * 0.05}"/></filter></defs>`;
  s += `<rect x="${x - S * 0.03}" y="${y - S * 0.03}" width="${b + S * 0.06}" height="${b + S * 0.06}" rx="${b * 0.26}" fill="${C.accent}" opacity=".5" filter="url(#g)"/>`;
  s += blk(x, y, b, C.violet, b * 0.22);
  s += `<rect x="${x}" y="${y}" width="${b}" height="${b}" rx="${b * 0.22}" fill="none" stroke="${C.accent}" stroke-width="${S * 0.018}"/>`;
  // chain link: two interlocked rounded rects
  const lw = S * 0.05, cx = S / 2, cy = S / 2, L = S * 0.2, H = S * 0.11, r = H / 2;
  s += `<g fill="none" stroke="#0E0F16" stroke-width="${lw}" opacity=".85"><rect x="${cx - L}" y="${cy - H / 2 - S * 0.045}" width="${L * 1.15}" height="${H}" rx="${r}"/><rect x="${cx - L * 0.15}" y="${cy - H / 2 + S * 0.045}" width="${L * 1.15}" height="${H}" rx="${r}"/></g>`;
  return s;
}
function conceptA(S) { // current mark
  let s = `<rect width="${S}" height="${S}" fill="${C.bg}"/>`;
  const cell = S * 0.29, gap = S * 0.043, half = cell + gap / 2, cx = S / 2, cy = S / 2;
  s += `<g transform="rotate(8 ${cx} ${cy})">`;
  cols.forEach((c, i) => { const x = cx + (i % 2) * (cell + gap) - half, y = cy + Math.floor(i / 2) * (cell + gap) - half; s += blk(x, y, cell, c, cell * 0.24); s += `<g fill="#000" opacity=".35">${glyph(i, x + cell / 2, y + cell / 2, cell * 0.21)}</g>`; });
  return s + '</g>';
}
const S = 512;
const svg = (inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${inner}</svg>`);
const mask = Buffer.from(`<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="${S * 0.22}" fill="#fff"/></svg>`);
const tiles = [];
for (const [i, fn] of [conceptA, conceptB, conceptC].entries()) {
  const png = await sharp(svg(fn(S))).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  tiles.push({ input: png, left: 40 + i * (S + 60), top: 60 });
  await sharp(svg(fn(1024))).png().toFile(`resources/concept-${'ABC'[i]}.png`);
}
const label = (t, x) => ({ input: Buffer.from(`<svg width="${S}" height="40"><text x="${S / 2}" y="30" font-family="Helvetica" font-size="28" font-weight="bold" text-anchor="middle" fill="#222">${t}</text></svg>`), left: x, top: 12 });
await sharp({ create: { width: 40 * 2 + S * 3 + 120, height: S + 120, channels: 4, background: '#f4f4f6' } })
  .composite([...tiles, label('A · 현재 (2×2 마크)', 40), label('B · 우물에 쌓인 블록', 40 + S + 60), label('C · 블록 + 체인 링크', 40 + 2 * (S + 60))])
  .png().toFile('resources/concepts.png');
console.log('done');
