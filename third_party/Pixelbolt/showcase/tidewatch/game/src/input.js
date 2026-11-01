// Keyboard and touch input folded into one small state object with edge-triggered presses.
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyJ: 'attack', KeyZ: 'attack', Space: 'attack', KeyE: 'act', KeyX: 'act', Enter: 'act', KeyK: 'act',
  KeyP: 'pause', Escape: 'pause', KeyM: 'sound', KeyF: 'fullscreen'
};
export class Input {
  constructor(target) {
    this.down = new Set(); this.pressed = new Set();
    addEventListener('keydown', e => {
      const k = KEYS[e.code]; if (!k) return;
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      e.preventDefault(); if (!this.down.has(k)) this.pressed.add(k); this.down.add(k);
    });
    addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) this.down.delete(k); });
    addEventListener('blur', () => this.down.clear());
    for (const button of target.querySelectorAll('[data-key]')) {
      const k = button.dataset.key;
      const on = e => { e.preventDefault(); if (!this.down.has(k)) this.pressed.add(k); this.down.add(k); button.classList.add('held'); };
      const off = e => { e.preventDefault(); this.down.delete(k); button.classList.remove('held'); };
      button.addEventListener('pointerdown', on); button.addEventListener('pointerup', off); button.addEventListener('pointerleave', off); button.addEventListener('pointercancel', off);
    }
  }
  held(k) { return this.down.has(k); }
  take(k) { const had = this.pressed.has(k); this.pressed.delete(k); return had; }
  endFrame() { this.pressed.clear(); }
  axis() { return { x: (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0), y: (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0) }; }
}
