// One-time scaffold: hand-drawn turf masks -> a shaded pixelforge-autotile template of grass over sand (transparent
// outside). art/terrain/grass.autotile.json is the authoritative, editable source; `pixelbolt autotile` compiles it
// into art/recipes/grass.json (47 blob tiles).
import { linkedPalette, writeJSON } from './common.mjs';

// Turf inset 3px with 1px recessions placed away from quarter boundaries.
const island = [
  '................................', '................................', '................................', '......##########..########......',
  '....######..################....', '...##########################...', '...##########################...', '...##########################...',
  '...##########################...', '....#########################...', '....#########################...', '...##########################...',
  '...#########################....', '...#########################....', '...##########################...', '...##########################...',
  '...##########################...', '...##########################...', '...##########################...', '...#########################....',
  '....########################....', '....#########################...', '...##########################...', '...##########################...',
  '...##########################...', '...##########################...', '...##########################...', '....########################....',
  '......########..####..######....', '................................', '................................', '................................'
];
const lake = Array.from({ length: 48 }, (_, y) => Array.from({ length: 48 }, (_, x) => {
  const inside = x >= 13 && x <= 34 && y >= 13 && y <= 34;
  const cx = x < 24 ? x - 13 : 34 - x, cy = y < 24 ? y - 13 : 34 - y;
  const rounded = (cy === 0 && cx < 2) || (cx === 0 && cy < 2);
  return inside && !rounded ? '.' : '#';
}).join(''));
const texture = [
  'hhhhhhhhhhhhhhhh', 'hhhhhhhhhhjhhhhh', 'hhjhhhhhhhhjhhhh', 'hhhjhhhhhhhhhhhh',
  'hhhhhhhhhhhhhhgh', 'hhhhhhhjhhhhhhhh', 'hhhhhhjhjhhhhhhh', 'hghhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhhhh', 'hhhhhhhhhhhhjhhh', 'hhhhjhhhhhhjhhhh', 'hhhhhjhhhhhhhhhh',
  'hhhhhhhhhgghhhhh', 'hhhhhhhhhhhhhhhh', 'hjhhhhhhhhhhhhjh', 'hhjhhhhhhhhhhhhj'
];
function shade(mask, outside) {
  const h = mask.length, w = mask[0].length;
  const land = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? outside : mask[y][x] === '#';
  return mask.map((row, y) => [...row].map((_, x) => {
    if (land(x, y)) {
      if (!land(x, y + 1)) return 'g';
      if (!land(x + 1, y)) return 'g';
      if (!land(x, y - 1) || !land(x - 1, y)) return 'j';
      if (!land(x - 1, y - 1) || !land(x + 1, y + 1)) return !land(x + 1, y + 1) ? 'g' : 'j';
      return texture[y % 16][x % 16];
    }
    // Outside the turf: blades on the sunlit north edge, a cast shadow on the south edge.
    if (land(x, y + 1) && land(x, y + 2) && [1, 2, 5, 9, 10, 13].includes(x % 16)) return x % 4 === 1 ? 'l' : 'j';
    if (land(x, y + 2) && land(x, y + 3) && land(x, y + 1) === false && [2, 10].includes(x % 16)) return 'l';
    if (land(x, y - 1)) return '_';
    if (land(x + 1, y) && [4, 11].includes(y % 16)) return 'j';
    return '.';
  }).join(''));
}
const crop = (rows, x, y) => rows.slice(y, y + 8).map(row => row.slice(x, x + 8));
const shadedIsland = shade(island, false), shadedLake = shade(lake, true);
// Template, two tiles wide and three tall: [lone-patch preview][inner corners] over the 2x2 turf island itself.
const template = Array.from({ length: 48 }, () => Array(32).fill('.'));
const paste = (rows, x0, y0) => rows.forEach((row, y) => [...row].forEach((c, x) => { template[y0 + y][x0 + x] = c; }));
for (const [x, y] of [[0, 0], [24, 0], [0, 24], [24, 24]]) paste(crop(shadedIsland, x, y), x ? 8 : 0, y ? 8 : 0);
paste(crop(shadedLake, 32, 32), 16, 0); paste(crop(shadedLake, 8, 32), 24, 0); paste(crop(shadedLake, 32, 8), 16, 8); paste(crop(shadedLake, 8, 8), 24, 8);
paste(shadedIsland, 0, 16);
writeJSON('art/terrain/grass.autotile.json', { format: 'pixelforge-autotile', version: 1, name: 'grass', tile: 16, mode: 'blob', palette: linkedPalette(), template: template.map(row => row.join('')), frame: 'grass-{mask}', sheet: { columns: 16 } }, { force: process.argv.includes('--force') });
console.log('template', template[0].length, 'x', template.length);
