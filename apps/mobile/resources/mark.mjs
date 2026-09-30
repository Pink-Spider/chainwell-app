// Renders the Chainwell mark (2×2 bevelled blocks, rotated 8°) into the PNGs @capacitor/assets expects.
import sharp from 'sharp';
const C = { bg: '#0E0F16', red: '#F2555A', yellow: '#F5C542', blue: '#4F7CFF', violet: '#A66BFF' };
function mark(size, cell, gap, radius) {
  const cols = [C.red, C.yellow, C.blue, C.violet], half = cell + gap / 2, cx = size / 2, cy = size / 2;
  let s = `<g transform="rotate(8 ${cx} ${cy})">`;
  cols.forEach((c, i) => {
    const x = cx + (i % 2) * (cell + gap) - half, y = cy + Math.floor(i / 2) * (cell + gap) - half;
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${radius}" fill="${c}"/>`;
    s += `<path d="M${x + radius} ${y} h${cell - 2 * radius} a${radius} ${radius} 0 0 1 ${radius} ${radius} v${cell * 0.07} h-${cell} v-${cell * 0.07} a${radius} ${radius} 0 0 1 ${radius} -${radius} z" fill="#fff" opacity=".28"/>`;
    s += `<path d="M${x} ${y + cell - cell * 0.1} h${cell} v${cell * 0.1 - radius} a${radius} ${radius} 0 0 1 -${radius} ${radius} h-${cell - 2 * radius} a${radius} ${radius} 0 0 1 -${radius} -${radius} z" fill="#000" opacity=".22"/>`;
    const gx = x + cell / 2, gy = y + cell / 2, g = cell * 0.21;
    const glyph = [`<circle cx="${gx}" cy="${gy}" r="${g * 0.9}"/>`,
      `<polygon points="${gx},${gy - g} ${gx + g},${gy + g * 0.8} ${gx - g},${gy + g * 0.8}"/>`,
      `<rect x="${gx - g * 0.85}" y="${gy - g * 0.85}" width="${g * 1.7}" height="${g * 1.7}" rx="${g * 0.15}"/>`,
      `<polygon points="${gx},${gy - g} ${gx + g},${gy} ${gx},${gy + g} ${gx - g},${gy}"/>`][i];
    s += `<g fill="#000" opacity=".35">${glyph}</g>`;
  });
  return s + '</g>';
}
const svg = (size, bg, cell, gap, radius) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${C.bg}"/>` : ''}${mark(size, cell, gap, radius)}</svg>`);
await sharp(svg(1024, true, 300, 44, 72)).png().toFile('resources/icon-only.png');
await sharp(svg(1024, false, 220, 32, 52)).png().toFile('resources/icon-foreground.png');   // adaptive: keep inside the 66% safe zone
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: C.bg } }).png().toFile('resources/icon-background.png');
await sharp(svg(2732, true, 330, 48, 80)).png().toFile('resources/splash.png');
await sharp(svg(2732, true, 330, 48, 80)).png().toFile('resources/splash-dark.png');
console.log('resources written');
