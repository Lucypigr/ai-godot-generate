// Image → pixel art: the core of Image-to-Pixel (MIT): resizing, built-in / extracted palettes,
// ordered and error-diffusion dithering, outlines and clean-up, on WebGL with a CPU fallback.
import { createPixelator, PRESETS, PALETTES, DITHER_METHODS, normalizeSettings, toGPL, toHexFile, upscale } from '@third/Image-to-Pixel/lib/index.js';
import { h, field, select, numberInput, range, status } from '../lib/ui';
import { type Rgba, paint, pngBytes, download, safeName, downloadZip } from '../lib/image';

type Settings = Record<string, any>;

function sampleImage(): HTMLCanvasElement {
  // A small scene drawn in code, so the tool has something to show before an upload.
  const c = document.createElement('canvas');
  c.width = 480; c.height = 320;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#2b3a67'); sky.addColorStop(0.55, '#f08a5d'); sky.addColorStop(1, '#f9d56e');
  g.fillStyle = sky; g.fillRect(0, 0, 480, 320);
  g.fillStyle = '#fff4c2'; g.beginPath(); g.arc(330, 170, 46, 0, Math.PI * 2); g.fill();
  const hills = (y: number, color: string, amp: number, seed: number) => {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, 320);
    for (let x = 0; x <= 480; x += 8) g.lineTo(x, y + Math.sin(x / 60 + seed) * amp + Math.sin(x / 23 + seed * 2) * amp * 0.3);
    g.lineTo(480, 320); g.fill();
  };
  hills(215, '#6a4c93', 18, 1); hills(245, '#3d2c5e', 22, 4); hills(280, '#1b1a33', 14, 7);
  return c;
}

export function pixelizeTool(): HTMLElement {
  const msg = h('div', { class: 'status' });
  const srcCanvas = h('canvas', { class: 'source-canvas' });
  const outCanvas = h('canvas', { class: 'pixel' });
  const paletteView = h('div', { class: 'palette small' });
  let source: HTMLCanvasElement | ImageBitmap = sampleImage();
  let name = 'pixelized';
  let settings: Settings = normalizeSettings(PRESETS[0].settings);
  let result: any = null;
  let exportScale = 4;
  const pixelator = createPixelator({});

  const showSource = () => {
    srcCanvas.width = source.width; srcCanvas.height = source.height;
    srcCanvas.getContext('2d')!.drawImage(source, 0, 0);
  };

  let pending = 0;
  const run = async () => {
    const ticket = ++pending;
    status(msg, '轉換中…', 'busy');
    try {
      const px = await pixelator;
      const r: any = await px.process(source, normalizeSettings(settings));
      if (ticket !== pending) return;
      result = r;
      paint(outCanvas, r, Math.max(1, Math.min(8, Math.floor(560 / r.width))));
      paletteView.replaceChildren(...(r.palette ?? []).map((c: string) => h('span', { class: 'chip', style: `background:${c.startsWith('#') ? c : '#' + c}`, title: c })));
      status(msg, `${r.width}×${r.height} · 使用 ${r.usedColors().length} 色 · ${px.backend === 'webgl' ? 'GPU' : 'CPU'} ${Math.round(r.ms)} ms`);
    } catch (error) {
      status(msg, `錯誤：${(error as Error).message}`, 'error');
      console.error(error);
    }
  };

  const set = (path: string, value: unknown) => {
    const keys = path.split('.');
    let obj = settings;
    for (const k of keys.slice(0, -1)) obj = obj[k] ??= {};
    obj[keys[keys.length - 1]] = value;
    run();
  };

  const controls = h('div', {});
  const buildControls = () => {
    const s = settings;
    controls.replaceChildren(...[
      field('寬度（像素）', numberInput(s.size.width, 8, 1024, 1, v => set('size.width', v))),
      field('調色盤', select([['extract', '從圖片萃取'], ['none', '不限制顏色'], ...PALETTES.map((p: { id: string; name: string; colors: string[] }) => [`builtin:${p.id}`, `${p.name}（${p.colors.length} 色）`] as [string, string])],
        s.palette.source === 'builtin' ? `builtin:${s.palette.id}` : s.palette.source, v => {
          if (v.startsWith('builtin:')) settings.palette = { source: 'builtin', id: v.slice(8) };
          else settings.palette = { source: v, count: settings.palette.count ?? 16 };
          buildControls(); run();
        })),
      s.palette.source === 'extract' ? field('萃取顏色數', numberInput(s.palette.count ?? 16, 2, 64, 1, v => set('palette.count', v))) : null,
      field('抖色演算法', select(DITHER_METHODS.filter((m: { id: string }) => m.id !== 'custom').map((m: { id: string; label: string }) => [m.id, m.label]), s.dither.method, v => set('dither.method', v))),
      field('抖色強度', range(s.dither.strength, 0, 1, 0.01, v => set('dither.strength', v))),
      h('fieldset', {}, h('legend', {}, '色彩調整'),
        field('亮度', range(s.adjust.brightness, -1, 1, 0.01, v => set('adjust.brightness', v))),
        field('對比', range(s.adjust.contrast, -1, 1, 0.01, v => set('adjust.contrast', v))),
        field('飽和度', range(s.adjust.saturation, -1, 1, 0.01, v => set('adjust.saturation', v))),
        field('色相', range(s.adjust.hue, -180, 180, 1, v => set('adjust.hue', v)))),
      field('外框', select([['none', '無'], ['outer', '外側'], ['inner', '內側']], s.outline.mode, v => set('outline.mode', v))),
      field('外框顏色', h('input', { type: 'color', value: s.outline.color, onchange: e => set('outline.color', (e.target as HTMLInputElement).value) })),
      field('清除孤立像素', select([['false', '否'], ['true', '是']], String(s.cleanup.orphans), v => set('cleanup.orphans', v === 'true'))),
      field('透明度門檻', range(s.alpha.threshold, 0, 1, 0.01, v => set('alpha.threshold', v)), '低於這個透明度的像素會變全透明，適合去背的 sprite'),
    ].filter((el): el is HTMLElement => el !== null));
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '圖片轉像素圖'),
    h('p', { class: 'muted' }, '把照片、手繪圖或 3D 算圖轉成像素風格，套用經典調色盤與抖色。全部在瀏覽器裡處理。引擎：Image-to-Pixel（MIT）。'),
    field('上傳圖片', h('input', { type: 'file', accept: 'image/*', onchange: async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      source = await createImageBitmap(file);
      name = safeName(file.name.replace(/\.[^.]+$/, ''));
      showSource(); run();
    } })),
    field('預設風格', select(PRESETS.map((p: { id: string; name: string }) => [p.id, p.name]), PRESETS[0].id, v => {
      settings = normalizeSettings(PRESETS.find((p: { id: string }) => p.id === v)!.settings);
      buildControls(); run();
    })),
    controls, msg);

  const main = h('section', { class: 'preview' },
    h('div', { class: 'tile-row' },
      h('figure', { class: 'grow' }, h('figcaption', {}, '原圖'), h('div', { class: 'sheet-wrap' }, srcCanvas)),
      h('figure', { class: 'grow' }, h('figcaption', {}, '像素圖'), h('div', { class: 'sheet-wrap bg-checker' }, outCanvas))),
    h('figure', {}, h('figcaption', {}, '使用的調色盤'), paletteView),
    h('div', { class: 'export-bar' },
      field('匯出放大倍率', select(['1', '2', '3', '4', '6', '8'].map(n => [n, `${n}×`]), String(exportScale), v => { exportScale = Number(v); })),
      h('button', { onclick: async () => {
        if (!result) return;
        const img = exportScale > 1 ? upscale(result, exportScale) : result;
        download(`${name}_pixel.png`, await pngBytes(img), 'image/png');
      } }, '⬇ 下載 PNG'),
      h('button', { class: 'secondary', onclick: async () => {
        if (!result) return;
        const palette = ((result.palette ?? []) as string[]).map(c => (c.startsWith('#') ? c : '#' + c));
        downloadZip(`${name}_pixel.zip`, {
          [`${name}_pixel.png`]: await pngBytes(result),
          [`${name}_pixel_x${exportScale}.png`]: await pngBytes(upscale(result, exportScale)),
          [`${name}.gpl`]: toGPL(name, palette),
          [`${name}.hex`]: toHexFile(palette),
          [`${name}.settings.json`]: JSON.stringify(settings, null, 2),
        });
      } }, 'ZIP（原尺寸、放大版、調色盤 .gpl / .hex）')));

  showSource();
  buildControls();
  run();
  return h('div', { class: 'tool' }, sidebar, main);
}

