// One-time scaffold for art/effects/fx.fx.json, the pixelforge-fx source of the effects recipe. After this, the fx
// source is authoritative: edit it and recompile with
//   node bin/pixelbolt.js compile showcase/tidewatch/art/effects/fx.fx.json --out showcase/tidewatch/art/recipes/fx.json --force
// Leaves, shards, splash, poof and dust are seeded particle emitters; hit and sparkle keep their hand-drawn frames,
// played by a single particle. Poof puffs bake the original circle formula (lit top-left, cooling to grey) into symbols.
import { linkedPalette, writeJSON } from './common.mjs';
const force = { force: process.argv.includes('--force') };
function puff(radius, cool) {
  const size = Math.ceil(radius) * 2 + 1, c = Math.ceil(radius), rows = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, (y - c) * 1.1);
      if (d > radius) { row += '.'; continue; }
      const light = (x - c) + (y - c) < -radius * 0.3;
      row += d > radius - 1 ? (cool ? '9' : 't') : light ? (cool ? '8' : 'r') : cool ? '9' : 'R';
    }
    rows.push(row);
  }
  while (!/[^.]/.test(rows[0])) rows.shift();
  while (!/[^.]/.test(rows.at(-1))) rows.pop();
  return rows;
}
const growth = [0.6, 1, 1.25, 1.35, 1.2, 0.8]; // puff radius over the six frames; grey from the fourth
const symbols = {
  'leaf-l0': ['jl', 'hj'], 'leaf-l1': ['.l', 'jh', 'g.'], 'leaf-j0': ['jj', 'hg'], 'leaf-j1': ['hj', '.g'], 'leaf-h0': ['hj', 'g.'], 'leaf-h1': ['.h', 'hg'],
  'shard-a': ['kOk', 'kuk'], 'shard-b': ['kkk', 'Ouk'], 'shard-c': ['kOuk', '.kk.'], 'shard-d': ['kO', 'uk'], 'shard-e': ['kOk'], 'shard-f': ['ku', 'kk'], 'shard-g': ['Uk'], 'shard-h': ['kuUk'],
  drop: ['w'], spout: ['w', 'W'], 'ripple-l': ['W.', 'ww', '.W'], 'ripple-r': ['.W', 'ww', 'W.'],
  ...Object.fromEntries(growth.map((s, f) => [`puff-${f}`, puff(3 * s, f >= 3)])),
  ...Object.fromEntries(growth.map((s, f) => [`cloud-${f}`, puff(4 * s, f >= 3)])),
  'hit-0': ['................', '.......x........', '.......x........', '...x...x...x....', '....x..W..x.....', '.....xWWWx......', '..xxxWW7WWxxx...', '.....xWWWx......', '....x..W..x.....', '...x...x...x....', '.......x........', '.......x........'],
  'hit-1': ['................', '................', '.......W........', '....W..x..W.....', '.....x.x.x......', '......x7x.......', '...WxxxWxxxW....', '......x7x.......', '.....x.x.x......', '....W..x..W.....', '.......W........', '................'],
  'hit-2': ['................', '................', '................', '................', '.......M........', '.....M.W.M......', '....M.W.W.M.....', '.....M.W.M......', '.......M........', '................', '................', '................'],
  'sparkle-0': ['.......', '...x...', '..xWx..', '.xW7Wx.', '..xWx..', '...x...', '.......'],
  'sparkle-1': ['...x...', '...x...', '..xWx..', 'xxW7Wxx', '..xWx..', '...x...', '...x...'],
  'sparkle-2': ['.......', '...W...', '...x...', '.Wx7xW.', '...x...', '...W...', '.......'],
  'sparkle-3': ['.......', '.......', '...W...', '..W7W..', '...W...', '.......', '.......'],
  'dust-0': ['.RR.', 'RrRt', '.tt.'], 'dust-1': ['R.', 'Rt'], 'dust-2': ['R']
};
const stripes = [[0, 1, 2], [1, 2, 0], [2, 0, 1]]; // the original poof's diagonal dissolve
const puffs = (name, at, speed, prefix) => ({ name, at, burst: 1, angle: 270, speed, life: 6, shapes: growth.map((_, f) => `${prefix}-${f}`), dissolve: 0.3, pattern: stripes });
const source = {
  format: 'pixelforge-fx', version: 1, name: 'fx', width: 32, height: 32, palette: linkedPalette(), symbols, anchor: [16, 20],
  effects: {
    // Cut grass: clippings fountain up, flutter between two shapes and drift down.
    leaves: { frames: 7, duration: 70, seed: 13, emitters: [
      { name: 'clippings', at: [16, 18], area: [8, 5], burst: 10, angle: [210, 330], speed: [2, 4.4], gravity: [0, 0.6], drag: 0.02, life: 7,
        sway: { amplitude: [1.1, 0], period: 5 }, shapes: [['leaf-l0', 'leaf-l1'], ['leaf-j0', 'leaf-j1'], ['leaf-h0', 'leaf-h1']], play: 'loop' }] },
    // A smashed pot: outlined terracotta pieces arc out and settle on the ground line.
    shards: { frames: 6, duration: 70, seed: 3, emitters: [
      { name: 'pot', at: [16, 19], area: [8, 6], burst: 8, angle: [195, 345], speed: [1, 4], gravity: [0, 1.1], floor: 26, bounce: 0.25,
        shapes: [['shard-a'], ['shard-b'], ['shard-c'], ['shard-d'], ['shard-e'], ['shard-f'], ['shard-g'], ['shard-h']] }] },
    // Water: a crown of trailing drops rises and falls back, spray flies higher, then ripples run out along the surface.
    splash: { frames: 5, duration: 80, seed: 5, emitters: [
      { name: 'crown', at: [16, 24], area: [7, 1], burst: 4, angle: [260, 280], speed: [3, 4.2], gravity: [0, 1], floor: 24, life: 4, shapes: ['spout', 'drop', 'drop', 'drop'], trail: { color: 'W', length: 4 } },
      { name: 'spray', at: [16, 18], area: [8, 2], burst: 4, start: 1, angle: [235, 305], speed: [2.4, 3.4], gravity: [0, 0.9], life: 2, shapes: ['drop'] },
      { name: 'ripple-left', at: [10, 24], burst: 1, start: 2, angle: 180, speed: 2, life: 3, shapes: ['ripple-l'] },
      { name: 'ripple-right', at: [23, 24], burst: 1, start: 2, angle: 0, speed: 2, life: 3, shapes: ['ripple-r'] }] },
    // A defeated creature: six puffs in a placed cluster swell, rise, cool to grey and dissolve along diagonals.
    poof: { frames: 6, duration: 70, seed: 2, emitters: [
      puffs('core', [16, 18], 1.7, 'cloud'), puffs('left', [11, 17], 1.2, 'puff'), puffs('right', [21, 17], 1.2, 'puff'),
      puffs('upper-left', [14, 13], 1.2, 'puff'), puffs('upper-right', [19, 13], 1.2, 'puff'), puffs('lower', [16, 21], 1.2, 'puff')] },
    hit: { frames: 3, duration: 50, emitters: [{ at: [16, 16], burst: 1, life: 3, shapes: ['hit-0', 'hit-1', 'hit-2'], play: 'once' }] },
    sparkle: { frames: 4, duration: 90, loop: true, emitters: [{ at: [15, 15], burst: 1, life: 4, shapes: ['sparkle-0', 'sparkle-1', 'sparkle-2', 'sparkle-3'], play: 'once' }] },
    // Footstep dust: two puffs slide apart and fade.
    dust: { frames: 3, duration: 70, seed: 4, emitters: [
      { name: 'left', at: [15, 26], burst: 1, angle: 185, speed: 1.6, drag: 0.3, life: 3, shapes: ['dust-0', 'dust-1', 'dust-2'] },
      { name: 'right', at: [17, 26], burst: 1, angle: 355, speed: 1.6, drag: 0.3, life: 3, shapes: ['dust-0', 'dust-1', 'dust-2'] }] }
  },
  sheet: { columns: 8, trim: true }
};
writeJSON('art/effects/fx.fx.json', source, force);
console.log('art/effects/fx.fx.json written; compile it into art/recipes/fx.json');
