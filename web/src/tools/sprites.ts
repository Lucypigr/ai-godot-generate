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
import { type Rgba, scaleImage, decodeImageFile, paint, safeName } from '../lib/image';
import { trimImage, fitImage } from '../lib/sprite-symbol';
import { maskSprite, MASKS } from './mask-sprite';
import { ACTIONS, animate, layoutFor } from './character-anim';

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

type Mode = 'upload' | 'character' | 'creature' | 'tree' | 'mask';
const UPLOAD_SLOTS = ['S', 'SE', 'E', 'NE', 'N'] as const;
const SLOT_LABEL: Record<string, string> = { S: '正面（下）S — 必填', SE: '右下 SE（選填）', E: '側面（右）E（選填）', NE: '右上 NE（選填）', N: '背面（上）N（選填）' };
interface State {
  mode: Mode; profile: string; seed: number; scale: number;
  who: string; actions: string[]; directions: Direction8[];
  species: string; creatureActions: string[];
  tree: string; stages: string[];
  mask: string; count: number;
  uploads: Record<string, Rgba | null>; uploadName: string; uploadActions: string[]; uploadDirs: number; maxSize: number; facesRight: boolean;
}

function mirrorImage(img: Rgba): Rgba {
  const data = new Uint8Array(img.data.length);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) data.set(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4) as Uint8Array, (y * img.width + img.width - 1 - x) * 4);
  return { width: img.width, height: img.height, data };
}

/** The pose for each output direction: uploaded views, the nearest uploaded view where one is missing, mirrors for the left side. */
function uploadPoses(s: State): { poses: Record<string, Rgba>; notes: string[] } {
  const up = s.uploads, notes: string[] = [];
  const fit = (img: Rgba) => fitImage(img, s.maxSize, s.maxSize);
  const pick = (dir: string, chain: string[]): Rgba => {
    for (const d of [dir, ...chain]) if (up[d]) { if (d !== dir) notes.push(`${dir} 用 ${d} 代替`); return fit(up[d]!); }
    throw new Error('請先上傳正面圖');
  };
  const right: Record<string, Rgba> = {
    S: pick('S', []), E: pick('E', ['SE', 'NE', 'S']), N: pick('N', ['NE', 'S']),
    SE: s.uploadDirs === 8 ? pick('SE', ['E', 'S']) : (null as unknown as Rgba), NE: s.uploadDirs === 8 ? pick('NE', ['E', 'N', 'S']) : (null as unknown as Rgba),
  };
  // Uploaded side views facing left are flipped so the "right" set really faces right.
  if (!s.facesRight) for (const d of ['E', 'SE', 'NE']) if (right[d] && up[d]) right[d] = mirrorImage(right[d]);
  const poses: Record<string, Rgba> = { S: right.S, E: right.E, N: right.N, W: mirrorImage(right.E) };
  if (s.uploadDirs === 8) Object.assign(poses, { SE: right.SE, NE: right.NE, SW: mirrorImage(right.SE), NW: mirrorImage(right.NE) });
  return { poses, notes };
}

const fromBuffer = (b: { width: number; height: number; data: Uint8ClampedArray }): Rgba => ({ width: b.width, height: b.height, data: b.data });

function profileOf(id: string) {
  return (DEFAULT_STYLE_PROFILES as Record<string, (typeof DEFAULT_STYLE_PROFILES)[keyof typeof DEFAULT_STYLE_PROFILES]>)[id];
}

function buildClips(s: State): Clip[] {
  const p = profileOf(s.profile);
  const up = (img: Rgba) => scaleImage(img, s.scale);
  if (s.mode === 'upload') {
    const { poses } = uploadPoses(s);
    const L = layoutFor(Object.values(poses));
    const order = (s.uploadDirs === 8 ? ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'] : ['S', 'E', 'N', 'W']).filter(d => poses[d]);
    return s.uploadActions.flatMap(id => {
      const a = ACTIONS.find(x => x.id === id)!;
      return order.map(dir => {
        const clip = animate(a.id, poses[dir], dir, L, a.frames, a.ms, a.loop);
        return { ...clip, frames: clip.frames.map(up) };
      });
    });
  }
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

/** Sample views (front, diagonals, side, back) of the default PPAE hero, shown before an upload. */
function sampleUploads(): Record<string, Rgba | null> {
  const p = profileOf('micro-6x6');
  const view = (dir: Direction8) => trimImage(fromBuffer(avatar.renderCharacterFrame(DEFAULT_HERO_APPEARANCE, DEFAULT_HERO_EQUIPMENT, 'idle', dir, 0, 4, p).buffer));
  return { S: view('S'), SE: view('SE'), E: view('E'), NE: view('NE'), N: view('N') };
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
    mode: 'upload', profile: PROFILES.includes('micro-6x6') ? 'micro-6x6' : PROFILES[0], seed: 7, scale: 1,
    who: 'hero', actions: ['idle', 'walk'], directions: ['S', 'E', 'N', 'W'],
    species: 'emerald_slime', creatureActions: ['idle', 'move', 'attack'],
    tree: Object.keys(TREE_SPECIES_CATALOG)[0], stages: ['mature', 'young', 'ancient'],
    mask: Object.keys(MASKS)[0], count: 16,
    uploads: sampleUploads(), uploadName: 'my_character', uploadActions: ['idle', 'walk', 'attack'], uploadDirs: 8, maxSize: 64, facesRight: true,
  };
  let usingSample = true;

  const run = () => {
    status(msg, '產生中…', 'busy');
    setTimeout(() => {
      try {
        const t = performance.now();
        const clips = buildClips(s);
        const name = s.mode === 'upload' ? safeName(s.uploadName) : s.mode === 'character' ? `character_${s.who}` : s.mode === 'creature' ? s.species : s.mode === 'tree' ? `tree_${s.tree}` : `sprite_${s.mask}`;
        preview.show(name, clips);
        const notes = s.mode === 'upload' ? uploadPoses(s).notes : [];
        status(msg, `完成（${Math.round(performance.now() - t)} ms）${usingSample && s.mode === 'upload' ? ' · 目前是範例角色，上傳你的圖片來替換' : ''}${notes.length ? ' · ' + notes.join('、') : ''}`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  const dirList = () => field('方向', checklist(DIRECTIONS.map(d => [d, `${DIR_LABEL[d]} ${d}`]), s.directions, v => { s.directions = v as Direction8[]; run(); }));

  const renderMode = () => {
    const parts: HTMLElement[] = [];
    if (s.mode === 'upload') {
      parts.push(h('p', { class: 'muted' }, '上傳你的角色圖（透明背景 PNG 最好）。只有正面也可以：沒上傳的方向會用最接近的圖代替，左邊的方向自動鏡像右邊。動作是用程式讓圖片動起來（呼吸、走路擺腿、前衝、受傷、跳躍、倒下）。'));
      for (const dir of UPLOAD_SLOTS) {
        const thumb = h('canvas', { class: 'pixel upload-thumb' });
        if (s.uploads[dir]) paint(thumb, s.uploads[dir]!, Math.max(1, Math.min(4, Math.floor(64 / Math.max(s.uploads[dir]!.width, s.uploads[dir]!.height)))));
        parts.push(field(SLOT_LABEL[dir], h('div', { class: 'slot-row' },
          h('input', { type: 'file', accept: 'image/*', onchange: async e => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            if (usingSample) { for (const d of UPLOAD_SLOTS) s.uploads[d] = null; usingSample = false; }
            s.uploads[dir] = trimImage(await decodeImageFile(file));
            if (dir === 'S') s.uploadName = file.name.replace(/\.[^.]+$/, '');
            renderMode(); run();
          } }),
          s.uploads[dir] ? thumb : '',
          s.uploads[dir] && !usingSample && dir !== 'S' ? h('button', { class: 'icon', title: '移除', onclick: () => { s.uploads[dir] = null; renderMode(); run(); } }, '×') : '')));
      }
      parts.push(field('側面圖朝向', select([['true', '朝右'], ['false', '朝左']], String(s.facesRight), v => { s.facesRight = v === 'true'; run(); })));
      parts.push(field('方向數', select([['8', '8 方向'], ['4', '4 方向']], String(s.uploadDirs), v => { s.uploadDirs = Number(v); run(); })));
      parts.push(field('動作', checklist(ACTIONS.map(a => [a.id, a.label]), s.uploadActions, v => { s.uploadActions = v.length ? v : ['idle']; run(); })));
      parts.push(field('最大尺寸', select(['32', '48', '64', '96', '128'].map(n => [n, `${n} px`]), String(s.maxSize), v => { s.maxSize = Number(v); run(); }), '大圖會縮小成這個尺寸以內'));
    } else if (s.mode === 'character') {
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
    proceduralOnly.style.display = s.mode === 'upload' ? 'none' : '';
  };

  const proceduralOnly = h('div', {},
    field('像素風格', select(PROFILES.map(id => [id, id]), s.profile, v => { s.profile = v; run(); }), 'module 越大，角色越大、細節越多'),
    field('隨機種子', numberInput(s.seed, 0, 999999, 1, v => { s.seed = v; run(); })));
  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '角色 / 生物 / 植物'),
    h('p', { class: 'muted' }, '上傳自己的角色圖，或用參數產生角色、生物、植物，輸出多方向、多動作的 Sprite Sheet 和 Godot SpriteFrames。程序產生的部分使用 PPAE（Apache-2.0）。'),
    field('類型', select([['upload', '上傳我的角色圖片 → 8 方向動作'], ['character', '人物角色（程序產生）'], ['creature', '生物 / 怪物'], ['tree', '樹木'], ['mask', '隨機小物（飛船、怪物、道具）']], s.mode, v => { s.mode = v as Mode; renderMode(); run(); })),
    proceduralOnly,
    field('輸出放大倍率', numberInput(s.scale, 1, 8, 1, v => { s.scale = v; run(); })),
    modeArea, msg);

  renderMode();
  run();
  return h('div', { class: 'tool' }, sidebar, preview.root);
}
