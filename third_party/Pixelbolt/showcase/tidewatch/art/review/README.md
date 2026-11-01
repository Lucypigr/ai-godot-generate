# Review captures

Contact sheets, onion views, tile mosaics and early drafts saved while authoring Tidewatch. They are evidence of the review loop, not sources: several show states that were later corrected (for example `keeper-draft.*` is the first hand-drawn keeper before it became a pose source, and the first `water`/`test-island` captures show the repetition that was fixed). `scene-scene-3x.png` is the first night review, when scene lighting only reached assets with material passes; `scene-night-scope-all-3x.png` is the same window after `lighting.scope: "all"` and the banding fix. The authoritative art is in `../recipes`, `../poses` and `../terrain`.

Regenerate a sheet with the CLI, for example:

```sh
node bin/pixelbolt.js inspect showcase/tidewatch/art/recipes/keeper.json --animation walk-r --view onion --out walk-r-onion.png
node bin/pixelbolt.js scene showcase/tidewatch/art/scenes/tidewatch-headland-night.scene.json --out night-review
```
