// One-time scaffold for trees (48x64). art/recipes/flora.json is the authoritative, editable source afterwards.
import { linkedPalette, writeJSON } from './common.mjs';
const S = {};
S['frond-r'] = [
  '.GGGG.............',
  'GjjllGGG..........',
  'GhjlllljGGG.......',
  '.GhhjjlllljGG.....',
  '..GGhhhjjjlljGG...',
  '...G.GGhGhjjjljG..',
  '......G.GhGhhjjlG.',
  '...........G.GhjG.',
  '.............G.GG.'
];
S['frond-r2'] = [
  '.GGGG.............',
  'GjjllGGG..........',
  'GhjlllljGG........',
  '.GhhjjllljGG......',
  '..GGhhhjjjljGG....',
  '...G.GGhGhjjjlG...',
  '......G.GhGhjjlG..',
  '..........G.GhjjG.',
  '............G.GhG.',
  '..............GG..'
];
S['frond-ur'] = [
  '..........G.',
  '.........GjG',
  '.......GGjlG',
  '......GjlljG',
  '....GGjllhG.',
  '...GjjllhhG.',
  '..GjllhhGG..',
  '.GjlhhG.G...',
  'GjlhGG.G....',
  'GjhG.G......',
  '.GG.........'
];
S['frond-d'] = [
  'GGG.......',
  'GhjGG.....',
  '.GhjjGG...',
  '..GhjjjG..',
  '..GghhjjG.',
  '...GGghjG.',
  '...G.GghjG',
  '.....G.GhG',
  '.......GhG',
  '.......GgG',
  '........G.'
];
S['coco'] = ['.kk.kk.', 'kuUkuUk', 'kUUkUUk', '.kk.kk.'];
// Trunk: a hand-chosen lean (x offset per row, top to bottom) and a three-row ring pattern.
const lean = [5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const ring = ['kooOuk', 'kOOuUk', 'kUuuUk'];
const trunk = lean.map((dx, y) => ('.'.repeat(dx) + (y > 29 ? 'kooOuUk' : ring[y % 3] + (y > 26 ? 'k' : '.')) + '.'.repeat(8)).slice(0, 14));
trunk.push('.kkooOuUkk....', 'kuUkkkkkkUuk..');
S['palm-trunk'] = trunk.map(r => r.padEnd(14, '.'));
S['leafA'] = ['....jjjj....', '..jjllljjh..', '.jjllllljhh.', 'jjllllljjhhg', 'jjjlljjjhhgg', 'hjjjjjjhhggg', '.hhjjhhhggg.', '..gghhhggg..', '....gggg....'];
S['leafB'] = ['....hhhh....', '..hhjjjhhg..', '.hjjjjjhhgg.', 'hjjjjjhhhggg', 'hhjjjhhhgggg', 'ghhhhhhggggG', '.gghhhgggGG.', '..GgggggGG..', '....GGGG....'];
S['leafC'] = ['....gggg....', '..gghhhggG..', '.ghhhhhggGG.', 'ghhhhhgggGGG', 'gghhhgggGGGG', 'GgggggGGGGGG', '.GGgggGGGGG.', '..GGGGGGGG..', '....GGGG....'];
S['oak-trunk'] = [
  '...kUOouk...', '...kUOuuk...', '...kUOouk...', '...kUoOuk...', '...kUOouk...', '...kUOuuk...',
  '...kUOouk...', '...kUoOuk...', '..kkUOuuUk..', '..kUOOuuUkk.', '.kUuOuuUuUk.', 'kUukkUukkuUk', '.kk..kk..kk.'
];
const palm = (variant) => ({ name: `palm-${variant}`, duration: [520, 420, 520][variant], anchor: [22, 61], ops: [
  { op: 'ellipse', x: 11, y: 58, w: 24, h: 6, color: '_' },
  { op: 'stamp', symbol: 'palm-trunk', x: 16, y: 27 }
], layers: [
  { name: 'back-fronds', ops: [
    { op: 'stamp', symbol: 'frond-ur', x: 24 + (variant === 1 ? 1 : 0), y: 10 },
    { op: 'stamp', symbol: 'frond-ur', x: 11 + (variant === 2 ? -1 : 0), y: 10, flipX: true }
  ] },
  { name: 'side-fronds', ops: [
    { op: 'stamp', symbol: variant === 1 ? 'frond-r2' : 'frond-r', x: 25, y: 20 },
    { op: 'stamp', symbol: variant === 2 ? 'frond-r2' : 'frond-r', x: 4, y: 20, flipX: true }
  ] },
  { name: 'front-fronds', ops: [
    { op: 'stamp', symbol: 'coco', x: 19, y: 23 },
    { op: 'stamp', symbol: 'frond-d', x: 24, y: 24 + (variant === 1 ? 1 : 0) },
    { op: 'stamp', symbol: 'frond-d', x: 13, y: 24 + (variant === 2 ? 1 : 0), flipX: true }
  ] }
] });
const clusters = {
  leafC: [[5, 21], [15, 16], [26, 16], [34, 21], [10, 29], [22, 31], [31, 29]],
  leafB: [[2, 15], [11, 10], [22, 9], [32, 14], [7, 24], [18, 23], [29, 23]],
  leafA: [[8, 6], [19, 4], [28, 8], [13, 15], [24, 16]]
};
// The canopy clusters share one layer so a single `outline` op traces their union's silhouette.
const oak = variant => ({ name: `oak-${variant}`, duration: 900, anchor: [23, 55], ops: [
  { op: 'ellipse', x: 8, y: 55, w: 32, h: 8, color: '_' },
  { op: 'stamp', symbol: 'oak-trunk', x: 18, y: 43 }
], layers: [
  { name: 'canopy', ops: [
    ...Object.entries(clusters).flatMap(([key, list]) => list.map(([x, y]) => ({ op: 'stamp', symbol: key, x, y: y + 4 }))),
    { op: 'outline', color: 'G', diagonal: true }
  ] }
] });
const frames = [palm(0), palm(1), palm(2), oak(0)];
const animations = { palm: { frames: ['palm-0', 'palm-1', 'palm-0', 'palm-2'] }, oak: { frames: ['oak-0'] } };
writeJSON('art/recipes/flora.json', { version: 1, name: 'flora', width: 48, height: 64, palette: linkedPalette(), symbols: S, frames, animations, sheet: { columns: 4, trim: true } }, { force: process.argv.includes('--force') });
console.log('flora frames', frames.length);
