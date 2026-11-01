// Mask-based random sprites, an original implementation of the technique described by Dave Bollinger
// and used in zfedoran/pixel-sprite-generator (MIT). Each mask cell is:
//  -1 always border, 0 empty, 1 random body/empty, 2 random body/border.
// The left half is drawn and mirrored; then an outline is added and the body shaded.
import type { Rgba } from '../lib/image';

interface MaskDef { label: string; width: number; rows: number[][]; mirrorY?: boolean }

// Original half-masks (left half; the right half is the mirror image).
export const MASKS: Record<string, MaskDef> = {
  ship: { label: '太空船', width: 6, rows: [
    [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1, 1], [0, 0, 0, 0, 1, -1], [0, 0, 0, 1, 1, -1], [0, 0, 0, 1, 1, -1],
    [0, 0, 1, 1, 1, -1], [0, 1, 1, 1, 2, 2], [0, 1, 1, 1, 2, 2], [0, 1, 1, 1, 2, 2], [0, 1, 1, 1, 1, -1],
    [0, 0, 0, 1, 1, 1], [0, 0, 0, 0, 0, 0]] },
  critter: { label: '小怪物', width: 6, rows: [
    [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1, 1], [0, 0, 0, 1, 1, 2], [0, 0, 1, 1, 1, 2], [0, 0, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1], [0, 1, 1, 2, 2, 1], [0, 0, 1, 1, 1, 1], [0, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0]] },
  potion: { label: '藥水瓶', width: 6, rows: [
    [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, -1, -1], [0, 0, 0, 0, -1, 2], [0, 0, 0, 0, 1, 2], [0, 0, 0, 1, 1, 2],
    [0, 0, 1, 1, 2, 2], [0, 1, 1, 2, 2, 2], [0, 1, 2, 2, 2, 2], [0, 1, 2, 2, 2, 2], [0, 1, 1, 2, 2, 2],
    [0, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]] },
  rune: { label: '符文 / 圖示', width: 6, rows: [
    [0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 1], [0, 1, 2, 2, 2, 2], [0, 1, 2, 1, 1, 1], [0, 1, 2, 1, 2, 2],
    [0, 1, 2, 1, 2, -1], [0, 1, 2, 1, 2, -1], [0, 1, 2, 1, 2, 2], [0, 1, 2, 1, 1, 1], [0, 1, 2, 2, 2, 2],
    [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]], mirrorY: true },
};

function rng(seed: number) {
  let t = seed >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(hue: number, sat: number, light: number): [number, number, number] {
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    return Math.round(255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

export function maskSprite(maskId: string, seed: number): Rgba {
  const def = MASKS[maskId] ?? MASKS.ship;
  const random = rng(seed * 2654435761);
  const half = def.width, w = half * 2, hgt = def.rows.length;
  // 0 empty, 1 body, -1 border
  const cells = Array.from({ length: hgt }, (_, y) => Array.from({ length: w }, (_, x) => {
    const mx = x < half ? x : w - 1 - x;
    const v = def.rows[y][mx];
    return v;
  }));
  // Randomise the left half, then mirror.
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < half; x++) {
      let v = def.rows[y][x];
      if (v === 1) v = random() < 0.5 ? 0 : 1;
      else if (v === 2) v = random() < 0.5 ? 1 : -1;
      cells[y][x] = v;
      cells[y][w - 1 - x] = v;
    }
  }
  if (def.mirrorY) for (let y = 0; y < hgt / 2; y++) cells[hgt - 1 - y] = [...cells[y]];
  // Outline: an empty cell next to a body cell becomes border.
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= hgt ? 0 : cells[y][x]);
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    if (cells[y][x] === 0 && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some(v => v === 1)) cells[y][x] = -1;
  }
  // Shade: hue per sprite, brightness by row with a little noise.
  const hue = random(), sat = 0.45 + random() * 0.4;
  const data = new Uint8Array(w * hgt * 4);
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    const v = cells[y][x], o = (y * w + x) * 4;
    if (v === 0) continue;
    let rgb: [number, number, number];
    if (v === -1) rgb = [24, 20, 37];
    else {
      const light = 0.28 + 0.5 * Math.sin((y / hgt) * Math.PI) * (0.8 + random() * 0.2) + (x < half ? 0.06 : 0);
      rgb = hsl((hue + (y / hgt) * 0.08) % 1, sat, Math.min(0.85, light));
    }
    data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255;
  }
  return { width: w, height: hgt, data };
}
