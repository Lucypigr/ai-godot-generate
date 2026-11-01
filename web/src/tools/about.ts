import { h } from '../lib/ui';

const ENGINES: [string, string, string, string][] = [
  ['Pixelbolt', 'https://github.com/skulitom/Pixelbolt', 'MIT', 'VFX 特效、流體模擬、地形規則、GIF 與 Godot SpriteFrames 輸出'],
  ['PPAE Engine', 'https://github.com/Mairon31/ppae-engine', 'Apache-2.0', '程序化角色、生物、樹木'],
  ['Autotiler', 'https://github.com/itsjavi/autotiler', 'MIT', '47 格 blob / dual grid tileset、Godot 4 / Tiled 匯出、測試地圖'],
  ['maxrects-packer', 'https://github.com/soimy/maxrects-packer', 'MIT', 'Sprite sheet 打包演算法'],
  ['fflate', 'https://github.com/101arrowz/fflate', 'MIT', 'ZIP 壓縮'],
  ['fast-png', 'https://github.com/image-js/fast-png', 'MIT', 'PNG 編碼（autotiler 匯出）'],
  ['pixel-sprite-generator', 'https://github.com/zfedoran/pixel-sprite-generator', 'MIT', '隨機小物的遮罩演算法（重新實作）'],
];

export function aboutPage(): HTMLElement {
  return h('div', { class: 'about' },
    h('h2', {}, '關於 Asset Forge'),
    h('p', {}, '一個在瀏覽器裡執行、不用安裝的遊戲素材工具組：VFX 特效、角色與生物、地圖圖塊、Sprite Sheet 打包，輸出 Godot 4 可以直接使用的檔案。所有運算都在你的瀏覽器裡完成，不會上傳任何圖片。'),
    h('h3', {}, '使用的開源引擎'),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, '專案'), h('th', {}, '授權'), h('th', {}, '用途'))),
      h('tbody', {}, ...ENGINES.map(([name, url, license, use]) => h('tr', {},
        h('td', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, name)), h('td', {}, license), h('td', {}, use))))),
    h('p', { class: 'muted' }, '各專案原始碼與完整授權條款位於 repo 的 third_party/ 資料夾。參考用專案列在 third_party/reference/README.md。'),
    h('h3', {}, '在 Godot 4 中使用'),
    h('ul', {},
      h('li', {}, 'SpriteFrames（.tres）：把 ZIP 裡的 .png 和 .tres 放在同一個資料夾，在 AnimatedSprite2D 的 Sprite Frames 屬性載入 .tres。'),
      h('li', {}, 'TileSet（.tres）：把 .png 和 .tres 放在一起，在 TileMapLayer 的 Tile Set 屬性載入，用 Terrains 分頁的地形筆刷繪製。'),
      h('li', {}, '像素圖請在 專案設定 → Rendering → Textures 把 Default Texture Filter 設為 Nearest。')));
}
