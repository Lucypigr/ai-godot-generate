// VFX workshop: Pixelbolt's fx (particles, beams, bursts) and fluid (smoke/fire simulation) recipes,
// with presets taken from Pixelbolt's MIT-licensed examples and editable colours, seed and timing.
import { renderProject } from '@pixelbolt/core.js';
import { compileEffects } from '@pixelbolt/fx.js';
import { compileFluid } from '@pixelbolt/fluid.js';
import { h, field, select, numberInput, range, status, createPreview } from '../lib/ui';
import type { Clip } from '../lib/atlas';
import { scaleImage } from '../lib/image';

type Recipe = Record<string, any>;

const modules = import.meta.glob('../../../third_party/Pixelbolt/examples/*.{fx,fluid}.json', { eager: true, import: 'default' }) as Record<string, Recipe>;

const LABELS: Record<string, string> = {
  fireball: '火球', 'fire-explosion': '火焰爆炸', 'fire-spells': '火系法術組', 'fluid-blast': '流體衝擊', 'healing-circle': '治療法陣',
  'hero-magic': '英雄魔法', 'holy-spells': '神聖法術組', 'ice-spells': '冰系法術組', 'lightning-spells': '雷系法術組',
  'lightning-strike': '落雷', meteor: '隕石', 'poison-spells': '毒系法術組', 'shadow-spells': '暗影法術組', shield: '護盾',
  'slash-hit': '斬擊命中', 'swing-trail': '揮砍軌跡', vortex: '漩渦', 'water-spells': '水系法術組', water: '水花', effects: '綜合特效',
  campfire: '營火', 'dam-break': '潰堤水流', drip: '水滴', 'dust-wave': '沙塵波', explosion: '爆炸（流體）', 'honey-drop': '蜂蜜滴落',
  honey: '蜂蜜', 'magic-swirl': '魔法漩渦', potion: '藥水', 'roof-snow': '屋頂落雪', 'slime-burst': '史萊姆爆裂', slime: '史萊姆',
  'smoke-puff': '煙霧', splash: '濺水', 'steam-vent': '蒸汽', torch: '火把', waterfall: '瀑布',
};

const presets = Object.entries(modules).map(([path, recipe]) => {
  const file = path.split('/').pop()!.replace(/\.(fx|fluid)\.json$/, '');
  const kind = path.endsWith('.fluid.json') ? 'fluid' : 'fx';
  return { id: `${kind}:${file}`, file, kind, label: `${LABELS[file] ?? file}${kind === 'fluid' ? '（流體模擬）' : ''}`, recipe };
}).sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));

function render(recipe: Recipe, scale = 1): { clips: Clip[]; warnings: string[] } {
  const compiled = recipe.format === 'pixelforge-fluid' ? compileFluid(recipe) : compileEffects(recipe);
  const project = renderProject(compiled.recipe);
  const clips: Clip[] = Object.entries(project.animations as Record<string, { frames: number[]; loop: boolean }>).map(([name, anim]) => ({
    name,
    loop: anim.loop !== false,
    frames: anim.frames.map(i => scaleImage({ width: project.width, height: project.height, data: project.frames[i].data }, scale)),
    durations: anim.frames.map(i => project.frames[i].duration),
  }));
  return { clips, warnings: [...(compiled.warnings ?? []), ...(project.warnings ?? [])] };
}

export function vfxTool(): HTMLElement {
  const preview = createPreview();
  const msg = h('div', { class: 'status' });
  const palette = h('div', { class: 'palette' });
  const effectControls = h('div', { class: 'effect-controls' });
  const json = h('textarea', { class: 'json', spellcheck: 'false', rows: 18 });
  let presetId = presets.find(p => p.file === 'fireball')?.id ?? presets[0].id;
  let recipe: Recipe = structuredClone(presets.find(p => p.id === presetId)!.recipe);
  let outScale = 1;

  const run = () => {
    status(msg, '算圖中…', 'busy');
    json.value = JSON.stringify(recipe, null, 2);
    setTimeout(() => {
      try {
        const t = performance.now();
        const { clips, warnings } = render(recipe, outScale);
        preview.show(recipe.name ?? 'vfx', clips);
        status(msg, `完成（${Math.round(performance.now() - t)} ms）${warnings.length ? ' · ' + warnings.slice(0, 2).join(' ') : ''}`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
      }
    }, 10);
  };

  const buildControls = () => {
    palette.replaceChildren(...Object.entries(recipe.palette ?? {}).map(([sym, color]) => {
      const input = h('input', { type: 'color', value: String(color).slice(0, 7), title: sym, onchange: e => {
        recipe.palette[sym] = (e.target as HTMLInputElement).value; run();
      } });
      return h('label', { class: 'swatch' }, input, h('code', {}, sym));
    }));
    const effects = Object.entries(recipe.effects ?? {}) as [string, Recipe][];
    effectControls.replaceChildren(...effects.map(([name, effect]) => h('fieldset', {},
      h('legend', {}, name),
      field('幀數', numberInput(effect.frames ?? 8, 1, 96, 1, v => { effect.frames = v; run(); })),
      field('每幀毫秒', numberInput(effect.duration ?? 80, 16, 1000, 1, v => { effect.duration = v; run(); })),
      field('隨機種子', numberInput(effect.seed ?? 1, 0, 99999, 1, v => { effect.seed = v; run(); })),
      field('循環', select([['true', '是'], ['false', '否']], String(effect.loop !== false), v => { effect.loop = v === 'true'; run(); })),
    )));
  };

  const load = (id: string) => {
    presetId = id;
    recipe = structuredClone(presets.find(p => p.id === id)!.recipe);
    buildControls();
    run();
  };

  const scaleBox = range(1, 1, 4, 1, v => { outScale = v; run(); });

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, 'VFX 特效工坊'),
    h('p', { class: 'muted' }, '選擇預設，調整顏色和參數，匯出成 Sprite Sheet、GIF 或 Godot SpriteFrames。引擎：Pixelbolt（MIT）。'),
    field('預設特效', select(presets.map(p => [p.id, p.label]), presetId, load)),
    field('輸出放大倍率', scaleBox, '匯出時每個像素放大的倍數'),
    h('h3', {}, '調色盤'), palette,
    h('h3', {}, '動畫參數'), effectControls,
    h('details', {}, h('summary', {}, '進階：直接編輯 JSON 配方'), json,
      h('button', { class: 'secondary', onclick: () => {
        try { recipe = JSON.parse(json.value); buildControls(); run(); }
        catch (error) { status(msg, `JSON 錯誤：${(error as Error).message}`, 'error'); }
      } }, '套用 JSON')),
    msg);

  load(presetId);
  return h('div', { class: 'tool' }, sidebar, preview.root);
}
