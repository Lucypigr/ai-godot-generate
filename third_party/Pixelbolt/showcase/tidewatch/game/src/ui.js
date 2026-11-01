// Text and HUD drawn straight onto the output canvas after lighting, so the interface is never darkened.
// Each glyph frame in the font atlas carries an `advance` point: where the next glyph starts.
export class UI {
  constructor(ctx, atlases, fontMap) {
    this.g = ctx; this.font = atlases.font; this.ui = atlases.ui; this.box = atlases.dialog; this.map = fontMap;
    this.widths = new Map(Object.entries(this.font.frames).map(([name, frame]) => [name, frame.points.advance.x])); this.tinted = new Map();
  }
  tint(color) {
    if (!this.tinted.has(color)) {
      const c = document.createElement('canvas'); c.width = this.font.color.width; c.height = this.font.color.height;
      const g = c.getContext('2d'); g.drawImage(this.font.color, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
      this.tinted.set(color, c);
    }
    return this.tinted.get(color);
  }
  measure(text) { let w = 0; for (const ch of text) w += ch === ' ' ? 4 : this.widths.get(this.map[ch]) ?? 4; return w; }
  text(text, x, y, color = '#ffffff', shadow = '#1b1528') {
    const draw = (ox, oy, img) => { let cx = x + ox; for (const ch of text) { const name = this.map[ch]; if (ch === ' ' || !name) { cx += 4; continue; } const f = this.font.lookup.get(name); this.g.drawImage(img, f.x, f.y, f.w, f.h, cx, y + oy, f.w, f.h); cx += this.widths.get(name); } };
    if (shadow) draw(1, 1, this.tint(shadow));
    draw(0, 0, this.tint(color));
  }
  wrap(text, width) {
    const lines = []; let line = '';
    for (const word of text.split(' ')) { const next = line ? `${line} ${word}` : word; if (this.measure(next) > width && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line); return lines;
  }
  icon(name, x, y) { const f = this.ui.lookup.get(name); this.g.drawImage(this.ui.color, f.x, f.y, f.w, f.h, x, y, f.w, f.h); }
  panel(x, y, w, h) {
    const piece = (name, px, py, pw = 8, ph = 8) => { const f = this.box.lookup.get(`box-${name}`); this.g.drawImage(this.box.color, f.x, f.y, f.w, f.h, px, py, pw, ph); };
    piece('tl', x, y); piece('tr', x + w - 8, y); piece('bl', x, y + h - 8); piece('br', x + w - 8, y + h - 8);
    piece('t', x + 8, y, w - 16, 8); piece('b', x + 8, y + h - 8, w - 16, 8); piece('l', x, y + 8, 8, h - 16); piece('r', x + w - 8, y + 8, 8, h - 16);
    piece('c', x + 8, y + 8, w - 16, h - 16);
  }
  hud(state) {
    for (let i = 0; i < state.maxHp / 2; i++) {
      const hp = state.hp - i * 2;
      this.icon(hp >= 2 ? 'heart-full' : hp === 1 ? 'heart-half' : 'heart-empty', 3 + i * 11, 3);
    }
    this.icon('glass', 196, 3); this.text(String(state.glass).padStart(3, '0'), 208, 4);
    let ix = 184;
    if (state.items.key) { this.icon('key', ix - 2, 3); ix -= 14; }
    if (state.items.flint) this.icon('flint', ix, 3);
  }
  dialog(message, shown, blink) {
    const x = 8, y = 108, w = 224, h = 46;
    this.panel(x, y, w, h);
    if (message.speaker) this.text(message.speaker, x + 8, y + 5, '#fcd04a');
    const lines = this.wrap(message.text, w - 18), visible = []; let budget = shown;
    for (const line of lines) { if (budget <= 0) break; visible.push(line.slice(0, budget)); budget -= line.length; }
    visible.slice(0, 3).forEach((line, i) => this.text(line, x + 8, y + (message.speaker ? 16 : 8) + i * 9));
    if (shown >= message.text.length && blink) this.text('*', x + w - 14, y + h - 12, '#97e3e3');
  }
}
