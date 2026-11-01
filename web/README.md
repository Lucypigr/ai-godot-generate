# Asset Forge 遊戲素材工坊

在瀏覽器裡執行的遊戲素材工具，輸出 Godot 4 可以直接使用的檔案。所有運算都在瀏覽器本地完成，不會上傳圖片。

| 分頁 | 功能 | 引擎 |
|---|---|---|
| VFX 特效 | 特效預設（火球、爆炸、雷電、冰、毒、營火、瀑布…），可調色盤、幀數、速度、種子；含流體模擬。**上傳圖片**：當粒子形狀、讓角色傳送 / 光環 / 飄散 / 碎裂 / 燃燒，或套用溶解、受擊閃白、冰凍等 10 種動畫特效 | Pixelbolt fx / fluid |
| 8 方向 | **上傳圖片**：俯視角圖片用像素畫旋轉演算法轉 4 / 8 / 16 方向；畫好的方向自動鏡像補齊 8 方向；**上傳 3D 模型**（GLB / FBX / OBJ / VOX）含動畫算成 8 方向像素 sprite | Pixelorama 旋轉 shader（cleanEdge、OmniScale）、three.js |
| 角色 / 生物 | 程序化人物（8 方向 × 多種動作）、生物 / 怪物、樹木生長階段、隨機小物 | PPAE Engine、mask 產生器 |
| 地圖圖塊 | 程序產生地形或上傳模板 → 47 格 blob / 16 格 dual grid tileset，含可繪製的測試地圖 | autotiler + Pixelbolt terrain |
| 星球 / 太空 | 12 種會自轉的像素星球（類地、海洋、冰、熔岩、氣態、環狀、恆星、黑洞、星系、小行星），輸出無縫循環動畫；太空背景（星雲、星塵、星星、小星球）可分層匯出 | PixelPlanets、PixelSpace（原始 Godot shader 轉 WebGL 2） |
| 圖片轉像素 | 照片或手繪轉像素圖，29 種調色盤或自動萃取，17 種抖色，外框與清理 | Image-to-Pixel |
| 音效 | 金幣、雷射、爆炸、跳躍等 8-bit 音效，所有參數可調，匯出 WAV，音效庫一次匯出 | jsfxr |
| Sprite Sheet 打包 | 上傳散圖 / GIF / 現有 sheet（可切割）→ MaxRects 打包 | maxrects-packer |

## 匯出格式

- **Sprite Sheet PNG** + **JSON**（TexturePacker hash 格式，Phaser、Pixi 等引擎都能讀）
- **Godot 4 SpriteFrames `.tres`**：給 `AnimatedSprite2D` 用，每個動畫（例如 `walk_S`）都已設好幀與速度
- **Godot 4 TileSet `.tres`**：含地形 peering bits（可直接用地形筆刷）與碰撞
- **Tiled `.tsx`**、**GIF**、Godot 3（舊版）
- **WAV**（Godot 匯入成 AudioStreamWAV）、調色盤 **.gpl / .hex**、太空背景分層 PNG

## 開發

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # 輸出到 web/dist，可部署到任何靜態網站
npm run typecheck
```

引擎原始碼直接從 `../third_party/` 匯入（見 `vite.config.ts` 的 alias），沒有另外複製一份。

`src/lib/godot-shader.ts` 會把 Godot 的 canvas_item shader 轉成 WebGL 2 GLSL，並讀取 `.tscn` / `.tres` 裡的材質參數和圖層位置，所以 PixelPlanets、PixelSpace 和 Pixelorama 的旋轉 shader 都是直接執行原始檔案，沒有手動改寫。需要支援 WebGL 2 的瀏覽器。
