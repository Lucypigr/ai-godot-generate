import { type Clip, atlasFromClips, exportAtlasZip, downloadAtlasPNG, gifBytes, type Atlas } from './atlas';
import { paint, download, safeName } from './image';

type Attrs = Record<string, string | number | boolean | ((e: Event) => void)>;

/** Tiny DOM helper: h('div', {class: 'x', onclick: fn}, child, 'text'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') el.addEventListener(key.replace(/^on/, ''), value as EventListener);
    else if (typeof value === 'boolean') { if (value) el.setAttribute(key, ''); }
    else el.setAttribute(key, String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
  return el;
}

export function field(label: string, input: HTMLElement, hint?: string): HTMLElement {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, hint ? h('small', {}, hint) : null);
}

export function select(options: [string, string][], value: string, onchange: (v: string) => void): HTMLSelectElement {
  const el = h('select', { onchange: e => onchange((e.target as HTMLSelectElement).value) });
  for (const [v, label] of options) el.append(h('option', { value: v, ...(v === value ? { selected: true } : {}) }, label));
  return el;
}

export function numberInput(value: number, min: number, max: number, step: number, onchange: (v: number) => void): HTMLInputElement {
  return h('input', { type: 'number', value, min, max, step, onchange: e => {
    const v = Number((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) onchange(Math.min(max, Math.max(min, v)));
  } });
}

export function range(value: number, min: number, max: number, step: number, onchange: (v: number) => void): HTMLElement {
  const out = h('output', {}, String(value));
  const input = h('input', { type: 'range', value, min, max, step, oninput: e => { out.textContent = (e.target as HTMLInputElement).value; },
    onchange: e => onchange(Number((e.target as HTMLInputElement).value)) });
  return h('span', { class: 'range' }, input, out);
}

export function status(el: HTMLElement, text: string, kind: 'info' | 'error' | 'busy' = 'info'): void {
  el.textContent = text;
  el.dataset.kind = kind;
}

/**
 * An animation player with export buttons. Call `show(name, clips)` whenever the asset changes.
 */
export function createPreview(): { root: HTMLElement; show: (name: string, clips: Clip[]) => void; atlas: () => Atlas | null } {
  const canvas = h('canvas', { class: 'preview-canvas' });
  const sheetCanvas = h('canvas', { class: 'sheet-canvas' });
  const info = h('div', { class: 'preview-info' });
  const clipSelect = h('select', {});
  const zoomSelect = h('select', {});
  for (const z of [1, 2, 3, 4, 6, 8, 12]) zoomSelect.append(h('option', { value: z, ...(z === 4 ? { selected: true } : {}) }, `${z}×`));
  const bg = h('select', {});
  for (const [v, l] of [['checker', '棋盤格'], ['dark', '深色'], ['light', '淺色'], ['green', '綠幕']]) bg.append(h('option', { value: v }, l));
  const stage = h('div', { class: 'stage bg-checker' }, canvas);
  bg.addEventListener('change', () => { stage.className = `stage bg-${bg.value}`; });
  let playing = true, clips: Clip[] = [], name = 'asset', current = 0, frame = 0, nextAt = 0, atlas: Atlas | null = null;
  const playBtn = h('button', { class: 'secondary', onclick: () => { playing = !playing; playBtn.textContent = playing ? '⏸ 暫停' : '▶ 播放'; } }, '⏸ 暫停');

  const draw = () => {
    const clip = clips[current];
    if (!clip || !clip.frames.length) return;
    paint(canvas, clip.frames[frame % clip.frames.length], Number(zoomSelect.value));
  };
  const tick = (now: number) => {
    const clip = clips[current];
    if (clip && playing && clip.frames.length > 1 && now >= nextAt) {
      frame = (frame + 1) % clip.frames.length;
      nextAt = now + (clip.durations[frame] ?? 100);
      draw();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  clipSelect.addEventListener('change', () => { current = Number(clipSelect.value); frame = 0; draw(); });
  let zoomTouched = false;
  zoomSelect.addEventListener('change', () => { zoomTouched = true; draw(); });

  const rebuildAtlas = () => {
    atlas = atlasFromClips(name, clips);
    paint(sheetCanvas, atlas.image, Math.max(1, Math.min(4, Math.floor(512 / Math.max(atlas.image.width, 1)))));
    const total = clips.reduce((n, c) => n + c.frames.length, 0);
    const f0 = clips[0]?.frames[0];
    info.textContent = `${clips.length} 個動畫 · ${total} 幀 · 單幀 ${f0?.width ?? 0}×${f0?.height ?? 0} · 圖集 ${atlas.image.width}×${atlas.image.height}`;
  };

  const exportBar = h('div', { class: 'export-bar' },
    h('button', { onclick: async () => { if (atlas) await exportAtlasZip(name, atlas); } }, '⬇ 匯出 ZIP（PNG + JSON + Godot .tres）'),
    h('button', { class: 'secondary', onclick: async () => { if (atlas) await downloadAtlasPNG(atlas); } }, 'Sprite Sheet PNG'),
    h('button', { class: 'secondary', onclick: () => {
      const clip = clips[current];
      if (!clip) return;
      download(`${safeName(name)}_${safeName(clip.name)}.gif`, gifBytes(clip.frames, clip.durations, Number(zoomSelect.value) > 4 ? 4 : Number(zoomSelect.value)), 'image/gif');
    } }, 'GIF（目前動畫）'),
  );

  const root = h('section', { class: 'preview' },
    h('div', { class: 'preview-controls' }, field('動畫', clipSelect), field('縮放', zoomSelect), field('背景', bg), playBtn),
    stage, info, exportBar,
    h('details', { class: 'sheet-details', open: true }, h('summary', {}, 'Sprite Sheet 圖集預覽'), h('div', { class: 'sheet-wrap bg-checker' }, sheetCanvas)));

  return {
    root,
    atlas: () => atlas,
    show(newName, newClips) {
      name = newName; clips = newClips.filter(c => c.frames.length);
      clipSelect.replaceChildren(...clips.map((c, i) => h('option', { value: i }, `${c.name}（${c.frames.length} 幀）`)));
      current = Math.min(current, Math.max(0, clips.length - 1));
      clipSelect.value = String(current);
      frame = 0;
      if (clips.length) {
        // Pick a zoom that makes small sprites readable without overflowing the stage.
        const f0 = clips[0].frames[0];
        const fit = Math.max(1, Math.min(12, Math.floor(260 / Math.max(f0.width, f0.height))));
        if (fit !== Number(zoomSelect.value) && !zoomTouched) zoomSelect.value = String([1, 2, 3, 4, 6, 8, 12].filter(z => z <= fit).pop() ?? 1);
        rebuildAtlas(); draw();
      } else { info.textContent = '沒有可顯示的幀'; }
    },
  };
}
