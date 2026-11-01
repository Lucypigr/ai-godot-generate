import sys
import os
import math
import argparse
import ctypes
import re
import numpy as np

parser = argparse.ArgumentParser(description="Render 8-directional sprites from OBJ model")
parser.add_argument("--model",     required=False, help="Path to .obj file (static mode)")
parser.add_argument("--texture",   required=True,  help="Path to texture (PNG/JPG)")
parser.add_argument("--size",      type=int, default=512, help="Sprite size in pixels (default 512)")
parser.add_argument("--bg",        default="transparent", choices=["transparent", "black", "white", "green"],
                    help="Sprite background")
parser.add_argument("--outdir",    default="sprites", help="Output folder for sprites")
parser.add_argument("--prefix",    default="sprite",  help="Output filename prefix")
parser.add_argument("--sheet",     action="store_true", help="Also save a sprite sheet")
parser.add_argument("--elevation", type=float, default=15.0,
                    help="Camera elevation angle in degrees (0 = horizon, 30 = top-down)")
parser.add_argument("--animation", nargs="+", metavar="FRAME_PATH",
                    help=(
                        "Animation frames. Pass paths with a printf-style counter pattern, e.g.:\n"
                        "  walking_%%06d.obj\n"
                        "or explicit list:\n"
                        "  walking_000000.obj walking_000001.obj ...\n"
                        "You can also specify the frame count first:\n"
                        "  5 walking_%%06d.obj\n"
                        "Frames are rendered for every direction, producing:\n"
                        "  <prefix>_<DIRECTION>_f<NNN>.png"
                    ))
args = parser.parse_args()

import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
from PIL import Image


DIRECTIONS = [
    ("BACK_LEFT",     180),
    ("BACK",          225),
    ("BACK_RIGHT",    270),
    ("RIGHT",         315),
    ("FRONT_RIGHT",     0),
    ("FRONT",          45),
    ("FRONT_LEFT",     90),
    ("LEFT",          135),
    ("BACK_LEFT",     180),
]

def resolve_animation_frames(animation_args):
    if not animation_args:
        return []

    frame_count = None
    paths_args = animation_args[:]
    if re.fullmatch(r"\d+", animation_args[0]):
        frame_count = int(animation_args[0])
        paths_args = animation_args[1:]

    if len(paths_args) == 0:
        raise ValueError("--animation requires at least one path/pattern after the optional frame count.")

    if len(paths_args) == 1 and re.search(r"%\d*d", paths_args[0]):
        pattern = paths_args[0]
        if frame_count is not None:
            frames = [pattern % i for i in range(1, frame_count + 1)]
        else:
            directory = os.path.dirname(pattern) or "."
            basename  = os.path.basename(pattern)

            regex_str = re.sub(r"%\d*d", r"(\\d+)", re.escape(basename))
            regex = re.compile(regex_str)
            candidates = sorted(
                f for f in os.listdir(directory) if regex.fullmatch(f)
            )

            if not candidates:
                raise FileNotFoundError(
                    f"No files matching pattern '{pattern}' found in '{directory}'."
                )
            frames = [os.path.join(directory, c) for c in candidates]
        return frames

    return paths_args

def compute_smooth_normals(verts, faces):
    pos = verts["pos"]
    uv  = verts["uv"]
    num_verts = len(pos)

    smooth_normals = np.zeros((num_verts, 3), dtype=np.float64)

    for tri in faces:
        (vi0, _, _), (vi1, _, _), (vi2, _, _) = tri

        p0 = pos[vi0].astype(np.float64)
        p1 = pos[vi1].astype(np.float64)
        p2 = pos[vi2].astype(np.float64)

        e10 = p1 - p0
        e20 = p2 - p0
        e01 = p0 - p1
        e21 = p2 - p1
        e02 = p0 - p2
        e12 = p1 - p2

        face_normal = np.cross(e10, e20)
        length = np.linalg.norm(face_normal)
        if length < 1e-12:
            continue
        face_normal /= length

        def angle_between(a, b):
            na = np.linalg.norm(a)
            nb = np.linalg.norm(b)
            if na < 1e-12 or nb < 1e-12:
                return 0.0
            cos_a = np.clip(np.dot(a, b) / (na * nb), -1.0, 1.0)
            return math.acos(cos_a)

        smooth_normals[vi0] += face_normal * angle_between(e10,  e20)
        smooth_normals[vi1] += face_normal * angle_between(e01,  e21)
        smooth_normals[vi2] += face_normal * angle_between(e02,  e12)

    lengths = np.linalg.norm(smooth_normals, axis=1, keepdims=True)
    lengths = np.where(lengths < 1e-9, 1.0, lengths)
    smooth_normals /= lengths

    buf = []
    for tri in faces:
        for vi, vti, _ in tri:
            px, py, pz = pos[vi]
            nx, ny, nz = smooth_normals[vi]
            if uv is not None and vti >= 0:
                u, v = uv[vti]
            else:
                u, v = 0.0, 0.0
            buf.extend([px, py, pz, nx, ny, nz, u, v])

    return np.array(buf, dtype=np.float32)


def load_obj(path):
    raw_verts, raw_uvs, faces = [], [], []

    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if parts[0] == "v":
                raw_verts.append([float(x) for x in parts[1:4]])
            elif parts[0] == "vt":
                raw_uvs.append([float(x) for x in parts[1:3]])
            elif parts[0] == "f":
                tri = []
                for token in parts[1:]:
                    indices = token.split("/")
                    vi  = int(indices[0]) - 1
                    vti = int(indices[1]) - 1 if len(indices) > 1 and indices[1] else -1
                    tri.append((vi, vti, -1))
                for i in range(1, len(tri) - 1):
                    faces.append([tri[0], tri[i], tri[i + 1]])

    pos = np.array(raw_verts, dtype=np.float32)
    uv  = np.array(raw_uvs,   dtype=np.float32) if raw_uvs else None

    center = (pos.max(axis=0) + pos.min(axis=0)) / 2.0
    pos -= center
    scale = np.max(np.abs(pos))
    if scale > 0:
        pos /= scale

    verts = {"pos": pos, "uv": uv}
    return verts, faces


def load_texture(path):
    img = Image.open(path).convert("RGBA")
    img = img.transpose(Image.FLIP_TOP_BOTTOM)
    img_data = np.array(img, dtype=np.uint8)

    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA,
                 img.width, img.height, 0,
                 GL_RGBA, GL_UNSIGNED_BYTE, img_data)
    glGenerateMipmap(GL_TEXTURE_2D)
    return tex_id


def build_vbo(verts, faces):
    buf = compute_smooth_normals(verts, faces)
    vbo = glGenBuffers(1)
    glBindBuffer(GL_ARRAY_BUFFER, vbo)
    glBufferData(GL_ARRAY_BUFFER, buf.nbytes, buf, GL_STATIC_DRAW)
    glBindBuffer(GL_ARRAY_BUFFER, 0)
    vertex_count = len(faces) * 3
    return vbo, vertex_count


def free_vbo(vbo):
    glDeleteBuffers(1, [vbo])


def render_frame(vbo, vertex_count, tex_id, azimuth_deg, elevation_deg, size, bg_color):
    glViewport(0, 0, size, size)
    glClearColor(*bg_color)
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

    glShadeModel(GL_SMOOTH)

    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    gluPerspective(30.0, 1.0, 0.01, 100.0)

    glMatrixMode(GL_MODELVIEW)
    glLoadIdentity()

    cam_dist = 4.0
    elev_rad = math.radians(elevation_deg)
    azim_rad = math.radians(azimuth_deg)

    cam_x = cam_dist * math.cos(elev_rad) * math.sin(azim_rad)
    cam_y = cam_dist * math.sin(elev_rad)
    cam_z = cam_dist * math.cos(elev_rad) * math.cos(azim_rad)

    gluLookAt(cam_x, cam_y, cam_z,
              0, 0, 0,
              0, 1, 0)

    glEnable(GL_LIGHTING)
    glEnable(GL_LIGHT0)
    glEnable(GL_LIGHT1)
    glEnable(GL_LIGHT2)

    glLightfv(GL_LIGHT0, GL_POSITION, [cam_x, cam_y, cam_z, 1.0])
    glLightfv(GL_LIGHT0, GL_DIFFUSE,  [1.10, 1.05, 1.00, 1.0])
    glLightfv(GL_LIGHT0, GL_SPECULAR, [0.90, 0.90, 0.85, 1.0])
    glLightf (GL_LIGHT0, GL_CONSTANT_ATTENUATION,  1.0)
    glLightf (GL_LIGHT0, GL_LINEAR_ATTENUATION,    0.0)
    glLightf (GL_LIGHT0, GL_QUADRATIC_ATTENUATION, 0.0)

    glLightfv(GL_LIGHT1, GL_POSITION, [-cam_x * 0.5, cam_y * 0.3, -cam_z * 0.5, 0.0])
    glLightfv(GL_LIGHT1, GL_DIFFUSE,  [0.30, 0.35, 0.45, 1.0])
    glLightfv(GL_LIGHT1, GL_SPECULAR, [0.00, 0.00, 0.00, 1.0])

    glLightfv(GL_LIGHT2, GL_POSITION, [0.0, 4.0, 0.0, 0.0])
    glLightfv(GL_LIGHT2, GL_DIFFUSE,  [0.25, 0.22, 0.18, 1.0])
    glLightfv(GL_LIGHT2, GL_SPECULAR, [0.00, 0.00, 0.00, 1.0])

    glLightModelfv(GL_LIGHT_MODEL_AMBIENT, [0.30, 0.28, 0.32, 1.0])
    glLightModeli (GL_LIGHT_MODEL_TWO_SIDE, GL_TRUE)

    glMaterialfv(GL_FRONT_AND_BACK, GL_AMBIENT,   [0.20, 0.20, 0.20, 1.0])
    glMaterialfv(GL_FRONT_AND_BACK, GL_DIFFUSE,   [1.00, 1.00, 1.00, 1.0])
    glMaterialfv(GL_FRONT_AND_BACK, GL_SPECULAR,  [0.25, 0.25, 0.25, 1.0])
    glMaterialf (GL_FRONT_AND_BACK, GL_SHININESS, 24.0)

    glEnable(GL_TEXTURE_2D)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE)

    glBindBuffer(GL_ARRAY_BUFFER, vbo)
    stride = 8 * 4

    glEnableClientState(GL_VERTEX_ARRAY)
    glEnableClientState(GL_NORMAL_ARRAY)
    glEnableClientState(GL_TEXTURE_COORD_ARRAY)

    glVertexPointer  (3, GL_FLOAT, stride, ctypes.c_void_p(0))
    glNormalPointer  (   GL_FLOAT, stride, ctypes.c_void_p(12))
    glTexCoordPointer(2, GL_FLOAT, stride, ctypes.c_void_p(24))

    glDrawArrays(GL_TRIANGLES, 0, vertex_count)

    glDisableClientState(GL_VERTEX_ARRAY)
    glDisableClientState(GL_NORMAL_ARRAY)
    glDisableClientState(GL_TEXTURE_COORD_ARRAY)
    glBindBuffer(GL_ARRAY_BUFFER, 0)
    glDisable(GL_LIGHTING)
    glDisable(GL_TEXTURE_2D)


def grab_frame(size, bg_transparent):
    if bg_transparent:
        pixels = glReadPixels(0, 0, size, size, GL_RGBA, GL_UNSIGNED_BYTE)
        img = Image.frombytes("RGBA", (size, size), pixels)
    else:
        pixels = glReadPixels(0, 0, size, size, GL_RGB, GL_UNSIGNED_BYTE)
        img = Image.frombytes("RGB", (size, size), pixels)
    return img.transpose(Image.FLIP_TOP_BOTTOM)

def save_static_sheet(images, SIZE, bg_transparent, outdir, prefix):
    cols, rows = 4, 2
    sheet = Image.new(
        "RGBA" if bg_transparent else "RGB",
        (SIZE * cols, SIZE * rows), (0, 0, 0, 0)
    )
    for i, (_name, _az, img) in enumerate(images):
        sheet.paste(img, ((i % cols) * SIZE, (i // cols) * SIZE))
    sheet_path = os.path.join(outdir, f"{prefix}_sheet.png")
    sheet.save(sheet_path, "PNG")
    print(f"  Sprite sheet -> {sheet_path}")

def save_animation_sheet(all_frames, SIZE, bg_transparent, outdir, prefix):
    from collections import defaultdict
    by_dir = defaultdict(list)
    for dir_name, _az, frame_idx, img in all_frames:
        by_dir[dir_name].append((frame_idx, img))

    for dir_name, frame_list in by_dir.items():
        frame_list.sort(key=lambda x: x[0])
        n = len(frame_list)
        sheet = Image.new(
            "RGBA" if bg_transparent else "RGB",
            (SIZE * n, SIZE), (0, 0, 0, 0)
        )
        for col, (_fi, img) in enumerate(frame_list):
            sheet.paste(img, (col * SIZE, 0))
        sheet_path = os.path.join(outdir, f"{prefix}_{dir_name}_sheet.png")
        sheet.save(sheet_path, "PNG")
        print(f"  Animation sheet [{dir_name}] -> {sheet_path}")

def main():
    SIZE = args.size
    BG_MAP = {
        "transparent": (0.0, 0.0, 0.0, 0.0),
        "black":       (0.0, 0.0, 0.0, 1.0),
        "white":       (1.0, 1.0, 1.0, 1.0),
        "green":       (0.0, 1.0, 0.0, 1.0),
    }
    bg_color       = BG_MAP[args.bg]
    bg_transparent = args.bg == "transparent"

    os.makedirs(args.outdir, exist_ok=True)

    animation_frames = []
    if args.animation:
        animation_frames = resolve_animation_frames(args.animation)
        if not animation_frames:
            print("ERROR: --animation resolved to zero frames.", file=sys.stderr)
            sys.exit(1)
        print(f"Animation mode: {len(animation_frames)} frame(s) detected.")
        for i, p in enumerate(animation_frames):
            print(f"  [{i:04d}] {p}")
    else:
        if not args.model:
            print("ERROR: --model is required when --animation is not used.", file=sys.stderr)
            sys.exit(1)

    pygame.init()
    pygame.display.set_mode((SIZE, SIZE), DOUBLEBUF | OPENGL | NOFRAME)
    pygame.display.set_caption("Sprite Renderer")

    glEnable(GL_DEPTH_TEST)
    glEnable(GL_MULTISAMPLE)
    if bg_transparent:
        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

    print(f"\nLoading texture: {args.texture}")
    tex_id = load_texture(args.texture)

    if not animation_frames:
        print(f"Loading model: {args.model}")
        verts, faces = load_obj(args.model)
        print(f"  Vertices: {len(verts['pos'])}, Triangles: {len(faces)}")

        print("Building VBO with smooth normals...")
        vbo, vertex_count = build_vbo(verts, faces)

        images = []
        print(f"\nRendering sprites {SIZE}x{SIZE}px...\n")

        for name, azimuth in DIRECTIONS:
            render_frame(vbo, vertex_count, tex_id,
                         azimuth, args.elevation, SIZE, bg_color)
            pygame.display.flip()

            img = grab_frame(SIZE, bg_transparent)
            images.append((name, azimuth, img))

            dir_folder = os.path.join(args.outdir, name)
            os.makedirs(dir_folder, exist_ok=True)
            out_path = os.path.join(dir_folder, f"{args.prefix}_{name}.png")

            img.save(out_path, "PNG")
            print(f"  {name:12s} ({azimuth:3d} deg) -> {out_path}")

        if args.sheet:
            images.pop(0)
            save_static_sheet(images, SIZE, bg_transparent, args.outdir, args.prefix)

        print(f"\nDone. Saved {len(DIRECTIONS)} sprites to '{args.outdir}/'")

    else:
        total = len(animation_frames) * len(DIRECTIONS)
        done  = 0
        all_rendered = []

        print(f"\nRendering animation: {len(animation_frames)} frames × "
              f"{len(DIRECTIONS)} directions = {total} sprites ({SIZE}x{SIZE}px)...\n")

        for frame_idx, obj_path in enumerate(animation_frames):
            if not os.path.isfile(obj_path):
                print(f"  WARNING: frame file not found, skipping: {obj_path}")
                continue

            verts, faces = load_obj(obj_path)
            vbo, vertex_count = build_vbo(verts, faces)

            for dir_name, azimuth in DIRECTIONS:
                render_frame(vbo, vertex_count, tex_id,
                             azimuth, args.elevation, SIZE, bg_color)
                pygame.display.flip()

                img = grab_frame(SIZE, bg_transparent)
                all_rendered.append((dir_name, azimuth, frame_idx, img))

                dir_folder = os.path.join(args.outdir, dir_name)
                os.makedirs(dir_folder, exist_ok=True)
                out_path = os.path.join(
                    dir_folder,
                    f"{args.prefix}_{dir_name}_f{frame_idx:04d}.png"
                )

                img.save(out_path, "PNG")
                done += 1
                print(f"  [{done:4d}/{total}] frame {frame_idx:04d}  "
                      f"{dir_name:12s} ({azimuth:3d}°) -> {out_path}")

            free_vbo(vbo)

        if args.sheet:
            print("\nGenerating per-direction animation sheets...")
            save_animation_sheet(all_rendered, SIZE, bg_transparent,
                                 args.outdir, args.prefix)

        print(f"\nDone. Saved {done} sprites to '{args.outdir}/'")

    pygame.quit()


if __name__ == "__main__":
    main()
