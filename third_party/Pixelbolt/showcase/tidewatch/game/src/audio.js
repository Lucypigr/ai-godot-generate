// Tiny synthesized sound effects (no audio files). Silent until the player enables sound.
export class Sound {
  constructor() { this.ctx = null; this.enabled = false; this.surf = null; }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && !this.ctx) this.ctx = new AudioContext();
    if (this.ctx) this.enabled ? this.ctx.resume() : this.ctx.suspend();
    if (this.enabled) this.startSurf();
    return this.enabled;
  }
  tone(freq, duration, { type = 'square', gain = 0.06, slide = 0, delay = 0 } = {}) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + duration);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + duration + 0.02);
  }
  noise(duration, { gain = 0.08, filter = 1800, delay = 0 } = {}) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + delay, length = Math.ceil(this.ctx.sampleRate * duration), buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = buffer; f.type = 'bandpass'; f.frequency.value = filter; g.gain.value = gain;
    src.connect(f).connect(g).connect(this.ctx.destination); src.start(t);
  }
  startSurf() {
    if (this.surf || !this.ctx) return;
    const length = this.ctx.sampleRate * 4, buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(i / length * Math.PI * 2));
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = buffer; src.loop = true; f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.035;
    src.connect(f).connect(g).connect(this.ctx.destination); src.start(); this.surf = src;
  }
  swing() { this.noise(0.09, { gain: 0.07, filter: 2600 }); }
  hit() { this.tone(180, 0.08, { type: 'square', gain: 0.07, slide: -90 }); this.noise(0.05, { gain: 0.06, filter: 900 }); }
  cut() { this.noise(0.12, { gain: 0.06, filter: 3800 }); }
  smash() { this.noise(0.18, { gain: 0.09, filter: 1400 }); this.tone(320, 0.06, { type: 'triangle', gain: 0.05, delay: 0.02 }); }
  pickup() { this.tone(880, 0.07, { type: 'square', gain: 0.04 }); this.tone(1320, 0.09, { type: 'square', gain: 0.04, delay: 0.06 }); }
  heart() { this.tone(660, 0.08, { type: 'triangle', gain: 0.06 }); this.tone(990, 0.1, { type: 'triangle', gain: 0.06, delay: 0.07 }); }
  hurt() { this.tone(220, 0.16, { type: 'sawtooth', gain: 0.06, slide: -140 }); }
  blip() { this.tone(520 + Math.random() * 60, 0.03, { type: 'square', gain: 0.025 }); }
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'square', gain: 0.045, delay: i * 0.11 })); }
  ignite() { this.noise(0.6, { gain: 0.08, filter: 700 }); [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', gain: 0.05, delay: 0.3 + i * 0.12 })); }
  splash() { this.noise(0.25, { gain: 0.06, filter: 1100 }); }
}
