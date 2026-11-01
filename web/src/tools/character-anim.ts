// Procedural animation for an uploaded character pose: idle breathing, walk and run (leg stride and bob),
// attack lunge, hurt knockback, jump with squash and stretch, and a death fall. Every frame is drawn on one
// canvas size with the feet at the same bottom-centre anchor, so all actions and directions line up in Godot.
import type { Rgba } from '../lib/image';
import type { Clip } from '../lib/atlas';

export const ACTIONS: { id: string; label: string; frames: number; ms: number; loop: boolean }[] = [
  { id: 'idle', label: '待機（呼吸）', frames: 4, ms: 200, loop: true },
  { id: 'walk', label: '走路', frames: 6, ms: 110, loop: true },
  { id: 'run', label: '跑步', frames: 6, ms: 80, loop: true },
  { id: 'attack', label: '攻擊（前衝）', frames: 6, ms: 70, loop: false },
  { id: 'hurt', label: '受傷', frames: 4, ms: 80, loop: false },
  { id: 'jump', label: '跳躍', frames: 8, ms: 80, loop: false },
  { id: 'death', label: '倒下', frames: 8, ms: 100, loop: false },
];

/** Screen-space facing for each direction (x right, y down). */
export const FACING: Record<string, [number, number]> = {
  S: [0, 1], SE: [0.7071, 0.7071], E: [1, 0], NE: [0.7071, -0.7071], N: [0, -1], NW: [-0.7071, -0.7071], W: [-1, 0], SW: [-0.7071, 0.7071],
};

export interface Layout { width: number; height: number; padX: number; padTop: number; padBottom: number }

/** One canvas size for a set of poses (the widest and tallest), with room for jumps and lunges. */
export function layoutFor(poses: Rgba[]): Layout {
  const w = Math.max(...poses.map(p => p.width)), h = Math.max(...poses.map(p => p.height));
  const padX = Math.ceil(Math.max(4, w * 0.4)), padTop = Math.ceil(Math.max(4, h * 0.45)), padBottom = 1;
  return { width: w + padX * 2, height: h + padTop + padBottom, padX, padTop, padBottom };
}

interface Pose {
  dx?: number; dy?: number; sx?: number; sy?: number; rot?: number; lean?: number;
  /** extra offset for a source pixel (legs, breathing) */
  local?: (x: number, y: number) => [number, number];
  tint?: number[]; tintAmount?: number; alpha?: number;
}

/** Draws `img` with its feet at the layout's bottom centre, transformed by `pose`. */
function draw(img: Rgba, L: Layout, pose: Pose): Rgba {
  const { width: w, height: h } = img;
  // 1) local deformation (forward mapping with whole-pixel offsets; overlaps keep the later pixel)
  const local = new Uint8Array(w * h * 4);
  const order: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) order.push(y * w + x);
  for (const i of order) {
    const x = i % w, y = Math.floor(i / w), o = i * 4;
    if (img.data[o + 3] < 128) continue;
    const [ox, oy] = pose.local ? pose.local(x, y) : [0, 0];
    const tx = x + Math.round(ox), ty = y + Math.round(oy);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
    local.set(img.data.subarray(o, o + 4) as Uint8Array, (ty * w + tx) * 4);
  }
  // 2) affine transform around the feet (inverse mapping, nearest neighbour)
  const out = new Uint8Array(L.width * L.height * 4);
  const ax = L.padX + w / 2 + (pose.dx ?? 0), ay = L.height - L.padBottom + (pose.dy ?? 0);
  const sx = pose.sx ?? 1, sy = pose.sy ?? 1, rot = ((pose.rot ?? 0) * Math.PI) / 180, lean = pose.lean ?? 0;
  const cos = Math.cos(-rot), sin = Math.sin(-rot);
  const tint = pose.tint, tAmt = pose.tintAmount ?? 0, alpha = pose.alpha ?? 1;
  for (let Y = 0; Y < L.height; Y++) for (let X = 0; X < L.width; X++) {
    let u = X + 0.5 - ax, v = Y + 0.5 - ay;
    [u, v] = [u * cos - v * sin, u * sin + v * cos];
    u /= sx; v /= sy;
    u += lean * (v / h);                      // lean: top of the sprite shifts by `lean` pixels
    const x = Math.floor(u + w / 2), y = Math.floor(v + h);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const s = (y * w + x) * 4;
    if (local[s + 3] < 128) continue;
    const d = (Y * L.width + X) * 4;
    for (let c = 0; c < 3; c++) out[d + c] = tint ? Math.round(local[s + c] + (tint[c] - local[s + c]) * tAmt) : local[s + c];
    out[d + 3] = Math.round(255 * alpha);
  }
  return { width: L.width, height: L.height, data: out };
}

/** Bottom of the visible pixels, so legs are found from the feet up. */
function visibleBounds(img: Rgba): { top: number; bottom: number } {
  let top = img.height, bottom = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
}

export function animate(action: string, img: Rgba, dir: string, L: Layout, frames: number, ms: number, loop: boolean): Clip {
  const [fx, fy] = FACING[dir] ?? [0, 1];
  const side = Math.abs(fx) > 0.3;                  // legs stride sideways in side views, lift in front / back views
  const { top, bottom } = visibleBounds(img);
  const h = bottom - top + 1, w = img.width, cx = w / 2;
  const legTop = top + h * 0.66, waist = top + h * 0.5;
  const unit = Math.max(1, Math.round(h / 24));    // one "pixel step" at this sprite size
  const out: Rgba[] = [];
  const legs = (phase: number, stride: number, lift: number) => (x: number, y: number): [number, number] => {
    if (y < legTop) return [0, 0];
    const k = (y - legTop) / Math.max(1, bottom - legTop);           // 0 at the hips, 1 at the feet
    const leftLeg = x < cx, s = Math.sin(phase) * (leftLeg ? 1 : -1);
    if (side) return [Math.sign(fx) * s * stride * k, 0];
    return [0, -Math.max(0, s) * lift * k];
  };
  for (let i = 0; i < frames; i++) {
    const t = frames > 1 ? i / frames : 0, tt = frames > 1 ? i / (frames - 1) : 0;
    let pose: Pose = {};
    switch (action) {
      case 'idle': {
        const b = Math.round((0.5 - 0.5 * Math.cos(t * Math.PI * 2)) * unit);
        pose = { local: (_x, y) => [0, y < waist ? b : y < legTop ? b * 0.5 : 0] };
        break;
      }
      case 'walk': case 'run': {
        const run = action === 'run', phase = t * Math.PI * 2;
        const bob = -Math.round(Math.abs(Math.sin(phase)) * unit * (run ? 2 : 1));
        pose = { dy: bob, lean: run ? fx * unit * 2 : 0, local: legs(phase, unit * (run ? 3 : 2), unit * (run ? 3 : 2)) };
        break;
      }
      case 'attack': {
        // wind-up, lunge, hold, recover
        const curve = [-0.4, -0.6, 1.4, 1.2, 0.5, 0][Math.min(5, Math.round(tt * 5))];
        const dist = unit * 4 * curve;
        pose = { dx: fx * dist, dy: fy * dist * 0.5, lean: fx * unit * 2 * Math.max(0, curve), sx: curve < 0 ? 0.95 : 1, sy: curve < 0 ? 0.95 : 1 };
        break;
      }
      case 'hurt': {
        const k = [1, 0.8, 0.4, 0][Math.min(3, Math.round(tt * 3))];
        pose = { dx: -fx * unit * 3 * k, dy: -fy * unit * 1.5 * k, lean: -fx * unit * 2 * k, tint: [255, 60, 60], tintAmount: i < 2 ? 0.6 : 0.2 * k };
        if (i === 0) pose.tint = [255, 255, 255], pose.tintAmount = 1;
        break;
      }
      case 'jump': {
        // crouch, launch, rise, apex, fall, land
        const keys = [[0.85, 0], [1.12, -0.3], [1.05, -0.65], [1, -0.85], [1, -0.85], [1.05, -0.55], [1.08, -0.15], [0.85, 0]];
        const [sy, up] = keys[Math.min(keys.length - 1, Math.round(tt * (keys.length - 1)))];
        pose = { sy, sx: 2 - sy, dy: up * h * 0.4 };
        break;
      }
      default: { // death: fall backwards (sideways for front / back views) and blink out
        const k = Math.min(1, tt / 0.6), angle = 90 * (1 - (1 - k) ** 2), fall = side ? -Math.sign(fx) : 1;
        pose = { rot: angle * fall, alpha: tt > 0.75 && i % 2 ? 0.35 : 1, tint: [40, 40, 60], tintAmount: 0.3 * k };
      }
    }
    out.push(draw(img, L, pose));
  }
  return { name: `${action}_${dir}`, frames: out, durations: out.map(() => ms), loop };
}
