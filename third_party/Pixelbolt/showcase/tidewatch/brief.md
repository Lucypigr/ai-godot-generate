# Tidewatch — art brief

An original top-down (3/4 view) action-adventure vignette. A young lighthouse keeper arrives on a small island at late afternoon to relight the lamp before night falls. Everything is authored with Pixelbolt; no imported art, fonts or image models.

## Format

- **Native resolution:** 240×160 viewport, 16×16 tiles, displayed at an integer scale (3× or 4×). Review every asset at 1× and at the display scale.
- **Perspective:** ground seen from above; characters, trees and buildings seen from a shallow front angle. Objects are y-sorted by their ground contact point.
- **Light:** late-afternoon sun from the upper left. Highlights on upper-left planes, occlusion along lower-right contours, cast shadows are soft translucent ovals below and slightly right of objects. At night, light comes only from authored emissive sources (lamps, lighthouse, fireflies) through aligned normal/emissive passes.

## Palette roles

One shared 57-color palette (`art/palette.json`) with hue-shifted ramps: shadows lean violet/teal, highlights lean yellow.

| Role | Keys | Notes |
| --- | --- | --- |
| Outline / occlusion | `k K L` | Near-black violet, never pure black. Characters use a darker version of the adjacent fill where the outline meets light (sel-out). |
| Foliage | `G g h j l` | Grass base is `h`; `l` only on sunlit tips. |
| Sand | `s S d D` | `d` doubles as wet sand at the waterline. |
| Water | `w W c C n N` | `w` foam only. Deep water `n/N`; shore shallows `c/W`. |
| Rock | `r R t T y` | Planes: top `R/r`, face `t`, occlusion `T/y`. |
| Wood | `o O u U` | Grain runs along the plank/trunk. |
| Keeper | `p P q` skin, `a A z` copper hair, `e E f F` yellow oilskin coat, `b B V` navy trousers/boots | Coat is the brightest warm shape on screen by day. |
| Metal | `m M v` | Cutlass, lamp frames, hinges. |
| Fire / light | `x X i I` | Reserved for flames, lamp glass and emissive passes. |
| Accents | `1 2 3` coral/red, `4 5 6` violet, `7 8 9` neutrals | Crabs and hearts use red; brine jellies violet; UI neutrals. |
| Shadow | `_` | `#1b152866`, translucent cast shadow. The only alpha color in color passes. |

## Landmarks

- **Keeper:** wide-brimmed sou'wester hat (back brim longer), bright coat with a dark belt, copper fringe, short cutlass. Readable from all four facings as a yellow triangle-on-rectangle.
- **Lighthouse:** tapered tower, three navy bands, glass lantern room with a railing, on a raised rock plateau. The tallest silhouette on the map.
- **Island:** crescent beach on the south with a dock, grass interior with tall grass fields, a cliff plateau in the north.

## Materials

- Grass: small clustered blades, not noise. Tall grass is a separate object that can be cut, leaving stubs.
- Sand: sparse pebbles and shell accents; wet sand band at the water line.
- Water: horizontal ripple dashes that drift through palette cycling; foam breathes in and out along the shore.
- Rock: faceted planes with a consistent top-left light; cliffs have a lit rim and darker vertical face.
- Effects each get their own behavior: leaves scatter and flutter down, pottery breaks into shards that bounce, water splashes up then rings outward, smoke puffs rise and fade.

## Motion

- Keeper walk: four poses per facing (contact, passing, contact, passing) with a 1px bob. Attack: anticipation, smear, follow-through, recover. Hurt: recoil pose.
- Crab: sideways scuttle with alternating legs; claw raise and snap. Jelly: squash-and-stretch hop.
- Loops should have no obvious jump; one-shot effects end empty.

## Acceptance

Each asset gets a native-size contact sheet, silhouette and grayscale review, and, for animations, onion and actual playback. Record honest strengths and weaknesses in `notes/art-review.md`. Passing validation is not evidence of art quality.
