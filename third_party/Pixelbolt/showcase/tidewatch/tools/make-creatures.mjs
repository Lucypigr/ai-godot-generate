// One-time scaffold for creatures. Crab: pose source compiled by Pixelbolt. Jelly, gull and fisher: authored frames.
import { linkedPalette, writeJSON } from './common.mjs';
const force = { force: process.argv.includes('--force') };
// ---------------- crab (pose compiler) ----------------
const parts = {
  shell: { rows: [
    '....kkkkkkkk....',
    '..kk11111122kk..',
    '.k111711122222k.',
    'k11111122222233k',
    'k1211122222k233k',
    'k222k22222k3333k',
    '.k32kk222kk333k.',
    '..kk33333333kk..',
    '....kkkkkkkk....'], anchor: [8, 8], points: { clawL: [0, 3], clawR: [15, 3], eyes: [8, 0], legs: [8, 6] } },
  'eyes-open': { rows: ['.kkk..kkk.', '.k7k..k7k.', '.kkk..kkk.', '..k....k..'], anchor: [5, 3] },
  'eyes-blink': { rows: ['..........', '.kkk..kkk.', '.kkk..kkk.', '..k....k..'], anchor: [5, 3] },
  'eyes-angry': { rows: ['kk......kk', '.kkk..kkk.', '.k2k..k2k.', '..k....k..'], anchor: [5, 3] },
  'claw-l-open': { rows: ['kk..kk.', 'k1k.k2k', 'k11k12k', '.k1122k', '..k22kk', '...kk2k', '....kk.'], anchor: [6, 5] },
  'claw-l-closed': { rows: ['.kkkk..', 'k1112k.', 'k11122k', '.k1122k', '..k22kk', '...kk2k', '....kk.'], anchor: [6, 5] },
  'claw-l-raised': { rows: ['kk.kk..', 'k1kk2k.', 'k11k2k.', 'k1122k.', '.k122k.', '..k22k.', '..k22kk', '...kk2k', '....kk.'], anchor: [6, 7] },
  'legs-a': { rows: ['kk..................kk', 'k2k................k2k', '.k2kk.k..........kk2k.', '..kk2k2k.......k2kk2k.', '....kk.k2k...k2k.kk...', '........kk...kk.......'], anchor: [11, 0] },
  'legs-b': { rows: ['.kk................kk.', '.k2k..............k2k.', 'k2kk.k............kk2k', 'kk.k2k2k........k2k.kk', '....kk.k2k....k2kk....', '........kk....kk......'], anchor: [11, 0] }
};
// The origin is the ground contact (it becomes the atlas anchor); a hop lifts the body above it. The right claw is
// the left claw flipped inside its own grid.
const crabPose = (name, duration, { legs = 'legs-a', claws = 'closed', eyes = 'eyes-open', lift = 0, marker } = {}) => ({
  name, duration, origin: [16, 19], parts: [
    { name: 'legs', part: legs, at: [0, -3 - lift] },
    { name: 'shell', part: 'shell', at: [0, -1 - lift] },
    { name: 'eyes', part: eyes, attach: { part: 'shell', point: 'eyes' } },
    { name: 'clawL', part: `claw-l-${claws}`, attach: { part: 'shell', point: 'clawL' } },
    { name: 'clawR', part: `claw-l-${claws}`, flipX: true, attach: { part: 'shell', point: 'clawR' } }
  ], ...(marker && { markers: [{ name: marker, part: 'clawL', point: 'tip' }] })
});
parts['claw-l-closed'].points = { tip: [1, 0] }; parts['claw-l-raised'].points = { tip: [1, 0] };
const crabPoses = [
  crabPose('idle-0', 900), crabPose('idle-1', 140, { eyes: 'eyes-blink' }), crabPose('idle-2', 500, { claws: 'open' }),
  crabPose('walk-0', 110, { legs: 'legs-a' }), crabPose('walk-1', 110, { legs: 'legs-b', lift: 1 }), crabPose('walk-2', 110, { legs: 'legs-a', claws: 'open' }), crabPose('walk-3', 110, { legs: 'legs-b', lift: 1, claws: 'open' }),
  crabPose('snap-0', 220, { claws: 'raised', eyes: 'eyes-angry', lift: 1 }), crabPose('snap-1', 90, { claws: 'open', eyes: 'eyes-angry', lift: 2 }), crabPose('snap-2', 160, { claws: 'closed', eyes: 'eyes-angry', marker: 'hit' }),
  crabPose('hurt', 200, { claws: 'open', eyes: 'eyes-blink', lift: 2 })
];
writeJSON('art/poses/crab.poses.json', { format: 'pixelforge-poses', version: 1, name: 'crab', width: 32, height: 24, palette: linkedPalette(), parts, poses: crabPoses, animations: {
  idle: { frames: ['idle-0', 'idle-1', 'idle-0', 'idle-2'] }, walk: { frames: ['walk-0', 'walk-1', 'walk-2', 'walk-3'] }, snap: { frames: ['snap-0', 'snap-1', 'snap-2'], loop: false }, hurt: { frames: ['hurt'], loop: false }
}, sheet: { columns: 6, trim: true } }, force);
// ---------------- brine jelly (translucent on purpose) ----------------
const jellyPalette = linkedPalette({ H: '#a266d6bb', J: '#66429ae6', Q: '#e5adf7dd', Y: '#633f9655' });
const J = {
  rest: ['................', '................', '................', '................', '................',
    '.....JJJJJJ.....', '...JJQQHHHHJJ...', '..JQQ7QHHHHHHJ..', '..JQ7QHHHHHHHJ..', '.JHQHHH66HHHHHJ.', '.JHHHH6446HHHHJ.', '.JHHHHH66HHHHHJ.', '..JJHHHHHHHHJJ..', '...YJJJJJJJJY...', '....________....', '................'],
  wobble: ['................', '................', '................', '................', '................',
    '................', '....JJJJJJJJ....', '..JJQQHHHHHHJJ..', '.JQQ7QHHHHHHHHJ.', '.JQ7QHHH66HHHHJ.', 'JHHHHHH6446HHHHJ', 'JHHHHHHH66HHHHHJ', '.JJHHHHHHHHHHJJ.', '..YJJJJJJJJJJY..', '...__________...', '................'],
  squash: ['................', '................', '................', '................', '................',
    '................', '................', '...JJJJJJJJJJ...', '.JJQQ7QHHHHHHJJ.', 'JHQ7QHHH66HHHHHJ', 'JHHHHHH6446HHHHJ', 'JJHHHHHHH66HHHJJ', '.YJJJJJJJJJJJJY.', '..____________..', '................', '................'],
  stretch: ['................', '.......JJ.......', '.....JJQQJ......', '....JQQ7QHJ.....', '....JQ7QHHJ.....', '....JHHHHHJ.....', '....JHH66HJ.....', '....JH6446J.....', '....JHH66HJ.....', '....JHHHHHJ.....', '.....JHHHJ......', '......JJJ.......', '................', '.....______.....', '................', '................'],
  air: ['................', '................', '.....JJJJJJ.....', '...JJQQHHHHJJ...', '..JQQ7QHHHHHHJ..', '..JQ7QHH66HHHJ..', '.JHHHHH6446HHHJ.', '.JHHHHHH66HHHHJ.', '..JJHHHHHHHHJJ..', '...YJJJJJJJJY...', '................', '................', '................', '................', '.....______.....', '................'],
  hurt: ['................', '................', '................', '................', '................',
    '.....777777.....', '...7777777777...', '..777777777777..', '..777777777777..', '.77777744777777.', '.77777444477777.', '.77777744777777.', '..777777777777..', '...7777777777...', '....________....', '................']
};
const jellyFrames = [['rest', 520], ['wobble', 380], ['squash', 110], ['stretch', 90], ['air', 180], ['squash', 120], ['hurt', 120]].map(([key, duration], i) => ({ name: `${key}-${i}`, duration, ops: [{ op: 'grid', x: 0, y: 0, rows: J[key] }] }));
writeJSON('art/recipes/jelly.json', { version: 1, name: 'jelly', width: 16, height: 16, palette: jellyPalette, anchor: [8, 13], frames: jellyFrames, animations: {
  idle: { frames: ['rest-0', 'wobble-1'] }, hop: { frames: ['squash-2', 'stretch-3', 'air-4', 'squash-5', 'rest-0'], loop: false }, hurt: { frames: ['hurt-6'], loop: false }
}, sheet: { columns: 7, trim: true } }, force);
// ---------------- gull (ambient) ----------------
const gull = {
  up: ['................', '..kk........kk..', '.k77k......k77k.', '..k77k....k77k..', '...k778kk877k...', '....k7777777k...', '.....kk77kXk....', '.......kkk......', '................', '................', '................', '................', '................', '................', '................', '................'],
  mid: ['................', '................', '................', '.kkk........kkk.', 'k7778kkkkkk8777k', '.kk77777777777k.', '...kkk777kXkk...', '......kkk.......', '................', '................', '................', '................', '................', '................', '................', '................'],
  down: ['................', '................', '................', '................', '....kkkkkkkk....', '...k77777777kk..', '..k8777777kXk...', '.k88kk777kkk....', 'k88k..kkk.......', '.kk.............', '................', '................', '................', '................', '................', '................'],
  glide: ['................', '................', '................', '................', 'kkkk......kkkk..', '8777kkkkkk7778k.', '.kk7777777777kk.', '...kkk777kXk....', '......kkk.......', '................', '................', '................', '................', '................', '................', '................']
};
const gullFrames = [['up', 110], ['mid', 90], ['down', 110], ['mid', 90], ['glide', 600]].map(([key, duration], i) => ({ name: `${key}-${i}`, duration, ops: [{ op: 'grid', x: 0, y: 0, rows: gull[key] }] }));
writeJSON('art/recipes/gull.json', { version: 1, name: 'gull', width: 16, height: 16, palette: linkedPalette(), anchor: [8, 8], frames: gullFrames, animations: { flap: { frames: ['up-0', 'mid-1', 'down-2', 'mid-3'] }, glide: { frames: ['glide-4'] } }, sheet: { trim: true } }, force);
// ---------------- old fisher (NPC, seated on a crate with a pipe) ----------------
const fisherBase = [
  '..........kkkkkk........',
  '........kkBBBBBBkk......',
  '.......kBbbBBBBBBVk.....',
  '.......kkkkkkkkkkkk.....',
  '......kVBBBBBBBBBBVk....',
  '.......k8ppppppp8k......',
  '.......kpkppppkpPk......',
  '.......k8pppPppp8k......',
  '......k8888888888k......',
  '.....k8878888878888k....',
  '.....k88878888788kk.....',
  '....kbbk8888888kbbk.....',
  '...kbBbbkkk8kkkbbBbk....',
  '...kbBbbbbbbbbbbbBBk....',
  '...kqPkbbbbbbbbbkPqk....',
  '....kkkUUUMMUUUUkkk.....',
  '.....kOooooooooouk......',
  '.....kOkkkkkkkkkuk......',
  '.....kOBBk...kBBuk......',
  '.....kOBBk...kBBuk......',
  '.....kOkUUk.kUUkuk......',
  '.....kOuuuuuuuuuUk......',
  '.....kkkkkkkkkkkkk......',
  '....______________......'
];
const fisher = (name, duration, extra) => ({ name, duration, ops: [{ op: 'grid', x: 4, y: 8, rows: fisherBase }, ...extra] });
const smoke = (x, y, rows) => ({ op: 'grid', x, y, rows });
const fisherFrames = [
  fisher('idle-0', 800, [{ op: 'grid', x: 20, y: 14, rows: ['kk', 'uk'] }]),
  fisher('puff-1', 240, [{ op: 'grid', x: 20, y: 14, rows: ['ki', 'uk'] }, smoke(21, 10, ['.8', '8.'])]),
  fisher('puff-2', 260, [{ op: 'grid', x: 20, y: 14, rows: ['kk', 'uk'] }, smoke(21, 6, ['..88', '.8.8', '88..'])]),
  fisher('puff-3', 300, [{ op: 'grid', x: 20, y: 14, rows: ['kk', 'uk'] }, smoke(22, 2, ['.9.', '9.9', '.9.'])])
];
writeJSON('art/recipes/fisher.json', { version: 1, name: 'fisher', width: 32, height: 32, palette: linkedPalette(), anchor: [16, 30], frames: fisherFrames, animations: { idle: { frames: ['idle-0', 'idle-0', 'puff-1', 'puff-2', 'puff-3'] } }, sheet: { trim: true } }, force);
console.log('creatures written');
