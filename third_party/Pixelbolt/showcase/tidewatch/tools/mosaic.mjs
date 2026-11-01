// Tile review: repeats frames through Pixelbolt's own scene renderer, writes an enlarged PNG and prints each
// frame's seam evidence (doubled edge lines and wrap steps, the same report as `inspect --view tile`).
// Usage: node tools/mosaic.mjs <recipe.json> <out.png> [--frames a,b] [--grid 6x4] [--scale 3] [--map "ab/ba"]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareScene, renderScene, scalePixels, encodePNG, inspectTile, renderProject, resolveReferences } from '../../../src/index.js';
const [file, out, ...rest] = process.argv.slice(2);
const opt = {}; for (let i = 0; i < rest.length; i += 2) opt[rest[i].slice(2)] = rest[i + 1];
const recipe = (await resolveReferences(JSON.parse(readFileSync(file, 'utf8')), { baseDir: path.dirname(path.resolve(file)) })).document;
const frames = (opt.frames ?? recipe.frames[0].name).split(',');
const [cols, rows] = (opt.grid ?? '6x4').split('x').map(Number);
const scale = Number(opt.scale ?? 3);
const map = opt.map ? opt.map.split('/') : null; // letters index into frames
const instances = [];
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  const index = map ? map[y % map.length].charCodeAt(x % map[0].length) - 97 : (x * 7 + y * 13) % frames.length;
  instances.push({ asset: 'tile', frame: frames[index], at: [x * recipe.width, y * recipe.height] });
}
const scene = prepareScene({ format: 'pixelforge-scene', version: 1, name: 'mosaic', width: cols * recipe.width, height: rows * recipe.height, background: '#ff00ff', assets: { tile: recipe }, instances });
const view = renderScene(scene);
writeFileSync(out, encodePNG(scalePixels(view.data, view.width, view.height, scale), view.width * scale, view.height * scale));
const project = renderProject(recipe);
for (const name of frames) { const { leftRight, topBottom } = inspectTile(project, name); console.log(name, JSON.stringify({ leftRight, topBottom })); }
