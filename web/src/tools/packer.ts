// Sprite sheet packer: drop in frames (PNG/GIF/WebP), slice an existing sheet, or pack loose sprites
// with MaxRects (soimy/maxrects-packer, MIT). Exports PNG + JSON + Godot SpriteFrames.
import { MaxRectsPacker } from 'maxrects-packer';
import { h, field, select, numberInput, status, createPreview } from '../lib/ui';
import { type Rgba, decodeImageFile, paint, pngBytes, downloadZip, safeName, blit } from '../lib/image';
import { atlasJSON, godotSpriteFrames, type Atlas, type Clip } from '../lib/atlas';

interface Sprite { name: string; image: Rgba }

function trim(image: Rgba): { image: Rgba; x: number; y: number } {
  let minX = image.width, minY = image.height, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return { image: { width: 1, height: 1, data: new Uint8Array(4) }, x: 0, y: 0 };
  const w = maxX - minX + 1, hgt = maxY - minY + 1, data = new Uint8Array(w * hgt * 4);
  for (let y = 0; y < hgt; y++) data.set(image.data.subarray(((minY + y) * image.width + minX) * 4, ((minY + y) * image.width + minX + w) * 4) as Uint8Array, y * w * 4);
  return { image: { width: w, height: hgt, data }, x: minX, y: minY };
}

function slice(image: Rgba, cols: number, rows: number): Rgba[] {
  const w = Math.floor(image.width / cols), hgt = Math.floor(image.height / rows), out: Rgba[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const data = new Uint8Array(w * hgt * 4);
    for (let y = 0; y < hgt; y++) data.set(image.data.subarray(((r * hgt + y) * image.width + c * w) * 4, ((r * hgt + y) * image.width + c * w + w) * 4) as Uint8Array, y * w * 4);
    out.push({ width: w, height: hgt, data });
  }
  return out;
}

async function decodeGifFrames(file: File): Promise<Rgba[] | null> {
  // ImageDecoder (WebCodecs) decodes every frame of an animated GIF/WebP where the browser supports it.
  const Decoder = (globalThis as any).ImageDecoder;
  if (!Decoder) return null;
  const decoder = new Decoder({ data: await file.arrayBuffer(), type: file.type });
  await decoder.tracks.ready;
  const count = decoder.tracks.selectedTrack?.frameCount ?? 1;
  const frames: Rgba[] = [];
  for (let i = 0; i < count; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    const canvas = new OffscreenCanvas(image.displayWidth, image.displayHeight);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    frames.push({ width: canvas.width, height: canvas.height, data: new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer) });
    image.close();
  }
  return frames;
}

export function packerTool(): HTMLElement {
  const msg = h('div', { class: 'status' });
  const list = h('div', { class: 'thumbs' });
  const sheetCanvas = h('canvas', { class: 'pixel' });
  const preview = createPreview();
  let sprites: Sprite[] = [];
  let opts = { padding: 1, trim: true, pot: false, square: false, maxSize: 2048, fps: 10, sliceCols: 1, sliceRows: 1, name: 'spritesheet' };
  let packed: Atlas | null = null;

  const repack = () => {
    if (!sprites.length) { list.replaceChildren(h('p', { class: 'muted' }, '把圖片拖進來，或用上方按鈕選擇檔案。')); return; }
    list.replaceChildren(...sprites.map((s, i) => {
      const c = h('canvas', { class: 'thumb', title: s.name });
      paint(c, s.image, Math.max(1, Math.floor(48 / Math.max(s.image.width, s.image.height))));
      return h('div', { class: 'thumb-item' }, c, h('small', {}, s.name),
        h('button', { class: 'icon', title: '移除', onclick: () => { sprites.splice(i, 1); repack(); } }, '×'));
    }));
    const items = sprites.map(s => {
      const t = opts.trim ? trim(s.image) : { image: s.image, x: 0, y: 0 };
      return { width: t.image.width, height: t.image.height, data: { sprite: s, ...t } };
    });
    const packer = new MaxRectsPacker(opts.maxSize, opts.maxSize, opts.padding, { smart: true, pot: opts.pot, square: opts.square, allowRotation: false, border: opts.padding });
    packer.addArray(items as any);
    if (packer.bins.length > 1) status(msg, `圖片太多，超出 ${opts.maxSize}px，已分成 ${packer.bins.length} 張；只預覽第一張。請調大最大尺寸。`, 'error');
    else status(msg, `已打包 ${sprites.length} 張圖`);
    const bin = packer.bins[0];
    const image: Rgba = { width: bin.width, height: bin.height, data: new Uint8Array(bin.width * bin.height * 4) };
    const frames: Atlas['frames'] = {};
    for (const rect of bin.rects as any[]) {
      const d = rect.data;
      blit(image.data as Uint8Array, image.width, d.image, rect.x, rect.y);
      frames[d.sprite.name] = {
        frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, rotated: false, trimmed: opts.trim,
        spriteSourceSize: { x: d.x, y: d.y, w: rect.width, h: rect.height }, sourceSize: { w: d.sprite.image.width, h: d.sprite.image.height },
        duration: Math.round(1000 / opts.fps),
      };
    }
    const order = sprites.map(s => s.name).filter(n => frames[n]);
    packed = { image, frames, animations: { [safeName(opts.name)]: { frames: order, loop: true } }, meta: { image: `${safeName(opts.name)}.png`, size: { w: bin.width, h: bin.height }, app: 'Asset Forge' } };
    paint(sheetCanvas, image, Math.max(1, Math.min(4, Math.floor(640 / image.width))));
    const clip: Clip = { name: safeName(opts.name), frames: sprites.map(s => s.image), durations: sprites.map(() => Math.round(1000 / opts.fps)), loop: true };
    preview.show(opts.name, [clip]);
  };

  const addFiles = async (files: FileList | File[]) => {
    status(msg, '讀取中…', 'busy');
    for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
      if (!file.type.startsWith('image/')) continue;
      const base = safeName(file.name.replace(/\.[^.]+$/, ''));
      let frames: Rgba[] | null = null;
      if (file.type === 'image/gif' || file.type === 'image/webp') { try { frames = await decodeGifFrames(file); } catch { frames = null; } }
      if (!frames) {
        const img = await decodeImageFile(file);
        frames = opts.sliceCols * opts.sliceRows > 1 ? slice(img, opts.sliceCols, opts.sliceRows) : [img];
      }
      frames.forEach((image, i) => sprites.push({ name: frames!.length > 1 ? `${base}_${String(i).padStart(2, '0')}` : base, image }));
    }
    repack();
  };

  const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, onchange: e => addFiles((e.target as HTMLInputElement).files ?? []) });
  const drop = h('div', { class: 'dropzone' }, '拖放 PNG / GIF / WebP 到這裡', h('br', {}), h('small', {}, 'GIF 會自動拆成每一幀；設定「切割」可把現有 sprite sheet 切成幀'));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, 'Sprite Sheet 打包'),
    h('p', { class: 'muted' }, '把散圖或動畫幀打包成圖集，匯出 PNG + JSON（TexturePacker 格式）和 Godot SpriteFrames。打包演算法：maxrects-packer（MIT）。'),
    field('選擇檔案', fileInput),
    field('名稱', h('input', { type: 'text', value: opts.name, onchange: e => { opts.name = (e.target as HTMLInputElement).value || 'spritesheet'; repack(); } })),
    h('fieldset', {}, h('legend', {}, '匯入時切割 sprite sheet'),
      field('欄數', numberInput(opts.sliceCols, 1, 64, 1, v => { opts.sliceCols = v; })),
      field('列數', numberInput(opts.sliceRows, 1, 64, 1, v => { opts.sliceRows = v; }))),
    field('間距 (px)', numberInput(opts.padding, 0, 16, 1, v => { opts.padding = v; repack(); })),
    field('去除透明邊', select([['true', '是'], ['false', '否']], 'true', v => { opts.trim = v === 'true'; repack(); })),
    field('2 的次方尺寸', select([['false', '否'], ['true', '是']], 'false', v => { opts.pot = v === 'true'; repack(); })),
    field('正方形', select([['false', '否'], ['true', '是']], 'false', v => { opts.square = v === 'true'; repack(); })),
    field('最大尺寸', select([512, 1024, 2048, 4096, 8192].map(n => [String(n), `${n}px`]), '2048', v => { opts.maxSize = Number(v); repack(); })),
    field('播放 FPS', numberInput(opts.fps, 1, 60, 1, v => { opts.fps = v; repack(); })),
    h('div', { class: 'export-bar column' },
      h('button', { onclick: async () => {
        if (!packed) return;
        const base = safeName(opts.name);
        downloadZip(`${base}.zip`, { [packed.meta.image]: await pngBytes(packed.image), [`${base}.json`]: atlasJSON(packed), [`${base}.tres`]: godotSpriteFrames(packed) });
      } }, '⬇ 匯出打包圖集 ZIP'),
      h('button', { class: 'secondary', onclick: () => { sprites = []; packed = null; repack(); } }, '清空')),
    msg);

  const main = h('section', { class: 'preview' }, drop, list,
    h('figure', {}, h('figcaption', {}, '打包結果（MaxRects）'), h('div', { class: 'sheet-wrap bg-checker' }, sheetCanvas)),
    h('details', {}, h('summary', {}, '動畫預覽（依檔名順序）'), preview.root));

  repack();
  return h('div', { class: 'tool' }, sidebar, main);
}
