// One-time scaffold for the lighthouse and its aligned normal/emissive passes (64x128).
// Geometry is laid out row by row: a tapered, cylinder-shaded tower with hand-placed bands, windows,
// door, masonry, gallery and lantern room. The three recipes share frame names, timing and animations.
import { linkedPalette, writeJSON } from './common.mjs';
const W = 64, H = 128, CX = 32;
const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
const put = (g, x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
// Colour ramps: [outline, rim, highlight, light, mid, shade, dark]
const RAMP = { white: ['k', 'R', '7', 'r', 'R', 't', 'T'], navy: ['k', 'b', 'b', 'b', 'B', 'V', 'V'], stone: ['k', 't', 'r', 'R', 't', 'T', 'y'], red: ['k', '2', '1', '1', '2', '3', '3'] };
function shadeAt(t) { return t < 0.12 ? 1 : t < 0.34 ? 2 : t < 0.55 ? 3 : t < 0.74 ? 4 : t < 0.9 ? 5 : 6; }
function cylinderRow(g, y, half, ramp) {
  const left = CX - half, right = CX + half - 1;
  for (let x = left; x <= right; x++) put(g, x, y, x === left || x === right ? ramp[0] : ramp[shadeAt((x - left) / (right - left))]);
  return [left, right];
}
// Normal encoding (+X right, +Y down, +Z toward the viewer) to hex.
const enc = (nx, ny, nz) => { const n = Math.hypot(nx, ny, nz) || 1; return '#' + [nx, ny, nz].map(v => Math.round((v / n + 1) * 127.5).toString(16).padStart(2, '0')).join(''); };
const NORMAL_KEYS = '0123456789';
const normalPalette = Object.fromEntries([...NORMAL_KEYS].map((k, i) => { const a = (i / 9 - 0.5) * Math.PI * 0.85; return [k, enc(Math.sin(a), 0, Math.cos(a))]; }));
Object.assign(normalPalette, { u: enc(0, -0.8, 0.6), d: enc(0, 0.7, 0.7), f: enc(0, 0, 1), U: enc(-0.3, -0.7, 0.65), D: enc(0.3, -0.7, 0.65) });
function normalRow(n, y, half, tilt = 0) {
  const left = CX - half, right = CX + half - 1;
  for (let x = left; x <= right; x++) put(n, x, y, tilt < 0 ? 'u' : NORMAL_KEYS[Math.min(9, Math.floor((x - left) / (right - left + 1) * 10))]);
}
function build(lit, phase) {
  const g = blank(), n = blank(), e = blank();
  // Finial and weather vane
  for (let y = 2; y <= 7; y++) put(g, CX - 1, y, y === 2 ? 'k' : 'v'), put(n, CX - 1, y, 'f');
  [[CX - 3, 4, 'k'], [CX - 2, 4, 'M'], [CX, 4, 'M'], [CX + 1, 4, 'k']].forEach(([x, y, c]) => { put(g, x, y, c); put(n, x, y, 'f'); });
  // Roof dome: widening red cap
  const roof = [3, 5, 7, 8, 9, 10, 11, 12, 13, 13];
  roof.forEach((half, i) => { const y = 8 + i; cylinderRow(g, y, half, RAMP.red); normalRow(n, y, half, i < 4 ? -1 : 0); if (i === 0) for (let x = CX - half; x < CX + half; x++) put(g, x, y, 'k'); });
  for (let x = CX - 14; x < CX + 14; x++) { put(g, x, 18, 'k'); put(n, x, 18, 'd'); }
  // Lantern room: glass panes between iron mullions, lamp in the middle
  for (let y = 19; y <= 31; y++) {
    const [left, right] = cylinderRow(g, y, 11, ['k', 'v', 'v', 'v', 'v', 'v', 'v']);
    normalRow(n, y, 11);
    for (let x = left + 1; x < right; x++) {
      const col = x - left, mullion = col % 5 === 0;
      let c = mullion ? (col < 11 ? 'M' : 'v') : (y + col) % 7 === 0 ? 'w' : col < 8 ? 'W' : col < 15 ? 'c' : 'C';
      if (lit && !mullion) {
        const flash = Math.abs(col - (4 + phase * 4)) <= 1 && y >= 21 && y <= 29;
        c = flash ? 'x' : (y >= 22 && y <= 28 && col > 6 && col < 16) ? 'X' : 'e';
        put(e, x, y, flash ? 'x' : (y >= 22 && y <= 28 && col > 6 && col < 16) ? 'X' : 'i');
      } else if (!mullion && y >= 23 && y <= 28 && col >= 9 && col <= 13) c = y === 23 ? 'T' : col === 9 ? 'R' : 't';
      put(g, x, y, c);
    }
  }
  // Gallery: railing in front of the lantern room, then a metal platform wider than the tower
  for (let x = CX - 15; x < CX + 15; x++) {
    put(g, x, 29, x === CX - 15 || x === CX + 14 ? 'k' : 'M');
    for (let y = 30; y <= 32; y++) if ((x - CX + 15) % 3 === 0) put(g, x, y, 'v');
    put(g, x, 33, 'k'); put(g, x, 34, x < CX - 6 ? 'M' : x < CX + 6 ? 'v' : 'y'); put(g, x, 35, 'y'); put(g, x, 36, 'k');
    put(n, x, 29, 'u'); put(n, x, 33, 'u'); put(n, x, 34, 'f'); put(n, x, 35, 'd'); put(n, x, 36, 'd');
  }
  // Tower: tapered white cylinder with three navy bands
  const bands = [[46, 53], [70, 77], [94, 101]];
  for (let y = 37; y <= 105; y++) {
    const half = 11 + Math.floor((y - 37) / 17);
    const band = bands.some(([a, b]) => y >= a && y <= b);
    cylinderRow(g, y, half, band ? RAMP.navy : RAMP.white);
    normalRow(n, y, half);
    if (y === 37) for (let x = CX - half; x < CX + half; x++) put(g, x, y, 'y');
  }
  // Windows (dark by day, warm at night) and a few weathering streaks under them
  for (const [wy, wx] of [[58, CX - 3], [82, CX + 1]]) {
    const win = ['.kkk.', 'kVVVk', 'kVcVk', 'kVVVk', 'kVVVk', 'kkkkk'];
    win.forEach((row, dy) => [...row].forEach((c, dx) => { if (c === '.') return; const glow = lit && c !== 'k'; put(g, wx + dx, wy + dy, glow ? (c === 'c' ? 'x' : 'X') : c); if (glow) put(e, wx + dx, wy + dy, 'i'); }));
    put(g, wx + 1, wy + 6, 't'); put(g, wx + 1, wy + 7, 't'); put(g, wx + 3, wy + 6, 't');
  }
  // Masonry foundation with staggered joints and a little moss
  for (let y = 106; y <= 124; y++) {
    const half = 19 + (y > 118 ? 1 : 0);
    const [left, right] = cylinderRow(g, y, half, RAMP.stone);
    normalRow(n, y, half);
    for (let x = left + 1; x < right; x++) {
      const course = Math.floor((y - 106) / 4), joint = (x - left + (course % 2) * 4) % 8 === 0;
      if ((y - 106) % 4 === 0 || joint) put(g, x, y, x - left < 10 ? 't' : 'T');
    }
  }
  for (let x = CX - 20; x < CX + 20; x++) put(g, x, 106, 'y');
  [[CX - 17, 123, 'g'], [CX - 16, 123, 'h'], [CX - 18, 122, 'g'], [CX + 14, 123, 'g'], [CX + 15, 122, 'g'], [CX + 16, 123, 'h']].forEach(([x, y, c]) => put(g, x, y, c));
  // Door: arched planks with an iron ring; warm light spills at night
  const door = ['..kkkk..', '.kUuuUk.', 'kUuOOuUk', 'kUOuuOUk', 'kUOuuOUk', 'kUOuMOUk', 'kUOuuOUk', 'kUOuuOUk', 'kUOuuOUk', 'kUOuuOUk', 'kkkkkkkk'];
  door.forEach((row, dy) => [...row].forEach((c, dx) => { if (c !== '.') { put(g, CX - 4 + dx, 114 + dy, c); put(n, CX - 4 + dx, 114 + dy, 'f'); } }));
  // Steps and ground shadow
  for (let x = CX - 7; x < CX + 7; x++) { put(g, x, 125, x < CX - 2 ? 'R' : 't'); put(g, x, 126, 'k'); put(n, x, 125, 'u'); put(n, x, 126, 'f'); }
  for (let x = CX - 22; x < CX + 22; x++) if (g[125][x] === '.') put(g, x, 125, '_');
  for (let x = CX - 20; x < CX + 20; x++) if (g[126][x] === '.') put(g, x, 126, '_');
  // Normal pass covers exactly the colour silhouette.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.' || g[y][x] === '_') n[y][x] = '.'; else if (n[y][x] === '.') n[y][x] = 'f';
  const rows = grid => grid.map(r => r.join(''));
  return { color: rows(g), normal: rows(n), emissive: rows(e) };
}
const variants = [['unlit', false, 0, 1000], ['lit-0', true, 0, 140], ['lit-1', true, 1, 140], ['lit-2', true, 2, 140], ['lit-3', true, 3, 140]];
const passes = { color: [], normal: [], emissive: [] };
for (const [name, lit, phase, duration] of variants) {
  const built = build(lit, phase);
  for (const pass of Object.keys(passes)) passes[pass].push({ name, duration, ops: [{ op: 'grid', x: 0, y: 0, rows: built[pass] }] });
}
const animations = { day: { frames: ['unlit'] }, night: { frames: ['lit-0', 'lit-1', 'lit-2', 'lit-3'] } };
const base = { version: 1, width: W, height: H, anchor: [32, 125], animations, sheet: { columns: 5 } };
const force = { force: process.argv.includes('--force') };
writeJSON('art/recipes/lighthouse.json', { ...base, name: 'lighthouse', palette: linkedPalette(), frames: passes.color }, force);
writeJSON('art/recipes/lighthouse-normal.json', { ...base, name: 'lighthouse-normal', palette: normalPalette, frames: passes.normal }, force);
writeJSON('art/recipes/lighthouse-emissive.json', { ...base, name: 'lighthouse-emissive', palette: linkedPalette(), frames: passes.emissive }, force);
console.log('lighthouse passes written');
