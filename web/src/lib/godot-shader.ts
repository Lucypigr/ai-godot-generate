// Runs Godot canvas_item shaders in the browser. Converts the Godot shading language to GLSL ES 3.00
// (WebGL 2) and reads ShaderMaterial parameters and ColorRect layout out of .tscn / .tres files, so the
// Deep-Fold generators (PixelPlanets, PixelSpace) run from their original, unmodified sources.
import type { Rgba } from './image';

export type Value = number | boolean | number[] | number[][] | string | { ext: string } | { sub: string } | null;

export interface Uniform { name: string; type: string; array: number; value: Value; hint?: string }

export interface ConvertedShader { glsl: string; uniforms: Uniform[] }

/** Parses a Godot literal: numbers, bools, Color(), Vector2(), Packed/PoolColorArray(), Ext/SubResource(). */
export function parseValue(raw: string): Value {
  const v = raw.trim();
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^-?\d/.test(v) || /^-?\.\d/.test(v)) return Number(v);
  if (v.startsWith('"')) return JSON.parse(v);
  const call = v.match(/^([A-Za-z0-9_]+)\s*\((.*)\)$/s);
  if (!call) return null;
  const [, fn, body] = call;
  if (fn === 'ExtResource') return { ext: body.replace(/["\s]/g, '') };
  if (fn === 'SubResource') return { sub: body.replace(/["\s]/g, '') };
  const nums = body.split(',').map(s => s.trim()).filter(Boolean).map(Number);
  if (/ColorArray$/.test(fn)) {
    const out: number[][] = [];
    for (let i = 0; i + 3 < nums.length; i += 4) out.push(nums.slice(i, i + 4));
    return out;
  }
  if (fn === 'vec2' || fn === 'Vector2') return nums.length === 1 ? [nums[0], nums[0]] : nums;
  if (fn === 'vec3' || fn === 'Vector3') return nums.length === 1 ? [nums[0], nums[0], nums[0]] : nums;
  if (fn === 'vec4' || fn === 'Color') return nums.length === 3 ? [...nums, 1] : nums;
  return nums;
}

export function convertShader(source: string, include?: (path: string) => string | undefined): ConvertedShader {
  const uniforms: Uniform[] = [];
  let src = source.replace(/^\s*#include\s+"([^"]+)"\s*$/gm, (_m, path: string) => {
    const text = include?.(path);
    if (text === undefined) throw new Error(`找不到 #include ${path}`);
    return text;
  });
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  src = src.replace(/\bshader_type\s+\w+\s*;/, '').replace(/\brender_mode\s+[^;]*;/, '');
  src = src.replace(/uniform\s+(\w+)(?:\s*\[(\d+)\])?\s+(\w+)(?:\s*\[(\d+)\])?\s*(?::\s*[^=;]+)?(?:=\s*([^;]+))?;/g,
    (m: string, type: string, arrA: string | undefined, name: string, arrB: string | undefined, def: string | undefined) => {
      const array = Number(arrA ?? arrB ?? 0);
      const hint = m.match(/:\s*([^=;]+)/)?.[1]?.trim();
      uniforms.push({ name, type, array, value: def === undefined ? null : parseValue(def), hint });
      return array ? `uniform ${type} ${name}[${array}];` : `uniform ${type} ${name};`;
    });
  src = promoteIntLiterals(src);
  src = src.replace(/void\s+fragment\s*\(\s*\)/, 'void main()')
    .replace(/\bUV\b/g, 'v_uv').replace(/\bCOLOR\b/g, 'fragColor').replace(/\bTIME\b/g, 'u_godot_time')
    .replace(/\bTEXTURE_PIXEL_SIZE\b/g, 'u_texture_pixel_size').replace(/\bTEXTURE\b/g, 'u_texture');
  // The canvas item's own texture (TEXTURE) and its texel size; renderers bind them from textures.TEXTURE.
  uniforms.push({ name: 'u_texture', type: 'sampler2D', array: 0, value: null, hint: 'filter_nearest' });
  uniforms.push({ name: 'u_texture_pixel_size', type: 'vec2', array: 0, value: null });
  const header = 'uniform float u_godot_time;\nuniform sampler2D u_texture;\nuniform vec2 u_texture_pixel_size;\n';
  const glsl = `#version 300 es\nprecision highp float;\nprecision highp int;\nin vec2 v_uv;\nout vec4 fragColor;\n${header}${src}`;
  return { glsl, uniforms };
}

/**
 * Godot converts an integer literal passed to a float parameter of a user function (Cells(p, 10));
 * GLSL ES does not, so write those literals as floats.
 */
function promoteIntLiterals(src: string): string {
  const floatParams = new Map<string, boolean[]>();
  for (const m of src.matchAll(/\b(?:float|int|bool|void|vec[234]|ivec[234]|mat[234])\s+(\w+)\s*\(([^)]*)\)\s*\{/g)) {
    const params = m[2].split(',').map(p => p.trim()).filter(Boolean);
    floatParams.set(m[1], params.map(p => /\b(float|vec[234])\s+\w+$/.test(p.replace(/\b(in|out|inout|const|highp|mediump|lowp)\s+/g, ''))));
  }
  if (!floatParams.size) return src;
  const names = [...floatParams.keys()].join('|');
  const call = new RegExp(`\\b(${names})\\s*\\(`, 'g');
  let out = '', last = 0;
  for (let m = call.exec(src); m; m = call.exec(src)) {
    // Skip the definition itself (preceded by a return type).
    if (/\b(?:float|int|bool|void|vec[234]|ivec[234]|mat[234])\s+$/.test(src.slice(Math.max(0, m.index - 12), m.index))) continue;
    const open = m.index + m[0].length;
    let depth = 1, i = open;
    const args: string[] = [];
    let start = open;
    for (; i < src.length && depth; i++) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (!depth) args.push(src.slice(start, i)); }
      else if (ch === ',' && depth === 1) { args.push(src.slice(start, i)); start = i + 1; }
    }
    const kinds = floatParams.get(m[1])!;
    const fixed = args.map((a, k) => (kinds[k] && /^\s*-?\d+\s*$/.test(a) ? a.replace(/(\d+)/, '$1.0') : a));
    out += src.slice(last, open) + fixed.join(',') + ')';
    last = i;
    call.lastIndex = i;
  }
  return out + src.slice(last);
}

// ---------- .tscn / .tres parsing ----------

export interface Section { kind: string; attrs: Record<string, string>; props: Record<string, Value> }

export function parseResourceFile(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const header = line.match(/^\[(\w+)(.*)\]\s*$/);
    if (header) {
      const attrs: Record<string, string> = {};
      for (const m of header[2].matchAll(/(\w+)=("([^"]*)"|[^\s\]]+)/g)) attrs[m[1]] = m[3] ?? m[2];
      current = { kind: header[1], attrs, props: {} };
      sections.push(current);
      continue;
    }
    const kv = line.match(/^([\w/]+)\s*=\s*(.*)$/);
    if (!kv || !current) continue;
    let value = kv[2];
    if (value.startsWith('"')) {
      // A string may span several lines; it ends at an unescaped quote.
      const quotes = (s: string) => (s.match(/(?<!\\)"/g) ?? []).length;
      while (quotes(value) < 2 && i + 1 < lines.length) value += '\n' + lines[++i];
    } else {
      let depth = (value.match(/\(/g) ?? []).length - (value.match(/\)/g) ?? []).length;
      while (depth > 0 && i + 1 < lines.length) { const next = lines[++i]; value += ' ' + next; depth += (next.match(/\(/g) ?? []).length - (next.match(/\)/g) ?? []).length; }
    }
    current.props[kv[1]] = value.startsWith('"') ? value.slice(1, value.lastIndexOf('"')).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\') : parseValue(value);
  }
  return sections;
}

export interface MaterialDef { shader: string; params: Record<string, Value> }

/** Shader parameters of a ShaderMaterial section (Godot 4 shader_parameter/ or Godot 3 shader_param/). */
export function materialParams(section: Section): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [key, value] of Object.entries(section.props)) {
    const m = key.match(/^shader_param(?:eter)?\/(.+)$/);
    if (m) out[m[1]] = value;
  }
  return out;
}

export interface SceneLayer { name: string; shader: string; params: Record<string, Value>; rect: [number, number, number, number] }

/**
 * Reads a scene made of ColorRects with ShaderMaterials. `shaderFile(resPath)` returns the source of an
 * external shader (res://...).
 */
export function readShaderScene(text: string, shaderFile: (path: string) => string | undefined): SceneLayer[] {
  const sections = parseResourceFile(text);
  const ext = new Map(sections.filter(s => s.kind === 'ext_resource').map(s => [s.attrs.id, s.attrs.path]));
  const subs = new Map(sections.filter(s => s.kind === 'sub_resource').map(s => [s.attrs.id, s]));
  const shaderOf = (ref: Value): string | undefined => {
    if (ref && typeof ref === 'object' && 'ext' in ref) return shaderFile(ext.get(ref.ext) ?? '');
    if (ref && typeof ref === 'object' && 'sub' in ref) { const code = subs.get(ref.sub)?.props.code; return typeof code === 'string' ? code : undefined; }
    return undefined;
  };
  const layers: SceneLayer[] = [];
  for (const node of sections.filter(s => s.kind === 'node' && s.attrs.type === 'ColorRect')) {
    const ref = node.props.material;
    if (!ref || typeof ref !== 'object' || !('sub' in ref)) continue;
    const mat = subs.get(ref.sub);
    if (!mat) continue;
    const shader = shaderOf(mat.props.shader);
    if (!shader) continue;
    const n = (k: string, d: number) => (typeof node.props[k] === 'number' ? node.props[k] as number : d);
    const left = n('offset_left', 0), top = n('offset_top', 0);
    let right = n('offset_right', 0), bottom = n('offset_bottom', 0);
    if (right <= left) right = left + 100;
    if (bottom <= top) bottom = top + 100;
    layers.push({ name: node.attrs.name, shader, params: materialParams(mat), rect: [left, top, right - left, bottom - top] });
  }
  return layers;
}

// ---------- WebGL 2 renderer ----------

const VERTEX = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() { v_uv = vec2((a_pos.x + 1.0) * 0.5, (1.0 - a_pos.y) * 0.5); gl_Position = vec4(a_pos, 0.0, 1.0); }`;

interface Program { program: WebGLProgram; uniforms: Uniform[]; locations: Map<string, WebGLUniformLocation | null> }

export interface DrawLayer {
  shader: string;
  /** x, y, width, height in output pixels (top-left origin) */
  rect: [number, number, number, number];
  params: Record<string, Value>;
  textures?: Record<string, Rgba>;
}

export class ShaderRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private programs = new Map<string, Program>();
  private textureCache = new Map<Rgba, Map<boolean, WebGLTexture>>();

  /** `include` resolves #include paths (res://...). */
  constructor(private include?: (path: string) => string | undefined) {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true });
    if (!gl) throw new Error('這個瀏覽器不支援 WebGL 2');
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  }

  private program(source: string): Program {
    const cached = this.programs.get(source);
    if (cached) return cached;
    const gl = this.gl;
    const { glsl, uniforms } = convertShader(source, this.include);
    const compile = (type: number, text: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, text);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader 編譯失敗：${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, glsl));
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Shader 連結失敗：${gl.getProgramInfoLog(program)}`);
    const locations = new Map<string, WebGLUniformLocation | null>();
    for (const u of uniforms) locations.set(u.name, gl.getUniformLocation(program, u.array ? `${u.name}[0]` : u.name));
    const p = { program, uniforms, locations };
    this.programs.set(source, p);
    return p;
  }

  /** Uniforms declared by a shader, with their defaults. */
  uniformsOf(source: string): Uniform[] { return convertShader(source, this.include).uniforms; }

  private texture(image: Rgba, nearest = false): WebGLTexture {
    const gl = this.gl;
    let byFilter = this.textureCache.get(image);
    if (!byFilter) { byFilter = new Map(); this.textureCache.set(image, byFilter); }
    let tex = byFilter.get(nearest);
    if (tex) return tex;
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    byFilter.set(nearest, tex);
    return tex;
  }

  render(width: number, height: number, layers: DrawLayer[], background: [number, number, number, number] = [0, 0, 0, 0]): Rgba {
    const gl = this.gl;
    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(...background);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const layer of layers) {
      const { program, uniforms, locations } = this.program(layer.shader);
      gl.useProgram(program);
      let unit = 0;
      for (const u of uniforms) {
        const loc = locations.get(u.name);
        if (!loc) continue;
        const own = layer.textures?.TEXTURE;
        if (u.name === 'u_texture_pixel_size') { if (own) gl.uniform2f(loc, 1 / own.width, 1 / own.height); continue; }
        const v = layer.params[u.name] ?? u.value;
        if (u.type === 'sampler2D') {
          const img = u.name === 'u_texture' ? own : layer.textures?.[u.name];
          if (!img) continue;
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, this.texture(img, /filter_nearest/.test(u.hint ?? '')));
          gl.uniform1i(loc, unit++);
          continue;
        }
        if (v === null || v === undefined) continue;
        setUniform(gl, loc, u, v);
      }
      const [x, y, w, h] = layer.rect;
      gl.viewport(x, height - y - h, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    const flipped = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, flipped);
    const data = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row++) data.set(flipped.subarray((height - 1 - row) * width * 4, (height - row) * width * 4), row * width * 4);
    return { width, height, data };
  }
}

function setUniform(gl: WebGL2RenderingContext, loc: WebGLUniformLocation, u: Uniform, v: Value): void {
  const flat = (x: Value): number[] => (Array.isArray(x) ? (x as (number | number[])[]).flat() as number[] : [Number(x)]);
  switch (u.type) {
    case 'float': gl.uniform1f(loc, Number(v)); break;
    case 'int': gl.uniform1i(loc, Math.round(Number(v))); break;
    case 'bool': gl.uniform1i(loc, v ? 1 : 0); break;
    case 'vec2': gl.uniform2fv(loc, flat(v)); break;
    case 'vec3': gl.uniform3fv(loc, flat(v).slice(0, 3)); break;
    case 'mat2': gl.uniformMatrix2fv(loc, false, flat(v).slice(0, 4)); break;
    case 'vec4': {
      const values = u.array ? padColors(v, u.array) : flat(v);
      gl.uniform4fv(loc, values);
      break;
    }
    default: break;
  }
}

function padColors(v: Value, count: number): number[] {
  const list = (Array.isArray(v) ? v : []) as number[][];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(...(list[i] ?? list[list.length - 1] ?? [0, 0, 0, 1]));
  return out;
}

/** Bakes a Godot Gradient (offsets + colors) into a 256×1 RGBA image, interpolating linearly. */
export function bakeGradient(offsets: number[], colors: number[][], size = 256): Rgba {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    let k = 0;
    while (k < offsets.length - 1 && offsets[k + 1] < t) k++;
    const a = colors[k], b = colors[Math.min(k + 1, colors.length - 1)];
    const span = (offsets[k + 1] ?? offsets[k]) - offsets[k];
    const f = span > 0 ? Math.min(1, Math.max(0, (t - offsets[k]) / span)) : 0;
    for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(((a[c] ?? 1) + ((b[c] ?? 1) - (a[c] ?? 1)) * (t <= offsets[0] ? 0 : f)) * 255);
  }
  return { width: size, height: 1, data };
}
