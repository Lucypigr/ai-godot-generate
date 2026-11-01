Original prompt: Take a look at PixelForge folder. I would like to stress test the abilities. Can you file a bug report and place it into the repo once you are finished? I'm thinking we can demo it by starting a new project a megaman like game (but in fantasy world) the twist? we have lots of detailed pixel art animations, characters ground, environment, actions, impact of actions on environment etc. we can make this a webapp which we can host on github pages, so as to be able to link to it as a demo of this project capabilities. Feel free to set up github and use mit licence i'm already logged in

## Approach

- Standalone, dependency-free browser game in `demo/`, deployed from this public MIT repository to GitHub Pages.
- Original fantasy action platformer: Emberfall. PixelForge recipes and exported atlases power every sprite and scenery asset.
- Exercise symbols, layers, frame inheritance, varying durations, pingpong, once-only effects, atlas export, inspection, patching, CLI, MCP and runtime. Record measured results and reproducible toolkit bugs.
- Preserve the zero-dependency toolkit. Browser QA dependencies stay outside the repository.

## Art direction

- Midnight ink #111b29, blue slate #2d4560, mist #96c4bd, moon ivory #eaf1ce, ember #ffa85b, plum #80609b.
- Scene first: a wide animated forest/ruin diorama with an ivory-armored, teal-cloaked spell knight. Pixel silhouettes, clustered highlights, original artwork, no external asset dependencies.
- Quiet page chrome in a slate palette, Georgia display title and system UI controls. Game occupies the hero area; controls and optional atlas explorer sit below.
- Centered game with left-aligned supporting content. On mobile, landscape-friendly canvas and touch buttons.

## Baseline

- 2026-09-27: repository clean at 092b457, main, origin skulitom/PixelForge. GitHub CLI authenticated. Existing MIT license.
- Baseline: all 46 toolkit tests pass. GitHub Pages not configured.
- Read AGENTS.md, PixelForge authoring skill/guide, game integration guide, develop-web-game and frontend-design skills.

## Outstanding

- User changed scope: keep the demo local and polish it before any hosting. Do not deploy to Pages or publish this work yet.

## Implementation and QA

- Added original recipe generator and nine asset collections: 220 frames, 44 named animations. All art is rendered by PixelForge; no imported art or image service.
- Built game simulation, Canvas atlas renderer, responsive page, touch controls, three spells, charge shots, dash, double jump, enemies, environmental reactions, boss, checkpoints, victory, and a guided play mode.
- Local preview running at http://127.0.0.1:4173 via `scripts/serve-emberfall.mjs`.
- Initial browser QA: movement, double jump, charge, freezing/reigniting braziers, pause/resume, dash, 400 extra sprites, gallery, restart, full guided completion and mobile movement pass with no console errors.
- Visual review prompted a second art pass: connected irregular foliage, organic soil and roots, engraved armor, stonework cracks and ivy, banners, mushrooms, ferns, hanging lanterns and rubble.
- Browser QA and screenshots are in ignored `output/emberfall/`. Playwright installed outside the repo under the web-game skill; no project runtime dependencies added.

## Completed validation

- `npm test`: 50/50 passing, including four gameplay sequence tests. Baseline toolkit source remains unchanged.
- `npm run stress:emberfall`: nine recipes, 220 frames, 44 animations, deterministic bundles, CLI validation, maximum source area, bounded comparison images, real MCP revision/patch/restart/inspect/render workflow.
- Independent Pillow and ZIP verification: all 220 source frames and 220 APNG playback frames match atlas pixels, timing and loop flags exactly.
- Browser QA: 15 scenarios passing, no page/console errors. Checked real touch jump, mobile controls, sound and fullscreen in addition to gameplay.
- Real RAF benchmark: approximately 60 fps at 0 / 160 / 400 extra actors in local headless Chromium. Not a mobile performance claim.
- Final source-art contact sheets and gameplay/desktop/mobile screenshots visually reviewed.
- In-repo bug report: `docs/bugreports/emberfall-stress-test.md`; raw evidence: `docs/bugreports/emberfall-evidence.json`. Two confirmed bugs (ZIP entry-count overflow and stamp-symbol type coercion), plus the documented preview-size/export workflow limitation. No remote issues filed.
- Local launch: `npm run play`. Preview remains running at http://127.0.0.1:4173. Added demo README, MIT license copy, downloadable recipe/export links and root README entry.

## Follow-up scope

- User review of art direction and play feel before any publication.
- Fix the two reported toolkit bugs as a separate follow-up; they remain reproducible in this snapshot.
- Real-device touch ergonomics, Safari/Firefox testing, difficulty tuning and more levels are future work.

## Art-quality review — 2026-09-27

- User found the art too visibly assembled from basic shapes and asked for an Animal Well quality comparison, then clarified that the main objective is improving PixelForge itself.
- Added `docs/reports/pixelforge-art-quality-roadmap.md`: seven prioritized toolkit proposals, existing capabilities, local evidence, first-party references, acceptance criteria and a controlled quality benchmark.
- Reviewed source and rendered contact sheets. Audit in `docs/reports/emberfall-art-audit.json`: 220 frames, 44 animations, 181 distinct rendered RGBA images when counted within the nine recipes. Repetition may be intentional; these counts are not an art score.
- Identified source-level studio onion-skin limitation: it selects the preceding recipe frame, which can differ from the preceding animation entry. Report marks this as source-inspected, not browser-reproduced.
- Review recommends stronger craft examples and inspection first, then regional editing, pose structure, scene context, interchange and optional material passes. Features remain proposals; no toolkit or game behavior changed. Keep work local; no publishing or hosting.
- Validation: checked report/document local links and recomputed source hashes and frame/animation counts for all nine recipes and 44 animations; `git diff --check` passed. No functional changes, so the gameplay suite was not rerun for this documentation review.
