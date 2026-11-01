// Composes a tile map through Pixelbolt's scene renderer: water everywhere, then autotiled sand and grass, each a
// single tilemap placement whose blob masks Pixelbolt computes from the map itself.
// Usage: node tools/preview-map.mjs <map.txt> <out.png> [--phase 0] [--scale 3] [--scene out.scene.json]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareScene, renderScene, scalePixels, encodePNG, resolveReferences } from '../../../src/index.js';
const [mapFile, out, ...rest] = process.argv.slice(2);
const opt = {}; for (let i = 0; i < rest.length; i += 2) opt[rest[i].slice(2)] = rest[i + 1];
const phase = Number(opt.phase ?? 0), scale = Number(opt.scale ?? 3);
const rows = readFileSync(mapFile, 'utf8').trim().split(/\r?\n/);
const load = async name => { const file = path.resolve('art/recipes', `${name}.json`); return (await resolveReferences(JSON.parse(readFileSync(file, 'utf8')), { baseDir: path.dirname(file) })).document; };
const assets = { water: await load('water'), shore: await load('shore'), grass: await load('grass') };
// Map characters: '.' is open water, 'g' is grass (on sand), anything else is sand.
const layer = keep => rows.map(row => [...row].map(c => keep(c) ? 'x' : '.').join(''));
const instances = [
  { name: 'water', asset: 'water', at: [0, 0], tilemap: { rows: layer(() => true), legend: { x: `water-a${phase}` } } },
  { name: 'sand', asset: 'shore', at: [0, 0], tilemap: { rows: layer(c => c !== '.'), legend: { x: { frame: `shore-{mask}-${phase}`, autotile: 'blob' } } } },
  { name: 'grass', asset: 'grass', at: [0, 0], tilemap: { rows: layer(c => c === 'g'), legend: { x: { frame: 'grass-{mask}', autotile: 'blob' } } } }
];
const source = { format: 'pixelforge-scene', version: 1, name: 'map-preview', width: rows[0].length * 16, height: rows.length * 16, background: '#000000', assets, instances };
const view = renderScene(prepareScene(source));
writeFileSync(out, encodePNG(scalePixels(view.data, view.width, view.height, scale), view.width * scale, view.height * scale));
if (opt.scene) writeFileSync(opt.scene, JSON.stringify(source));
console.log(JSON.stringify({ tiles: view.placements.map(p => [p.name, p.tiles]), warnings: view.warnings }));
