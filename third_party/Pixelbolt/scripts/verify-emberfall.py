"""Independent Pillow/ZIP verification of the complete Emberfall export corpus."""
import io
import json
from pathlib import Path
import zipfile
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / 'demo' / 'assets'
manifest = json.loads((assets / 'manifest.json').read_text())
counts = {'bundles': 0, 'frames': 0, 'animations': 0, 'animation_frames': 0}
for item in manifest:
    name = item['name']
    with zipfile.ZipFile(assets / name / 'bundle.zip') as archive:
        assert archive.testzip() is None
        atlas = json.loads(archive.read(f'{name}.atlas.json'))
        sheet = Image.open(io.BytesIO(archive.read(f'{name}.png'))).convert('RGBA')
        assert sheet.size == (atlas['meta']['size']['w'], atlas['meta']['size']['h'])
        frames = {}
        for key, frame in atlas['frames'].items():
            rect = frame['frame']
            crop = sheet.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h']))
            individual = Image.open(io.BytesIO(archive.read(f'frames/{key}.png'))).convert('RGBA')
            assert individual.size == crop.size
            assert individual.tobytes() == crop.tobytes(), (name, key)
            frames[key] = individual
            counts['frames'] += 1
        for animation, sequence in atlas['animations'].items():
            image = Image.open(io.BytesIO(archive.read(f'animations/{animation}.png')))
            assert image.n_frames == len(sequence['frames']), (name, animation)
            assert image.info['loop'] == (0 if sequence['loop'] else 1)
            for i, key in enumerate(sequence['frames']):
                image.seek(i)
                assert image.info['duration'] == atlas['frames'][key]['duration']
                assert image.convert('RGBA').tobytes() == frames[key].tobytes(), (name, animation, key)
                counts['animation_frames'] += 1
            counts['animations'] += 1
        counts['bundles'] += 1
output = root / 'output' / 'emberfall' / 'independent-decode.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(counts, indent=2) + '\n')
print(json.dumps(counts, indent=2))
