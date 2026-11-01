// One-time scaffold for the water recipe. After this, art/recipes/water.json is the authoritative source.
import { linkedPalette, writeJSON } from './common.mjs';
const symbols = {
  crest0: ['.......', '..ccc..'],
  crest1: ['..ccc..', '.c...c.'],
  crest2: ['..cWc..', 'cc...cc'],
  crest3: ['.c...c.', '.......'],
  trough: ['.nnn', 'nn..'],
  lull: ['nnnn']
};
const layouts = {
  a: { groups: [[0, 2, 0], [8, 7, 2], [3, 12, 1]], dark: [['trough', 11, 1], ['lull', 0, 9], ['lull', 11, 14]] },
  b: { groups: [[6, 1, 1], [1, 6, 3], [9, 11, 0]], dark: [['lull', 2, 14], ['trough', 12, 4], ['lull', 7, 9]] },
  c: { groups: [[3, 3, 2], [9, 9, 0], [0, 13, 3]], dark: [['lull', 9, 1], ['trough', 3, 8], ['lull', 12, 14]] }
};
const frames = [], animations = {};
for (const [variant, layout] of Object.entries(layouts)) {
  const names = [];
  for (let f = 0; f < 4; f++) {
    const name = `water-${variant}${f}`;
    names.push(name);
    frames.push({ name, duration: 260, ops: [
      { op: 'rect', x: 0, y: 0, w: 16, h: 16, color: 'C' },
      ...layout.dark.map(([symbol, x, y]) => ({ op: 'stamp', symbol, x, y })),
      ...layout.groups.map(([x, y, phase]) => ({ op: 'stamp', symbol: `crest${(f + phase) % 4}`, x, y }))
    ] });
  }
  animations[`shimmer-${variant}`] = { frames: names };
}
const recipe = { version: 1, name: 'water', width: 16, height: 16, palette: {}, symbols, frames, animations, sheet: { columns: 4 } };
recipe.palette = linkedPalette();
writeJSON('art/recipes/water.json', recipe, { force: process.argv.includes('--force') });
