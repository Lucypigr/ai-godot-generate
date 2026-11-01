// A shared sprite-atlas model. It matches the TexturePacker "hash" JSON layout, which is also what
// Pixelbolt's Godot SpriteFrames writer reads, so every tool can export through the same functions.
import { spriteFrames } from '@pixelbolt/godot.js';
import { encodeGIF } from '@pixelbolt/gif.js';
import { type Rgba, gridSheet, pngBytes, downloadZip, download, safeName } from './image';

const MAX_ATLAS_WIDTH = 4096;

export interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
}

export interface Atlas {
  image: Rgba;
  frames: Record<string, AtlasFrame>;
  animations: Record<string, { frames: string[]; loop: boolean }>;
  meta: { image: string; size: { w: number; h: number }; app: string };
}

export interface Clip {
  name: string;
  frames: Rgba[];
  durations: number[];
  loop: boolean;
}

/** Packs one or more animation clips into a grid atlas (one row per clip when `rowPerClip`). */
export function atlasFromClips(baseName: string, clips: Clip[], { columns = 0, padding = 0, rowPerClip = true } = {}): Atlas {
  const all: Rgba[] = [], names: string[] = [], durations: number[] = [];
  const longest = Math.max(...clips.map(c => c.frames.length));
  const animations: Atlas['animations'] = {};
  const empty = (w: number, h: number): Rgba => ({ width: w, height: h, data: new Uint8Array(w * h * 4) });
  const w = Math.max(...clips.flatMap(c => c.frames.map(f => f.width)));
  const h = Math.max(...clips.flatMap(c => c.frames.map(f => f.height)));
  // Keep the sheet at most MAX_ATLAS_WIDTH wide (Godot and most GPUs cap textures at 16384); long clips wrap.
  const fit = Math.max(1, Math.floor(MAX_ATLAS_WIDTH / (w + padding * 2)));
  const wanted = columns > 0 ? columns : rowPerClip ? longest : Math.ceil(Math.sqrt(clips.reduce((n, c) => n + c.frames.length, 0)));
  const cols = Math.min(wanted, fit);
  const slots: (string | null)[] = [];
  for (const clip of clips) {
    const frameNames = clip.frames.map((frame, i) => {
      const name = `${clip.name}_${String(i).padStart(2, '0')}`;
      all.push(frame); names.push(name); durations.push(clip.durations[i] ?? 100); slots.push(name);
      return name;
    });
    animations[clip.name] = { frames: frameNames, loop: clip.loop };
    if (rowPerClip) while (slots.length % cols) { slots.push(null); }
  }
  const slotImages = slots.map(name => (name === null ? empty(w, h) : all[names.indexOf(name)]));
  const sheet = gridSheet(slotImages, cols, padding);
  const frames: Atlas['frames'] = {};
  slots.forEach((name, i) => {
    if (name === null) return;
    // gridSheet centres smaller frames; record their full cell so Godot keeps a stable pivot.
    const x = (i % cols) * (w + padding * 2) + padding, y = Math.floor(i / cols) * (h + padding * 2) + padding;
    frames[name] = {
      frame: { x, y, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h },
      duration: durations[names.indexOf(name)],
    };
  });
  const image = `${safeName(baseName)}.png`;
  return { image: sheet, frames, animations, meta: { image, size: { w: sheet.width, h: sheet.height }, app: 'Asset Forge' } };
}

export function atlasJSON(atlas: Atlas): string {
  return JSON.stringify({ frames: atlas.frames, animations: atlas.animations, meta: atlas.meta }, null, 2);
}

export function godotSpriteFrames(atlas: Atlas): string {
  const used = Object.values(atlas.animations).some(a => a.frames.length);
  if (!used) throw new Error('No animations to export');
  return spriteFrames({ frames: atlas.frames, animations: atlas.animations, meta: atlas.meta }).text;
}

export function gifBytes(frames: Rgba[], durations: number[], scale = 1): Uint8Array {
  const w = frames[0].width, h = frames[0].height;
  const input = frames.map((f, i) => ({ data: f.data, duration: Math.max(1, Math.round(durations[i] ?? 100)) }));
  return encodeGIF(input, w, h, { loop: true, scale }).data;
}

export async function exportAtlasZip(baseName: string, atlas: Atlas, extra: Record<string, Uint8Array | string> = {}): Promise<void> {
  const base = safeName(baseName);
  const files: Record<string, Uint8Array | string> = {
    [atlas.meta.image]: await pngBytes(atlas.image),
    [`${base}.json`]: atlasJSON(atlas),
    ...extra,
  };
  if (Object.keys(atlas.animations).length) files[`${base}.tres`] = godotSpriteFrames(atlas);
  downloadZip(`${base}.zip`, files);
}

export async function downloadAtlasPNG(atlas: Atlas): Promise<void> {
  download(atlas.meta.image, await pngBytes(atlas.image), 'image/png');
}
