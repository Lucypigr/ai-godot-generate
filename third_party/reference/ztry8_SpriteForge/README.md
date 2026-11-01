# SpriteForge

[![GitHub last commit](https://img.shields.io/github/last-commit/ztry8/spriteforge)](https://github.com/ztry8/spriteforge/commits)
[![License](https://img.shields.io/github/license/ztry8/spriteforge)](https://github.com/ztry8/spriteforge/blob/main/LICENSE)

## Simple and fast tool to render 8-directional sprites from 3D models

### About
When making retro-style games (like Daggerfall or classic Doom-era titles),    
3D characters are often represented as pre-rendered 2D sprites from multiple angles.    
Creating these by hand is tedious and inconsistent.

SpriteForge automates the process: given a `.obj` model and a texture,    
it renders 8 directional views (`BACK_LEFT`, `BACK`, `BACK_RIGHT`, `RIGHT`, `FRONT_RIGHT`, `FRONT`, `FRONT_LEFT`, `LEFT`) using OpenGL    
and saves each frame as a PNG sprite, ready to use in your game engine.    

**Two modes are supported:**

- **Static mode** — render a single model from all 8 directions.
- **Animation mode** — render a sequence of OBJ frames (e.g. a walking cycle) from all 8 directions, producing a full directional animation set.

Each direction is saved into its own subfolder. 
Optionally, it can also produce a single sprite sheet with all 8 directions combined.

The camera elevation, sprite size, and background color are all configurable.    
Transparent backgrounds are supported for direct use in engines without chroma keying.

> ## Note: Correct sprites are only produced if the model is positioned along the X-axis and facing the negative Y-axis! (Blender coordinate system)

### Installation

#### Windows
Install Python, then:

```bash
pip install PyOpenGL PyOpenGL_accelerate pygame Pillow numpy
```

#### Linux

For Debian-based:

```bash
sudo apt install python3-pip python3-pygame
pip3 install PyOpenGL PyOpenGL_accelerate Pillow numpy
```

For Arch-based:

```bash
sudo pacman -S python-pip python-pygame
pip install PyOpenGL PyOpenGL_accelerate Pillow numpy
```

For RHEL-based:

```bash
sudo dnf install python3-pip
pip3 install PyOpenGL PyOpenGL_accelerate pygame Pillow numpy
```

#### macOS

```bash
sudo port install python3
pip3 install PyOpenGL PyOpenGL_accelerate pygame Pillow numpy
```

### Usage

#### Static mode

Render a single model from 8 directions:

```bash
python render_sprites.py --model model.obj --texture texture.png
```

#### Animation mode

Render a sequence of OBJ frames from 8 directions.    
Frames can be specified as a printf-style pattern, an explicit list, or a pattern with a known frame count:

```bash
# Auto-discover frames matching a pattern
python render_sprites.py --texture texture.png --animation walking_%06d.obj

# Specify exact frame count
python render_sprites.py --texture texture.png --animation 12 walking_%06d.obj

# Explicit list of files
python render_sprites.py --texture texture.png --animation frame_000.obj frame_001.obj frame_002.obj
```

### Options

| Argument | Default | Meaning |
|---|---|---|
| `--model` | *(required in static mode)* | Path to `.obj` file |
| `--texture` | *(required)* | Path to texture (PNG/JPG) |
| `--animation` | off | Animation frames: pattern, explicit list, or `N pattern` |
| `--size` | `512` | Output sprite size in pixels |
| `--bg` | `transparent` | Background: `transparent`, `black`, `white`, `green` |
| `--outdir` | `sprites` | Output folder for sprites |
| `--prefix` | `sprite` | Filename prefix for output files |
| `--sheet` | off | Also save sprite sheet(s) |
| `--elevation` | `15.0` | Camera elevation angle in degrees |

### Output structure

#### Static mode

```
sprites/
  FRONT/
    sprite_FRONT.png
  FRONT_LEFT/
    sprite_FRONT_LEFT.png
  BACK/
    sprite_BACK.png
  ...
  sprite_sheet.png       # if --sheet is set
```

#### Animation mode

```
sprites/
  FRONT/
    sprite_FRONT_f0000.png
    sprite_FRONT_f0001.png
    ...
  BACK_LEFT/
    sprite_BACK_LEFT_f0000.png
    ...
  sprite_FRONT_sheet.png        # if --sheet is set
  sprite_BACK_LEFT_sheet.png
  ...
```

---

### Examples

#### Static render

```
$ python render_sprites.py --model hero.obj --texture hero.png --elevation 25 --prefix hero

Loading texture: hero.png
Loading model: hero.obj
  Vertices: 203, Triangles: 402
Building VBO with smooth normals...

Rendering sprites 512x512px...

  BACK_LEFT    (180 deg) -> sprites/BACK_LEFT/hero_BACK_LEFT.png
  BACK         (225 deg) -> sprites/BACK/hero_BACK.png
  BACK_RIGHT   (270 deg) -> sprites/BACK_RIGHT/hero_BACK_RIGHT.png
  RIGHT        (315 deg) -> sprites/RIGHT/hero_RIGHT.png
  FRONT_RIGHT  (  0 deg) -> sprites/FRONT_RIGHT/hero_FRONT_RIGHT.png
  FRONT        ( 45 deg) -> sprites/FRONT/hero_FRONT.png
  FRONT_LEFT   ( 90 deg) -> sprites/FRONT_LEFT/hero_FRONT_LEFT.png
  LEFT         (135 deg) -> sprites/LEFT/hero_LEFT.png

Done. Saved 9 sprites to 'sprites/'
```

#### Animation render

```
$ python render_sprites.py --texture hero.png --animation 4 walk_%06d.obj --sheet --prefix hero

Animation mode: 4 frame(s) detected.
  [0000] walk_000001.obj
  [0001] walk_000002.obj
  [0002] walk_000003.obj
  [0003] walk_000004.obj

Rendering animation: 4 frames × 9 directions = 36 sprites (512x512px)...

  [   1/ 36] frame 0000  BACK_LEFT    (180°) -> sprites/BACK_LEFT/hero_BACK_LEFT_f0000.png
  [   2/ 36] frame 0000  BACK         (225°) -> sprites/BACK/hero_BACK_f0000.png
  ...
  [  36/ 36] frame 0003  BACK_LEFT    (180°) -> sprites/BACK_LEFT/hero_BACK_LEFT_f0003.png

Generating per-direction animation sheets...
  Animation sheet [FRONT] -> sprites/hero_FRONT_sheet.png
  Animation sheet [BACK]  -> sprites/hero_BACK_sheet.png
  ...

Done. Saved 36 sprites to 'sprites/'
```

#### Example of result
 
![N](https://github.com/Ztry8/SpriteForge/blob/main/sprites/sprite_FRONT.png)
![NE](https://github.com/Ztry8/SpriteForge/blob/main/sprites/sprite_FRONT_RIGHT.png)
![E](https://github.com/Ztry8/SpriteForge/blob/main/sprites/sprite_FRONT_LEFT.png)
