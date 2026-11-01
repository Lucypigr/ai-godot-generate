import { h } from '../lib/ui';

const ENGINES: [string, string, string, string][] = [
  ['Pixelbolt', 'https://github.com/skulitom/Pixelbolt', 'MIT', 'VFX 特效、流體模擬、地形規則、GIF 與 Godot SpriteFrames 輸出'],
  ['PPAE Engine', 'https://github.com/Mairon31/ppae-engine', 'Apache-2.0', '程序化角色、生物、樹木'],
  ['Autotiler', 'https://github.com/itsjavi/autotiler', 'MIT', '47 格 blob / dual grid tileset、Godot 4 / Tiled 匯出、測試地圖'],
  ['PixelPlanets', 'https://github.com/Deep-Fold/PixelPlanets', 'MIT', '像素星球、恆星、黑洞、星系（原始 Godot shader 在 WebGL 2 執行）'],
  ['PixelSpace', 'https://github.com/Deep-Fold/PixelSpace', 'MIT', '太空背景：星雲、星塵 shader'],
  ['Image-to-Pixel', 'https://github.com/Tezumie/Image-to-Pixel', 'MIT', '圖片轉像素圖：調色盤、抖色、外框'],
  ['shadermate', 'https://www.npmjs.com/package/shadermate', 'MIT', 'Image-to-Pixel 的 GPU 加速'],
  ['jsfxr', 'https://github.com/chr15m/jsfxr', 'Unlicense', '8-bit 音效產生'],
  ['Pixelorama 旋轉 shader', 'https://github.com/Orama-Interactive/Pixelorama', 'MIT', '8 方向旋轉：cleanEdge（torcado）、OmniScale'],
  ['three.js', 'https://github.com/mrdoob/three.js', 'MIT', '3D 模型（GLB / FBX / OBJ / VOX）算成 8 方向 sprite'],
  ['maxrects-packer', 'https://github.com/soimy/maxrects-packer', 'MIT', 'Sprite sheet 打包演算法'],
  ['fflate', 'https://github.com/101arrowz/fflate', 'MIT', 'ZIP 壓縮'],
  ['fast-png', 'https://github.com/image-js/fast-png', 'MIT', 'PNG 編碼（autotiler 匯出）'],
  ['pixel-sprite-generator', 'https://github.com/zfedoran/pixel-sprite-generator', 'MIT', '隨機小物的遮罩演算法（重新實作）'],
];

export function aboutPage(): HTMLElement {
  return h('div', { class: 'about' },
    h('h2', {}, '關於 Asset Forge'),
    h('p', {}, '一個在瀏覽器裡執行、不用安裝的遊戲素材工具組：VFX 特效（可用自己的圖片）、角色與生物、8 方向 sprite（圖片或 3D 模型）、地圖圖塊、星球與太空背景、圖片轉像素圖、Sprite Sheet 打包、音效，輸出 Godot 4 可以直接使用的檔案。所有運算都在你的瀏覽器裡完成，不會上傳任何圖片。'),
    h('h3', {}, '使用的開源引擎'),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, '專案'), h('th', {}, '授權'), h('th', {}, '用途'))),
      h('tbody', {}, ...ENGINES.map(([name, url, license, use]) => h('tr', {},
        h('td', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, name)), h('td', {}, license), h('td', {}, use))))),
    h('p', { class: 'muted' }, '各專案原始碼與完整授權條款位於 repo 的 third_party/ 資料夾。參考用專案列在 third_party/reference/README.md。'),
    h('h3', {}, '在 Godot 4 中使用'),
    h('ul', {},
      h('li', {}, 'SpriteFrames（.tres）：把 ZIP 裡的 .png 和 .tres 放在同一個資料夾，在 AnimatedSprite2D 的 Sprite Frames 屬性載入 .tres。'),
      h('li', {}, 'TileSet（.tres）：把 .png 和 .tres 放在一起，在 TileMapLayer 的 Tile Set 屬性載入，用 Terrains 分頁的地形筆刷繪製。'),
      h('li', {}, '音效（.wav）：直接拖進 Godot 專案，會匯入成 AudioStreamWAV，給 AudioStreamPlayer 使用。'),
      h('li', {}, '太空背景分層 PNG：放進 ParallaxBackground 的多個 ParallaxLayer，遠的層 motion_scale 設小一點。'),
      h('li', {}, '像素圖請在 專案設定 → Rendering → Textures 把 Default Texture Filter 設為 Nearest。')));
}
