// Helpers for uploaded sprites: trim, fit, and convert to Pixelbolt symbols (rows of palette keys).
import type { Rgba } from './image';

/** Crops fully transparent borders. */
export function trimImage(img: Rgba): Rgba {
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] >= 128) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  if (maxX < 0) return { width: 1, height: 1, data: new Uint8Array(4) };
  const w = maxX - minX + 1, h = maxY - minY + 1, data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) data.set(img.data.subarray(((minY + y) * img.width + minX) * 4, ((minY + y) * img.width + minX + w) * 4) as Uint8Array, y * w * 4);
  return { width: w, height: h, data };
}

/** Nearest-neighbour downscale so the image fits in maxW × maxH (never upscales). */
export function fitImage(img: Rgba, maxW: number, maxH: number): Rgba {
  const k = Math.min(1, maxW / img.width, maxH / img.height);
  if (k >= 1) return img;
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (Math.min(img.height - 1, Math.floor((y + 0.5) / k)) * img.width + Math.min(img.width - 1, Math.floor((x + 0.5) / k))) * 4;
    data.set(img.data.subarray(s, s + 4) as Uint8Array, (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}

// Keys a symbol may use (letters and digits; '.' and ' ' mean empty in Pixelbolt).
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&*+-/:;<=>?@^_~';

/** Median-cut colour reduction: returns a palette of at most `count` RGB colours. */
export function medianCut(colors: number[][], count: number): number[][] {
  let boxes: number[][][] = [colors];
  while (boxes.length < count) {
    let best = -1, bestRange = 0, bestChannel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of box) { lo = Math.min(lo, p[c]); hi = Math.max(hi, p[c]); }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestChannel = c; }
      }
    });
    if (best < 0) break;
    const box = boxes[best].sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = box.length >> 1;
    boxes = [...boxes.slice(0, best), box.slice(0, mid), box.slice(mid), ...boxes.slice(best + 1)];
  }
  return boxes.map(box => [0, 1, 2].map(c => Math.round(box.reduce((s, p) => s + p[c], 0) / box.length)));
}

const hex = (c: number[]) => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');

/**
 * Converts an image into a Pixelbolt symbol. Pixels with alpha < 128 are empty; colours are reduced to
 * `maxColors` and given palette keys that the existing palette does not use.
 */
export function imageToSymbol(img: Rgba, existing: Record<string, string>, maxColors = 40): { rows: string[]; palette: Record<string, string> } {
  const opaque: number[][] = [];
  const counts = new Map<number, number[]>();
  for (let i = 0; i < img.width * img.height; i++) {
    if (img.data[i * 4 + 3] < 128) continue;
    const c = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]];
    const k = (c[0] << 16) | (c[1] << 8) | c[2];
    if (!counts.has(k)) counts.set(k, c);
    opaque.push(c);
  }
  const free = [...KEYS].filter(k => !(k in existing));
  const limit = Math.min(maxColors, free.length);
  const colors = counts.size <= limit ? [...counts.values()] : medianCut(opaque, limit);
  const palette: Record<string, string> = {};
  colors.forEach((c, i) => { palette[free[i]] = hex(c); });
  const nearest = new Map<number, string>();
  const keyOf = (c: number[]) => {
    const k = (c[0] << 16) | (c[1] << 8) | c[2];
    let key = nearest.get(k);
    if (key === undefined) {
      let best = 0, bestD = Infinity;
      colors.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bestD) { bestD = d; best = i; } });
      key = free[best];
      nearest.set(k, key);
    }
    return key;
  };
  const rows: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let row = '';
    for (let x = 0; x < img.width; x++) {
      const o = (y * img.width + x) * 4;
      row += img.data[o + 3] < 128 ? '.' : keyOf([img.data[o], img.data[o + 1], img.data[o + 2]]);
    }
    rows.push(row);
  }
  return { rows, palette };
}
