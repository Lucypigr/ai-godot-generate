// 8-direction sprite sheets from uploads.
//  - Top-down rotation: rotates a sprite (or every frame of an animation) with Pixelorama's pixel-art
//    rotation shaders (cleanEdge by torcado, OmniScale, nearest; MIT), run unmodified on WebGL 2.
//  - Mirror fill: drawn directions plus mirrored ones (E → W, SE → SW, NE → NW).
//  - 3D model: GLB / glTF / OBJ / FBX / VOX rendered in 4, 8 or 16 directions with three.js (MIT),
//    at pixel resolution, with the model's animations, outline and colour reduction.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VOXLoader, VOXMesh } from 'three/examples/jsm/loaders/VOXLoader.js';
import { ShaderRenderer } from '../lib/godot-shader';
import { h, field, select, numberInput, status, createPreview } from '../lib/ui';
import type { Clip } from '../lib/atlas';
import { type Rgba, decodeFrames, safeName, scaleImage } from '../lib/image';
import { trimImage, medianCut } from '../lib/sprite-symbol';

const rotationFiles = import.meta.glob('../../../third_party/Pixelorama/src/Shaders/Effects/Rotation/*.{gdshader,gdshaderinc}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const pixeloramaRes = (path: string) => {
  const rel = path.replace(/^res:\/\//, '');
  const key = Object.keys(rotationFiles).find(k => k.endsWith(`Pixelorama/${rel}`));
  return key ? rotationFiles[key] : undefined;
};

const DIR8 = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'] as const;
const DIR16 = ['S', 'SSE', 'SE', 'ESE', 'E', 'ENE', 'NE', 'NNE', 'N', 'NNW', 'NW', 'WNW', 'W', 'WSW', 'SW', 'SSW'] as const;
/** Direction names for a count, each with its yaw: degrees counter-clockwise on screen from facing down (S). */
function directions(count: number): { name: string; yaw: number }[] {
  const names = count === 16 ? DIR16 : count === 4 ? ['S', 'E', 'N', 'W'] : DIR8;
  return names.map((name, i) => ({ name, yaw: (360 / names.length) * i }));
}
const DIR_LABEL: Record<string, string> = { S: '下', SE: '右下', E: '右', NE: '右上', N: '上', NW: '左上', W: '左', SW: '左下' };

// ---------- mode 1: top-down rotation with Pixelorama's shaders ----------
const ALGORITHMS: [string, string][] = [['cleanEdge', 'cleanEdge（線條最乾淨，推薦）'], ['OmniScale', 'OmniScale（較平滑）'], ['NearestNeighbour', '最近鄰（最快，鋸齒較多）']];
// Facing uses the same angles as directions(): 0 = S (down), 90 = E (right), 180 = N (up), 270 = W (left).
const FACING: [string, string][] = [['90', '朝右（E）'], ['0', '朝下（S）'], ['180', '朝上（N）'], ['270', '朝左（W）']];

let shaderRenderer: ShaderRenderer | null = null;
const WHITE: Rgba = { width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) };

function rotateSprite(img: Rgba, degrees: number, algorithm: string): Rgba {
  shaderRenderer ??= new ShaderRenderer(pixeloramaRes);
  const side = Math.ceil(Math.hypot(img.width, img.height)) + 2;
  const padded: Rgba = { width: side, height: side, data: new Uint8Array(side * side * 4) };
  const ox = Math.floor((side - img.width) / 2), oy = Math.floor((side - img.height) / 2);
  for (let y = 0; y < img.height; y++) padded.data.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4) as Uint8Array, ((oy + y) * side + ox) * 4);
  if (degrees % 360 === 0) return padded;
  const shader = pixeloramaRes(`res://src/Shaders/Effects/Rotation/${algorithm}.gdshader`);
  if (!shader) throw new Error(`找不到 ${algorithm} shader`);
  const a = (degrees * Math.PI) / 180;
  // Pixelorama passes Transform2D(angle).affine_inverse() as a mat2 (columns).
  const matrix = [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
  return shaderRenderer.render(side, side, [{ shader, rect: [0, 0, side, side], params: { pivot: [0.5, 0.5], transformation_matrix: matrix, preview: false }, textures: { TEXTURE: padded, selection_tex: WHITE } }]);
}

/** Crops every frame to the union of their visible pixels, so all directions share one size and pivot. */
function cropShared(frames: Rgba[], margin = 1): Rgba[] {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (const f of frames) for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    if (f.data[(y * f.width + x) * 4 + 3] > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  if (maxX < 0) return frames;
  minX = Math.max(0, minX - margin); minY = Math.max(0, minY - margin);
  return frames.map(f => {
    const w = Math.min(f.width, maxX + margin + 1) - minX, hgt = Math.min(f.height, maxY + margin + 1) - minY, data = new Uint8Array(w * hgt * 4);
    for (let y = 0; y < hgt; y++) data.set(f.data.subarray(((minY + y) * f.width + minX) * 4, ((minY + y) * f.width + minX + w) * 4) as Uint8Array, y * w * 4);
    return { width: w, height: hgt, data };
  });
}

function mirror(img: Rgba): Rgba {
  const data = new Uint8Array(img.data.length);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) data.set(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4) as Uint8Array, (y * img.width + img.width - 1 - x) * 4);
  return { width: img.width, height: img.height, data };
}

// ---------- mode 3: 3D models with three.js ----------
interface Model { root: THREE.Object3D; clips: THREE.AnimationClip[]; name: string }

/** A small built-in robot with idle and walk clips, so the mode works before an upload. */
function sampleModel(): Model {
  const root = new THREE.Group(), mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1 });
  const box = (name: string, w: number, hh: number, d: number, c: number, x: number, y: number, z: number, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(c)); m.name = name; m.position.set(x, y, z); parent.add(m); return m;
  };
  const body = box('body', 1, 1.1, 0.7, 0x4f7cff, 0, 1.55, 0);
  const head = box('head', 0.8, 0.65, 0.65, 0xd8dde6, 0, 0.95, 0, body);
  box('eyeL', 0.14, 0.14, 0.05, 0x1a1c2c, -0.18, 0.05, 0.33, head);
  box('eyeR', 0.14, 0.14, 0.05, 0x1a1c2c, 0.18, 0.05, 0.33, head);
  box('antenna', 0.08, 0.3, 0.08, 0xffb547, 0, 0.45, 0, head);
  const limb = (name: string, x: number, y: number, len: number, c: number) => {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, y, 0); root.add(pivot);
    box(`${name}Mesh`, 0.28, len, 0.3, c, 0, -len / 2, 0, pivot); return pivot;
  };
  limb('armL', -0.66, 2.0, 0.85, 0x3a5bcc); limb('armR', 0.66, 2.0, 0.85, 0x3a5bcc);
  limb('legL', -0.25, 1.0, 1.0, 0x2a2f45); limb('legR', 0.25, 1.0, 1.0, 0x2a2f45);
  const swing = (name: string, amp: number, phase: number) => {
    const times = [0, 0.25, 0.5, 0.75, 1], values: number[] = [];
    for (const t of times) values.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin((t + phase) * Math.PI * 2) * amp, 0, 0)).toArray());
    return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
  };
  const walk = new THREE.AnimationClip('walk', 1, [swing('legL', 0.6, 0), swing('legR', 0.6, 0.5), swing('armL', 0.5, 0.5), swing('armR', 0.5, 0),
    new THREE.VectorKeyframeTrack('body.position', [0, 0.25, 0.5, 0.75, 1], [0, 1.55, 0, 0, 1.62, 0, 0, 1.55, 0, 0, 1.62, 0, 0, 1.55, 0])]);
  const idle = new THREE.AnimationClip('idle', 1.6, [new THREE.VectorKeyframeTrack('body.position', [0, 0.8, 1.6], [0, 1.55, 0, 0, 1.5, 0, 0, 1.55, 0]),
    swing('armL', 0.08, 0), swing('armR', 0.08, 0.5)]);
  return { root, clips: [idle, walk], name: 'robot' };
}

async function loadModel(file: File): Promise<Model> {
  const ext = file.name.split('.').pop()!.toLowerCase(), url = URL.createObjectURL(file), name = file.name.replace(/\.[^.]+$/, '');
  try {
    if (ext === 'glb' || ext === 'gltf') { const g = await new GLTFLoader().loadAsync(url); return { root: g.scene, clips: g.animations, name }; }
    if (ext === 'fbx') { const g = await new FBXLoader().loadAsync(url); return { root: g, clips: g.animations, name }; }
    if (ext === 'obj') { return { root: await new OBJLoader().loadAsync(url), clips: [], name }; }
    if (ext === 'vox') {
      const chunks = await new VOXLoader().loadAsync(url), group = new THREE.Group();
      for (const chunk of chunks) group.add(new VOXMesh(chunk));
      group.rotation.x = 0; return { root: group, clips: [], name };
    }
    throw new Error('支援 .glb、.gltf（單檔）、.fbx、.obj、.vox');
  } finally { URL.revokeObjectURL(url); }
}

interface RenderOptions { size: number; elevation: number; dirs: number; frames: number; clip: string; outline: boolean; outlineColor: string; colors: number; toon: boolean; light: number }

class ModelRenderer {
  private renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  private holder = new THREE.Group();
  private sun = new THREE.DirectionalLight(0xffffff, 2.2);
  private ambient = new THREE.HemisphereLight(0xffffff, 0x445066, 1.1);
  private read = document.createElement('canvas');

  constructor() {
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(this.holder, this.sun, this.ambient);
  }

  render(model: Model, o: RenderOptions): Clip[] {
    this.holder.clear();
    const root = model.root;
    this.holder.add(root);
    root.updateMatrixWorld(true);
    // Toon shading: swap each material for a MeshToonMaterial with the same colour/texture (restored after).
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    if (o.toon) root.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      originals.set(mesh, mesh.material);
      const toon = (m: THREE.Material) => new THREE.MeshToonMaterial({ color: (m as THREE.MeshStandardMaterial).color ?? 0xffffff, map: (m as THREE.MeshStandardMaterial).map ?? null, transparent: m.transparent, alphaTest: 0.5 });
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toon) : toon(mesh.material);
    });
    const mixer = new THREE.AnimationMixer(root);
    const clip = model.clips.find(c => c.name === o.clip) ?? null;
    if (clip) mixer.clipAction(clip).play();
    // Fit the camera to the model's bounds over the whole animation, so every frame and direction shares one scale.
    const box = new THREE.Box3();
    const samples = clip ? o.frames : 1;
    for (let i = 0; i < samples; i++) { if (clip) mixer.setTime((i / samples) * clip.duration); root.updateMatrixWorld(true); box.union(new THREE.Box3().setFromObject(root)); }
    const center = box.getCenter(new THREE.Vector3()), radius = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    const height = box.max.y - box.min.y, mid = height / 2;
    const elev = (o.elevation * Math.PI) / 180;
    this.camera.position.set(0, mid + Math.sin(elev) * radius * 4, Math.cos(elev) * radius * 4);
    this.camera.lookAt(0, mid, 0);
    this.camera.left = -radius; this.camera.right = radius; this.camera.top = radius; this.camera.bottom = -radius;
    this.camera.near = 0.01; this.camera.far = radius * 10;
    this.camera.updateProjectionMatrix();
    this.sun.position.set(radius * 2, radius * 4, radius * 3);
    this.sun.intensity = 2.2 * o.light; this.ambient.intensity = 1.1 * o.light;
    this.renderer.setSize(o.size, o.size, false);

    const clips: Clip[] = [];
    const animName = clip ? clip.name : 'static';
    for (const dir of directions(o.dirs)) {
      this.holder.rotation.y = (dir.yaw * Math.PI) / 180;
      const frames: Rgba[] = [];
      for (let i = 0; i < samples; i++) {
        if (clip) mixer.setTime((i / samples) * clip.duration);
        this.renderer.render(this.scene, this.camera);
        frames.push(this.capture(o.size));
      }
      clips.push({ name: `${safeName(animName)}_${dir.name}`, frames, durations: frames.map(() => clip ? Math.round((clip.duration * 1000) / samples) : 100), loop: true });
    }
    root.position.add(new THREE.Vector3(center.x, box.min.y, center.z));
    mixer.stopAllAction();
    for (const [mesh, m] of originals) mesh.material = m;
    this.holder.remove(root);
    // Shared crop across every frame of every direction, then outline and colour reduction.
    const all = cropShared(clips.flatMap(c => c.frames), o.outline ? 1 : 0);
    let k = 0;
    const palette = o.colors > 0 ? paletteOf(all, o.colors) : null;
    for (const c of clips) c.frames = c.frames.map(() => {
      let img = all[k++];
      if (palette) img = quantize(img, palette);
      if (o.outline) img = addOutline(img, o.outlineColor);
      return img;
    });
    return clips;
  }

  private capture(size: number): Rgba {
    this.read.width = size; this.read.height = size;
    const ctx = this.read.getContext('2d', { willReadFrequently: true })!;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(this.renderer.domElement, 0, 0);
    const data = new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer);
    // Hard alpha: pixel art has no half-transparent edge pixels.
    for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 110 ? 255 : 0;
    return { width: size, height: size, data };
  }
}

function paletteOf(frames: Rgba[], count: number): number[][] {
  const sample: number[][] = [];
  for (const f of frames) for (let i = 0; i < f.width * f.height; i += 3) if (f.data[i * 4 + 3]) sample.push([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]]);
  return sample.length ? medianCut(sample, count) : [];
}
function quantize(img: Rgba, palette: number[][]): Rgba {
  const data = new Uint8Array(img.data);
  for (let i = 0; i < img.width * img.height; i++) {
    if (!data[i * 4 + 3]) continue;
    let best = palette[0], bd = Infinity;
    for (const p of palette) { const d = (p[0] - data[i * 4]) ** 2 + (p[1] - data[i * 4 + 1]) ** 2 + (p[2] - data[i * 4 + 2]) ** 2; if (d < bd) { bd = d; best = p; } }
    data[i * 4] = best[0]; data[i * 4 + 1] = best[1]; data[i * 4 + 2] = best[2];
  }
  return { ...img, data };
}
function addOutline(img: Rgba, color: string): Rgba {
  const c = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const data = new Uint8Array(img.data), on = (x: number, y: number) => x >= 0 && y >= 0 && x < img.width && y < img.height && img.data[(y * img.width + x) * 4 + 3] > 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (on(x, y) || !(on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) continue;
    data.set([...c, 255], (y * img.width + x) * 4);
  }
  return { ...img, data };
}

// ---------- tool ----------
type Mode = 'rotate' | 'mirror' | 'model';

export function directionsTool(): HTMLElement {
  const preview = createPreview();
  const msg = h('div', { class: 'status' });
  const modeArea = h('div', {});
  let mode: Mode = 'rotate';
  let outScale = 1;

  // rotate state
  let rotFrames: Rgba[] | null = null, rotName = 'sprite', facing = 90, algorithm = 'cleanEdge', rotDirs = 8, stripCount = 1, frameMs = 100;
  // mirror state
  const slots: Record<string, Rgba[] | null> = { S: null, SE: null, E: null, NE: null, N: null };
  let mirrorName = 'walk', mirrorFacesRight = true;
  // model state
  let model: Model = sampleModel(), modelRenderer: ModelRenderer | null = null;
  const mo: RenderOptions = { size: 48, elevation: 30, dirs: 8, frames: 8, clip: 'walk', outline: true, outlineColor: '#14121c', colors: 16, toon: true, light: 1 };

  const run = () => {
    status(msg, '產生中…', 'busy');
    setTimeout(async () => {
      const t0 = performance.now();
      try {
        let name = 'sprite', clips: Clip[] = [];
        if (mode === 'rotate') {
          const frames = rotFrames ?? [sampleArrow()];
          name = rotName;
          const built = directions(rotDirs).map(d => ({ name: d.name, frames: frames.map(f => rotateSprite(f, screenTurn(facing, d.yaw), algorithm)) }));
          const cropped = cropShared(built.flatMap(b => b.frames));
          let k = 0;
          clips = built.map(b => ({ name: `${safeName(name)}_${b.name}`, frames: b.frames.map(() => cropped[k++]), durations: b.frames.map(() => frameMs), loop: true }));
        } else if (mode === 'mirror') {
          name = mirrorName;
          const flip = (dir: string) => (mirrorFacesRight ? dir : dir.replace('E', '#').replace('W', 'E').replace('#', 'W'));
          const have: Record<string, Rgba[]> = {};
          for (const [dir, frames] of Object.entries(slots)) if (frames) have[flip(dir)] = frames;
          for (const [a, b] of [['E', 'W'], ['SE', 'SW'], ['NE', 'NW'], ['W', 'E'], ['SW', 'SE'], ['NW', 'NE']]) if (have[a] && !have[b]) have[b] = have[a].map(mirror);
          const order = DIR8.filter(d => have[d]);
          if (!order.length) { status(msg, '請上傳至少一個方向的圖片（例如「下」和「右」）'); return; }
          const cropped = cropShared(order.flatMap(d => have[d]));
          let k = 0;
          clips = order.map(d => ({ name: `${safeName(name)}_${d}`, frames: have[d].map(() => cropped[k++]), durations: have[d].map(() => frameMs), loop: true }));
        } else {
          modelRenderer ??= new ModelRenderer();
          name = model.name;
          clips = modelRenderer.render(model, mo);
        }
        preview.show(safeName(name), clips.map(c => ({ ...c, frames: c.frames.map(f => scaleImage(f, outScale)) })));
        status(msg, `完成（${Math.round(performance.now() - t0)} ms）· ${clips.length} 個方向`);
      } catch (error) {
        status(msg, `錯誤：${(error as Error).message}`, 'error');
        console.error(error);
      }
    }, 10);
  };

  const fileField = (label: string, accept: string, onFile: (f: File) => void | Promise<void>, hint?: string) =>
    field(label, h('input', { type: 'file', accept, onchange: async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { await onFile(f); } } }), hint);

  const renderMode = () => {
    if (mode === 'rotate') {
      modeArea.replaceChildren(
        h('p', { class: 'muted' }, '適合俯視角遊戲（飛船、車輛、坦克、俯視角色）：上傳一張朝向固定的圖，用像素畫專用的旋轉演算法轉出每個方向，不會糊掉。'),
        fileField('上傳圖片（PNG / GIF / 橫排動畫）', 'image/*', async f => { rotFrames = (await decodeFrames(f, stripCount)).map(trimImage); rotName = f.name.replace(/\.[^.]+$/, ''); run(); }),
        field('橫排動畫的幀數', numberInput(stripCount, 1, 64, 1, v => { stripCount = v; }), '上傳前設定；PNG 會切成這麼多欄。GIF 自動拆幀'),
        field('原圖朝向', select(FACING, String(facing), v => { facing = Number(v); run(); })),
        field('旋轉演算法', select(ALGORITHMS, algorithm, v => { algorithm = v; run(); }), 'Pixelorama 的像素畫旋轉 shader'),
        field('方向數', select([['4', '4 方向'], ['8', '8 方向'], ['16', '16 方向']], String(rotDirs), v => { rotDirs = Number(v); run(); })),
        field('每幀毫秒', numberInput(frameMs, 16, 1000, 1, v => { frameMs = v; run(); })));
    } else if (mode === 'mirror') {
      const slotField = (dir: string) => fileField(`${DIR_LABEL[dir]}（${dir}）`, 'image/*', async f => { slots[dir] = await decodeFrames(f, stripCount); run(); }, slots[dir] ? `已載入 ${slots[dir]!.length} 幀` : undefined);
      modeArea.replaceChildren(
        h('p', { class: 'muted' }, '適合側視 / 斜角角色：畫好 下、右下、右、右上、上 五個方向（或 下、右、上 三個），左邊的方向自動鏡像補齊，輸出完整 8 方向。'),
        field('動畫名稱', h('input', { type: 'text', value: mirrorName, onchange: e => { mirrorName = (e.target as HTMLInputElement).value || 'walk'; run(); } })),
        field('每張圖的幀數（橫排動畫）', numberInput(stripCount, 1, 64, 1, v => { stripCount = v; }), '上傳前設定。GIF 會自動拆幀'),
        field('上傳的圖朝向', select([['true', '右側（E / SE / NE）'], ['false', '左側（W / SW / NW）']], String(mirrorFacesRight), v => { mirrorFacesRight = v === 'true'; renderMode(); run(); })),
        ...['S', 'SE', 'E', 'NE', 'N'].map(slotField),
        field('每幀毫秒', numberInput(frameMs, 16, 1000, 1, v => { frameMs = v; run(); })));
    } else {
      const clipOptions: [string, string][] = [['static', '（靜態）'], ...model.clips.map(c => [c.name, `${c.name}（${c.duration.toFixed(2)} 秒）`] as [string, string])];
      modeArea.replaceChildren(
        h('p', { class: 'muted' }, '上傳 3D 模型，自動從 4 / 8 / 16 個方向算成像素 sprite（含模型裡的動畫）。Mixamo 的 FBX、Blender 匯出的 GLB、MagicaVoxel 的 VOX 都可以。沒上傳時用內建的機器人範例。'),
        fileField('上傳 3D 模型', '.glb,.gltf,.fbx,.obj,.vox', async f => {
          status(msg, '讀取模型中…', 'busy');
          try { model = await loadModel(f); mo.clip = model.clips[0]?.name ?? 'static'; renderMode(); run(); }
          catch (error) { status(msg, `模型讀取失敗：${(error as Error).message}`, 'error'); }
        }, '.gltf 需要是單一檔案（貼圖內嵌）；有外部貼圖請用 .glb'),
        field('動畫', select(clipOptions, mo.clip, v => { mo.clip = v; run(); })),
        field('輸出大小', select(['24', '32', '48', '64', '96', '128'].map(n => [n, `${n}×${n} px`]), String(mo.size), v => { mo.size = Number(v); run(); })),
        field('鏡頭俯角', select([['0', '0°（正側面）'], ['20', '20°'], ['30', '30°（RPG 常見）'], ['45', '45°'], ['60', '60°'], ['89', '90°（正上方）']], String(mo.elevation), v => { mo.elevation = Number(v); run(); })),
        field('方向數', select([['4', '4 方向'], ['8', '8 方向'], ['16', '16 方向']], String(mo.dirs), v => { mo.dirs = Number(v); run(); })),
        field('每個動畫的幀數', numberInput(mo.frames, 1, 48, 1, v => { mo.frames = v; run(); })),
        field('卡通著色', select([['true', '開'], ['false', '關']], String(mo.toon), v => { mo.toon = v === 'true'; run(); })),
        field('顏色數（0＝不限制）', numberInput(mo.colors, 0, 64, 1, v => { mo.colors = v; run(); })),
        field('外框', select([['true', '開'], ['false', '關']], String(mo.outline), v => { mo.outline = v === 'true'; run(); })),
        field('外框顏色', h('input', { type: 'color', value: mo.outlineColor, onchange: e => { mo.outlineColor = (e.target as HTMLInputElement).value; run(); } })),
        field('亮度', numberInput(mo.light, 0.2, 3, 0.1, v => { mo.light = v; run(); })));
    }
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '8 方向 Sprite Sheet'),
    field('來源', select([['rotate', '旋轉一張圖（俯視角）'], ['mirror', '畫好的方向 + 鏡像補齊'], ['model', '3D 模型 → 8 方向']], mode, v => { mode = v as Mode; renderMode(); run(); })),
    modeArea,
    field('輸出放大倍率', numberInput(outScale, 1, 6, 1, v => { outScale = v; run(); })),
    h('details', {}, h('summary', {}, '只有一張側面圖，想要真正的背面 / 側面？'),
      h('p', { class: 'muted' }, '從一張 2D 圖「想像」出看不到的那一面需要 AI。可以先用開源的 image-to-3D 模型（例如 TRELLIS，MIT 授權）把圖轉成 3D 模型（.glb），再用上面的「3D 模型 → 8 方向」轉成 sprite。這類模型需要 GPU，無法在瀏覽器裡執行。')),
    msg);

  renderMode();
  run();
  return h('div', { class: 'tool' }, sidebar, preview.root);
}

/** Clockwise screen rotation that turns a sprite facing `facing` (deg, 0 = S, 90 = E, 180 = N, 270 = W) to a direction with `yaw`. */
function screenTurn(facing: number, yaw: number): number {
  // Directions list yaw counter-clockwise on screen from S (S=0, SE=45, E=90 ...); `facing` uses the same convention.
  return facing - yaw;
}

/** A small arrow pointing right, shown before an upload. */
function sampleArrow(): Rgba {
  const rows = [
    '......11.......',
    '......121......',
    '......1221.....',
    '11111112221....',
    '1222222222221..',
    '12333333333321.',
    '1222222222221..',
    '11111112221....',
    '......1221.....',
    '......121......',
    '......11.......',
  ];
  const colors: Record<string, number[]> = { '1': [26, 28, 44], '2': [79, 124, 255], '3': [143, 233, 255] };
  const w = rows[0].length, hh = rows.length, data = new Uint8Array(w * hh * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = colors[ch]; if (c) data.set([...c, 255], (y * w + x) * 4); }));
  return { width: w, height: hh, data };
}

