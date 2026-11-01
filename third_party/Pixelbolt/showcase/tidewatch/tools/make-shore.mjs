// One-time scaffold: hand-drawn coastline masks -> a shaded pixelforge-autotile template with four surf phases.
// art/terrain/shore.autotile.json is the authoritative, editable source; `pixelbolt autotile` compiles it into
// art/recipes/shore.json (47 blob tiles x 4 palette-cycled phases).
import { linkedPalette, writeJSON } from './common.mjs';

// Island: a 2x2-tile sand island inset 4px, with hand-placed 1px recessions away from quarter boundaries.
const island = [
  '................................', '................................', '................................', '................................',
  '.......#####..####....###.......', '.....##############..######.....', '....########################....', '....########################....',
  '....########################....', '....########################....', '.....#######################....', '.....#######################....',
  '.....######################.....', '....#######################.....', '....########################....', '....########################....',
  '....########################....', '....#######################.....', '....#######################.....', '.....######################.....',
  '.....#######################....', '....########################....', '....########################....', '....########################....',
  '....########################....', '....########################....', '.....######################.....', '.......###...######..####.......',
  '................................', '................................', '................................', '................................'
];
// Lake: sand everywhere except one water tile (plus the 4px shore band that belongs to the sand tiles).
const lake = Array.from({ length: 48 }, (_, y) => Array.from({ length: 48 }, (_, x) => {
  const inside = x >= 12 && x <= 35 && y >= 12 && y <= 35;
  const cx = x < 24 ? x - 12 : 35 - x, cy = y < 24 ? y - 12 : 35 - y; // distance into the water from the nearer edge
  const rounded = (cy === 0 && cx < 3) || (cy === 1 && cx < 1) || (cx === 0 && cy < 3) || (cx === 1 && cy < 1);
  return inside && !rounded ? '.' : '#';
}).join(''));
// Seamless 16x16 sand texture, indexed by global template coordinates.
const texture = [
  'SSSSSSSSSSSSSSSS', 'SSSSSSSSSSSsSSSS', 'SSSdSSSSSSSSdSSS', 'SSSSSSSSSSSSSSSS',
  'SSSSSSSsSSSSSSSS', 'SSSSSSSSdSSSSSSS', 'SsSSSSSSSSSSSSdS', 'SSSSSSSSSSSSSSSS',
  'SSSSSSSSSSSSSSSS', 'SSSSSSSSSSdSSSSS', 'SSSSsSSSSSSSSSSS', 'SSSSSdSSSSSSSsSS',
  'SSSSSSSSSSSSSSSS', 'SdSSSSSSSSSSSSSS', 'SSSSSSSSSsSSSSSS', 'SSSSSSSSSSSSSSSS'
];
function shade(mask, outside) {
  const h = mask.length, w = mask[0].length;
  const land = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? outside : mask[y][x] === '#';
  return mask.map((row, y) => [...row].map((_, x) => {
    if (land(x, y)) {
      // South-facing bank only where open water continues below (not beside a one-pixel side notch).
      const open = dy => !land(x, y + dy) && !land(x, y + dy + 1) && (!land(x - 1, y + dy) || !land(x + 1, y + dy));
      if (open(1)) return 'D';
      if (open(2)) return 'd';
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!land(x + dx, y + dy)) return 'd';
      if (!land(x, y - 2) || !land(x - 2, y)) return 's';
      return texture[y % 16][x % 16];
    }
    let best = Infinity;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (land(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy));
    return best <= 1.5 ? '!' : best <= 2.5 ? '@' : best <= 3.5 ? '$' : '.';
  }).join(''));
}
const crop = (rows, x, y) => rows.slice(y, y + 8).map(row => row.slice(x, x + 8));
const shadedIsland = shade(island, false), shadedLake = shade(lake, true);
// Template, two tiles wide and three tall: [lone-island preview][inner corners] over the 2x2 island itself.
// Inner corners come from the sand tiles diagonal to the lake's water tile.
const template = Array.from({ length: 48 }, () => Array(32).fill('.'));
const paste = (rows, x0, y0) => rows.forEach((row, y) => [...row].forEach((c, x) => { template[y0 + y][x0 + x] = c; }));
for (const [x, y] of [[0, 0], [24, 0], [0, 24], [24, 24]]) paste(crop(shadedIsland, x, y), x ? 8 : 0, y ? 8 : 0);
paste(crop(shadedLake, 32, 32), 16, 0); paste(crop(shadedLake, 8, 32), 24, 0); paste(crop(shadedLake, 32, 8), 16, 8); paste(crop(shadedLake, 8, 8), 24, 8);
paste(shadedIsland, 0, 16);
const phases = [
  { '!': 'tint1', '@': 'tint2', '$': 'foam-soft', duration: 240 },
  { '!': 'tint1', '@': 'w', '$': 'tint3', duration: 200 },
  { '!': 'w', '@': 'foam-soft', '$': 'tint3', duration: 260 },
  { '!': 'foam-soft', '@': 'tint2', '$': 'tint3', duration: 340 }
];
// The surf bands '!', '@' and '$' are palette entries; each phase is a variant that recolors them (palette cycling).
const palette = linkedPalette({ tint1: '#97e3e388', tint2: '#97e3e366', tint3: '#97e3e344', 'foam-soft': '#effcffaa', '!': '#97e3e388', '@': '#97e3e366', '$': '#effcffaa' });
const variants = phases.map(({ duration, ...colors }, p) => ({ name: String(p), duration, palette: colors }));
writeJSON('art/terrain/shore.autotile.json', { format: 'pixelforge-autotile', version: 1, name: 'shore', tile: 16, mode: 'blob', palette, template: template.map(row => row.join('')), frame: 'shore-{mask}-{variant}', variants, animation: 'surf-{mask}', sheet: { columns: 16 } }, { force: process.argv.includes('--force') });
console.log('template', template[0].length, 'x', template.length, 'variants', variants.length);
