// Tidewatch Isle. Terrain is a text grid; objects are placed on tile coordinates (x = tile column, y = the
// tile row whose bottom edge the object stands on). Terrain legend: ~ sea, . sand, g grass, D pier deck, P pier posts.
export const TERRAIN = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~......~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~..........~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~...gggggg...~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~..gggggggggg..~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~..gggggggggg..~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~..gggggggggg..~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~..gggg..gggg..~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~..ggg..ggg..~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~..gg..gg..~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~..g..g..~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~.......g..g.......~~~~~~~~~~~',
  '~~~~~~~~.....gggggg..gggggg.....~~~~~~~~',
  '~~~~~~...gggggggggg..gggggggggg...~~~~~~',
  '~~~~~..gggggggggggg..gggggggggggg...~~~~',
  '~~~~..ggggggggggggg..ggggggggggggg....~~',
  '~~~~..ggggggggggggg..gggggggggggg.....~~',
  '~~~~..gggggggggggggg..gggggggggg......~~',
  '~~~~..ggggggggggggggg..ggggggggg......~~',
  '~~~~..gggggggggggggggg..gggggggg.....~~~',
  '~~~~~..gggggggggggggggg..ggggggg.....~~~',
  '~~~~~..ggggggggggggggggg...gggg....~~~~~',
  '~~~~~~..gggggggggg...........gg...~~~~~~',
  '~~~~~~.....gggg.................~~~~~~~~',
  '~~~~~~~..~~...................~~~~~~~~~~',
  '~~~~~~~..~~.................~~~~~~~~~~~~',
  '~~~~~~~~~.......~~DD~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~DD~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~DD~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~PP~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
];
export const TILE = 16, COLS = TERRAIN[0].length, ROWS = TERRAIN.length;
export const at = (x, y) => TERRAIN[y]?.[x] ?? '~';
export const isSand = (x, y) => '.g'.includes(at(x, y));
export const isGrass = (x, y) => at(x, y) === 'g';
export const walkable = (x, y) => '.gD'.includes(at(x, y));

// Objects: [kind, tileX, tileY, extra]. Positions are the tile whose bottom-centre the object stands on.
export const OBJECTS = [
  ['lighthouse', 20, 8, { dx: -8 }], ['cottage', 9, 15, { dx: 8 }],
  ['lamp', 13, 15], ['lamp', 17, 26], ['lamp', 22, 12], ['lamp', 22, 3],
  ['sign', 21, 26], ['fisher', 18, 29, { dx: 6 }], ['boat', 21, 29, { dx: 4, dy: 4 }],
  ['palm', 5, 15], ['palm', 4, 19, { dx: 6 }], ['palm', 7, 24], ['palm', 34, 14], ['palm', 37, 21, { dx: -6 }], ['palm', 13, 25], ['palm', 30, 24],
  ['oak', 11, 13], ['oak', 26, 15], ['oak', 15, 21], ['oak', 29, 19], ['oak', 6, 18, { dx: 4 }],
  ['bush', 7, 16], ['bush', 8, 17], ['bush', 27, 14], ['bush', 28, 13], ['bush', 16, 5], ['bush', 23, 5], ['bush', 13, 19], ['bush', 25, 21],
  ['bush', 7, 21], ['bush', 31, 17], ['bush', 17, 13], ['bush', 24, 13], ['bush', 10, 22],
  ['grass', 13, 17], ['grass', 14, 17], ['grass', 15, 17], ['grass', 14, 18], ['grass', 15, 18], ['grass', 16, 18], ['grass', 13, 18],
  ['grass', 23, 16], ['grass', 24, 16], ['grass', 25, 16], ['grass', 24, 17], ['grass', 25, 17], ['grass', 26, 17],
  ['grass', 8, 19], ['grass', 9, 19], ['grass', 8, 20], ['grass', 9, 20, { item: 'flint' }], ['grass', 10, 20],
  ['grass', 16, 7], ['grass', 17, 7], ['grass', 22, 7], ['grass', 23, 7], ['grass', 21, 19], ['grass', 20, 21],
  ['flower-red', 10, 17], ['flower-violet', 18, 15], ['flower-white', 24, 19], ['flower-red', 17, 6], ['flower-violet', 22, 5], ['flower-white', 6, 17],
  ['flower-red', 29, 16], ['flower-white', 12, 21], ['flower-violet', 27, 20], ['flower-red', 19, 5], ['flower-white', 9, 14],
  ['rock', 15, 3], ['rock', 24, 3], ['rock', 30, 12], ['rock', 33, 21], ['rock', 8, 24], ['rock', 27, 24], ['rock', 14, 9],
  ['boulder-a', 34, 16], ['boulder-a', 37, 18, { dx: -4 }], ['boulder-b', 33, 19], ['boulder-b', 14, 5, { dx: -4 }], ['boulder-a', 26, 6],
  ['pot', 7, 15], ['pot', 12, 16], ['pot', 13, 16], ['pot', 33, 18], ['pot', 36, 20], ['pot', 16, 12],
  ['chest', 36, 17, { item: 'key' }],
  ['shell', 12, 24], ['starfish', 22, 25], ['pebbles', 25, 23], ['shell', 31, 22], ['starfish', 35, 16], ['pebbles', 9, 12], ['shell', 16, 26], ['pebbles', 29, 12]
];
export const ENEMIES = [
  ['crab', 33, 17], ['crab', 35, 20], ['crab', 32, 21], ['crab', 14, 25], ['crab', 25, 25],
  ['jelly', 10, 18], ['jelly', 16, 16], ['jelly', 27, 17], ['jelly', 17, 6], ['jelly', 23, 7]
];
export const START = { x: 19 * TILE + 8, y: 28 * TILE + 12 };
