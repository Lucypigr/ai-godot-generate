// VFX workshop. Three sources:
//  - Pixelbolt presets (MIT examples), optionally with an uploaded image as the particle shape;
//  - "my sprite": an uploaded sprite driven by Pixelbolt sprite emitters (teleport, aura, disintegrate, shatter);
//  - image effects: frame effects applied to the uploaded sprite (dissolve, hit flash, freeze...).
import { renderProject } from '@pixelbolt/core.js';
import { compileEffects } from '@pixelbolt/fx.js';
import { compileFluid } from '@pixelbolt/fluid.js';
import { CharacterAvatarGenerator, DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT } from '@ppae/entities/character-generator';
import { DEFAULT_STYLE_PROFILES } from '@ppae/core/coordinates';
import { h, field, select, numberInput, range, status, createPreview } from '../lib/ui';
import type { Clip } from '../lib/atlas';
import { type Rgba, scaleImage, decodeImageFile, paint, safeName } from '../lib/image';
import { trimImage, fitImage, imageToSymbol } from '../lib/sprite-symbol';
import { IMAGE_EFFECTS, applyImageEffect } from './image-effects';

type Recipe = Record<string, any>;

const examples = import.meta.glob('../../../third_party/Pixelbolt/examples/*.json', { eager: true, import: 'default' }) as Record<string, Recipe>;
const exampleByFile = (file: string) => Object.entries(examples).find(([p]) => p.endsWith(`/${file}`))?.[1];

/** Replaces { recipe: "other.json" } references with the referenced example, as the CLI would. */
function inlineRefs(value: any): any {
  if (Array.isArray(value)) return value.map(inlineRefs);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => {
      if (k === 'recipe' && typeof v === 'string' && v.endsWith('.json')) {
        const target = exampleByFile(v);
        if (!target) throw new Error(`找不到 ${v}`);
        return [k, inlineRefs(structuredClone(target))];
      }
      return [k, inlineRefs(v)];
    }));
  }
  return value;
}

const LABELS: Record<string, string> = {
  fireball: '火球', 'fire-explosion': '火焰爆炸', 'fire-spells': '火系法術組', 'fluid-blast': '流體衝擊', 'healing-circle': '治療法陣',
  'hero-magic': '英雄魔法', 'holy-spells': '神聖法術組', 'ice-spells': '冰系法術組', 'lightning-spells': '雷系法術組',
  'lightning-strike': '落雷', meteor: '隕石', 'poison-spells': '毒系法術組', 'shadow-spells': '暗影法術組', shield: '護盾',
  'slash-hit': '斬擊命中', 'swing-trail': '揮砍軌跡', vortex: '漩渦', 'water-spells': '水系法術組', water: '水花', effects: '綜合特效',
  campfire: '營火', 'dam-break': '潰堤水流', drip: '水滴', 'dust-wave': '沙塵波', explosion: '爆炸（流體）', 'honey-drop': '蜂蜜滴落',
  honey: '蜂蜜', 'magic-swirl': '魔法漩渦', potion: '藥水', 'roof-snow': '屋頂落雪', 'slime-burst': '史萊姆爆裂', slime: '史萊姆',
  'smoke-puff': '煙霧', splash: '濺水', 'steam-vent': '蒸汽', torch: '火把', waterfall: '瀑布',
};

const presets = Object.entries(examples).filter(([p]) => /\.(fx|fluid)\.json$/.test(p)).map(([path, recipe]) => {
  const file = path.split('/').pop()!.replace(/\.(fx|fluid)\.json$/, '');
  const kind = path.endsWith('.fluid.json') ? 'fluid' : 'fx';
  return { id: `${kind}:${file}`, file, kind, label: `${LABELS[file] ?? file}${kind === 'fluid' ? '（流體模擬）' : ''}`, recipe };
}).sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));

function render(recipe: Recipe, scale = 1): { clips: Clip[]; warnings: string[] } {
  const source = inlineRefs(recipe);
  const compiled = source.format === 'pixelforge-fluid' ? compileFluid(source) : compileEffects(source);
  const project = renderProject(compiled.recipe);
  const clips: Clip[] = Object.entries(project.animations as Record<string, { frames: number[]; loop: boolean }>).map(([name, anim]) => ({
    name,
    loop: anim.loop !== false,
    frames: anim.frames.map(i => scaleImage({ width: project.width, height: project.height, data: project.frames[i].data }, scale)),
    durations: anim.frames.map(i => project.frames[i].duration),
  }));
  return { clips, warnings: [...(compiled.warnings ?? []), ...(project.warnings ?? [])] };
}

/** Uses an uploaded image as every particle shape the preset's emitters draw. */
function withParticle(recipe: Recipe, particle: Rgba): Recipe {
  const r = structuredClone(recipe);
  const used = new Set<string>();
  for (const effect of Object.values(r.effects ?? {}) as Recipe[]) for (const em of effect.emitters ?? []) {
    for (const s of (em.shapes ?? []).flat()) if (typeof s === 'string') used.add(s);
  }
  if (!used.size) return r;
  const { rows, palette } = imageToSymbol(particle, r.palette ?? {}, 24);
  r.palette = { ...(r.palette ?? {}), ...palette };
  for (const name of used) r.symbols[name] = rows;
  return r;
}

// ---------- "my sprite" templates for Pixelbolt sprite emitters ----------
const SPRITE_FX: { id: string; label: string; colors: string[] }[] = [
  { id: 'teleport', label: '傳送消失（光柱 + 粒子上升）', colors: ['#6a3fb5', '#4f7cff', '#8fe9ff', '#ffffff'] },
  { id: 'aura', label: '能量光環（循環）', colors: ['#6a3fb5', '#4f7cff', '#8fe9ff', '#ffffff'] },
  { id: 'disintegrate', label: '隨風飄散', colors: ['#3b2a52', '#7d4fb0', '#c9a2ff', '#ffffff'] },
  { id: 'shatter', label: '崩落碎裂（彈跳落地）', colors: ['#2b2b3a', '#5a5a73', '#a0a0b8', '#ffffff'] },
  { id: 'burn', label: '燃燒成灰', colors: ['#3a1f1f', '#d6402b', '#ff8a2b', '#ffd34d'] },
];
const FX_KEYS = ['5', '6', '7', '8'];

function spriteRecipe(kind: string, sprite: Rgba, colors: string[], frames: number, duration: number, seed: number): Recipe {
  const reserved: Record<string, string> = Object.fromEntries(FX_KEYS.map((k, i) => [k, colors[i]]));
  const { rows, palette } = imageToSymbol(sprite, reserved, 48);
  const w = sprite.width, hgt = sprite.height;
  const px = Math.max(8, Math.round(w * 0.45)), top = Math.max(10, Math.round(hgt * 0.6));
  const W = w + px * 2, H = hgt + top + 2, floor = top + hgt - 1, cx = Math.round(W / 2);
  const look = { colors: FX_KEYS, thresholds: [0.3, 0.5, 0.72, 0.9] };
  const base = { format: 'pixelforge-fx', version: 1, name: kind, width: W, height: H, palette: { ...reserved, ...palette },
    symbols: { me: rows, spark: [FX_KEYS[3]], 'spark-dim': [FX_KEYS[2]], ember: [FX_KEYS[2]], ash: [FX_KEYS[0]] }, anchor: [cx, floor] };
  const at = [px, top];
  const effect = (e: Recipe) => ({ ...base, effects: { [kind]: { frames, duration, seed, ...e } } });
  switch (kind) {
    case 'teleport':
      return effect({ edges: ['top', 'bottom'], looks: { light: look },
        layers: [{ kind: 'beam', look: 'light', at: [cx, floor], to: [cx, 0], width: [1, Math.max(6, Math.round(w * 0.3)), Math.max(5, Math.round(w * 0.25)), 0], reveal: 0.2, wobble: 0.12, wavelength: 9, waves: -3, fade: 0.6, power: [1.2, 1.1, 0.7, 0] }],
        emitters: [{ sprite: { symbol: 'me' }, at, release: { sweep: 270, jitter: 0.35 }, start: 1, end: Math.max(2, frames - 4), angle: [255, 285], speed: [0.6, 1.6], gravity: [0, -0.12], drag: 0.02, life: [5, 8], tint: [{}, FX_KEYS[3], FX_KEYS[2], FX_KEYS[1]], dissolve: 0.35 }] });
    case 'aura':
      return effect({ loop: true, edges: ['bottom'], looks: { spirit: { colors: FX_KEYS, thresholds: [0.1, 0.3, 0.55, 0.8] } }, cleanup: { corners: true, strays: true },
        layers: [{ kind: 'aura', look: 'spirit', symbol: 'me', at, width: 4, rise: 3, noise: 0.8, scale: 3, floor }],
        emitters: [{ sprite: { symbol: 'me', pixels: 'outline', draw: true }, at, rate: 0.6, angle: [255, 285], speed: [0.6, 1.2], life: [5, 8], shapes: ['spark', 'spark-dim'] }] });
    case 'disintegrate':
      return effect({ edges: ['top', 'right'],
        emitters: [{ sprite: { symbol: 'me' }, at, release: { sweep: 0, jitter: 0.4 }, start: 1, end: Math.max(2, Math.round(frames * 0.7)), angle: [300, 340], speed: [0.5, 1.3], gravity: [0.03, -0.06], drag: 0.02, life: [6, 10], tint: [{}, FX_KEYS[2], FX_KEYS[1], FX_KEYS[0]], dissolve: 0.5, turbulence: { strength: 0.3, scale: 6 } }] });
    case 'shatter':
      return effect({ edges: ['left', 'right', 'top', 'bottom'],
        emitters: [{ sprite: { symbol: 'me' }, at, release: { sweep: 90, jitter: 0.6 }, start: 1, end: Math.max(2, Math.round(frames * 0.35)), angle: [200, 340], speed: [0.8, 2.2], gravity: [0, 0.3], floor, bounce: 0.35, life: [frames, frames + 4], dissolve: 0.15 }] });
    default: // burn
      return effect({ edges: ['top', 'bottom'],
        emitters: [{ sprite: { symbol: 'me' }, at, release: { sweep: 270, jitter: 0.5 }, start: 1, end: Math.max(2, Math.round(frames * 0.75)), angle: [250, 290], speed: [0.3, 1.0], gravity: [0, -0.08], drag: 0.03, life: [6, 11], tint: [{}, FX_KEYS[3], FX_KEYS[2], FX_KEYS[1], FX_KEYS[0]], dissolve: 0.45, turbulence: { strength: 0.4, scale: 5 } }] });
  }
}

function defaultSprite(): Rgba {
  const profile = (DEFAULT_STYLE_PROFILES as Record<string, any>)['micro-6x6'];
  const buf = new CharacterAvatarGenerator().renderCharacterFrame(DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', 'S', 0, 4, profile).buffer;
  return trimImage({ width: buf.width, height: buf.height, data: buf.data as unknown as Uint8Array });
}

type Mode = 'preset' | 'sprite' | 'image';

export function vfxTool(): HTMLElement {
  const preview = createPreview();
  const msg = h('div', { class: 'status' });
  const modeArea = h('div', {});
  const uploadPreview = h('canvas', { class: 'pixel upload-thumb' });
  let mode: Mode = 'preset';
  let presetId = presets.find(p => p.file === 'fireball')?.id ?? presets[0].id;
  let recipe: Recipe = structuredClone(presets.find(p => p.id === presetId)!.recipe);
  let outScale = 1;
  let particle: Rgba | null = null;
  let sprite: Rgba = defaultSprite();
  let spriteName = 'hero';
  let maxSize = 64;
  let reverse = false;
  const spriteState = { kind: 'teleport', colors: [...SPRITE_FX[0].colors], frames: 16, duration: 70, seed: 3 };
  const imageState = { effect: IMAGE_EFFECTS[0].id, frames: 12, duration: 70, seed: 1, color: IMAGE_EFFECTS[0].color, color2: IMAGE_EFFECTS[0].color2, loop: IMAGE_EFFECTS[0].loop };

  const fitted = () => fitImage(sprite, maxSize, maxSize);
  const finish = (name: string, clips: Clip[], t0: number, warnings: string[] = []) => {
    const out = clips.map(c => {
      const frames = c.frames.map(f => scaleImage(f, outScale));
      return reverse ? { ...c, name: `${c.name}_in`, frames: frames.reverse(), durations: [...c.durations].reverse() } : { ...c, frames };
    });
    preview.show(name, out);
    status(msg, `完成（${Math.round(performance.now() - t0)} ms）${warnings.length ? ' · ' + warnings.slice(0, 2).join(' ') : ''}`);
  };

  const run = () => {
    status(msg, '算圖中…', 'busy');
    setTimeout(() => {
      const t0 = performance.now();
      try {
        if (mode === 'preset') {
          const r = particle ? withParticle(recipe, particle) : recipe;
          const { clips, warnings } = render(r, 1);
          finish(recipe.name ?? 'vfx', clips, t0, warnings);
        } else if (mode === 'sprite') {
          const r = spriteRecipe(spriteState.kind, fitted(), spriteState.colors, spriteState.frames, spriteState.duration, spriteState.seed);
          const { clips, warnings } = render(r, 1);
          finish(`${safeName(spriteName)}_${spriteState.kind}`, clips, t0, warnings);
        } else {
          const clip = applyImageEffect(imageState.effect, fitted(), imageState);
          finish(`${safeName(spriteName)}_${imageState.effect}`, [clip], t0);
        }
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  const upload = (label: string, onImage: (img: Rgba, name: string) => void, hint?: string) => field(label, h('input', { type: 'file', accept: 'image/*', onchange: async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    onImage(trimImage(await decodeImageFile(file)), file.name.replace(/\.[^.]+$/, ''));
  } }), hint);

  const showUpload = (img: Rgba) => paint(uploadPreview, img, Math.max(1, Math.min(6, Math.floor(96 / Math.max(img.width, img.height)))));

  const colorRow = (colors: string[], onchange: () => void) => h('div', { class: 'palette' }, ...colors.map((c, i) => h('label', { class: 'swatch' },
    h('input', { type: 'color', value: c, onchange: e => { colors[i] = (e.target as HTMLInputElement).value; onchange(); } }), h('code', {}, String(i + 1)))));

  const renderMode = () => {
    if (mode === 'preset') {
      const palette = h('div', { class: 'palette' }, ...Object.entries(recipe.palette ?? {}).map(([sym, color]) => h('label', { class: 'swatch' },
        h('input', { type: 'color', value: String(color).slice(0, 7), title: sym, onchange: e => { recipe.palette[sym] = (e.target as HTMLInputElement).value; run(); } }),
        h('code', {}, sym))));
      const effects = Object.entries(recipe.effects ?? {}) as [string, Recipe][];
      const json = h('textarea', { class: 'json', spellcheck: 'false', rows: 16 });
      json.value = JSON.stringify(recipe, null, 2);
      modeArea.replaceChildren(
        field('預設特效', select(presets.map(p => [p.id, p.label]), presetId, v => { presetId = v; recipe = structuredClone(presets.find(p => p.id === v)!.recipe); renderMode(); run(); })),
        upload('用自己的圖當粒子（選填）', img => { particle = fitImage(img, 12, 12); showUpload(particle); run(); }, '會縮到 12px 以內，取代這個特效裡噴出的粒子形狀（火花、餘燼、碎片等）；流體和 blob 類特效沒有粒子形狀'),
        particle ? h('div', { class: 'export-bar' }, uploadPreview, h('button', { class: 'secondary', onclick: () => { particle = null; renderMode(); run(); } }, '移除粒子圖')) : '',
        h('h3', {}, '調色盤'), palette,
        h('h3', {}, '動畫參數'),
        ...effects.map(([name, effect]) => h('fieldset', {}, h('legend', {}, name),
          field('幀數', numberInput(effect.frames ?? 8, 1, 96, 1, v => { effect.frames = v; run(); })),
          field('每幀毫秒', numberInput(effect.duration ?? 80, 16, 1000, 1, v => { effect.duration = v; run(); })),
          field('隨機種子', numberInput(effect.seed ?? 1, 0, 99999, 1, v => { effect.seed = v; run(); })),
          field('循環', select([['true', '是'], ['false', '否']], String(effect.loop !== false), v => { effect.loop = v === 'true'; run(); })))),
        h('details', {}, h('summary', {}, '進階：直接編輯 JSON 配方'), json,
          h('button', { class: 'secondary', onclick: () => {
            try { recipe = JSON.parse(json.value); renderMode(); run(); } catch (error) { status(msg, `JSON 錯誤：${(error as Error).message}`, 'error'); }
          } }, '套用 JSON')),
      );
      if (particle) showUpload(particle);
    } else {
      const common = [
        upload('上傳角色 / 物件圖片', (img, name) => { sprite = img; spriteName = name; showUpload(fitted()); run(); }, '透明背景 PNG 效果最好；沒上傳時用內建的範例角色'),
        h('div', { class: 'export-bar' }, uploadPreview, h('small', { class: 'muted' }, `${spriteName}：${fitted().width}×${fitted().height}`)),
        field('最大尺寸', select(['32', '48', '64', '96', '128'].map(n => [n, `${n} px`]), String(maxSize), v => { maxSize = Number(v); showUpload(fitted()); renderMode(); run(); }), '大圖會縮小；像素越多算圖越久'),
      ];
      if (mode === 'sprite') {
        modeArea.replaceChildren(...common,
          field('特效', select(SPRITE_FX.map(f => [f.id, f.label]), spriteState.kind, v => { spriteState.kind = v; spriteState.colors = [...SPRITE_FX.find(f => f.id === v)!.colors]; renderMode(); run(); })),
          h('h3', {}, '特效顏色（暗 → 亮）'), colorRow(spriteState.colors, run),
          h('fieldset', {}, h('legend', {}, '動畫'),
            field('幀數', numberInput(spriteState.frames, 6, 48, 1, v => { spriteState.frames = v; run(); })),
            field('每幀毫秒', numberInput(spriteState.duration, 16, 500, 1, v => { spriteState.duration = v; run(); })),
            field('隨機種子', numberInput(spriteState.seed, 0, 99999, 1, v => { spriteState.seed = v; run(); }))));
      } else {
        const def = IMAGE_EFFECTS.find(e => e.id === imageState.effect)!;
        const colors = [imageState.color, imageState.color2];
        modeArea.replaceChildren(...common,
          field('特效', select(IMAGE_EFFECTS.map(e => [e.id, e.label]), imageState.effect, v => {
            const d = IMAGE_EFFECTS.find(e => e.id === v)!;
            Object.assign(imageState, { effect: v, color: d.color, color2: d.color2, loop: d.loop });
            renderMode(); run();
          })),
          def.hint ? h('div', {}, h('h3', {}, '顏色'), colorRow(colors, () => { imageState.color = colors[0]; imageState.color2 = colors[1]; run(); }), h('small', { class: 'muted' }, def.hint)) : '',
          h('fieldset', {}, h('legend', {}, '動畫'),
            field('幀數', numberInput(imageState.frames, 2, 60, 1, v => { imageState.frames = v; run(); })),
            field('每幀毫秒', numberInput(imageState.duration, 16, 500, 1, v => { imageState.duration = v; run(); })),
            field('隨機種子', numberInput(imageState.seed, 0, 99999, 1, v => { imageState.seed = v; run(); }))));
      }
      showUpload(fitted());
    }
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, 'VFX 特效工坊'),
    h('p', { class: 'muted' }, '預設特效、用你上傳的角色做特效，或對圖片套用特效動畫。匯出成 Sprite Sheet、GIF 或 Godot SpriteFrames。引擎：Pixelbolt（MIT）。'),
    field('來源', select([['preset', '預設特效'], ['sprite', '我的圖片 × 粒子特效（Pixelbolt）'], ['image', '我的圖片 × 動畫特效']], mode, v => { mode = v as Mode; renderMode(); run(); })),
    modeArea,
    h('h3', {}, '輸出'),
    field('輸出放大倍率', range(1, 1, 4, 1, v => { outScale = v; run(); }), '匯出時每個像素放大的倍數'),
    field('倒著播放', select([['false', '否'], ['true', '是（例如：消散 → 從粒子組合出現）']], 'false', v => { reverse = v === 'true'; run(); })),
    msg);

  renderMode();
  run();
  return h('div', { class: 'tool' }, sidebar, preview.root);
}
