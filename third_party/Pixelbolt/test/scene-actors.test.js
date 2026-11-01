import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareScene, renderScene } from '../src/scene.js';

const palette = { r: '#ff0000', g: '#00ff00', b: '#0000ff', w: '#ffffff' };
// hero: two frames with a "hand" point that moves; spark: one pixel; post: a tall 1×3 prop anchored at its foot.
const hero = { version: 1, name: 'hero', width: 2, height: 2, palette, anchor: [0, 1], frames: [
  { name: 'stand', duration: 100, points: { hand: [1, 0] }, ops: [{ op: 'rect', w: 2, h: 2, color: 'r' }] },
  { name: 'swing', duration: 100, points: { hand: [1, 1] }, ops: [{ op: 'rect', w: 2, h: 2, color: 'r' }] },
  { name: 'empty-handed', duration: 100, ops: [{ op: 'rect', w: 2, h: 2, color: 'r' }] }
], animations: { walk: { frames: ['stand', 'swing'] } } };
const spark = { version: 1, name: 'spark', width: 1, height: 1, palette, frames: [{ name: 'on', ops: [{ op: 'pixel', color: 'w' }] }] };
const post = { version: 1, name: 'post', width: 1, height: 3, palette, anchor: [0, 2], frames: [{ name: 'p', ops: [{ op: 'rect', w: 1, h: 3, color: 'g' }] }] };
const scene = (instances, extra = {}) => ({ format: 'pixelforge-scene', version: 1, name: 'stage', width: 6, height: 5, duration: 1000, background: '#000000', assets: { hero, spark, post }, instances, ...extra });
const pixel = (source, time, x, y) => { const v = renderScene(prepareScene(source), { time }); return [...v.data.subarray((y * v.width + x) * 4, (y * v.width + x) * 4 + 3)].join(); };
const WHITE = '255,255,255', BLACK = '0,0,0', RED = '255,0,0', GREEN = '0,255,0';

test('placements can start hidden and be hidden again by a cue; named cues write related times once', () => {
  const source = scene([{ name: 'spark', asset: 'spark', at: [2, 2], frame: 'on', hidden: true, sequence: [{ time: 'hit', frame: 'on' }, { time: 'hit+200', hide: true }] }], { cues: { hit: 300 } });
  assert.deepEqual([pixel(source, 0, 2, 2), pixel(source, 300, 2, 2), pixel(source, 499, 2, 2), pixel(source, 500, 2, 2)], [BLACK, WHITE, WHITE, BLACK]);
  // Trajectory keys take named times too.
  const moving = scene([{ asset: 'spark', at: [0, 0], frame: 'on', trajectory: [{ time: 0, at: [0, 0] }, { time: 'hit', at: [4, 0] }] }], { cues: { hit: 400 } });
  assert.deepEqual([pixel(moving, 400, 4, 0), pixel(moving, 200, 2, 0)], [WHITE, WHITE]);
  assert.throws(() => prepareScene(scene([{ asset: 'spark', at: [0, 0], frame: 'on', sequence: [{ time: 'miss' }] }], { cues: { hit: 1 } })), /sequence\[0\]\.time: expected milliseconds or a named cue such as "strike" or "strike\+90"; "miss" is not in scene\.cues/);
  assert.throws(() => prepareScene(scene([{ asset: 'spark', at: [0, 0], frame: 'on', sequence: [{ time: 'hit-20', frame: 'on' }] }], { cues: { hit: 10 } })), /"hit-20" is -10 ms, outside 0–999/);
  assert.throws(() => prepareScene(scene([{ asset: 'spark', at: [0, 0], frame: 'on', sequence: [{ time: 5, hide: true, frame: 'on' }] }])), /a hide cue takes no frame or animation/);
  assert.throws(() => prepareScene(scene([], { cues: { hit: 2000 } })), /cues\.hit: expected an integer from 0 to 1000/);
});

test('an attached placement follows a named point of another placement\'s current frame', () => {
  const source = scene([
    { name: 'hero', asset: 'hero', at: [1, 3], anchor: 'frame', animation: 'walk', trajectory: [{ time: 0, at: [1, 3] }, { time: 400, at: [3, 3] }], sequence: [{ time: 600, frame: 'empty-handed' }] },
    { asset: 'spark', at: [1, 0], frame: 'on', attach: { instance: 'hero', point: 'hand' } }
  ]);
  // At 0 the hero stands at x 1 (top y 2); its hand is at [1, 0], so the spark sits one pixel right of it: (3, 2).
  assert.equal(pixel(source, 0, 3, 2), WHITE);
  // At 100 the swing frame moves the hand down a row, and the hero has walked a pixel (1.5 rounds to 2).
  assert.equal(pixel(source, 100, 4, 3), WHITE);
  // At 400 the hero has walked two pixels; the spark went with it.
  assert.equal(pixel(source, 400, 5, 2), WHITE);
  // A frame without the point hides the attached placement.
  assert.equal(pixel(source, 700, 5, 2), BLACK);
  assert.throws(() => prepareScene(scene([{ asset: 'spark', at: [0, 0], frame: 'on', attach: { instance: 'nobody', point: 'hand' } }])), /attach\.instance: expected the name of another, uniquely named placement that is neither a tilemap nor attached itself/);
  assert.throws(() => prepareScene(scene([{ name: 'hero', asset: 'hero', at: [0, 0], frame: 'stand' }, { asset: 'spark', at: [0, 0], frame: 'on', attach: { instance: 'hero', point: 'foot' } }])), /attach\.point: no frame of hero has a point named "foot"/);
  // The target may come later in the list, so a shadow can be drawn before the actor that casts it.
  const shadowFirst = scene([{ asset: 'spark', at: [0, 1], frame: 'on', attach: { instance: 'hero', point: 'hand' } }, { name: 'hero', asset: 'hero', at: [1, 3], anchor: 'frame', frame: 'stand' }]);
  assert.equal(pixel(shadowFirst, 0, 2, 3), RED);
  assert.deepEqual(renderScene(prepareScene(shadowFirst)).placements.map(p => [p.name, p.x, p.y]), [['spark', 2, 3], ['hero', 1, 2]]);
  assert.throws(() => prepareScene(scene([{ name: 'a', asset: 'spark', at: [0, 0], frame: 'on', attach: { instance: 'b', point: 'hand' } }, { name: 'b', asset: 'hero', at: [0, 0], frame: 'stand', attach: { instance: 'a', point: 'hand' } }])), /neither a tilemap nor attached itself/);
});

test('placements sorted by ground draw by the y of their placement point, so a hero passes behind a post', () => {
  // The post stands at y 3 (its foot); the hero walks from y 2 (behind) to y 4 (in front) through the same column.
  const source = scene([
    { asset: 'post', at: [2, 3], anchor: 'frame', frame: 'p', sort: 'ground' },
    { asset: 'hero', at: [1, 2], anchor: 'frame', frame: 'stand', sort: 'ground', trajectory: [{ time: 0, at: [1, 2] }, { time: 500, at: [1, 4] }] }
  ]);
  // Behind: the post (listed first) is drawn over the hero where they overlap, (2, 2).
  assert.equal(pixel(source, 0, 2, 2), GREEN);
  // In front: the hero now covers the post, (2, 3).
  assert.equal(pixel(source, 500, 2, 3), RED);
  // Without sorting, list order always draws the hero last.
  assert.equal(pixel(scene(source.instances.map(({ sort, ...rest }) => rest)), 0, 2, 2), RED);
  assert.throws(() => prepareScene(scene([{ asset: 'post', at: [0, 0], frame: 'p', sort: 'y' }])), /sort: expected ground/);
});
