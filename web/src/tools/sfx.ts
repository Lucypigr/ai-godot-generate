// Sound effect workshop: jsfxr (sfxr port, public domain / Unlicense). Presets roll a new random sound
// for a typical game event; every parameter is a slider; sounds export as WAV, which Godot imports directly.
import '@third/jsfxr/riffwave.js';
import '@third/jsfxr/sfxr.js';
import { h, field, select, status } from '../lib/ui';
import { download, downloadZip, safeName } from '../lib/image';

type Params = Record<string, number | boolean> & { wave_type: number };
interface JsfxrLib {
  sfxr: { generate: (alg: string, opts?: Record<string, number>) => Params; toWave: (p: Params) => Wave };
  Params: new () => ParamsObject;
  parameters: { order: string[]; signed: string[] };
  convert: { units: Record<string, (v: number) => string>; sliders: Record<string, (v: number) => number> };
}
interface ParamsObject { fromJSON: (o: object) => ParamsObject & Params; mutate: () => Params }
interface Wave { wav: number[]; buffer: number[]; header: { sampleRate: number }; clipping: number; getAudio: () => { play: () => void } }

const lib = (globalThis as unknown as { jsfxr: JsfxrLib }).jsfxr;

const PRESETS: [string, string][] = [
  ['pickupCoin', '金幣 / 拾取'], ['laserShoot', '雷射 / 射擊'], ['explosion', '爆炸'], ['powerUp', '強化 / 升級'],
  ['hitHurt', '受傷 / 擊中'], ['jump', '跳躍'], ['blipSelect', '選單 / 按鈕'], ['synth', '合成音'], ['tone', '純音'],
  ['click', '點擊'], ['random', '完全隨機'],
];
const WAVES: [string, string][] = [['0', '方波 Square'], ['1', '鋸齒波 Sawtooth'], ['2', '正弦波 Sine'], ['3', '雜訊 Noise']];
const LABELS: Record<string, string> = {
  p_env_attack: '起音 Attack', p_env_sustain: '持續 Sustain', p_env_punch: '衝擊 Punch', p_env_decay: '衰減 Decay',
  p_base_freq: '起始頻率', p_freq_limit: '最低頻率', p_freq_ramp: '滑音 Slide', p_freq_dramp: '滑音加速',
  p_vib_strength: '顫音深度', p_vib_speed: '顫音速度', p_arp_mod: '琶音音程', p_arp_speed: '琶音速度',
  p_duty: '方波占空比', p_duty_ramp: '占空比掃動', p_repeat_speed: '重複速度', p_pha_offset: '鑲邊偏移', p_pha_ramp: '鑲邊掃動',
  p_lpf_freq: '低通截止', p_lpf_ramp: '低通掃動', p_lpf_resonance: '低通共振', p_hpf_freq: '高通截止', p_hpf_ramp: '高通掃動',
};
const GROUPS: [string, string[]][] = [
  ['音量包絡', ['p_env_attack', 'p_env_sustain', 'p_env_punch', 'p_env_decay']],
  ['頻率', ['p_base_freq', 'p_freq_limit', 'p_freq_ramp', 'p_freq_dramp']],
  ['顫音 / 琶音', ['p_vib_strength', 'p_vib_speed', 'p_arp_mod', 'p_arp_speed']],
  ['音色', ['p_duty', 'p_duty_ramp', 'p_repeat_speed', 'p_pha_offset', 'p_pha_ramp']],
  ['濾波器', ['p_lpf_freq', 'p_lpf_ramp', 'p_lpf_resonance', 'p_hpf_freq', 'p_hpf_ramp']],
];

interface Saved { name: string; params: Params }

export function sfxTool(): HTMLElement {
  const msg = h('div', { class: 'status' });
  const sliders = h('div', { class: 'sfx-sliders' });
  const wave = h('canvas', { class: 'waveform', width: 900, height: 160 });
  const bankList = h('div', { class: 'sfx-bank' });
  let params: Params = lib.sfxr.generate('pickupCoin');
  let name = 'pickup_coin';
  let sampleRate = 44100, sampleSize = 16, autoplay = true;
  const bank: Saved[] = [];
  let lastWave: Wave | null = null;

  const render = (): Wave => {
    const p = new lib.Params().fromJSON({ ...params, sample_rate: sampleRate, sample_size: sampleSize });
    return lib.sfxr.toWave(p);
  };

  const drawWave = (w: Wave) => {
    const ctx = wave.getContext('2d')!;
    const { width, height } = wave;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#2f3345';
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    ctx.strokeStyle = '#ffb547';
    ctx.beginPath();
    const data = w.buffer, step = Math.max(1, Math.floor(data.length / width));
    for (let x = 0; x < width; x++) {
      let min = 1, max = -1;
      for (let i = x * step; i < Math.min(data.length, (x + 1) * step); i++) { min = Math.min(min, data[i]); max = Math.max(max, data[i]); }
      ctx.moveTo(x + 0.5, (1 - max) * height / 2);
      ctx.lineTo(x + 0.5, (1 - min) * height / 2 + 1);
    }
    ctx.stroke();
  };

  const update = (play = autoplay) => {
    try {
      lastWave = render();
      drawWave(lastWave);
      const seconds = lastWave.buffer.length / lastWave.header.sampleRate;
      status(msg, `${seconds.toFixed(2)} 秒 · ${sampleRate} Hz · ${sampleSize}-bit${lastWave.clipping ? ` · 削波 ${lastWave.clipping} 個樣本（請調低音量）` : ''}`);
      if (play) lastWave.getAudio().play();
    } catch (error) {
      status(msg, `錯誤：${(error as Error).message}`, 'error');
    }
  };

  const buildSliders = () => {
    const signed = new Set(lib.parameters.signed);
    sliders.replaceChildren(
      field('波形', select(WAVES, String(params.wave_type), v => { params.wave_type = Number(v); update(); })),
      field('音量', slider('sound_vol', 0, 1, false)),
      ...GROUPS.map(([title, keys]) => h('fieldset', { class: 'sfx-group' }, h('legend', {}, title),
        ...keys.map(key => field(LABELS[key] ?? key, slider(key, signed.has(key) ? -1 : 0, 1, true))))));
  };

  function slider(key: string, min: number, max: number, unit: boolean): HTMLElement {
    const value = Number(params[key] ?? 0);
    const out = h('output', {}, unit ? fmt(key, value) : value.toFixed(2));
    const input = h('input', { type: 'range', min, max, step: 0.001, value,
      oninput: e => { const v = Number((e.target as HTMLInputElement).value); params[key] = v; out.textContent = unit ? fmt(key, v) : v.toFixed(2); },
      onchange: () => update() });
    return h('span', { class: 'range' }, input, out);
  }
  function fmt(key: string, v: number): string {
    try {
      const real = lib.convert.sliders[key] ? lib.convert.sliders[key](v) : v;
      return lib.convert.units[key]?.(real) ?? v.toFixed(3);
    } catch { return v.toFixed(3); }
  }

  const preset = (alg: string, label: string) => {
    params = lib.sfxr.generate(alg, { sound_vol: Number(params.sound_vol ?? 0.25) });
    name = safeName(`${alg}_${bank.length + 1}`);
    nameInput.value = name;
    buildSliders();
    update();
    status(msg, `${label}：已產生新的隨機音效`);
  };

  const renderBank = () => {
    bankList.replaceChildren(...(bank.length ? bank.map((s, i) => h('div', { class: 'sfx-item' },
      h('button', { class: 'secondary', onclick: () => { params = { ...s.params }; name = s.name; nameInput.value = name; buildSliders(); update(); } }, `▶ ${s.name}`),
      h('button', { class: 'icon', title: '移除', onclick: () => { bank.splice(i, 1); renderBank(); } }, '×'))) : [h('p', { class: 'muted' }, '按「加入音效庫」把喜歡的音效存起來，最後一次全部匯出。')]));
  };

  const nameInput = h('input', { type: 'text', value: name, onchange: e => { name = safeName((e.target as HTMLInputElement).value); } });
  const wavBytes = (p: Params) => new Uint8Array(lib.sfxr.toWave(new lib.Params().fromJSON({ ...p, sample_rate: sampleRate, sample_size: sampleSize })).wav);

  const sidebar = h('aside', { class: 'sidebar' },
    h('h2', {}, '音效產生器'),
    h('p', { class: 'muted' }, '選一種遊戲事件，隨機產生 8-bit 音效，再用滑桿微調。匯出 WAV，Godot 可直接匯入成 AudioStreamWAV。引擎：jsfxr（Unlicense，公有領域）。'),
    h('div', { class: 'preset-grid' }, ...PRESETS.map(([alg, label]) => h('button', { class: 'secondary', onclick: () => preset(alg, label) }, label))),
    h('div', { class: 'export-bar' },
      h('button', { class: 'secondary', onclick: () => { params = new lib.Params().fromJSON(params).mutate(); buildSliders(); update(); } }, '🎲 微調變化'),
      h('button', { class: 'secondary', onclick: () => update(true) }, '▶ 再播一次')),
    field('名稱', nameInput),
    field('取樣率', select([['44100', '44100 Hz'], ['22050', '22050 Hz'], ['11025', '11025 Hz']], '44100', v => { sampleRate = Number(v); update(false); })),
    field('位元深度', select([['16', '16-bit'], ['8', '8-bit']], '16', v => { sampleSize = Number(v); update(false); })),
    field('調整時自動播放', select([['true', '是'], ['false', '否']], 'true', v => { autoplay = v === 'true'; })),
    h('div', { class: 'export-bar column' },
      h('button', { onclick: () => download(`${name}.wav`, wavBytes(params), 'audio/wav') }, '⬇ 下載 WAV'),
      h('button', { class: 'secondary', onclick: () => { bank.push({ name, params: { ...params } }); renderBank(); } }, '＋ 加入音效庫'),
      h('button', { class: 'secondary', onclick: () => download(`${name}.sfxr.json`, JSON.stringify(params, null, 2), 'application/json') }, '參數 JSON（之後可再編輯）'),
      h('label', { class: 'secondary file-button' }, '載入參數 JSON', h('input', { type: 'file', accept: '.json,application/json', onchange: async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try { params = new lib.Params().fromJSON(JSON.parse(await file.text())); name = safeName(file.name.replace(/(\.sfxr)?\.json$/, '')); nameInput.value = name; buildSliders(); update(); }
        catch (error) { status(msg, `JSON 錯誤：${(error as Error).message}`, 'error'); }
      } }))),
    msg);

  const main = h('section', { class: 'preview' },
    h('figure', {}, h('figcaption', {}, '波形'), h('div', { class: 'wave-wrap' }, wave)),
    sliders,
    h('h3', {}, '音效庫'), bankList,
    h('button', { onclick: () => {
      if (!bank.length) return;
      const files: Record<string, Uint8Array | string> = {};
      for (const s of bank) { files[`${s.name}.wav`] = wavBytes(s.params); files[`${s.name}.sfxr.json`] = JSON.stringify(s.params, null, 2); }
      downloadZip('sfx_bank.zip', files);
    } }, '⬇ 匯出整個音效庫 ZIP'));

  buildSliders();
  renderBank();
  update(false);
  return h('div', { class: 'tool' }, sidebar, main);
}
