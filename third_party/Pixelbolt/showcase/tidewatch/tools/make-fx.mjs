// One-time scaffold for slash arcs, pickups and UI. The particle effects moved to a pixelforge-fx source
// (make-effects.mjs); the grids written here are ordinary frames.
import { linkedPalette, writeJSON } from './common.mjs';
const force = { force: process.argv.includes('--force') };
const canvas = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const rows = g => g.map(r => r.join(''));
const put = (g, x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
// ---------------- sword slash arcs (48x48, centred on the keeper's body) ----------------
const SWEEPS = { d: [-20, 200], u: [160, 380], r: [-110, 110], l: [70, 290] };
function slash(dir, frame) {
  const g = canvas(48, 48), [a0, a1] = SWEEPS[dir], cx = 24, cy = dir === 'u' ? 25 : dir === 'd' ? 23 : 24;
  const from = frame === 2 ? 0.45 : 0, to = frame === 0 ? 0.45 : 1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * 1.15, r = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx) * 180 / Math.PI; while (ang < a0) ang += 360; while (ang > a0 + 360) ang -= 360;
    const t = (ang - a0) / (a1 - a0); if (t < from || t > to) continue;
    const lead = frame === 2 ? 1 - (t - from) / (to - from) : (t - from) / (to - from); // thickest near the blade
    const outer = 19, thick = 1 + lead * 5.5;
    if (r > outer || r < outer - thick) continue;
    const edge = r > outer - 1.2 ? 'x' : r > outer - 2.4 ? (frame === 2 ? 'M' : '7') : frame === 2 ? '8' : 'W';
    put(g, x, y, lead < 0.25 && (x + y) % 2 ? '.' : edge);
  }
  return rows(g);
}
// Particle effects (fx.json) are compiled from art/effects/fx.fx.json, a pixelforge-fx source scaffolded by make-effects.mjs.
const slashFrames = [], slashAnimations = {};
for (const dir of 'durl') {
  slashAnimations[`slash-${dir}`] = { frames: [0, 1, 2].map(f => { const name = `slash-${dir}-${f}`; slashFrames.push({ name, duration: [50, 70, 70][f], ops: [{ op: 'grid', x: 0, y: 0, rows: slash(dir, f) }] }); return name; }), loop: false };
}
writeJSON('art/recipes/slash.json', { version: 1, name: 'slash', width: 48, height: 48, palette: linkedPalette(), anchor: [24, 24], frames: slashFrames, animations: slashAnimations, sheet: { columns: 6, trim: true } }, force);
// ---------------- pickups (16x16) with an emissive pass for the sunflint ----------------
const P = {
  'heart-0': ['................', '................', '................', '....kkk.kkk.....', '...k1x1k122k....', '...k1x11222k....', '...k1112223k....', '....k12223k.....', '.....k223k......', '......k3k.......', '.......k........', '................', '.....______.....', '................', '................'],
  'heart-1': ['................', '................', '................', '................', '....kkk.kkk.....', '...k1x1k122k....', '...k1x11222k....', '...k1112223k....', '....k12223k.....', '.....k223k......', '......k3k.......', '.......k........', '.....______.....', '................', '................'],
  'glass-0': ['................', '................', '................', '.......kk.......', '......kwWk......', '.....kwWWck.....', '....kwWWcccK....', '....kWWccCCk....', '....kWccCCnk....', '.....kcCCnk.....', '......kCnk......', '.......kk.......', '.....______.....', '................', '................', '................'],
  'glass-1': ['................', '................', '................', '.......kk.......', '......kWWk......', '.....kWxWck.....', '....kWxxWccK....', '....kWWWccCk....', '....kWccCCnk....', '.....kcCCnk.....', '......kCnk......', '.......kk.......', '.....______.....', '................', '................', '................'],
  'glass-2': ['................', '................', '................', '.......kk.......', '......kWWk......', '.....kWWWck.....', '....kWWWcxcK....', '....kWWccxCk....', '....kWccCCnk....', '.....kcCCnk.....', '......kCnk......', '.......kk.......', '.....______.....', '................', '................', '................'],
  'key': ['................', '................', '....kkkk........', '...kXeeXk.......', '..kXk..kXk......', '..kXk..kik......', '...kXiiik.......', '....kkXik.......', '......kXk.......', '......kXkk......', '......kXXik.....', '......kXkk......', '......kXXik.....', '.......kkk......', '.....______.....', '................'],
  'flint-0': ['................', '................', '.......kk.......', '......kxek......', '.....kxXXik.....', '.....keXXiik....', '....kxXXXiiIk...', '....keXXiiiIk...', '....kXXiiiIIk...', '.....kiiiIIk....', '.....kiIIIk.....', '......kIIk......', '.......kk.......', '.....______.....', '................', '................'],
  'flint-1': ['................', '................', '.......kk.......', '......kxxk......', '.....kxxXek.....', '.....kxXXiik....', '....kxXXXXiIk...', '....keXXXiiIk...', '....kXXXiiiIk...', '.....kXiiIIk....', '.....kiiIIk.....', '......kIIk......', '.......kk.......', '.....______.....', '................', '................']
};
const pickFrames = Object.entries(P).map(([name, g]) => ({ name, duration: name.startsWith('glass') ? 160 : name.startsWith('heart') ? 400 : 300, ops: [{ op: 'grid', x: 0, y: 0, rows: g }] }));
const pickAnimations = { heart: { frames: ['heart-0', 'heart-1'] }, glass: { frames: ['glass-0', 'glass-0', 'glass-1', 'glass-2'] }, key: { frames: ['key'] }, flint: { frames: ['flint-0', 'flint-1'] } };
writeJSON('art/recipes/pickups.json', { version: 1, name: 'pickups', width: 16, height: 16, palette: linkedPalette(), anchor: [8, 12], frames: pickFrames, animations: pickAnimations }, force);
const glow = name => P[name].map(r => r.replace(/[^xXeiI]/g, '.'));
writeJSON('art/recipes/pickups-emissive.json', { version: 1, name: 'pickups-emissive', width: 16, height: 16, palette: linkedPalette(), frames: pickFrames.map(f => ({ ...f, ops: [{ op: 'grid', x: 0, y: 0, rows: f.name.startsWith('flint') ? glow(f.name) : ['................'] }] })), animations: pickAnimations }, force);
// ---------------- UI icons (16x16) and a 9-slice dialog frame (8x8) ----------------
const U = {
  'heart-full': ['.kkk.kkk.', 'k1x1k122k', 'k1112222k', 'k1122223k', '.k12223k.', '..k223k..', '...k3k...', '....k....'],
  'heart-half': ['.kkk.kkk.', 'k1x1kKKLk', 'k112kKKLk', 'k122kKLLk', '.k12kLLk.', '..k2kLk..', '...kkk...', '....k....'],
  'heart-empty': ['.kkk.kkk.', 'kKKLkKKLk', 'kKKKKKLLk', 'kKKKKLLLk', '.kKKLLLk.', '..kKLLk..', '...kLk...', '....k....'],
  'glass': ['...kk...', '..kwWk..', '.kwWcck.', 'kWWccCnk', '.kcCCnk.', '..kCnk..', '...kk...'],
  'key': ['.kkk.....', 'kXeXk....', 'kX.Xkkkkk', 'kXiXXXiik', '.kkk.kXk.', '.....kkk.'],
  'flint': ['..kk..', '.kxek.', 'kxXXik', 'keXiIk', '.kiIk.', '..kk..']
};
const uiFrames = Object.entries(U).map(([name, g]) => ({ name, ops: [{ op: 'grid', x: 1, y: 1, rows: g.map(r => r.padEnd(10, '.').slice(0, 10)) }] }));
writeJSON('art/recipes/ui.json', { version: 1, name: 'ui', width: 12, height: 10, palette: linkedPalette(), frames: uiFrames }, force);
const box = {
  tl: ['..kkkkkk', '.kMMMMMM', 'kMvvvvvv', 'kMvVVVVV', 'kMvVVVVV', 'kMvVVVVV', 'kMvVVVVV', 'kMvVVVVV'],
  t: ['kkkkkkkk', 'MMMMMMMM', 'vvvvvvvv', 'VVVVVVVV', 'VVVVVVVV', 'VVVVVVVV', 'VVVVVVVV', 'VVVVVVVV'],
  c: Array(8).fill('VVVVVVVV')
};
const rot = g => g[0].split('').map((_, x) => g.map(r => r[x]).reverse().join(''));
const boxFrames = { tl: box.tl, t: box.t, tr: rot(box.tl), r: rot(box.t), br: rot(rot(box.tl)), b: rot(rot(box.t)), bl: rot(rot(rot(box.tl))), l: rot(rot(rot(box.t))), c: box.c };
writeJSON('art/recipes/dialog.json', { version: 1, name: 'dialog', width: 8, height: 8, palette: linkedPalette(), frames: Object.entries(boxFrames).map(([name, g]) => ({ name: `box-${name}`, ops: [{ op: 'grid', x: 0, y: 0, rows: g }] })), sheet: { columns: 9 } }, force);
console.log('slash, pickups, ui and dialog written');
