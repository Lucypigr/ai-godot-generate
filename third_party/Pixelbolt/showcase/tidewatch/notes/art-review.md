# Tidewatch art review

Self-review against [the brief](../brief.md), made from native and enlarged contact sheets, silhouette/onion views and in-game captures at 240×160. This is one agent's judgment, not an independent review. Passing tests says nothing about any of this.

## What reads well

- **Keeper.** The sou'wester is a strong, ownable silhouette in all four facings; the face stays readable at 1×. The attack reads as backswing → strike → recover rather than a sliding stamp, and the blade-tip marker gives an honest hitbox. The item-get pose needed a second pass (see below).
- **Crab.** Claws, eyestalks and splayed legs survive at 1×; the snap raises the body and changes the eyes, so the action is legible before the hit frame.
- **Shoreline.** The 47-tile blob set joins cleanly at inner corners, one-tile strips and the tidal pool. Surf breathes through four phases and the translucent shallows show the animated sea beneath.
- **Lighthouse.** Cylinder shading, navy bands and the glass lantern room read at a glance; its normal pass is plausible under the lamp and beam.
- **Materials.** Surf, cut leaves (flutter), pot shards (bounce), smoke (rise and fade), splash (rise, then ring) and the translucent jelly each move differently; none is a recoloured copy of another.
- **Night.** Banded point lights on aligned normal/emissive buffers keep the art pixel-sharp; the beam only fully lights water, which reads as a beam over the sea rather than a spotlight on grass.

## Weak or unfinished

- **Terrain repetition.** Grass and sand textures repeat every 16px and are visible across large open areas; props break it up but there are no interior tile variants.
- **Oak.** The single canopy outline (first emulated with dilated cluster symbols, now one `outline` op with identical pixels) fixed the "pile of balls" look, but the canopy is nearly symmetrical and the trunk is short for the mass above it.
- **Palm.** Fronds are thin; the sway alternates two droop poses only, and coconuts are mostly hidden.
- **Side walk.** A chibi small-step cycle: the stride is readable but not weighty; the arm swing is two pixels.
- **Item-get pose.** The first version put the hands at shoulder height and the hold marker inside the hat, hiding the key. Fixed in the pose source (raised arm parts, higher `hold` point), but the long arms are stiff.
- **Small props.** Pebbles and the shell are thin; the boat's waterline strip floats slightly below the hull.
- **Lighting bands.** The lantern pool on the headland is a set of large concentric rings; stylised, but heavier than it needs to be.
- **Scene integration.** Crabs and jellies can overlap boulders and trees awkwardly because collision boxes are ground footprints only.

## Corrections made during review

| Asset | Problem seen | Correction |
| --- | --- | --- |
| Water | Diagonal dark marks read as noise; wallpaper repeat | Horizontal troughs, three shimmer variants, fewer larger crests |
| Shore | Dashed rim from 8px-periodic notches; bank shading beside side notches | One recession per edge piece, bank only over open water, softer foam phases |
| Grass | Tufts tiled into a high-contrast wallpaper | Quiet slanted blade strokes; variety moved into props |
| Keeper | Side stride too short; passing frames identical; side windup hid the blade behind the hat | Wider contact legs, distinct passing poses, horizontal backswing |
| Oak | Separately outlined clusters, floating canopy | One outline around the whole canopy (dilated clusters, later the `outline` op), trunk tucked under the canopy |
| Effects | Leaves and shards too small to read | Two-pixel flutter shapes, more and larger shards |
| Hearts | Asymmetric lobes | Symmetric 9×8 hearts |
