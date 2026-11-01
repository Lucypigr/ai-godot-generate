// Planets and space backgrounds from Deep-Fold's PixelPlanets and PixelSpace (MIT). The original Godot
// shaders and scenes are read as-is and run on WebGL 2 through ../lib/godot-shader.
import { ShaderRenderer, readShaderScene, parseResourceFile, materialParams, bakeGradient, type SceneLayer, type Value, type DrawLayer } from '../lib/godot-shader';
import { h, field, select, numberInput, range, status, createPreview } from '../lib/ui';
import type { Clip } from '../lib/atlas';
import { type Rgba, scaleImage, paint, pngBytes, download, downloadZip, blit } from '../lib/image';

const planetFiles = import.meta.glob('../../../third_party/PixelPlanets/Planets/**/*.{tscn,gdshader}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const spaceFiles = import.meta.glob('../../../third_party/PixelSpace/BackgroundGenerator/*.{tres,shader}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

const fromRes = (files: Record<string, string>, root: string) => (resPath: string) => {
  const rel = resPath.replace(/^res:\/\//, '');
  const key = Object.keys(files).find(k => k.endsWith(`${root}/${rel}`));
  return key ? files[key] : undefined;
};
const planetRes = fromRes(planetFiles, 'PixelPlanets');
const spaceRes = fromRes(spaceFiles, 'PixelSpace');

type TimeRule = 'mult' | 'half' | 'ring' | 'star' | 'galaxy' | 'rotation' | 'none';
const PLANETS: { id: string; label: string; scene: string; time?: Record<string, TimeRule> }[] = [
  { id: 'rivers', label: '類地行星（河流）', scene: 'Planets/Rivers/Rivers.tscn', time: { Cloud: 'half' } },
  { id: 'landmasses', label: '海洋大陸行星', scene: 'Planets/LandMasses/LandMasses.tscn' },
  { id: 'dry', label: '乾燥行星', scene: 'Planets/DryTerran/DryTerran.tscn' },
  { id: 'ice', label: '冰原行星', scene: 'Planets/IceWorld/IceWorld.tscn' },
  { id: 'lava', label: '熔岩行星', scene: 'Planets/LavaWorld/LavaWorld.tscn' },
  { id: 'moon', label: '無大氣（月球）', scene: 'Planets/NoAtmosphere/NoAtmosphere.tscn' },
  { id: 'gas', label: '氣態巨行星', scene: 'Planets/GasPlanet/GasPlanet.tscn' },
  { id: 'ringed', label: '環狀氣態行星', scene: 'Planets/GasPlanetLayers/GasPlanetLayers.tscn', time: { Ring: 'ring' } },
  { id: 'star', label: '恆星', scene: 'Planets/Star/Star.tscn', time: { Star: 'star' } },
  { id: 'blackhole', label: '黑洞', scene: 'Planets/BlackHole/BlackHole.tscn', time: { Disk: 'ring', BlackHole: 'none' } },
  { id: 'galaxy', label: '星系', scene: 'Planets/Galaxy/Galaxy.tscn', time: { Galaxy: 'galaxy' } },
  { id: 'asteroid', label: '小行星', scene: 'Planets/Asteroids/Asteroid.tscn', time: { Asteroid: 'rotation' } },
];

const num = (v: Value, d = 0) => (typeof v === 'number' ? v : d);

/** The shader `time` (or rotation) for loop position t in [0, 1), as each Deep-Fold script's set_custom_time does it. */
function timeParams(rule: TimeRule, p: Record<string, Value>, t: number): Record<string, Value> {
  const speed = num(p.time_speed, 1) || 1, mult = (Math.round(num(p.size, 50)) * 2) / speed;
  switch (rule) {
    case 'mult': return { time: t * mult };
    case 'half': return { time: t * mult * 0.5 };
    case 'ring': return { time: t * 314.15 * speed * 0.5 };
    case 'star': return { time: t * (1 / speed) };
    case 'galaxy': return { time: t * Math.PI * 2 * speed };
    case 'rotation': return { rotation: t * Math.PI * 2 };
    default: return {};
  }
}

function loadPlanet(id: string): SceneLayer[] {
  const def = PLANETS.find(p => p.id === id)!;
  const text = planetRes(`res://${def.scene}`);
  if (!text) throw new Error(`找不到場景 ${def.scene}`);
  return readShaderScene(text, path => planetRes(path));
}

// Cosine palettes (Inigo Quilez), as PixelPlanets' _generate_new_colorscheme does.
function cosinePalette(n: number, rand: () => number, hueDiff = 0.9, saturation = 0.5): number[][] {
  const c = [0, 0, 0].map(() => (0.5 + rand()) * hueDiff), d = [0, 0, 0].map(() => rand() * (1 + rand() * 2));
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    return [0, 1, 2].map(k => Math.min(1, Math.max(0, 0.5 + 0.5 * saturation * Math.cos(6.28318 * (c[k] * t + d[k]))))).concat(1);
  });
}
const lum = (c: number[]) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
function mulberry(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const hex = (c: number[]) => '#' + c.slice(0, 3).map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const unhex = (s: string, a = 1) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255).concat(a);

/** Re-colours every colour array of every layer with one shared random scheme, keeping each array's light→dark order. */
function randomizeColors(layers: SceneLayer[], seed: number): void {
  const rand = mulberry(seed);
  for (const layer of layers) for (const [key, value] of Object.entries(layer.params)) {
    if (!Array.isArray(value) || !Array.isArray(value[0])) continue;
    const old = value as number[][];
    let fresh = cosinePalette(old.length, rand, 0.7 + rand() * 0.3, 0.45 + rand() * 0.4);
    const descending = lum(old[0]) >= lum(old[old.length - 1]);
    fresh = fresh.sort((a, b) => (descending ? lum(b) - lum(a) : lum(a) - lum(b))).map((c, i) => [c[0], c[1], c[2], old[i][3] ?? 1]);
    layer.params[key] = fresh;
  }
}

interface PlanetOptions { pixels: number; seed: number | null; rotation: number | null; light: [number, number] | null; dither: boolean }

function planetDraw(layers: SceneLayer[], def: (typeof PLANETS)[number], o: PlanetOptions, t: number): { width: number; height: number; draws: DrawLayer[] } {
  const k = o.pixels / 100;
  const minX = Math.min(...layers.map(l => l.rect[0])), minY = Math.min(...layers.map(l => l.rect[1]));
  const maxX = Math.max(...layers.map(l => l.rect[0] + l.rect[2])), maxY = Math.max(...layers.map(l => l.rect[1] + l.rect[3]));
  const draws = layers.map(layer => {
    const rect: [number, number, number, number] = [Math.round((layer.rect[0] - minX) * k), Math.round((layer.rect[1] - minY) * k), Math.round(layer.rect[2] * k), Math.round(layer.rect[3] * k)];
    const params: Record<string, Value> = { ...layer.params, pixels: rect[2] };
    if (o.seed !== null && 'seed' in params) params.seed = (o.seed % 1000) / 100;
    if (o.rotation !== null && 'rotation' in params) params.rotation = o.rotation;
    if (o.light && 'light_origin' in params) params.light_origin = o.light;
    if ('should_dither' in params) params.should_dither = o.dither;
    Object.assign(params, timeParams(def.time?.[layer.name] ?? 'mult', params, t));
    return { shader: layer.shader, rect, params };
  });
  return { width: Math.round((maxX - minX) * k), height: Math.round((maxY - minY) * k), draws };
}

export function spaceTool(): HTMLElement {
  let renderer: ShaderRenderer;
  try { renderer = new ShaderRenderer(); }
  catch (error) { return h('div', { class: 'status', 'data-kind': 'error' }, (error as Error).message); }
  const preview = createPreview();
  const msg = h('div', { class: 'status' });
  const colorsBox = h('div', {});
  const modeArea = h('div', {});
  const bgCanvas = h('canvas', { class: 'pixel' });
  const mainArea = h('div', {});

  let mode: 'planet' | 'background' = 'planet';
  let planetId = 'rivers';
  let layers = loadPlanet(planetId);
  const o: PlanetOptions = { pixels: 100, seed: null, rotation: null, light: null, dither: true };
  let frames = 60, frameMs = 50, scale = 1;

  const renderPlanet = () => {
    status(msg, '算圖中…', 'busy');
    setTimeout(() => {
      try {
        const def = PLANETS.find(p => p.id === planetId)!;
        const t0 = performance.now();
        const out: Rgba[] = [];
        for (let i = 0; i < frames; i++) {
          const { width, height, draws } = planetDraw(layers, def, o, i / frames);
          out.push(scaleImage(renderer.render(width, height, draws), scale));
        }
        const clip: Clip = { name: planetId, frames: out, durations: out.map(() => frameMs), loop: true };
        preview.show(`planet_${planetId}`, [clip]);
        status(msg, `完成（${Math.round(performance.now() - t0)} ms）· 動畫首尾無縫循環`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  const buildColors = () => {
    colorsBox.replaceChildren(...layers.map(layer => {
      const swatches = Object.entries(layer.params).flatMap(([key, value]) => {
        if (Array.isArray(value) && Array.isArray(value[0])) {
          return (value as number[][]).map((c, i) => h('label', { class: 'swatch' },
            h('input', { type: 'color', value: hex(c), onchange: e => { (layer.params[key] as number[][])[i] = unhex((e.target as HTMLInputElement).value, c[3]); renderPlanet(); } }),
            h('code', {}, `${i}`)));
        }
        return [];
      });
      return swatches.length ? h('div', {}, h('small', { class: 'muted' }, layer.name), h('div', { class: 'palette' }, ...swatches)) : null;
    }).filter(Boolean) as HTMLElement[]);
  };

  // ---------- background mode ----------
  const nebula = parseResourceFile(spaceRes('res://BackgroundGenerator/Nebulae.tres') ?? '').find(s => s.kind === 'resource');
  const dust = parseResourceFile(spaceRes('res://BackgroundGenerator/StarStuff.tres') ?? '').find(s => s.kind === 'resource');
  const gradientSection = parseResourceFile(spaceRes('res://BackgroundGenerator/Colorscheme.tres') ?? '').find(s => s.kind === 'sub_resource');
  const nebulaShader = spaceRes('res://BackgroundGenerator/Nebulae.shader') ?? '';
  const dustShader = spaceRes('res://BackgroundGenerator/StarStuff.shader') ?? '';
  const defaultOffsets = (gradientSection?.props.offsets as number[]) ?? [0, 1];
  const defaultColors = (gradientSection?.props.colors as number[][]) ?? [[0, 0, 0, 1], [1, 1, 1, 1]];
  const bg = {
    width: 480, height: 270, seed: 1, tile: false, reduce: false,
    nebula: true, dust: true, stars: true, planets: 2,
    colors: defaultColors.map(c => [...c]), background: [...((nebula ? materialParams(nebula).background_color : null) as number[] ?? [0.09, 0.09, 0.067, 1])],
  };
  let bgLayers: Record<string, Rgba> = {};

  const renderBackground = () => {
    status(msg, '算圖中…', 'busy');
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const { width: w, height: hgt } = bg;
        const rand = mulberry(bg.seed * 7919);
        const scheme = bakeGradient(bg.colors.map((_, i) => i / Math.max(1, bg.colors.length - 1)), bg.colors);
        const aspect: [number, number] = w > hgt ? [w / hgt, 1] : [1, hgt / w];
        const common = { pixels: Math.max(w, hgt), uv_correct: aspect, should_tile: bg.tile, reduce_background: bg.reduce };
        const layer = (shader: string, base: Record<string, Value>, seed: number) => renderer.render(w, hgt, [{
          shader, rect: [0, 0, w, hgt], params: { ...base, ...common, seed, background_color: bg.background }, textures: { colorscheme: scheme },
        }]);
        const empty = (): Rgba => ({ width: w, height: hgt, data: new Uint8Array(w * hgt * 4) });
        bgLayers = {};
        bgLayers.background = { width: w, height: hgt, data: new Uint8Array(w * hgt * 4).map((_, i) => Math.round(bg.background[i % 4] * 255)) };
        bgLayers.nebula = bg.nebula && nebula ? layer(nebulaShader, materialParams(nebula), 1 + rand() * 9) : empty();
        bgLayers.dust = bg.dust && dust ? layer(dustShader, materialParams(dust), 1 + rand() * 9) : empty();
        bgLayers.stars = bg.stars ? starLayer(w, hgt, scheme, rand) : empty();
        bgLayers.planets = bg.planets ? planetLayer(w, hgt, bg.planets, rand) : empty();
        const flat = composite(w, hgt, ['background', 'nebula', 'dust', 'stars', 'planets'].map(k => bgLayers[k]));
        bgLayers.combined = flat;
        paint(bgCanvas, flat, Math.max(1, Math.min(4, Math.floor(900 / w))));
        status(msg, `完成（${Math.round(performance.now() - t0)} ms）· ${w}×${hgt}`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  // Small stars as single pixels, bright ones as crosses, tinted from the colour scheme.
  function starLayer(w: number, hgt: number, scheme: Rgba, rand: () => number): Rgba {
    const img: Rgba = { width: w, height: hgt, data: new Uint8Array(w * hgt * 4) };
    const put = (x: number, y: number, c: number[]) => {
      x = ((x % w) + w) % w; y = ((y % hgt) + hgt) % hgt;
      img.data.set(c, (y * w + x) * 4);
    };
    const color = (bright: number) => { const i = Math.min(255, Math.floor((0.55 + bright * 0.45) * 255)); return [scheme.data[i * 4], scheme.data[i * 4 + 1], scheme.data[i * 4 + 2], 255]; };
    const small = Math.floor((w * hgt) / 150 * (0.25 + rand() * 0.75));
    for (let i = 0; i < small; i++) put(Math.floor(rand() * w), Math.floor(rand() * hgt), color(rand() * 0.6));
    const big = Math.floor(rand() * Math.max(1, Math.max(w, hgt) / 20));
    for (let i = 0; i < big; i++) {
      const x = Math.floor(rand() * w), y = Math.floor(rand() * hgt), c = color(1), dim = color(0.6);
      put(x, y, c); put(x - 1, y, dim); put(x + 1, y, dim); put(x, y - 1, dim); put(x, y + 1, dim);
      if (rand() < 0.4) { put(x - 2, y, dim); put(x + 2, y, dim); put(x, y - 2, dim); put(x, y + 2, dim); }
    }
    return img;
  }

  // A few small PixelPlanets placed on the background.
  function planetLayer(w: number, hgt: number, count: number, rand: () => number): Rgba {
    const img: Rgba = { width: w, height: hgt, data: new Uint8Array(w * hgt * 4) };
    const choices = PLANETS.filter(p => !['galaxy', 'blackhole', 'star'].includes(p.id));
    for (let i = 0; i < count; i++) {
      const def = choices[Math.floor(rand() * choices.length)];
      const ls = loadPlanet(def.id);
      if (rand() < 0.7) randomizeColors(ls, Math.floor(rand() * 1e6));
      const size = Math.max(16, Math.round(Math.min(w, hgt) * (0.1 + rand() * 0.2)));
      const { width, height, draws } = planetDraw(ls, def, { pixels: size, seed: Math.floor(rand() * 1000), rotation: rand() * 6.28, light: [0.3 + rand() * 0.4, 0.3 + rand() * 0.4], dither: true }, rand());
      const p = renderer.render(width, height, draws);
      const x = Math.floor(rand() * Math.max(1, w - width)), y = Math.floor(rand() * Math.max(1, hgt - height));
      overlay(img, p, x, y);
    }
    return img;
  }

  const sizeOptions: [string, string][] = [['320x180', '320×180'], ['480x270', '480×270'], ['640x360', '640×360'], ['960x540', '960×540'], ['256x256', '256×256（可平鋪）'], ['512x512', '512×512']];
  const bgColorsBox = h('div', { class: 'palette' });
  const buildBgColors = () => {
    bgColorsBox.replaceChildren(
      h('label', { class: 'swatch' }, h('input', { type: 'color', value: hex(bg.background), onchange: e => { bg.background = unhex((e.target as HTMLInputElement).value); renderBackground(); } }), h('code', {}, '底色')),
      ...bg.colors.map((c, i) => h('label', { class: 'swatch' }, h('input', { type: 'color', value: hex(c), onchange: e => { bg.colors[i] = unhex((e.target as HTMLInputElement).value); renderBackground(); } }), h('code', {}, String(i)))));
  };
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => field(label, select([['true', '開'], ['false', '關']], String(value), v => { set(v === 'true'); renderBackground(); }));

  const renderMode = () => {
    if (mode === 'planet') {
      modeArea.replaceChildren(
        field('類型', select(PLANETS.map(p => [p.id, p.label]), planetId, v => { planetId = v; layers = loadPlanet(v); buildColors(); renderPlanet(); })),
        field('像素大小（星球直徑）', select(['32', '48', '64', '100', '128', '200'].map(n => [n, `${n} px`]), String(o.pixels), v => { o.pixels = Number(v); renderPlanet(); })),
        field('隨機種子（空白＝原始設定）', h('input', { type: 'number', min: 0, max: 99999, placeholder: '原始', onchange: e => { const v = (e.target as HTMLInputElement).value; o.seed = v === '' ? null : Number(v); renderPlanet(); } })),
        field('自轉軸傾斜', range(0, 0, 6.28, 0.01, v => { o.rotation = v; renderPlanet(); })),
        h('fieldset', {}, h('legend', {}, '光源位置'),
          field('X', range(0.39, 0, 1, 0.01, v => { o.light = [v, o.light?.[1] ?? 0.39]; renderPlanet(); })),
          field('Y', range(0.39, 0, 1, 0.01, v => { o.light = [o.light?.[0] ?? 0.39, v]; renderPlanet(); }))),
        field('抖色（dither）', select([['true', '開'], ['false', '關']], 'true', v => { o.dither = v === 'true'; renderPlanet(); })),
        h('fieldset', {}, h('legend', {}, '動畫'),
          field('幀數', numberInput(frames, 4, 240, 1, v => { frames = v; renderPlanet(); })),
          field('每幀毫秒', numberInput(frameMs, 16, 500, 1, v => { frameMs = v; renderPlanet(); }))),
        field('輸出放大倍率', numberInput(scale, 1, 6, 1, v => { scale = v; renderPlanet(); })),
        h('h3', {}, '顏色'),
        h('button', { class: 'secondary', onclick: () => { randomizeColors(layers, Math.floor(Math.random() * 1e9)); buildColors(); renderPlanet(); } }, '🎲 隨機配色'),
        h('button', { class: 'secondary', onclick: () => { layers = loadPlanet(planetId); buildColors(); renderPlanet(); } }, '還原原始配色'),
        colorsBox);
      mainArea.replaceChildren(preview.root);
      buildColors();
      renderPlanet();
    } else {
      buildBgColors();
      modeArea.replaceChildren(
        field('尺寸', select(sizeOptions, `${bg.width}x${bg.height}`, v => { const [w, ht] = v.split('x').map(Number); bg.width = w; bg.height = ht; renderBackground(); })),
        field('隨機種子', numberInput(bg.seed, 0, 99999, 1, v => { bg.seed = v; renderBackground(); })),
        h('button', { class: 'secondary', onclick: () => { bg.seed = Math.floor(Math.random() * 99999); renderMode(); } }, '🎲 重新產生'),
        toggle('星雲', bg.nebula, v => { bg.nebula = v; }),
        toggle('星塵', bg.dust, v => { bg.dust = v; }),
        toggle('星星', bg.stars, v => { bg.stars = v; }),
        field('小星球數量', numberInput(bg.planets, 0, 6, 1, v => { bg.planets = v; renderBackground(); })),
        toggle('無縫平鋪（星雲 / 星塵）', bg.tile, v => { bg.tile = v; }),
        toggle('降低背景亮度', bg.reduce, v => { bg.reduce = v; }),
        h('h3', {}, '配色'),
        h('button', { class: 'secondary', onclick: () => {
          const rand = mulberry(Math.floor(Math.random() * 1e9));
          bg.colors = cosinePalette(bg.colors.length, rand, 0.6 + rand() * 0.4, 0.6 + rand() * 0.4).sort((a, b) => lum(a) - lum(b));
          bg.background = bg.colors[0].map((v, i) => (i < 3 ? v * 0.35 : 1));
          buildBgColors(); renderBackground();
        } }, '🎲 隨機配色'),
        h('button', { class: 'secondary', onclick: () => { bg.colors = defaultColors.map(c => [...c]); buildBgColors(); renderBackground(); } }, '還原原始配色'),
        bgColorsBox);
      mainArea.replaceChildren(h('section', { class: 'preview' },
        h('div', { class: 'sheet-wrap bg-checker' }, bgCanvas),
        h('div', { class: 'export-bar' },
          h('button', { onclick: async () => { if (bgLayers.combined) download(`space_${bg.width}x${bg.height}.png`, await pngBytes(bgLayers.combined), 'image/png'); } }, '⬇ 下載背景 PNG'),
          h('button', { class: 'secondary', onclick: async () => {
            const files: Record<string, Uint8Array> = {};
            for (const key of ['background', 'nebula', 'dust', 'stars', 'planets', 'combined']) if (bgLayers[key]) files[`space_${key}.png`] = await pngBytes(bgLayers[key]);
            downloadZip(`space_layers_${bg.width}x${bg.height}.zip`, files);
          } }, '分層 ZIP（給 ParallaxBackground 用）')),
        h('p', { class: 'muted' }, '分層匯出：底色、星雲、星塵、星星、小星球各一張透明 PNG，在 Godot 的 ParallaxBackground 設不同的 motion_scale，就有視差捲動效果。')));
      renderBackground();
    }
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '星球 / 太空背景'),
    h('p', { class: 'muted' }, '會自轉的像素星球（可輸出無縫循環動畫）和太空背景。直接執行 Deep-Fold 原本的 Godot shader（PixelPlanets、PixelSpace，MIT）。'),
    field('模式', select([['planet', '星球動畫'], ['background', '太空背景']], mode, v => { mode = v as typeof mode; renderMode(); })),
    modeArea, msg);

  renderMode();
  return h('div', { class: 'tool' }, sidebar, mainArea);
}

function overlay(target: Rgba, src: Rgba, x: number, y: number): void {
  for (let row = 0; row < src.height; row++) for (let col = 0; col < src.width; col++) {
    const tx = x + col, ty = y + row;
    if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
    const s = (row * src.width + col) * 4, d = (ty * target.width + tx) * 4, a = src.data[s + 3] / 255;
    if (!a) continue;
    for (let c = 0; c < 3; c++) target.data[d + c] = Math.round(src.data[s + c] * a + target.data[d + c] * (1 - a));
    target.data[d + 3] = Math.max(target.data[d + 3], src.data[s + 3]);
  }
}

function composite(w: number, hgt: number, layers: Rgba[]): Rgba {
  const out: Rgba = { width: w, height: hgt, data: new Uint8Array(w * hgt * 4) };
  blit(out.data as Uint8Array, w, layers[0], 0, 0);
  for (const layer of layers.slice(1)) overlay(out, layer, 0, 0);
  return out;
}
