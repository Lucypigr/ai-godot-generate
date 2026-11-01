// Exports every Tidewatch recipe through Pixelbolt's own reference resolver, renderer, atlas packer and PNG/APNG
// encoders. Output: game/assets/<name>.png + <name>.json (TexturePacker-style atlases with durations, animations,
// anchors, marker points and trimmed rectangles), aligned -normal/-emissive atlases, gallery contact sheets and
// APNG previews, and a copy of Pixelbolt's browser runtime, autotile masks and the craft helpers they import.
// Usage: node tools/build-assets.mjs [--check]   (--check compares without writing)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { renderProject, buildAtlas, encodePNG, encodeAPNG, inspectProject, scalePixels, decodePNG, resolveReferences } from '../../../src/index.js';
import { root } from './common.mjs';

const RECIPES = ['water', 'shore', 'grass', 'dock', 'props', 'flora', 'rocks', 'lighthouse', 'lighthouse-normal', 'lighthouse-emissive',
  'cottage', 'cottage-normal', 'cottage-emissive', 'lamp', 'lamp-normal', 'lamp-emissive', 'boat', 'keeper', 'crab', 'jelly', 'gull',
  'fisher', 'fx', 'slash', 'pickups', 'pickups-emissive', 'ui', 'dialog', 'font'];
const GALLERY = { keeper: ['walk-d', 'walk-r', 'attack-d', 'attack-r'], crab: ['walk', 'snap'], jelly: ['hop'], lighthouse: ['night'], shore: ['surf-0'], fx: ['leaves', 'poof', 'splash'], slash: ['slash-d'], flora: ['palm'], gull: ['flap'], fisher: ['idle'], pickups: ['glass', 'flint'] };
const check = process.argv.includes('--check');
const out = path.join(root, 'game/assets'), gallery = path.join(root, 'game/gallery');
let written = 0, differing = [];
// zlib output may differ between Node releases, so --check compares what the files mean, not compressed bytes:
// JSON exactly, PNG atlases by decoded RGBA, and APNG previews by their frame-control (timing/size) chunks.
function chunks(buffer, types) { const out = []; for (let at = 8; at < buffer.length;) { const length = buffer.readUInt32BE(at), type = buffer.toString('ascii', at + 4, at + 8); if (types.includes(type)) out.push(buffer.subarray(at + 8, at + 8 + length).toString('hex')); at += 12 + length; } return out.join(); }
function equivalent(file, a, b) {
  if (!file.endsWith('.png')) return a.equals(b);
  if (a.includes('acTL')) return chunks(a, ['IHDR', 'acTL', 'fcTL']) === chunks(b, ['IHDR', 'acTL', 'fcTL']);
  const x = decodePNG(a), y = decodePNG(b);
  return x.width === y.width && x.height === y.height && x.data.every((v, i) => v === y.data[i]);
}
function emit(file, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (check) { if (!existsSync(file) || !equivalent(file, readFileSync(file), buffer)) differing.push(path.relative(root, file)); return; }
  mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, buffer); written++;
}
const manifest = {};
for (const name of RECIPES) {
  // Recipes link art/palette.json; resolve it the way the Pixelbolt CLI does.
  const file = path.join(root, 'art/recipes', `${name}.json`);
  const { document: recipe } = await resolveReferences(JSON.parse(readFileSync(file, 'utf8')), { baseDir: path.dirname(file) });
  const project = renderProject(recipe), atlas = buildAtlas(project);
  if (project.warnings.length) console.warn(`${name}: ${project.warnings.join(' ')}`);
  emit(path.join(out, `${name}.png`), encodePNG(atlas.data, atlas.width, atlas.height));
  emit(path.join(out, `${name}.json`), JSON.stringify(atlas.metadata) + '\n');
  manifest[name] = { width: project.width, height: project.height, frames: project.frames.length, animations: Object.keys(project.animations) };
  if (GALLERY[name]) {
    const sheet = inspectProject(project, {}).sheet;
    emit(path.join(gallery, `${name}.png`), encodePNG(sheet.data, sheet.width, sheet.height));
    const scale = Math.max(1, Math.min(6, Math.floor(160 / Math.max(project.width, project.height))));
    for (const key of GALLERY[name]) {
      const a = project.animations[key];
      const frames = a.frames.map(i => ({ duration: project.frames[i].duration, data: scalePixels(project.frames[i].data, project.width, project.height, scale) }));
      emit(path.join(gallery, `${name}-${key}.png`), encodeAPNG(frames, project.width * scale, project.height * scale, a.loop));
    }
  }
}
emit(path.join(out, 'font.map.json'), readFileSync(path.join(root, 'art/recipes/font.map.json')));
// The game server only serves game/, so the Pixelbolt modules the game imports are copied beside its code
// (autotile.js imports craft.js).
for (const module of ['runtime.js', 'autotile.js', 'craft.js']) emit(path.join(root, 'game/src/pixelforge', module), readFileSync(new URL(`../../../src/${module}`, import.meta.url)));
emit(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (check) { console.log(differing.length ? `Out of date:\n${differing.join('\n')}` : 'All exported assets match their recipes.'); process.exitCode = differing.length ? 1 : 0; }
else console.log(`Wrote ${written} files for ${RECIPES.length} recipes.`);
