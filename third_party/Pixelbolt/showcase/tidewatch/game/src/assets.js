// Loads Pixelbolt atlases (TexturePacker-style JSON + PNG) with Pixelbolt's own runtime and prepares aligned
// lighting passes. Assets without authored normal/emissive recipes get derived passes: a flat normal (#8080ff)
// silhouette and a black emissive silhouette, so they still occlude lit or glowing sprites behind them.
import { loadSpriteSheet } from './pixelforge/runtime.js';
const LIT = ['lighthouse', 'cottage', 'lamp', 'pickups'];
// onload rather than decode(): decode() can stay pending while a page is hidden or not painting.
function image(url) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Could not load ${url}`)); img.src = url; }); }
function canvasFrom(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return c; }
function silhouette(source, rgb) {
  const c = canvasFrom(source), g = c.getContext('2d'), data = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < data.data.length; i += 4) if (data.data[i + 3]) { data.data[i] = rgb[0]; data.data[i + 1] = rgb[1]; data.data[i + 2] = rgb[2]; data.data[i + 3] = 255; }
  g.putImageData(data, 0, 0); return c;
}
export async function loadAtlas(name, base = './assets/') {
  const { image: color, atlas: meta } = await loadSpriteSheet(`${base}${name}.json`);
  const atlas = { name, meta, color, frames: meta.frames, animations: meta.animations };
  if (LIT.includes(name)) {
    atlas.emissive = await image(`${base}${name}-emissive.png`);
    atlas.normal = name === 'pickups' ? silhouette(color, [128, 128, 255]) : await image(`${base}${name}-normal.png`);
  } else {
    atlas.normal = silhouette(color, [128, 128, 255]);
  }
  atlas.shadow = silhouette(color, [0, 0, 0]);
  atlas.lookup = new Map(Object.entries(meta.frames).map(([key, f]) => [key, f.frame]));
  return atlas;
}
export async function loadAll(names) {
  const atlases = await Promise.all(names.map(n => loadAtlas(n)));
  return Object.fromEntries(atlases.map(a => [a.name, a]));
}
// Frame timing (per-frame durations, loops, held last frames) is Pixelbolt's runtime frameAt.
export { frameAt } from './pixelforge/runtime.js';
export const animationDone = (atlas, animation, time) => !atlas.animations[animation].loop && time >= atlas.animations[animation].duration;
