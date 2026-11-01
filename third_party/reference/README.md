# Reference projects

Open-source projects copied for reference (without `.git` history). Each keeps its
own LICENSE file. Only projects with a permissive license file were copied.

| Directory | Upstream | Commit | License | Useful for |
|---|---|---|---|---|
| `odrick_free-tex-packer/` | https://github.com/odrick/free-tex-packer | `c972c97` | MIT | Sprite sheet / atlas packing, Godot/Phaser/Pixi exporters |
| `andrewrexo_opentxpacker/` | https://github.com/andrewrexo/opentxpacker | `bcea64b` | MIT | Browser atlas packer (Svelte) |
| `soimy_maxrects-packer/` | https://github.com/soimy/maxrects-packer | `8604685` | MIT | MaxRects bin packing algorithm |
| `piskelapp_piskel/` | https://github.com/piskelapp/piskel | `85800e3` | Apache-2.0 | Browser sprite editor, GIF/sheet export |
| `pixijs-userland_particle-emitter/` | https://github.com/pixijs-userland/particle-emitter | `0fffdd9` | MIT | Particle emitter behaviours (VFX) |
| `kchapelier_wavefunctioncollapse/` | https://github.com/kchapelier/wavefunctioncollapse | `f1374ee` | MIT | WFC in JavaScript (map generation) |
| `LingDong-_ndwfc/` | https://github.com/LingDong-/ndwfc | `3479af8` | MIT | N-dimensional / infinite WFC in JS |
| `mxgmn_WaveFunctionCollapse/` | https://github.com/mxgmn/WaveFunctionCollapse | `de7d22e` | MIT | Original WFC (C#) |
| `zfedoran_pixel-sprite-generator/` | https://github.com/zfedoran/pixel-sprite-generator | `8c2cee7` | MIT | Procedural mask-based sprites |
| `ArtBIT_pixel-sprite-generator/` | https://github.com/ArtBIT/pixel-sprite-generator | `d930042` | MIT | Procedural sprite sheets |
| `shikaan_pickcells/` | https://github.com/shikaan/pickcells | `2fb2576` | MIT | Procedural pixel art variations (TS + Vite) |
| `ttencate_jfxr/` | https://github.com/ttencate/jfxr | `e971e4c` | BSD-3-Clause | Browser sound effect generator |
| `mneubrand_jsfxr/` | https://github.com/mneubrand/jsfxr | `b2bfe50` | Apache-2.0 | sfxr port (JS library) |
| `Zed2101_dither-studio/` | https://github.com/Zed2101/dither-studio | `a814d8e` | MIT | Dithering algorithms |
| `Experience-Monks_msdf-bmfont/` | https://github.com/Experience-Monks/msdf-bmfont | `4c4b890` | MIT | TTF to BMFont (MSDF) |
| `vladimirgamalian_fontbm/` | https://github.com/vladimirgamalian/fontbm | `7677b90` | MIT | BMFont generator (C++ CLI) |
| `johnnesky_beepbox/` | https://github.com/johnnesky/beepbox | `355e510` | MIT | Chiptune music editor and synth |

## Excluded

- `mxgmn_WaveFunctionCollapse`: `samples/`, `images/` and `tilesets/` were not copied.
  Per its README, many samples come from third-party artists and games (e.g. Ultima IV,
  Nyan Cat) and are not covered by the MIT license of the code.
- `LingDong-_ndwfc`: `screenshots/` not copied (size only).
- Test fonts (`*.ttf`) in `msdf-bmfont` and `fontbm` were not copied.
- `codingtrain/wave-function-collapse` was **not** copied: it has no license file.
