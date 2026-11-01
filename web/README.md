# Asset Forge 遊戲素材工坊

在瀏覽器裡執行的遊戲素材工具，輸出 Godot 4 可以直接使用的檔案。所有運算都在瀏覽器本地完成，不會上傳圖片。

| 分頁 | 功能 | 引擎 |
|---|---|---|
| VFX 特效 | 特效預設（火球、爆炸、雷電、冰、毒、營火、瀑布…），可調色盤、幀數、速度、種子；含流體模擬 | Pixelbolt fx / fluid |
| 角色 / 生物 | 程序化人物（8 方向 × 多種動作）、生物 / 怪物、樹木生長階段、隨機小物 | PPAE Engine、mask 產生器 |
| 地圖圖塊 | 程序產生地形或上傳模板 → 47 格 blob / 16 格 dual grid tileset，含可繪製的測試地圖 | autotiler + Pixelbolt terrain |
| Sprite Sheet 打包 | 上傳散圖 / GIF / 現有 sheet（可切割）→ MaxRects 打包 | maxrects-packer |

## 匯出格式

- **Sprite Sheet PNG** + **JSON**（TexturePacker hash 格式，Phaser、Pixi 等引擎都能讀）
- **Godot 4 SpriteFrames `.tres`**：給 `AnimatedSprite2D` 用，每個動畫（例如 `walk_S`）都已設好幀與速度
- **Godot 4 TileSet `.tres`**：含地形 peering bits（可直接用地形筆刷）與碰撞
- **Tiled `.tsx`**、**GIF**、Godot 3（舊版）

## 開發

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # 輸出到 web/dist，可部署到任何靜態網站
npm run typecheck
```

引擎原始碼直接從 `../third_party/` 匯入（見 `vite.config.ts` 的 alias），沒有另外複製一份。
