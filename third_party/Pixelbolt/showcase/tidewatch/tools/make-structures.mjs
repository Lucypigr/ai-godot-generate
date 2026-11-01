// One-time scaffold for the cottage (64x64), lamp post (16x32) and rowboat (48x32), with aligned normal/emissive passes.
import { linkedPalette, writeJSON } from './common.mjs';
const enc = (nx, ny, nz) => { const n = Math.hypot(nx, ny, nz) || 1; return '#' + [nx, ny, nz].map(v => Math.round((v / n + 1) * 127.5).toString(16).padStart(2, '0')).join(''); };
const NORMALS = { f: enc(0, 0, 1), r: enc(0, -0.55, 0.83), R: enc(-0.45, -0.5, 0.74), L: enc(0.45, -0.5, 0.74), u: enc(0, -0.9, 0.44), d: enc(0, 0.7, 0.7), l: enc(-0.8, 0, 0.6), e: enc(0.8, 0, 0.6) };
const force = { force: process.argv.includes('--force') };
function canvas(w, h) { const g = Array.from({ length: h }, () => Array(w).fill('.')); return { g, w, h, put(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; }, rows() { return g.map(r => r.join('')); } }; }
function stampRows(c, x0, y0, rows) { rows.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch !== '.') c.put(x0 + dx, y0 + dy, ch); })); }
// The anchor is the ground point the game places; every pass carries it so each atlas stands alone.
const ANCHORS = { cottage: [32, 59], lamp: [7, 29] };
function writePasses(name, w, h, frames, animations, columns) {
  const base = { version: 1, width: w, height: h, anchor: ANCHORS[name], animations, sheet: { columns } };
  const pass = key => frames.map(f => ({ name: f.name, duration: f.duration, ops: [{ op: 'grid', x: 0, y: 0, rows: f[key] }] }));
  writeJSON(`art/recipes/${name}.json`, { ...base, name, palette: linkedPalette(), frames: pass('color') }, force);
  writeJSON(`art/recipes/${name}-normal.json`, { ...base, name: `${name}-normal`, palette: NORMALS, frames: pass('normal') }, force);
  writeJSON(`art/recipes/${name}-emissive.json`, { ...base, name: `${name}-emissive`, palette: linkedPalette(), frames: pass('emissive') }, force);
}
// ---------------- cottage ----------------
function cottage(night) {
  const c = canvas(64, 64), n = canvas(64, 64), e = canvas(64, 64);
  // Ground shadow
  for (let y = 58; y <= 62; y++) for (let x = 6 + (62 - y); x <= 58 - (62 - y) / 2; x++) c.put(x, y, '_');
  // Walls: plaster between timber, lit from the left
  for (let y = 33; y <= 59; y++) for (let x = 10; x <= 53; x++) {
    const t = (x - 10) / 43;
    let ch = t < 0.08 ? 'R' : t < 0.35 ? 'r' : t < 0.7 ? 'R' : t < 0.92 ? 't' : 'T';
    if (x === 10 || x === 53 || y === 59) ch = 'k';
    else if (x === 11 || x === 31 || x === 32 || x === 52 || y === 34 || y === 46 || y === 58) ch = x === 11 || y === 34 ? 'u' : 'U';
    c.put(x, y, ch); n.put(x, y, x < 14 ? 'l' : x > 50 ? 'e' : 'f');
  }
  // Windows: panes with a mullion cross; warm glow at night
  for (const wx of [15, 40]) {
    for (let y = 38; y <= 44; y++) for (let x = wx; x <= wx + 8; x++) {
      const frame = x === wx || x === wx + 8 || y === 38 || y === 44, mull = x === wx + 4 || y === 41;
      let ch = frame ? 'k' : mull ? 'U' : night ? ((x + y) % 5 === 0 ? 'x' : 'X') : (x - wx + y) % 6 === 0 ? 'W' : x - wx < 4 ? 'c' : 'C';
      c.put(x, y, ch); if (night && !frame) e.put(x, y, mull ? 'i' : 'X');
    }
    for (let x = wx - 1; x <= wx + 9; x++) { c.put(x, 45, 'u'); c.put(x, 46, 'U'); n.put(x, 45, 'u'); }
  }
  // Flower box under the left window
  stampRows(c, 14, 47, ['k1k7k1kk2k1', 'kUUUUUUUUUk', '.kkkkkkkkk.']);
  // Door
  stampRows(c, 27, 47, ['.kkkkkkkkk.', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoXuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kUOoOOoOuUk', 'kkkkkkkkkkk']);
  if (night) for (let y = 48; y <= 57; y++) e.put(28, y, 'i');
  // Roof: slate courses on a trapezoid, eaves overhanging the walls, ridge highlight
  for (let y = 10; y <= 34; y++) {
    const inset = Math.round((34 - y) * 0.26), left = 5 + inset, right = 58 - inset;
    for (let x = left; x <= right; x++) {
      const course = Math.floor((y - 10) / 3), rowInCourse = (y - 10) % 3;
      const joint = (x + course * 3) % 6 === 0 && rowInCourse !== 2;
      const t = (x - left) / (right - left);
      let ch = rowInCourse === 2 ? 'y' : joint ? 'y' : t < 0.2 ? 'R' : t < 0.55 ? 't' : t < 0.85 ? 'T' : 'y';
      if (y === 10) ch = t < 0.5 ? 'r' : 'R';
      if (x === left || x === right) ch = 'k';
      if (y === 34 || y === 33) ch = y === 34 ? 'k' : 'K';
      c.put(x, y, ch); n.put(x, y, x - left < 4 ? 'R' : right - x < 4 ? 'L' : y === 10 ? 'u' : 'r');
    }
  }
  for (let x = 13; x <= 50; x++) c.put(x, 9, 'k');
  // Chimney with cap, drawn over the roof
  for (let y = 2; y <= 16; y++) for (let x = 42; x <= 48; x++) {
    let ch = x === 42 || x === 48 ? 'k' : (y - 2) % 3 === 2 ? 'U' : x < 45 ? 'O' : 'u';
    if (y <= 3) ch = y === 2 ? 'k' : (x === 42 || x === 48 ? 'k' : 'T');
    c.put(x, y, ch); n.put(x, y, x < 45 ? 'l' : 'e');
  }
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const ch = c.g[y][x]; if (ch === '.' || ch === '_') n.g[y][x] = '.'; else if (n.g[y][x] === '.') n.g[y][x] = 'f'; }
  return { color: c.rows(), normal: n.rows(), emissive: e.rows() };
}
writePasses('cottage', 64, 64, [{ name: 'day', duration: 1000, ...cottage(false) }, { name: 'night', duration: 1000, ...cottage(true) }], { day: { frames: ['day'] }, night: { frames: ['night'] } }, 2);
// ---------------- lamp post ----------------
function lamp(state) {
  const c = canvas(16, 32), n = canvas(16, 32), e = canvas(16, 32);
  const head = ['...kkkkk....', '..kvMMMvk...', '.kkkkkkkkk..', '.kWcccCck...', '.kWcXcCck...', '.kWcccCck...', '.kkkkkkkkk..', '..kvvvvvk...', '....kvk.....'];
  head.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.') return;
    let out = ch;
    if (state !== 'off' && 'WcCX'.includes(ch)) out = ch === 'X' ? 'x' : state === 'on-1' && ch === 'C' ? 'i' : 'X';
    c.put(2 + dx, 2 + dy, out); n.put(2 + dx, 2 + dy, dx < 4 ? 'l' : dx > 7 ? 'e' : 'f');
    if (state !== 'off' && 'WcCX'.includes(ch)) e.put(2 + dx, 2 + dy, out === 'x' ? 'x' : out === 'i' ? 'i' : 'X');
  }));
  for (let y = 11; y <= 27; y++) { c.put(6, y, 'k'); c.put(7, y, y % 5 === 0 ? 'M' : 'v'); c.put(8, y, 'k'); n.put(6, y, 'l'); n.put(7, y, 'f'); n.put(8, y, 'e'); }
  stampRows(c, 4, 27, ['.kkkkk.', 'kvMMvvk', 'kkkkkkk']);
  stampRows(n, 4, 27, ['.uuuuu.', 'fffffff', 'fffffff']);
  for (let x = 3; x <= 12; x++) c.put(x, 30, '_');
  return { color: c.rows(), normal: n.rows(), emissive: e.rows() };
}
writePasses('lamp', 16, 32, [{ name: 'off', duration: 1000, ...lamp('off') }, { name: 'on-0', duration: 380, ...lamp('on-0') }, { name: 'on-1', duration: 240, ...lamp('on-1') }], { off: { frames: ['off'] }, on: { frames: ['on-0', 'on-1'] } }, 3);
// ---------------- rowboat (colour only, bobbing) ----------------
const boat = [
  '................................................',
  '................................................',
  '................................................',
  '..........kkkkkkkkkkkkkkkkkkkkkkkkkk............',
  '........kkooooooooooooooooooooooooookk..........',
  '......kkoOOOOOOOOOOOOOOOOOOOOOOOOOOOOokk........',
  '.....koOkkkkkkkkkkkkkkkkkkkkkkkkkkkkkOOuk.......',
  '....koOkuuUUUUUUUUUUUUUUUUUUUUUUUUUUukOuUk......',
  '...koOkuUOOOOkUUUUUUUUUkOOOOkUUUUUUuUkOuUk......',
  '...kOOkuUOooOkUUUUUUUUUkOooOkUUUUUUUukOuUk......',
  '...kOuku UOOOOkUUUUUUUUUkOOOOkUUUUUUuUkuuk......',
  '...kOukuUkkkkkUUUUUUUUUkkkkkUUUUUUUUukuUk.......',
  '....kuUkuuuuuuuuuuuuuuuuuuuuuuuuuuukUUk.........',
  '.....kUUkkkkkkkkkkkkkkkkkkkkkkkkkkkUUk..........',
  '......kUUUUUUUUUUUUUUUUUUUUUUUUUUUUUk...........',
  '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkk............'
].map(r => r.replace(/ /g, 'u'));
const boatFrame = (name, dy, duration) => ({ name, duration, ops: [
  { op: 'grid', x: 0, y: 10 + dy, rows: boat },
  { op: 'grid', x: 2, y: 26 + dy, rows: ['..ww..wWWw......wWw.....wWWw..ww'] }
] });
writeJSON('art/recipes/boat.json', { version: 1, name: 'boat', width: 48, height: 32, palette: linkedPalette(), anchor: [24, 24], sheet: { trim: true }, frames: [boatFrame('bob-0', 0, 700), boatFrame('bob-1', 1, 700)], animations: { bob: { frames: ['bob-0', 'bob-1'] } } }, force);
console.log('structures written');
