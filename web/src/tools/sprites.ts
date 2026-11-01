// Sprite generator: characters, NPCs, creatures and trees from ppae-engine (Apache-2.0),
// plus a mask-based random sprite generator (after zfedoran/pixel-sprite-generator, MIT).
import { CharacterAvatarGenerator, DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT } from '@ppae/entities/character-generator';
import { CharacterCustomizationService } from '@ppae/entities/character-customization';
import { CreatureGenerator, CREATURE_SPECIES_CATALOG } from '@ppae/entities/creature-archetypes';
import { NatureGenerator, TREE_SPECIES_CATALOG } from '@ppae/vegetation/nature-generator';
import { DEFAULT_CHARACTER_CLIPS } from '@ppae/animation/state-machine';
import { DEFAULT_CREATURE_CLIPS, SpeciesAnimationCapabilityRegistry } from '@ppae/animation/species-capabilities';
import { DEFAULT_STYLE_PROFILES } from '@ppae/core/coordinates';
import type { CharacterActionId, CreatureActionId, CreatureSpeciesId, Direction8, NpcProfessionArchetypeId, TreeLifecycleStage, TreeSpeciesId } from '@ppae/core/contracts';
import { h, field, select, numberInput, status, createPreview } from '../lib/ui';
import type { Clip } from '../lib/atlas';
import { type Rgba, scaleImage } from '../lib/image';
import { maskSprite, MASKS } from './mask-sprite';

const avatar = new CharacterAvatarGenerator();
const customization = new CharacterCustomizationService();
const creatures = new CreatureGenerator();
const capabilities = new SpeciesAnimationCapabilityRegistry();
const nature = new NatureGenerator();

const DIRECTIONS: Direction8[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const DIR_LABEL: Record<Direction8, string> = { S: '下', SE: '右下', E: '右', NE: '右上', N: '上', NW: '左上', W: '左', SW: '左下' };
const PROFESSIONS: [NpcProfessionArchetypeId | 'hero', string][] = [
  ['hero', '預設英雄'], ['villager_farmer', '農夫'], ['blacksmith_artisan', '鐵匠'], ['town_guard', '守衛'], ['wandering_mage', '法師'],
  ['forest_ranger', '遊俠'], ['merchant_trader', '商人'], ['elder_scholar', '學者'], ['miner_prospector', '礦工'],
];
const TREE_STAGES: TreeLifecycleStage[] = ['seed', 'sprout', 'sapling', 'young', 'immature', 'mature', 'ancient', 'damaged', 'dead', 'burned', 'stump', 'fallen_log'];
const PROFILES = Object.keys(DEFAULT_STYLE_PROFILES).filter(id => id !== 'adaptive-auto');

type Mode = 'character' | 'creature' | 'tree' | 'mask';
interface State {
  mode: Mode; profile: string; seed: number; scale: number;
  who: string; actions: string[]; directions: Direction8[];
  species: string; creatureActions: string[];
  tree: string; stages: string[];
  mask: string; count: number;
}

const fromBuffer = (b: { width: number; height: number; data: Uint8ClampedArray }): Rgba => ({ width: b.width, height: b.height, data: b.data });

function profileOf(id: string) {
  return (DEFAULT_STYLE_PROFILES as Record<string, (typeof DEFAULT_STYLE_PROFILES)[keyof typeof DEFAULT_STYLE_PROFILES]>)[id];
}

function buildClips(s: State): Clip[] {
  const p = profileOf(s.profile);
  const up = (img: Rgba) => scaleImage(img, s.scale);
  if (s.mode === 'character') {
    const preset = s.who === 'hero'
      ? { appearance: DEFAULT_HERO_APPEARANCE, equipment: DEFAULT_HERO_EQUIPMENT }
      : customization.generateNpcPreset(s.who as NpcProfessionArchetypeId, s.seed);
    return s.actions.flatMap(action => s.directions.map(dir => {
      const clip = DEFAULT_CHARACTER_CLIPS[action as CharacterActionId];
      const frames = Array.from({ length: clip.frameCount }, (_, i) =>
        up(fromBuffer(avatar.renderCharacterFrame(preset.appearance, preset.equipment, action as CharacterActionId, dir, i, clip.frameCount, p).buffer)));
      return { name: `${action}_${dir}`, frames, durations: frames.map(() => clip.frameDurationMs), loop: clip.loop !== false };
    }));
  }
  if (s.mode === 'creature') {
    const species = s.species as CreatureSpeciesId;
    const seen = new Set<string>();
    return s.creatureActions.flatMap(requested => {
      const action = capabilities.resolveSupportedAction(species, requested as CreatureActionId);
      if (seen.has(action)) return [];
      seen.add(action);
      return s.directions.map(dir => {
        const clip = DEFAULT_CREATURE_CLIPS[action];
        const frames = Array.from({ length: clip.frameCount }, (_, i) =>
          up(fromBuffer(creatures.renderCreatureFrame(species, action, dir, i, clip.frameCount, p, s.seed).buffer)));
        return { name: `${action}_${dir}`, frames, durations: frames.map(() => clip.frameDurationMs), loop: clip.loop !== false };
      });
    });
  }
  if (s.mode === 'tree') {
    const frames = s.stages.map(stage => up(fromBuffer(nature.generateTreeStage(s.tree as TreeSpeciesId, stage as TreeLifecycleStage, p, s.seed).buffer)));
    // A wind sway clip for the first stage, plus one still per lifecycle stage.
    const sway = [-1, 0, 1, 0].map(w => up(fromBuffer(nature.generateTreeStage(s.tree as TreeSpeciesId, s.stages[0] as TreeLifecycleStage, p, s.seed, { windShiftTexels: w }).buffer)));
    return [
      { name: `${s.stages[0]}_sway`, frames: sway, durations: sway.map(() => 180), loop: true },
      { name: 'stages', frames, durations: frames.map(() => 600), loop: true },
    ];
  }
  const frames = Array.from({ length: s.count }, (_, i) => up(maskSprite(s.mask, s.seed + i)));
  return [{ name: s.mask, frames, durations: frames.map(() => 250), loop: true }];
}

function checklist(options: [string, string][], selected: string[], onchange: (v: string[]) => void): HTMLElement {
  const box = h('div', { class: 'checklist' });
  for (const [value, label] of options) {
    const input = h('input', { type: 'checkbox', value, ...(selected.includes(value) ? { checked: true } : {}), onchange: () => {
      onchange([...box.querySelectorAll<HTMLInputElement>('input:checked')].map(i => i.value));
    } });
    box.append(h('label', {}, input, label));
  }
  return box;
}

export function spritesTool(): HTMLElement {
  const preview = createPreview();
  const msg = h('div', { class: 'status' });
  const modeArea = h('div', {});
  const s: State = {
    mode: 'character', profile: PROFILES.includes('micro-6x6') ? 'micro-6x6' : PROFILES[0], seed: 7, scale: 1,
    who: 'hero', actions: ['idle', 'walk'], directions: ['S', 'E', 'N', 'W'],
    species: 'emerald_slime', creatureActions: ['idle', 'move', 'attack'],
    tree: Object.keys(TREE_SPECIES_CATALOG)[0], stages: ['mature', 'young', 'ancient'],
    mask: Object.keys(MASKS)[0], count: 16,
  };

  const run = () => {
    status(msg, '產生中…', 'busy');
    setTimeout(() => {
      try {
        const t = performance.now();
        const clips = buildClips(s);
        const name = s.mode === 'character' ? `character_${s.who}` : s.mode === 'creature' ? s.species : s.mode === 'tree' ? `tree_${s.tree}` : `sprite_${s.mask}`;
        preview.show(name, clips);
        status(msg, `完成（${Math.round(performance.now() - t)} ms）`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  const dirList = () => field('方向', checklist(DIRECTIONS.map(d => [d, `${DIR_LABEL[d]} ${d}`]), s.directions, v => { s.directions = v as Direction8[]; run(); }));

  const renderMode = () => {
    const parts: HTMLElement[] = [];
    if (s.mode === 'character') {
      parts.push(field('角色', select(PROFESSIONS.map(([v, l]) => [v, l]), s.who, v => { s.who = v; run(); })));
      parts.push(field('動作', checklist(Object.keys(DEFAULT_CHARACTER_CLIPS).map(a => [a, a]), s.actions, v => { s.actions = v; run(); })));
      parts.push(dirList());
    } else if (s.mode === 'creature') {
      parts.push(field('物種', select(Object.keys(CREATURE_SPECIES_CATALOG).map(id => [id, id]), s.species, v => { s.species = v; run(); })));
      parts.push(field('動作', checklist(Object.keys(DEFAULT_CREATURE_CLIPS).map(a => [a, a]), s.creatureActions, v => { s.creatureActions = v; run(); }),
        '物種不支援的動作會自動換成最接近的動作'));
      parts.push(dirList());
    } else if (s.mode === 'tree') {
      parts.push(field('樹種', select(Object.keys(TREE_SPECIES_CATALOG).map(id => [id, id]), s.tree, v => { s.tree = v; run(); })));
      parts.push(field('生長階段', checklist(TREE_STAGES.map(a => [a, a]), s.stages, v => { s.stages = v.length ? v : ['mature']; run(); })));
    } else {
      parts.push(field('形狀範本', select(Object.keys(MASKS).map(id => [id, MASKS[id].label]), s.mask, v => { s.mask = v; run(); })));
      parts.push(field('數量', numberInput(s.count, 1, 64, 1, v => { s.count = v; run(); })));
    }
    modeArea.replaceChildren(...parts);
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '程序化角色 / 生物 / 植物'),
    h('p', { class: 'muted' }, '用參數產生多方向、多動作的像素角色，直接輸出成 Godot 可用的 Sprite Sheet。引擎：PPAE（Apache-2.0）。'),
    field('類型', select([['character', '人物角色'], ['creature', '生物 / 怪物'], ['tree', '樹木'], ['mask', '隨機小物（飛船、怪物、道具）']], s.mode, v => { s.mode = v as Mode; renderMode(); run(); })),
    field('像素風格', select(PROFILES.map(id => [id, id]), s.profile, v => { s.profile = v; run(); }), 'module 越大，角色越大、細節越多'),
    field('隨機種子', numberInput(s.seed, 0, 999999, 1, v => { s.seed = v; run(); })),
    field('輸出放大倍率', numberInput(s.scale, 1, 8, 1, v => { s.scale = v; run(); })),
    modeArea, msg);

  renderMode();
  run();
  return h('div', { class: 'tool' }, sidebar, preview.root);
}
