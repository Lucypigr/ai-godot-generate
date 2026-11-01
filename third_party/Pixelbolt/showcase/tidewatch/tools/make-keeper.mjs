// One-time scaffold for the keeper's pose source. art/poses/keeper.poses.json is authoritative afterwards.
import { linkedPalette, writeJSON } from './common.mjs';
const P = {};
const swap = (rows, edits) => rows.map((row, i) => edits[i] ?? row);
// ---------- facing down (front) ----------
P['head-d'] = { rows: [
  '.....kkkkkk.....', '...kkeeeeEEkk...', '..keeeeEEEEEEk..', '.keeEEEEEEEEEfk.', '.kEEEEEEEEEEEfk.',
  'kEEEEEEEEEEEEEfk', 'kfEffffffffffEfk', 'kfEkzAaaaaAzkEfk', 'kfEkApppppPAkEfk', 'kffkpkppppkPkffk',
  'kFfkpkppppkqkfFk', '.kFkqPppppPqkFk.', '..kkkqqqqqqkkk..'], anchor: [8, 12] };
P['head-d-hurt'] = { rows: swap(P['head-d'].rows, { 9: 'kffkpppppppPkffk', 10: 'kFfkpkkppkkqkfFk', 11: '.kFkqPpkkpPqkFk.' }), anchor: [8, 12] };
P['head-d-happy'] = { rows: swap(P['head-d'].rows, { 9: 'kffkpkkppkkPkffk', 10: 'kFfkpppppppqkfFk', 11: '.kFkqPpkkpPqkFk.' }), anchor: [8, 12] };
const bodyD = rows => ({ rows, anchor: [8, 6], points: { neck: [8, -1] } });
P['body-d'] = bodyD(['..kfEekkkkeEfk..', '.kEkEeEEEEEfkfk.', '.kEkeEEEEEEfkfk.', '.kPkEEEEEEEfkqk.', '.kPkUUUMMUUUkqk.', '..kEEEEEEEEEEk..', '..kfffffffffFk..']);
P['body-d-a'] = bodyD(['..kfEekkkkeEfk..', '.kEkEeEEEEEfkfk.', '.kPkeEEEEEEfkfk.', '.kPkEEEEEEEfkfk.', '.kEkUUUMMUUUkqk.', '..kEEEEEEEEEEqk.', '..kfffffffffFk..']);
P['body-d-b'] = bodyD(['..kfEekkkkeEfk..', '.kEkEeEEEEEfkqk.', '.kEkeEEEEEEfkqk.', '.kEkEEEEEEEfkfk.', '.kPkUUUMMUUUkk..', '.kPEEEEEEEEEEk..', '..kfffffffffFk..']);
P['body-d-lift'] = { rows: ['..kfEekkkkeEfk..', '...kEeEEEEEfk...', '...keEEEEEEfk...', '...kEEEEEEEfk...', '...kUUUMMUUUk...', '..kEEEEEEEEEEk..', '..kfffffffffFk..'], anchor: [8, 6], points: { neck: [8, -1], shoulderL: [2, 1], shoulderR: [13, 1], hold: [8, -16] } };
P['arm-up-l'] = { rows: ['kqk.', 'kPk.', 'kEk.', 'kfk.', '.kEk', '.kEk', '.kfk', '.kEk', '.kEk', '.kfk', '.kEk', '.kEk', '.kfk', '.kEk', '.kEk', '.kfk', '.kEk'], anchor: [2, 16] };
// legs: anchor on the ground row, hip one row above the part
P['legs-d'] = { rows: ['.kBBkkBBk.', 'kUUUkkUUUk'], anchor: [5, 1], points: { hip: [5, -1] } };
P['legs-d-cl'] = { rows: ['.kBBkkUUUk', '.kBBk.kkk.', 'kUUUk.....'], anchor: [5, 1], points: { hip: [5, -1], foot: [2, 2] } };
P['legs-d-cr'] = { rows: ['kUUUkkBBk.', '.kkk.kBBk.', '.....kUUUk'], anchor: [5, 1], points: { hip: [5, -1], foot: [7, 2] } };
P['legs-d-pass'] = { rows: ['.kBBkkBBk.', '.kBBkkBBk.', 'kUUUkkUUUk'], anchor: [5, 2], points: { hip: [5, -1] } };
P['legs-d-pa'] = { rows: ['.kBBkkBBk.', 'kUUUkkBBk.', '.kkk.kUUUk'], anchor: [5, 2], points: { hip: [5, -1] } };
P['legs-d-pb'] = { rows: ['.kBBkkBBk.', '.kBBkkUUUk', 'kUUUk.kkk.'], anchor: [5, 2], points: { hip: [5, -1] } };
// ---------- facing up (back) ----------
P['head-u'] = { rows: [
  '.....kkkkkk.....', '...kkeeeeEEkk...', '..keeeeEEEEEEk..', '.keeEEEEEEEEEfk.', '.kEEEEEEEEEEEfk.',
  'kEEEEEEEEEEEEEfk', 'keEEEEEEEEEEEEfk', 'kfEEEEEEEEEEEEfk', 'kfEEEEEEEEEEEffk', 'kffEEEEEEEEEfffk',
  'kFffffffffffffFk', '.kFFffffffffFFk.', '..kkkkkkkkkkkk..'], anchor: [8, 12] };
P['body-u'] = bodyD(['..kfzAAAAAAzfk..', '.kEkEeEEEEEfkfk.', '.kEkeEEEEEEfkfk.', '.kPkEEEEEEEfkqk.', '.kPkUUUUUUUUkqk.', '..kEEEEEEEEEEk..', '..kfffffffffFk..']);
P['body-u-a'] = bodyD(['..kfzAAAAAAzfk..', '.kEkEeEEEEEfkqk.', '.kEkeEEEEEEfkqk.', '.kEkEEEEEEEfkfk.', '.kPkUUUUUUUUkk..', '.kPEEEEEEEEEEk..', '..kfffffffffFk..']);
P['body-u-b'] = bodyD(['..kfzAAAAAAzfk..', '.kEkEeEEEEEfkfk.', '.kPkeEEEEEEfkfk.', '.kPkEEEEEEEfkfk.', '.kEkUUUUUUUUkqk.', '..kEEEEEEEEEEqk.', '..kfffffffffFk..']);
// ---------- facing right (profile) ----------
P['head-r'] = { rows: [
  '.....kkkkkkk......', '...kkeeeeEEEkk....', '..keeeEEEEEEEEk...', '.keeEEEEEEEEEEEk..', '.kEEEEEEEEEEEEEfk.',
  'kEEEEEEEEEEEEEEEfk', 'kfEEEEffffffffffFk', 'kfEEEkzAaaappppkk.', 'kfEEEkzAapppkpPk..', 'kffEEkzAappppPPk..',
  'kFffEkzzApppqqk...', '.kFFfkkzzqqqkk....', '..kkkkkkkkkkk.....'], anchor: [8, 12] };
P['head-r-hurt'] = { rows: swap(P['head-r'].rows, { 8: 'kfEEEkzAappkkpPk..' }), anchor: [8, 12] };
const bodyR = rows => ({ rows, anchor: [5, 6], points: { neck: [5, -1] } });
P['body-r'] = bodyR(['kfEEeEEfk.', 'kEEeEEEEfk', 'kEeEEEEEfk', 'kEEPPEEEfk', 'kkUUPPUUkk', 'kEEEEEEEEk', 'kfffffffFk']);
P['body-r-fwd'] = bodyR(['kfEEeEEfk.', 'kEEeEEEEfk', 'kEeEEEEEfk', 'kEEEEPPEfk', 'kkUUUUPPkk', 'kEEEEEEEEk', 'kfffffffFk']);
P['body-r-back'] = bodyR(['kfEEeEEfk.', 'kEEeEEEEfk', 'kEeEEEEEfk', 'kEPPEEEEfk', 'kkPPUUUUkk', 'kEEEEEEEEk', 'kfffffffFk']);
P['legs-r'] = { rows: ['.kBBkBBk.', 'kUUUkUUUk'], anchor: [4, 1], points: { hip: [4, -1] } };
P['legs-r-c1'] = { rows: ['.kVVk...kBBk.', 'kUUUk...kUUUk'], anchor: [6, 1], points: { hip: [6, -1], foot: [10, 1] } };
P['legs-r-c2'] = { rows: ['.kBBk...kVVk.', 'kUUUk...kUUUk'], anchor: [6, 1], points: { hip: [6, -1], foot: [10, 1] } };
P['legs-r-pass'] = { rows: ['...kVBBk.', '...kVBBk.', '..kUUUUk.'], anchor: [5, 2], points: { hip: [5, -1] } };
P['legs-r-pa'] = { rows: ['..kVkBBk.', '..kUUkBBk', '...kkUUUk'], anchor: [5, 2], points: { hip: [5, -1] } };
P['legs-r-pb'] = { rows: ['...kVBBk.', '...kVkUUUk', '..kUUUkk.'].map(r => r.slice(0, 9).padEnd(9, '.')), anchor: [5, 2], points: { hip: [5, -1] } };
// ---------- attacks: an armless torso plus a sword arm attached at the shoulder ----------
P['body-d-noarm'] = { rows: ['..kfEekkkkeEfk..', '.kEkEeEEEEEfk...', '.kEkeEEEEEEfk...', '.kPkEEEEEEEfk...', '.kPkUUUMMUUUk...', '..kEEEEEEEEEEk..', '..kfffffffffFk..'], anchor: [8, 6], points: { neck: [8, -1], shoulder: [13, 1] } };
P['body-u-noarm'] = { rows: ['..kfzAAAAAAzfk..', '...kEeEEEEEfkfk.', '...keEEEEEEfkfk.', '...kEEEEEEEfkqk.', '...kUUUUUUUUkqk.', '..kEEEEEEEEEEk..', '..kfffffffffFk..'], anchor: [8, 6], points: { neck: [8, -1], shoulder: [2, 1] } };
P['body-r-noarm'] = { rows: ['kfEEeEEfk.', 'kEEeEEEEfk', 'kEeEEEEEfk', 'kEEEEEEEfk', 'kkUUUUUUkk', 'kEEEEEEEEk', 'kfffffffFk'], anchor: [5, 6], points: { neck: [5, -1], shoulder: [6, 1] } };
P['sa-d-windup'] = { rows: ['....kk..', '...kmMk.', '...kmMk.', '...kmMk.', '...kmMk.', '...kmvk.', '..kiXXik', '...kUUk.', '...kqqk.', '..kfEk..', '.kfEk...', 'kfEk....', 'kEk.....'], anchor: [1, 12], points: { tip: [4, 0] } };
P['sa-d-strike'] = { rows: ['...kEk.', '..kEfk.', '.kEfk..', '.kqqk..', 'kiXXik.', '.kmMk..', '.kmMk..', '.kmMk..', '.kmMk..', '.kmMk..', '.kmvk..', '..kk...'], anchor: [4, 0], points: { tip: [2, 11] } };
P['sa-d-recover'] = { rows: ['kEk....', 'kEfk...', '.kqqk..', '.kiXk..', '..kmMk.', '...kmMk', '....kmk', '.....k.'], anchor: [1, 0], points: { tip: [5, 7] } };
P['sa-u-windup'] = { rows: ['....kEk', '...kfEk', '..kqqk.', '..kXik.', '.kMmk..', 'kMmk...', 'kmk....', '.k.....'], anchor: [5, 0], points: { tip: [1, 7] } };
P['sa-u-strike'] = { rows: ['..kk...', '.kmMk..', '.kmMk..', '.kmMk..', '.kmMk..', '.kmMk..', '.kmvk..', 'kiXXik.', '.kUUk..', '.kqqk..', '.kEfk..', '..kEfk.', '...kEk.'], anchor: [4, 12], points: { tip: [2, 0] } };
P['sa-u-recover'] = { rows: ['.k.....', 'kmk....', 'kMmk...', '.kMmk..', '..kXik.', '..kqqk.', '...kfEk', '....kEk'], anchor: [5, 7], points: { tip: [1, 0] } };
P['sa-r-windup'] = { rows: ['..........k.kkkk.', '..kkkkkkkkXkqfEEk', '.kmmmmmmmmXkqqfEk', '.kvMMMMMMMXkkkkk.', '..kkkkkkk.k......'], anchor: [16, 2], points: { tip: [1, 2] } };
P['sa-r-strike'] = { rows: ['.kkkk.k..........', 'kEEfqkXkkkkkkkk..', 'kEfqqkXmmmmmmmmk.', '.kkkkkXMMMMMMMvk.', '......k.kkkkkkk..'], anchor: [0, 2], points: { tip: [15, 2] } };
P['sa-r-recover'] = { rows: ['kEk.....', 'kEfk....', '.kqqk...', '.kkXik..', '...kmMk.', '....kmMk', '.....kmk', '......k.'], anchor: [1, 0], points: { tip: [6, 7] } };
const origin = [20, 31];
const pose = (name, duration, legs, body, head, markers) => ({ name, duration, origin, parts: [
  { name: 'legs', part: legs }, { name: 'body', part: body, attach: { part: 'legs', point: 'hip' } }, { name: 'head', part: head, attach: { part: 'body', point: 'neck' } }
], ...(markers && { markers }) });
const poses = [];
for (const [dir, legs, pass, c1, c2, body, a, b, head, passA, passB] of [
  ['d', 'legs-d', 'legs-d-pass', 'legs-d-cl', 'legs-d-cr', 'body-d', 'body-d-a', 'body-d-b', 'head-d', 'legs-d-pa', 'legs-d-pb'],
  ['u', 'legs-d', 'legs-d-pass', 'legs-d-cr', 'legs-d-cl', 'body-u', 'body-u-a', 'body-u-b', 'head-u', 'legs-d-pb', 'legs-d-pa'],
  ['r', 'legs-r', 'legs-r-pass', 'legs-r-c1', 'legs-r-c2', 'body-r', 'body-r-back', 'body-r-fwd', 'head-r', 'legs-r-pa', 'legs-r-pb']
]) {
  poses.push(pose(`idle-${dir}`, 600, legs, body, head));
  poses.push(pose(`breathe-${dir}`, 400, pass, body, head));
  poses.push(pose(`walk-${dir}-1`, 140, c1, a, head, [{ name: 'step', part: 'legs', point: 'foot' }]));
  poses.push(pose(`walk-${dir}-2`, 120, passB, body, head));
  poses.push(pose(`walk-${dir}-3`, 140, c2, b, head, [{ name: 'step', part: 'legs', point: 'foot' }]));
  poses.push(pose(`walk-${dir}-4`, 120, passA, body, head));
}
// Facing left mirrors each right-facing pose around the origin, markers included, so no left parts are drawn.
const mirrored = name => ({ name: name.replace('-r', '-l'), mirror: name });
poses.push(...['idle-r', 'breathe-r', 'walk-r-1', 'walk-r-2', 'walk-r-3', 'walk-r-4'].map(mirrored));
poses.push(pose('hurt-d', 300, 'legs-d', 'body-d', 'head-d-hurt'));
poses.push(pose('hurt-r', 300, 'legs-r', 'body-r', 'head-r-hurt'));
poses.push(mirrored('hurt-r'));
// Attacks: windup, strike (hit window, blade marker), recover. Facing up, the sword arm is behind the head.
const attack = (dir, legs, body, head, swordBehind) => ['windup', 'strike', 'recover'].map((phase, i) => {
  const sword = { name: 'sword', part: `sa-${dir}-${phase}`, attach: { part: 'body', point: 'shoulder' } };
  const parts = [{ name: 'legs', part: legs }, { name: 'body', part: body, attach: { part: 'legs', point: 'hip' } }];
  const headPart = { name: 'head', part: head, attach: { part: 'body', point: 'neck' } };
  parts.push(...(swordBehind[i] ? [sword, headPart] : [headPart, sword]));
  return { name: `attack-${dir}-${i + 1}`, duration: [70, 150, 90][i], origin, parts, markers: [{ name: phase === 'strike' ? 'hit' : 'blade', part: 'sword', point: 'tip' }] };
});
poses.push(...attack('d', 'legs-d', 'body-d-noarm', 'head-d', [false, false, false]));
poses.push(...attack('u', 'legs-d', 'body-u-noarm', 'head-u', [false, true, true]));
poses.push(...attack('r', 'legs-r', 'body-r-noarm', 'head-r', [false, false, false]));
poses.push(...['attack-r-1', 'attack-r-2', 'attack-r-3'].map(mirrored));
poses.push({ name: 'hold-up', duration: 900, origin, parts: [
  { name: 'legs', part: 'legs-d' }, { name: 'body', part: 'body-d-lift', attach: { part: 'legs', point: 'hip' } }, { name: 'head', part: 'head-d-happy', attach: { part: 'body', point: 'neck' } },
  { name: 'armL', part: 'arm-up-l', attach: { part: 'body', point: 'shoulderL' } }, { name: 'armR', part: 'arm-up-l', flipX: true, attach: { part: 'body', point: 'shoulderR' } }
], markers: [{ name: 'item', part: 'body', point: 'hold' }] });
const animations = {};
for (const dir of 'durl') {
  animations[`idle-${dir}`] = { frames: [`idle-${dir}`, `breathe-${dir}`] };
  animations[`walk-${dir}`] = { frames: [1, 2, 3, 4].map(i => `walk-${dir}-${i}`) };
}
for (const dir of 'durl') animations[`attack-${dir}`] = { frames: [1, 2, 3].map(i => `attack-${dir}-${i}`), loop: false };
animations['hurt-d'] = { frames: ['hurt-d'], loop: false };
animations['hold-up'] = { frames: ['hold-up'], loop: false };
const source = { format: 'pixelforge-poses', version: 1, name: 'keeper', width: 40, height: 40, palette: linkedPalette(), parts: P, poses, animations, sheet: { columns: 8, trim: true } };
writeJSON('art/poses/keeper.poses.json', source, { force: process.argv.includes('--force') });
console.log('parts', Object.keys(P).length, 'poses', poses.length);
