"""Optional independent Pillow, zlib and ZIP verification. Toolkit runtime remains dependency-free."""
import binascii
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import zipfile
import zlib
from PIL import Image

root = Path(__file__).resolve().parents[1]
parent = root / 'output' / 'quality-independent'
parent.mkdir(parents=True, exist_ok=True)
out = Path(tempfile.mkdtemp(prefix='run-', dir=parent)).resolve()
assert out.is_relative_to(parent.resolve())
script = r'''
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createBundle,writeBundle,createZip,createSceneBundle,renderProject} from './src/index.js';
const out=process.argv[1], names=['fern','shale','root-bank','skink','lantern','lantern-normal','lantern-emissive','crystal'];
for(const name of names){const recipe=JSON.parse(await readFile(`examples/quality/${name}.json`,'utf8'));const bundle=await createBundle(recipe);await writeBundle(bundle,path.join(out,name));for(const frame of bundle.project.frames)await writeFile(path.join(out,name,`${frame.name}.rgba`),frame.data);await writeFile(path.join(out,name,'bundle.zip'),createZip(bundle.files));}
const scene=JSON.parse(await readFile('examples/quality/hollow.scene.json','utf8'));await writeBundle(await createSceneBundle(scene),path.join(out,'scene'));
await writeFile(path.join(out,'boundary.zip'),createZip(new Map(Array.from({length:65535},(_,i)=>[`f${i}`,Buffer.alloc(0)]))));
'''
subprocess.run(['node', '--input-type=module', '-e', script, str(out)], cwd=root, check=True)
counts = {'bundles': 0, 'frames': 0, 'animation_frames': 0, 'material_passes': 0, 'png_filters': 5, 'zip_boundary_entries': 65535}
for name in ['fern', 'shale', 'root-bank', 'skink', 'lantern', 'lantern-normal', 'lantern-emissive', 'crystal']:
    folder = out / name
    atlas = json.loads(next(folder.glob('*.atlas.json')).read_text())
    sheet = Image.open(folder / atlas['meta']['image']).convert('RGBA')
    for frame_name, metadata in atlas['frames'].items():
        frame = Image.open(folder / 'frames' / f'{frame_name}.png').convert('RGBA')
        assert frame.tobytes() == (folder / f'{frame_name}.rgba').read_bytes()
        box = metadata['frame']
        assert sheet.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h'])).tobytes() == frame.tobytes()
        counts['frames'] += 1
    for animation, sequence in atlas['animations'].items():
        image = Image.open(folder / 'animations' / f'{animation}.png')
        assert image.n_frames == len(sequence['frames'])
        assert image.info['loop'] == (0 if sequence['loop'] else 1)
        for index, frame_name in enumerate(sequence['frames']):
            image.seek(index)
            assert image.convert('RGBA').tobytes() == (folder / f'{frame_name}.rgba').read_bytes()
            assert image.info['duration'] == atlas['frames'][frame_name]['duration']
            counts['animation_frames'] += 1
    with zipfile.ZipFile(folder / 'bundle.zip') as archive:
        assert archive.testzip() is None
    counts['bundles'] += 1
alignment = json.loads((out / 'scene' / 'alignment.json').read_text())
for asset in alignment['assets'].values():
    sizes = [Image.open(out / 'scene' / file).size for file in asset['passes'].values()]
    assert len(set(sizes)) == 1
    counts['material_passes'] += len(sizes)
with zipfile.ZipFile(out / 'boundary.zip') as archive:
    assert len(archive.infolist()) == 65535 and archive.testzip() is None

# Independent filter fixtures, including hidden RGB at alpha zero and every predictor.
def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', binascii.crc32(kind + data) & 0xffffffff)

def paeth(a, b, c):
    p = a + b - c
    return min([(abs(p - a), 0, a), (abs(p - b), 1, b), (abs(p - c), 2, c)])[2]

w, h = 13, 10
pixels = bytes((i * 31 + i // 11) % 256 for i in range(w * h * 4))
raw = bytearray()
stride = w * 4
for y in range(h):
    filter_type = y % 5
    raw.append(filter_type)
    for x in range(stride):
        at = y * stride + x
        a = pixels[at - 4] if x >= 4 else 0
        b = pixels[at - stride] if y else 0
        c = pixels[at - stride - 4] if y and x >= 4 else 0
        predictor = [0, a, b, (a + b) // 2, paeth(a, b, c)][filter_type]
        raw.append((pixels[at] - predictor) % 256)
fixture = out / 'all-filters.png'
fixture.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))
assert Image.open(fixture).convert('RGBA').tobytes() == pixels
subprocess.run(['node', 'bin/pixelbolt.js', 'import', str(fixture), '--out', str(out / 'imported.json')], cwd=root, check=True, capture_output=True)
subprocess.run(['node', 'bin/pixelbolt.js', 'render', str(out / 'imported.json'), '--out', str(out / 'roundtrip')], cwd=root, check=True, capture_output=True)
assert Image.open(out / 'roundtrip' / 'frames' / 'idle.png').convert('RGBA').tobytes() == pixels
report = {'checks': counts, 'evidence_directory': str(out)}
(out / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
