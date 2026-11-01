// Frame-by-frame effects applied to an uploaded sprite: dissolve, hit flash, shatter, disintegrate, glow,
// pop-in, freeze, poison, dash afterimages and hover. Original code; the dissolve-with-burning-edge idea
// follows indiesoftby/defold-dissolve-fx (CC0), done on the CPU per frame.
import type { Rgba } from '../lib/image';
import type { Clip } from '../lib/atlas';

export interface EffectOptions { frames: number; duration: number; seed: number; color: string; color2: string; loop: boolean }

export const IMAGE_EFFECTS: { id: string; label: string; loop: boolean; color: string; color2: string; hint: string }[] = [
  { id: 'dissolve', label: '溶解燃燒', loop: false, color: '#ffb547', color2: '#ff4d2e', hint: '顏色 1：燃燒邊緣；顏色 2：外圈' },
  { id: 'flash', label: '受擊閃白 + 震動', loop: false, color: '#ffffff', color2: '#ff3b3b', hint: '顏色 1：閃光；顏色 2：受傷色調' },
  { id: 'shatter', label: '碎裂', loop: false, color: '#ffffff', color2: '#000000', hint: '' },
  { id: 'disintegrate', label: '化為粒子消散', loop: false, color: '#9be7ff', color2: '#ffffff', hint: '顏色 1：粒子色調' },
  { id: 'glow', label: '發光脈動（buff）', loop: true, color: '#ffe66d', color2: '#ffffff', hint: '顏色 1：光暈' },
  { id: 'pop', label: '彈出出現', loop: false, color: '#ffffff', color2: '#000000', hint: '' },
  { id: 'freeze', label: '冰凍', loop: false, color: '#9fe3ff', color2: '#ffffff', hint: '顏色 1：冰；顏色 2：閃光' },
  { id: 'poison', label: '中毒', loop: true, color: '#7bd84a', color2: '#3f7d20', hint: '顏色 1：色調；顏色 2：泡泡' },
  { id: 'dash', label: '衝刺殘影', loop: false, color: '#6ec6ff', color2: '#ffffff', hint: '顏色 1：殘影' },
  { id: 'hover', label: '漂浮（idle）', loop: true, color: '#000000', color2: '#000000', hint: '' },
];

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

/** Smooth value noise in [0, 1). */
function noiseField(w: number, h: number, seed: number, cell = 4): Float32Array {
  const rand = rng(seed), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Float32Array.from({ length: gw * gh }, () => rand());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (i: number, j: number) => grid[j * gw + i];
    const top = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx, bot = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
    out[y * w + x] = (top + (bot - top) * sy) * 0.75 + rand() * 0.25;
  }
  return out;
}

class Canvas {
  data: Uint8Array;
  constructor(public width: number, public height: number) { this.data = new Uint8Array(width * height * 4); }
  set(x: number, y: number, c: ArrayLike<number>, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || a <= 0) return;
    const o = (y * this.width + x) * 4, k = Math.min(255, a) / 255, ia = 1 - k;
    this.data[o] = Math.round(c[0] * k + this.data[o] * ia);
    this.data[o + 1] = Math.round(c[1] * k + this.data[o + 1] * ia);
    this.data[o + 2] = Math.round(c[2] * k + this.data[o + 2] * ia);
    this.data[o + 3] = Math.max(this.data[o + 3], Math.min(255, a));
  }
  image(): Rgba { return { width: this.width, height: this.height, data: this.data }; }
}

export function applyImageEffect(effect: string, sprite: Rgba, o: EffectOptions): Clip {
  const { width: w, height: h, data: src } = sprite;
  const pad = Math.max(6, Math.round(Math.max(w, h) * (['shatter', 'dash'].includes(effect) ? 0.6 : 0.25)));
  const W = (effect === 'dash' ? w * 3 : w) + pad * 2, H = h + pad * 2;
  const ox = pad, oy = pad;
  const n = Math.max(2, o.frames), c1 = rgb(o.color), c2 = rgb(o.color2), rand = rng(o.seed * 7919);
  const px = (x: number, y: number) => src.subarray((y * w + x) * 4, (y * w + x) * 4 + 4);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= 128;
  const frames: Rgba[] = [];
  const drawSprite = (cv: Canvas, dx: number, dy: number, tint?: number[], amount = 0, alpha = 255) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      const p = px(x, y), c = tint ? [0, 1, 2].map(i => p[i] + (tint[i] - p[i]) * amount) : p;
      cv.set(ox + x + dx, oy + y + dy, c, alpha);
    }
  };
  const outline = (cv: Canvas, color: number[], alpha: number, width = 1, dx = 0, dy = 0) => {
    for (let y = -width; y < h + width; y++) for (let x = -width; x < w + width; x++) {
      if (solid(x, y)) continue;
      let near = false;
      for (let j = -width; j <= width && !near; j++) for (let i = -width; i <= width; i++) if (Math.abs(i) + Math.abs(j) <= width && solid(x + i, y + j)) { near = true; break; }
      if (near) cv.set(ox + x + dx, oy + y + dy, color, alpha);
    }
  };

  if (effect === 'dissolve') {
    const noise = noiseField(w, h, o.seed, Math.max(2, Math.round(Math.min(w, h) / 8)));
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = (f / (n - 1)) * 1.15 - 0.05;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!solid(x, y)) continue;
        const v = noise[y * w + x];
        if (v < t) continue;
        if (v < t + 0.05) cv.set(ox + x, oy + y, c1);
        else if (v < t + 0.1) cv.set(ox + x, oy + y, c2);
        else cv.set(ox + x, oy + y, px(x, y));
      }
      frames.push(cv.image());
    }
  } else if (effect === 'flash') {
    const shake = [[0, 0], [2, 0], [-2, 1], [1, -1], [-1, 0], [1, 0], [0, 0]];
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), [dx, dy] = shake[Math.min(f, shake.length - 1)].map(v => Math.round(v * Math.max(1, w / 32)));
      if (f < 2) drawSprite(cv, dx, dy, c1, 1);
      else if (f < n - 1) drawSprite(cv, dx, dy, c2, 0.5 * (1 - (f - 2) / Math.max(1, n - 3)));
      else drawSprite(cv, 0, 0);
      frames.push(cv.image());
    }
  } else if (effect === 'shatter') {
    const size = Math.max(2, Math.round(Math.min(w, h) / 6));
    const chunks: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
      const cx = x + size / 2 - w / 2, cy = y + size / 2 - h / 2, d = Math.hypot(cx, cy) || 1;
      chunks.push({ x, y, vx: (cx / d) * (0.8 + rand() * 1.6) * size / 3, vy: (cy / d) * (0.6 + rand() * 1.2) * size / 3 - rand() * size / 2 });
    }
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = f, alpha = f < n * 0.6 ? 255 : Math.round(255 * (1 - (f - n * 0.6) / (n * 0.4)));
      for (const ch of chunks) {
        const dx = ch.vx * t, dy = ch.vy * t + 0.25 * t * t * size / 4;
        for (let y = ch.y; y < Math.min(h, ch.y + size); y++) for (let x = ch.x; x < Math.min(w, ch.x + size); x++) if (solid(x, y)) cv.set(ox + x + dx, oy + y + dy, px(x, y), alpha);
      }
      frames.push(cv.image());
    }
  } else if (effect === 'disintegrate') {
    const delay = new Float32Array(w * h), drift = new Float32Array(w * h * 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      delay[y * w + x] = (x / w) * 0.55 + rand() * 0.25;
      drift[(y * w + x) * 2] = 0.6 + rand() * 1.4; drift[(y * w + x) * 2 + 1] = -(0.8 + rand() * 1.8);
    }
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = f / (n - 1);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!solid(x, y)) continue;
        const local = (t - delay[y * w + x]) / 0.35;
        if (local <= 0) { cv.set(ox + x, oy + y, px(x, y)); continue; }
        if (local >= 1) continue;
        const k = local * pad * 0.9, p = px(x, y), c = [0, 1, 2].map(i => p[i] + (c1[i] - p[i]) * Math.min(1, local * 1.6));
        cv.set(ox + x + drift[(y * w + x) * 2] * k, oy + y + drift[(y * w + x) * 2 + 1] * k, c, Math.round(255 * (1 - local)));
      }
      frames.push(cv.image());
    }
  } else if (effect === 'glow') {
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), s = 0.5 - 0.5 * Math.cos((f / n) * Math.PI * 2);
      outline(cv, c1, Math.round(70 + 120 * s), 2);
      outline(cv, c2, Math.round(110 + 145 * s), 1);
      drawSprite(cv, 0, 0, c1, 0.25 * s);
      frames.push(cv.image());
    }
  } else if (effect === 'pop') {
    const curve = (t: number) => (t < 0.45 ? 1.25 * (t / 0.45) : t < 0.7 ? 1.25 - 0.35 * ((t - 0.45) / 0.25) : 0.9 + 0.1 * ((t - 0.7) / 0.3));
    for (let f = 0; f < n; f++) {
      // Grow while appearing, then stretch tall (thinner) and settle with a squash (wider).
      const cv = new Canvas(W, H), t = f / (n - 1), sy = Math.max(0.05, curve(t));
      const sx = t <= 0.45 ? sy : sy > 1 ? 2 - sy : 1 + (1 - sy) * 0.6;
      const tw = Math.max(1, Math.round(w * sx)), th = Math.max(1, Math.round(h * sy));
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const sxp = Math.min(w - 1, Math.floor(x / sx)), syp = Math.min(h - 1, Math.floor(y / sy));
        if (solid(sxp, syp)) cv.set(ox + Math.round(w / 2 - tw / 2) + x, oy + h - th + y, px(sxp, syp));
      }
      frames.push(cv.image());
    }
  } else if (effect === 'freeze') {
    const sparks = Array.from({ length: Math.max(3, Math.round(w * h / 120)) }, () => [Math.floor(rand() * w), Math.floor(rand() * h), rand()]);
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = f / (n - 1);
      drawSprite(cv, 0, 0, c1, 0.65 * Math.min(1, t * 1.4));
      outline(cv, c1, Math.round(255 * Math.min(1, t * 1.6)), 1);
      for (const [x, y, s] of sparks) if (t > s * 0.6 && t < s * 0.6 + 0.35 && solid(x, y)) {
        cv.set(ox + x, oy + y, c2); cv.set(ox + x - 1, oy + y, c2, 150); cv.set(ox + x + 1, oy + y, c2, 150); cv.set(ox + x, oy + y - 1, c2, 150); cv.set(ox + x, oy + y + 1, c2, 150);
      }
      frames.push(cv.image());
    }
  } else if (effect === 'poison') {
    const bubbles = Array.from({ length: Math.max(3, Math.round(w / 6)) }, () => [rand() * w, rand(), 1 + Math.floor(rand() * 2)]);
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = f / n, s = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      drawSprite(cv, 0, 0, c1, 0.2 + 0.35 * s);
      for (const [bx, phase, r] of bubbles) {
        const p = (t + phase) % 1, y = h * 0.9 - p * (h * 0.9 + pad * 0.8), x = bx + Math.sin(p * 6.28) * 1.5;
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.abs(i) + Math.abs(j) === r) cv.set(ox + x + i, oy + y + j, c2, Math.round(255 * (1 - p)));
      }
      frames.push(cv.image());
    }
  } else if (effect === 'dash') {
    const dist = w * 2;
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), t = f / (n - 1), ease = 1 - (1 - t) ** 3, x = Math.round(dist * ease);
      for (let k = 4; k >= 1; k--) {
        const tt = Math.max(0, t - k * 0.06), e2 = 1 - (1 - tt) ** 3;
        if (t - k * 0.06 < 0) continue;
        drawSprite(cv, Math.round(dist * e2), 0, c1, 0.85, Math.round(150 - k * 30));
      }
      drawSprite(cv, x, 0);
      frames.push(cv.image());
    }
  } else {
    // hover: bob up and down with a shadow that shrinks as the sprite rises
    for (let f = 0; f < n; f++) {
      const cv = new Canvas(W, H), s = Math.sin((f / n) * Math.PI * 2), dy = Math.round(-Math.max(1, h / 16) * (1 + s));
      const sw = Math.round(w * (0.55 - 0.1 * (1 + s) / 2));
      for (let x = -sw / 2; x <= sw / 2; x++) cv.set(ox + w / 2 + x, oy + h + 1, [0, 0, 0], 90);
      drawSprite(cv, 0, dy);
      frames.push(cv.image());
    }
  }
  return { name: effect, frames, durations: frames.map(() => o.duration), loop: o.loop };
}
