// Builds a pixelforge-scene manifest of one 240x160 screen of the island, straight from the game's map, so the
// Pixelbolt scene viewer can review it (native size, grayscale, density, lighting). Assets are file references and
// the terrain is three tilemap placements, so the manifest stays small and always shows the current recipes.
// Usage: node tools/make-scene.mjs <name> <tileX> <tileY> [--night]
import { writeJSON } from './common.mjs';
import { OBJECTS, isSand, isGrass } from '../game/src/map.js';
const [name = 'headland', tx = '12', ty = '0'] = process.argv.slice(2), night = process.argv.includes('--night');
const X0 = Number(tx), Y0 = Number(ty), COLS = 15, ROWS = 10;
// Scene asset paths are relative to art/scenes/. Sprites use `anchor: "frame"`, so the scene places every drawn frame
// by its own atlas anchor, as the game does, including animations whose anchors change between frames.
const file = recipe => `../recipes/${recipe}.json`;
const lit = recipe => ({ recipe: file(recipe), normal: file(`${recipe}-normal`), emissive: file(`${recipe}-emissive`) });
const assets = { water: file('water'), shore: file('shore'), grass: file('grass'), props: file('props'), flora: file('flora'), rocks: file('rocks'), keeper: file('keeper'), lighthouse: lit('lighthouse'), lamp: lit('lamp') };
// Terrain tilemaps carry a one-tile ring of context cells (legend null) so edge tiles see the map beyond the window.
const framed = (inside, outside) => Array.from({ length: ROWS + 2 }, (_, j) => Array.from({ length: COLS + 2 }, (_, i) => {
  const x = X0 + i - 1, y = Y0 + j - 1, edge = i === 0 || j === 0 || i === COLS + 1 || j === ROWS + 1;
  return inside(x, y) ? (edge ? outside : outside.toLowerCase()) : '.';
}).join(''));
// Water variants follow the game's own per-cell choice.
const sea = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => { const x = X0 + i, y = Y0 + j; return 'abc'[(x * 7 + y * 13 + ((x * y) % 5)) % 3]; }).join(''));
const instances = [
  { name: 'sea', asset: 'water', at: [0, 0], tilemap: { rows: sea, legend: { a: { animation: 'shimmer-a' }, b: { animation: 'shimmer-b' }, c: { animation: 'shimmer-c' } } } },
  { name: 'sand', asset: 'shore', at: [-16, -16], tilemap: { rows: framed(isSand, 'S'), legend: { s: { animation: 'surf-{mask}', autotile: 'blob', match: 'sS' }, S: null } } },
  { name: 'turf', asset: 'grass', at: [-16, -16], tilemap: { rows: framed(isGrass, 'G'), legend: { g: { frame: 'grass-{mask}', autotile: 'blob', match: 'gG' }, G: null } } }
];
const ASSET = { palm: 'flora', oak: 'flora', 'boulder-a': 'rocks', 'boulder-b': 'rocks', lighthouse: 'lighthouse', lamp: 'lamp' };
const FRAME = { lighthouse: night ? undefined : 'unlit', lamp: night ? undefined : 'off', palm: 'palm-0', oak: 'oak-0' };
const ANIM = { lighthouse: 'night', lamp: 'on', grass: 'grass-sway' };
const visible = OBJECTS.map(([kind, x, y, extra = {}]) => ({ kind, x: x * 16 + 8 + (extra.dx ?? 0) - X0 * 16, y: y * 16 + 16 + (extra.dy ?? 0) - Y0 * 16 }))
  .filter(o => o.x > -40 && o.x < COLS * 16 + 40 && o.y > -8 && o.y < ROWS * 16 + 140 && ['lighthouse', 'lamp', 'palm', 'oak', 'bush', 'grass', 'rock', 'boulder-a', 'boulder-b', 'flower-red', 'flower-violet', 'flower-white', 'pot'].includes(o.kind))
  .sort((a, b) => a.y - b.y);
for (const o of visible) {
  const asset = ASSET[o.kind] ?? 'props', anim = night || o.kind === 'grass' ? ANIM[o.kind] : undefined, pick = anim ? { animation: anim } : { frame: FRAME[o.kind] ?? o.kind };
  instances.push({ name: o.kind, asset, at: [o.x, o.y], anchor: 'frame', ...pick });
}
instances.push({ name: 'keeper', asset: 'keeper', animation: 'idle-u', at: [8 * 16 + 8, 9 * 16 + 4], anchor: 'frame' });
const lighthouse = visible.find(o => o.kind === 'lighthouse'), lamps = visible.filter(o => o.kind === 'lamp');
// scope "all" lights the terrain and props as flat surfaces too, so the night preview darkens the whole island.
const scene = { format: 'pixelforge-scene', version: 1, name: `tidewatch-${name}${night ? '-night' : ''}`, width: COLS * 16, height: ROWS * 16, duration: 2400, background: '#213f7a', assets, instances,
  ...(night && { lighting: { ambient: 0.28, bands: 4, scope: 'all', lights: [{ at: [lighthouse.x, lighthouse.y - 98], height: 40, radius: 130, color: '#ffe8a0' }, ...lamps.map(l => ({ at: [l.x, l.y - 24], height: 14, radius: 64, color: '#ffb866' }))].slice(0, 8) } }) };
console.log('placements', instances.length);
writeJSON(`art/scenes/${scene.name}.scene.json`, scene, { force: true });
