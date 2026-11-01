// Tileset workshop. Sources: a procedural terrain (Pixelbolt terrain rules, MIT), autotiler's example
// templates (MIT) or the user's own template. autotiler's core (MIT) turns the template into a full 47-tile
// blob set or a 16-tile dual grid and writes Godot 4 / Tiled / PNG exports.
import { terrainTemplate } from '@pixelbolt/terrain.js';
import { parseColor } from '@pixelbolt/core.js';
import {
  analyzeSource, generate, LAYOUTS, getLayout, getTemplate, exportGodot4, exportTiled, exportPng, exportGodot3,
  randomMap, allBlobCombinations, allDualCombinations, renderTestMap, setCell, isTerrain, createTestMap, terrainColor,
  type Tileset, type TestMap, type LayoutId, type RgbaImage,
} from '@autotiler/index.ts';
import { zipSync, strToU8 } from 'fflate';
import { h, field, select, numberInput, status } from '../lib/ui';
import { paint, decodeImageFile, download, safeName } from '../lib/image';

type Recipe = Record<string, any>;

const autotileRecipes = import.meta.glob('../../../third_party/Pixelbolt/examples/*.autotile.json', { eager: true, import: 'default' }) as Record<string, Recipe>;
const exampleUrls = import.meta.glob('../../../third_party/autotiler/public/examples/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

/** Finds the first terrain block (with a fill) anywhere in a recipe, with the palette and tile size around it. */
function findTerrain(node: any, palette: Recipe, tile: number): { terrain: Recipe; palette: Recipe; tile: number } | null {
  if (!node || typeof node !== 'object') return null;
  const pal = node.palette && typeof node.palette === 'object' ? { ...palette, ...node.palette } : palette;
  const size = typeof node.tile === 'number' ? node.tile : tile;
  if (node.terrain?.fill !== undefined) return { terrain: node.terrain, palette: pal, tile: size };
  for (const value of Object.values(node)) {
    const found = findTerrain(value, pal, size);
    if (found) return found;
  }
  return null;
}

const TERRAIN_LABELS: Record<string, string> = { ground: '泥土草地', meadow: '草原', shore: '海岸 / 沙灘' };
const terrainPresets = Object.entries(autotileRecipes).flatMap(([path, recipe]) => {
  const id = path.split('/').pop()!.replace('.autotile.json', '');
  const found = findTerrain(recipe, {}, 16);
  return found ? [{ id, label: TERRAIN_LABELS[id] ?? id, ...found }] : [];
});

const examples = Object.entries(exampleUrls).map(([path, url]) => ({ id: path.split('/').pop()!.replace('.png', ''), url }));

function rowsToImage(rows: string[], palette: Recipe): RgbaImage {
  const width = rows[0].length, height = rows.length;
  const data = new Uint8ClampedArray(width * height * 4);
  const cache = new Map<string, number[]>();
  rows.forEach((row, y) => [...row].forEach((key, x) => {
    if (key === '.' || key === ' ') return;
    let rgba = cache.get(key);
    if (!rgba) { rgba = parseColor(key, palette) as number[]; cache.set(key, rgba); }
    data.set(rgba, (y * width + x) * 4);
  }));
  return { width, height, data };
}

type Source = 'procedural' | 'example' | 'upload';

export function tilesetTool(): HTMLElement {
  const msg = h('div', { class: 'status' });
  const sourceArea = h('div', {});
  const templateCanvas = h('canvas', { class: 'pixel' });
  const tilesetCanvas = h('canvas', { class: 'pixel' });
  const mapCanvas = h('canvas', { class: 'pixel map-canvas' });
  const palette = h('div', { class: 'palette' });

  let source: Source = 'procedural';
  let preset = terrainPresets[0];
  let terrain: Recipe = structuredClone(preset?.terrain ?? {});
  let pal: Recipe = structuredClone(preset?.palette ?? {});
  let tile = preset?.tile ?? 16;
  let exampleId = examples.find(e => e.id.startsWith('meadow-16'))?.id ?? examples[0]?.id;
  let uploaded: RgbaImage | null = null;
  let layoutId: LayoutId = 'godot-12x4';
  let name = 'terrain';
  let tileset: Tileset | null = null;
  let templateImage: RgbaImage | null = null;
  let map: TestMap = randomMap(16, 12, 3, 0.55);
  let mapZoom = 2;

  const drawMap = () => {
    if (!tileset) return;
    paint(mapCanvas, renderTestMap(tileset, map), mapZoom);
  };

  const build = async () => {
    status(msg, '產生中…', 'busy');
    try {
      let img: RgbaImage, templateId: 'rpgmaker-a2' | undefined, size: number | undefined;
      if (source === 'procedural') {
        const rows = terrainTemplate(terrain, { tile, palette: pal }) as string[];
        img = rowsToImage(rows, pal); templateId = 'rpgmaker-a2'; size = tile;
      } else if (source === 'example') {
        const ex = examples.find(e => e.id === exampleId)!;
        const decoded = await decodeImageFile(await (await fetch(ex.url)).blob());
        img = { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
      } else {
        if (!uploaded) { status(msg, '請上傳模板圖片（13 格 5×3，或 RPG Maker A2 2×3）'); return; }
        img = uploaded;
      }
      const analysis = analyzeSource(img, templateId, size);
      const errors = analysis.issues.filter(i => i.level === 'error');
      if (!analysis.template || !analysis.tileSize || errors.length) throw new Error(errors.map(e => e.message).join(' ') || '無法辨識模板');
      const layout = getLayout(layoutId);
      if (layout.kind === 'dual' && analysis.tileSize % 2) throw new Error('Dual grid 需要偶數的圖塊尺寸');
      templateImage = img;
      tileset = generate(img, { template: getTemplate(analysis.template.id), tileSize: analysis.tileSize, layout });
      paint(templateCanvas, img, Math.max(1, Math.floor(160 / img.width)));
      paint(tilesetCanvas, tileset.image, Math.max(1, Math.min(4, Math.floor(640 / tileset.image.width))));
      drawMap();
      const warn = analysis.issues.filter(i => i.level === 'warning').map(i => i.message);
      status(msg, `完成：${analysis.template.id} · ${analysis.tileSize}px · ${layout.name} · ${tileset.cells.length} 格${warn.length ? ' · ' + warn.join(' ') : ''}`);
    } catch (error) {
      tileset = null;
      status(msg, `錯誤：${(error as Error).message}`, 'error');
      console.error(error);
    }
  };

  const buildPalette = () => {
    palette.replaceChildren(...Object.entries(pal).map(([key, color]) => h('label', { class: 'swatch' },
      h('input', { type: 'color', value: String(color).slice(0, 7), onchange: e => { pal[key] = (e.target as HTMLInputElement).value; build(); } }),
      h('code', {}, key))));
  };

  const renderSource = () => {
    if (source === 'procedural') {
      const json = h('textarea', { class: 'json', rows: 14, spellcheck: 'false' });
      json.value = JSON.stringify(terrain, null, 2);
      buildPalette();
      sourceArea.replaceChildren(
        field('地形預設', select(terrainPresets.map(p => [p.id, p.label]), preset?.id ?? '', v => {
          preset = terrainPresets.find(p => p.id === v)!;
          terrain = structuredClone(preset.terrain); pal = structuredClone(preset.palette); tile = preset.tile; name = preset.id;
          renderSource(); build();
        })),
        field('圖塊尺寸 (px)', select([8, 12, 16, 24, 32].map(n => [String(n), `${n}×${n}`]), String(tile), v => { tile = Number(v); build(); })),
        field('隨機種子', numberInput(terrain.seed ?? 0, 0, 99999, 1, v => { terrain.seed = v; json.value = JSON.stringify(terrain, null, 2); build(); })),
        h('h3', {}, '調色盤'), palette,
        h('details', {}, h('summary', {}, '進階：地形規則 JSON（填色、邊緣、草叢…）'), json,
          h('button', { class: 'secondary', onclick: () => {
            try { terrain = JSON.parse(json.value); build(); } catch (e) { status(msg, `JSON 錯誤：${(e as Error).message}`, 'error'); }
          } }, '套用')),
      );
    } else if (source === 'example') {
      sourceArea.replaceChildren(field('範例模板', select(examples.map(e => [e.id, e.id]), exampleId, v => { exampleId = v; name = v.replace(/-\d+px$/, ''); build(); })));
    } else {
      sourceArea.replaceChildren(
        field('上傳模板 PNG', h('input', { type: 'file', accept: 'image/png,image/*', onchange: async e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const decoded = await decodeImageFile(file);
          uploaded = { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
          name = safeName(file.name.replace(/\.[^.]+$/, ''));
          build();
        } }), '13 格模板（5×3 格）或 RPG Maker A2（2×3 格）'),
        h('p', { class: 'muted' }, h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); downloadBlank(); } }, '下載空白 13 格模板範例')),
      );
    }
  };

  const downloadBlank = async () => {
    const ex = examples.find(e => e.id.startsWith('autotiler13'));
    if (ex) download('autotiler13-template.png', new Uint8Array(await (await fetch(ex.url)).arrayBuffer()), 'image/png');
  };

  const exportAs = (target: 'godot4' | 'godot3' | 'tiled' | 'png') => {
    if (!tileset || !templateImage) return;
    const base = safeName(name);
    const color = terrainColor(tileset, templateImage);
    const files = target === 'godot4' ? exportGodot4(tileset, { name: base, terrainName: base, terrainColor: color, collision: true, forceNearest: true })
      : target === 'godot3' ? exportGodot3(tileset, { name: base, collision: true })
      : target === 'tiled' ? exportTiled(tileset, { name: base, terrainName: base, terrainColor: color })
      : exportPng(tileset, { name: base, sidecar: true });
    const zip = zipSync(Object.fromEntries(files.map(f => [f.path, typeof f.data === 'string' ? strToU8(f.data) : f.data])));
    download(`${base}_${target}.zip`, zip, 'application/zip');
  };

  // Paint on the test map: left click adds terrain, right click erases.
  let painting: boolean | null = null;
  const paintAt = (e: MouseEvent) => {
    if (!tileset || painting === null) return;
    const rect = mapCanvas.getBoundingClientRect();
    const ts = tileset.tileSize * mapZoom * (rect.width / mapCanvas.width);
    const x = Math.floor((e.clientX - rect.left) / ts), y = Math.floor((e.clientY - rect.top) / ts);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height || isTerrain(map, x, y) === painting) return;
    map = setCell(map, x, y, painting);
    drawMap();
  };
  mapCanvas.addEventListener('contextmenu', e => e.preventDefault());
  mapCanvas.addEventListener('mousedown', e => { painting = e.button !== 2; paintAt(e); });
  mapCanvas.addEventListener('mousemove', paintAt);
  window.addEventListener('mouseup', () => { painting = null; });

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '地圖圖塊 Tileset 工坊'),
    h('p', { class: 'muted' }, '把小模板展開成完整的 47 格 autotile（或 16 格 dual grid），直接匯出 Godot 4 TileSet（含地形 peering bits 與碰撞）。引擎：autotiler + Pixelbolt terrain（MIT）。'),
    field('模板來源', select([['procedural', '程序產生地形'], ['example', '範例模板'], ['upload', '上傳自己的模板']], source, v => { source = v as Source; renderSource(); build(); })),
    sourceArea,
    field('輸出排列', select(LAYOUTS.map(l => [l.id, l.name]), layoutId, v => { layoutId = v as LayoutId; build(); })),
    h('h3', {}, '匯出'),
    h('div', { class: 'export-bar column' },
      h('button', { onclick: () => exportAs('godot4') }, 'Godot 4 TileSet（.tres + .png）'),
      h('button', { class: 'secondary', onclick: () => exportAs('tiled') }, 'Tiled（.tsx + .png）'),
      h('button', { class: 'secondary', onclick: () => exportAs('png') }, 'PNG + JSON（其他引擎）'),
      h('button', { class: 'secondary', onclick: () => exportAs('godot3') }, 'Godot 3（舊版）')),
    msg);

  const main = h('section', { class: 'preview' },
    h('div', { class: 'tile-row' },
      h('figure', {}, h('figcaption', {}, '模板'), h('div', { class: 'sheet-wrap bg-checker' }, templateCanvas)),
      h('figure', { class: 'grow' }, h('figcaption', {}, '產生的 Tileset'), h('div', { class: 'sheet-wrap bg-checker' }, tilesetCanvas))),
    h('figure', {},
      h('figcaption', {}, '測試地圖：左鍵畫地形、右鍵擦除（拼法與 Godot 地形筆刷相同）'),
      h('div', { class: 'preview-controls' },
        h('button', { class: 'secondary', onclick: () => { map = randomMap(16, 12, Math.floor(Math.random() * 1e6), 0.55); drawMap(); } }, '隨機地圖'),
        h('button', { class: 'secondary', onclick: () => { map = getLayout(layoutId).kind === 'dual' ? allDualCombinations() : allBlobCombinations(); drawMap(); } }, '所有組合'),
        h('button', { class: 'secondary', onclick: () => { map = createTestMap(16, 12); drawMap(); } }, '清空'),
        field('縮放', select([['1', '1×'], ['2', '2×'], ['3', '3×'], ['4', '4×']], String(mapZoom), v => { mapZoom = Number(v); drawMap(); })),
        h('button', { class: 'secondary', onclick: async () => {
          if (!tileset) return;
          const img = renderTestMap(tileset, map);
          const { pngBytes } = await import('../lib/image');
          download(`${safeName(name)}_map.png`, await pngBytes(img), 'image/png');
        } }, '下載地圖 PNG')),
      h('div', { class: 'sheet-wrap bg-checker' }, mapCanvas)));

  renderSource();
  build();
  return h('div', { class: 'tool' }, sidebar, main);
}
