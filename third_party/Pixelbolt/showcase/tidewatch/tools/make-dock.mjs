// One-time scaffold for the pier tiles (16x16) and headland boulders (32x32).
import { linkedPalette, writeJSON } from './common.mjs';
const force = { force: process.argv.includes('--force') };
const mirror = rows => rows.map(row => [...row].reverse().join(''));
// Planks run across the pier; every fourth row is a gap. Grain specks are hand-placed per plank.
const deckL = [
  'kUooooooooooooow', 'kUOOOOOOOOOOOOOO', 'kvOOOOuOOOOOOOuO', 'kUuuuuuuuuuuuuuu',
  'kUoooooooooooooo', 'kUOOOOOOOuOOOOOO', 'kvOOOuOOOOOOOOOO', 'kUuuuuuuuuuuuuuu',
  'kUoooooooooooooo', 'kUOOOOOOOOOOOuOO', 'kvOOOOOOuOOOOOOO', 'kUuuuuuuuuuuuuuu',
  'kUoooooooooooooo', 'kUOOuOOOOOOOOOOO', 'kvOOOOOOOOOOuOOO', 'kUuuuuuuuuuuuuuu'
].map(r => r.replace('w', 'o'));
const deckR = mirror(deckL).map(r => r.replace(/o/g, 'O').replace(/^(.{14})Uk$/, '$1uk'));
const endL = [...deckL.slice(0, 12), 'kUuuuuuuuuuuuuuu', 'kkUUUUUUUUUUUUUU', '.kkkkkkkkkkkkkkk', '................'];
const endR = [...deckR.slice(0, 12), 'uuuuuuuuuuuuuuUk', 'UUUUUUUUUUUUUUkk', 'kkkkkkkkkkkkkkk.', '................'];
const postsL = ['.kUuk...........', '.kUuk...........', '.kUuk...........', '.kUuk...........', 'wkUukw..........', '.WWWW...........', '................', ...Array(9).fill('................')];
const postsR = mirror(postsL);
const tiles = { 'deck-l': deckL, 'deck-r': deckR, 'end-l': endL, 'end-r': endR, 'posts-l': postsL, 'posts-r': postsR };
writeJSON('art/recipes/dock.json', { version: 1, name: 'dock', width: 16, height: 16, palette: linkedPalette(), frames: Object.entries(tiles).map(([name, rows]) => ({ name, ops: [{ op: 'grid', x: 0, y: 0, rows }] })), sheet: { columns: 6 } }, force);
// Boulders: a broad lit top plane, a darker face, cracks following the planes, a grounded shadow.
const boulders = {
  'boulder-a': [
    '................................', '................................', '................................', '................................',
    '................................', '..........kkkkkkkk..............', '........kkRrrrrRRRkk............', '.......kRrrrrRRRRRRtk...........',
    '......kRrrrRRRRRRRRttk..........', '.....kRrrRRRRRRRRRRtttkk........', '....kRrRRRRRRRRRRRRttttRkk......', '...kRRRRRRRRRRRRRttttTttRRk.....',
    '...kRRRRRRRRRRRRtttttTttRRRk....', '..kRRRRRRRRRRttttttttTtttRRtk...', '..kRRRRRRRtttttttttTTTttttttk...', '..ktRRRRtttttttttTTyTTtttttTTk..',
    '.kttttttttttttttTTyyTTTtttTTTk..', '.kttTtttttttttTTTyTTTTTTTTTTTk..', '.ktTTTtttttTTTTTyTTTTTTTTTTyyk..', '.kTTTTTTTTTTTTTTyTTTTTTTTyyyyk..',
    '..kTTTTTTTTTTTTyyTTTTTTyyyyyk...', '..kyTTTTTTTTTTTyyyyyyyyyyyyk....', '...kyyyTTTTTyyyyyyyyyyyykk......', '....kkyyyyyyyyyyyyyykkkk........',
    '..____kkkkkkkkkkkkkk______......', '...______________________.......', '................................', '................................',
    '................................', '................................', '................................', '................................'
  ],
  'boulder-b': [
    '................................', '................................', '................................', '................................',
    '................................', '................................', '................................', '................................',
    '...........kkkkkk...............', '.........kkRrrrRRk..kkkk.........', '........kRrrrRRRRtkkRrRRkk.......', '.......kRrrRRRRRttkRRRRRttk......',
    '......kRrRRRRRRtttkRRRRtttTk.....', '......kRRRRRRRttttkRRRtttTTk.....', '.....kRRRRRRtttttTkRtttttTTTk....', '.....ktRRRRtttttTTykttttTTTyk....',
    '.....kttttttttTTTykTTTTTTyyk.....', '.....kTttttttTTTTyykTTTTyyyk.....', '......kTTTTTTTTTyyyykyyyyyk......', '......kyTTTTTTyyyyyykyyyykk......',
    '.......kkyyyyyyyyykkkkkkk.......', '.....__kkkkkkkkkkk________.......', '......__________________........', '................................',
    ...Array(8).fill('................................')
  ].map(r => r.slice(0, 32))
};
const ROCK_ANCHORS = { 'boulder-a': [16, 23], 'boulder-b': [16, 20] };
writeJSON('art/recipes/rocks.json', { version: 1, name: 'rocks', width: 32, height: 32, palette: linkedPalette(), frames: Object.entries(boulders).map(([name, rows]) => ({ name, anchor: ROCK_ANCHORS[name], ops: [{ op: 'grid', x: 0, y: 0, rows }] })), sheet: { trim: true } }, force);
console.log('dock and rocks written');
