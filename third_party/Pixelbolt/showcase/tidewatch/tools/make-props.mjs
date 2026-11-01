// One-time scaffold for 16x16 props. art/recipes/props.json is the authoritative, editable source afterwards.
import { linkedPalette, writeJSON } from './common.mjs';
const G = {};
G['bush'] = [
  '................',
  '................',
  '.....GGGGG......',
  '...GGljjjjGG....',
  '..GjllljjjhhG...',
  '.GjllljjhhjhgG..',
  '.GjljjhhjjhhgG..',
  'GjjjhhjjhhhhggG.',
  'GjhhjjhhhhhgghG.',
  'GghhhhhhhhggggG.',
  'GgghhhhhhgggGgG.',
  '.GgggghhggGGGG..',
  '.__GGgggGGGG__..',
  '..____GGG_____..',
  '...__________...',
  '................'
];
G['bush-cut'] = [
  '................', '................', '................', '................', '................',
  '................', '................', '................', '................',
  '................',
  '.....j...l......',
  '...GjhG.GjhG....',
  '..GuOuGGuOuG....',
  '.__GuuGGuuG__...',
  '..___GGGG____...',
  '................'
];
G['grass-a'] = [
  '................',
  '................',
  '................',
  '.......l........',
  '..l....jl...l...',
  '..jl..ljj..jl...',
  '...jl.jhj.ljh...',
  '..ljhljhjljhj...',
  '..jhjjhhjjhhg...',
  '.ljhhjhhhhhhgl..',
  '.jhhhhhhhhhhgj..',
  '.ghhhhhhhhhhgg..',
  '..gghhhhhhggg...',
  '..__ggggggg__...',
  '...________.....',
  '................'
];
G['grass-b'] = [
  '................',
  '................',
  '................',
  '........l.......',
  '...l....jl...l..',
  '...jl..ljj..jl..',
  '...jhl.jhjl.jh..',
  '..ljhljhjljhj...',
  '..jhjjhhjjhhg...',
  '.ljhhjhhhhhhgl..',
  '.jhhhhhhhhhhgj..',
  '.ghhhhhhhhhhgg..',
  '..gghhhhhhggg...',
  '..__ggggggg__...',
  '...________.....',
  '................'
];
G['grass-cut'] = [
  '................', '................', '................', '................', '................',
  '................', '................', '................', '................', '................',
  '................',
  '..l.j..l.j.l....',
  '.jhjhjjhjhjhj...',
  '.gghgghggghgg...',
  '..__________....',
  '................'
];
const flower = (a, b) => [
  '................',
  '................',
  '................',
  '................',
  '................',
  `.....${a}...........`,
  `....${a}${b}${a}...${a}......`,
  `.....${a}.h.${a}${b}${a}.....`,
  `.....h.jh.${a}.h....`,
  '....hjhjh..jh....',
  '.....gjhgjhjg....',
  '......gghgg......',
  '.......___.......',
  '................',
  '................',
  '................'
].map(r => r.slice(0, 16).padEnd(16, '.'));
G['flower-red'] = flower('1', 'X');
G['flower-violet'] = flower('4', 'e');
G['flower-white'] = flower('7', 'X');
G['pebbles'] = [
  '................', '................', '................', '................', '................',
  '................', '................', '................',
  '..........kk....',
  '...kkk...kRtk...',
  '..kRrtk..kttk...',
  '..kttTk...kk....',
  '...kkk..........',
  '................',
  '................',
  '................'
];
G['shell'] = [
  '................', '................', '................', '................', '................',
  '................', '................', '................',
  '................',
  '......qqq.......',
  '.....qpppq......',
  '.....qp1pq......',
  '......qPq.......',
  '.......q........',
  '................',
  '................'
];
G['starfish'] = [
  '................', '................', '................', '................', '................',
  '................', '................',
  '.......I........',
  '.......i........',
  '....IiiiiiI.....',
  '......iai.......',
  '.....ia.ai......',
  '.....I...I......',
  '................',
  '................',
  '................'
];
G['rock'] = [
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkRrrRRtkk...',
  '..kRrrRRRRttTk..',
  '..kRRRRRRttTTk..',
  '.kRRRRRtttttTyk.',
  '.ktRRttttttTTyk.',
  '.kttttttTTTTyyk.',
  '..kTTTTTTTTyyk..',
  '..__kkkkkkkk__..',
  '...__________...',
  '................',
  '................'
];
G['pot'] = [
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '....kOooooUk....',
  '....kkkkkkkk....',
  '.....kOooUk.....',
  '....kOoOOOuk....',
  '...kOooOOOuUk...',
  '...kOoOOOOuUk...',
  '...kOOOOOOuUk...',
  '...kuOOOOuuUk...',
  '....kuuuuUUk....',
  '...__kkkkkk__...',
  '....________....',
  '................'
];
G['chest'] = [
  '................',
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..kOooooooooOk..',
  '..kMmOooooOMMk..',
  '..kvMuuuuuuMvk..',
  '..kkkkkXXkkkkk..',
  '..kOMooiioMOuk..',
  '..kOMOOkkOMOuk..',
  '..kOMOOOOOMOuk..',
  '..kuvuuuuuvuUk..',
  '..kkkkkkkkkkkk..',
  '..____________..',
  '................',
  '................'
];
G['chest-open'] = [
  '................',
  '...kkkkkkkkkk...',
  '..kuuuuuuuuuuk..',
  '..kUOOOOOOOOUk..',
  '..kUuuuuuuuuUk..',
  '..kvMuuuuuuMvk..',
  '..kKKKKKKKKKKk..',
  '..kkkkkkkkkkkk..',
  '..kOMooooooMOk..',
  '..kOMOOOOOOMuk..',
  '..kOMOOOOOOMuk..',
  '..kuvuuuuuuvUk..',
  '..kkkkkkkkkkkk..',
  '..____________..',
  '................',
  '................'
];
G['sign'] = [
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..koooooooooOk..',
  '..kOuuOuuuOOuk..',
  '..kOOOOOOOOOuk..',
  '..kOuuuOuuOOuk..',
  '..kuuuuuuuuuUk..',
  '...kkkkUukkkk...',
  '......kUuk......',
  '......kUuk......',
  '......kUuk......',
  '....__kUuk__....',
  '.....__kk__.....',
  '................',
  '................'
];
// Ground anchors: most props stand on row 12; taller grass, the pot and cut bushes on row 13, flowers on row 11.
const ANCHORS = { 'bush-cut': [8, 13], 'grass-a': [8, 13], 'grass-b': [8, 13], 'grass-cut': [8, 13], pot: [8, 13], 'flower-red': [8, 11], 'flower-violet': [8, 11], 'flower-white': [8, 11] };
const frames = Object.entries(G).map(([name, rows]) => ({ name, ...(ANCHORS[name] && { anchor: ANCHORS[name] }), ops: [{ op: 'grid', x: 0, y: 0, rows }] }));
// Tall grass and flowers sway by alternating authored poses; cut variants are separate frames.
const animations = {
  'grass-sway': { frames: ['grass-a', 'grass-b'] },
  'bush': { frames: ['bush'] }
};
frames.find(f => f.name === 'grass-a').duration = 700;
frames.find(f => f.name === 'grass-b').duration = 500;
writeJSON('art/recipes/props.json', { version: 1, name: 'props', width: 16, height: 16, palette: linkedPalette(), anchor: [8, 12], frames, animations, sheet: { columns: 8, trim: true } }, { force: process.argv.includes('--force') });
console.log('frames', frames.length);
