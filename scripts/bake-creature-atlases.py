"""Bake creature sheets offline. Input/output are separate game directories.

Optional illustrated masters are transparent single-row PNG strips in original
pose order, named after the source PNG and divided into equal-width cells.
Requires Pillow and NumPy.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

from sprite_atlas import pack


def round_corners(tile):
    """Split each texel into quadrants along connected colour boundaries."""
    pixels = np.asarray(tile).copy()
    pixels[pixels[:, :, 3] == 0] = 0
    words = pixels.view(np.uint32)[:, :, 0]
    padded = np.pad(words, 1)
    up, down = padded[:-2, 1:-1], padded[2:, 1:-1]
    left, right = padded[1:-1, :-2], padded[1:-1, 2:]
    corner = (up != down) & (left != right)
    height, width = words.shape
    out = np.empty((height * 2, width * 2), dtype=np.uint32)
    for y, vertical in enumerate((up, down)):
        for x, horizontal in enumerate((left, right)):
            out[y::2, x::2] = np.where(corner & (vertical == horizontal), vertical, words)
    return Image.fromarray(out.view(np.uint8).reshape(height * 2, width * 2, 4))


def cel_sprite(tile, scale):
    # Reconstruct diagonal ink and colour boundaries before filtering down.
    smooth = round_corners(round_corners(ImageOps.expand(tile, 1)))
    smooth = smooth.crop((4, 4, smooth.width - 4, smooth.height - 4))
    smooth = smooth.resize((tile.width * scale, tile.height * scale), Image.Resampling.LANCZOS)
    rgba = np.asarray(smooth).copy()
    rgb = rgba[:, :, :3].astype(np.float32) / 255
    light = rgb @ np.array([0.25, 0.57, 0.18], dtype=np.float32)
    # Light the colour planes from upper left. Weight by coverage so the
    # transparent pixels outside the silhouette cannot cast a dark fringe.
    coverage = rgba[:, :, 3].astype(np.float32) / 255
    blur = ImageFilter.GaussianBlur(max(1, scale * 1.6))
    def diffuse(channel):
        return np.asarray(Image.fromarray((channel * 255).astype(np.uint8)).filter(blur)) / 255
    volume = diffuse(light * coverage) / np.maximum(diffuse(coverage), 0.01)
    slope_y, slope_x = np.gradient(volume)
    relief = np.clip((slope_x * 0.55 + slope_y) * scale * 1.8, -0.09, 0.10)
    y, x = np.ogrid[:tile.height * scale, :tile.width * scale]
    key = 0.62 - 0.72 * y / smooth.height - 0.28 * x / smooth.width
    value = relief + key * 0.13
    shadow = (1 - np.clip(light, 0, 1)) ** 2
    rgb += shadow[:, :, None] * np.array([0.062, 0.052, 0.108])
    rgb += value[:, :, None] * np.clip(light[:, :, None] * 3, 0, 1)
    rgba[:, :, :3] = (np.clip(rgb, 0, 1) * 255).round().astype(np.uint8)
    rgba[rgba[:, :, 3] == 0] = 0
    return Image.fromarray(rgba)


def bake(spec, source, dest, masters):
    path = Path(spec['sheet'])
    with Image.open(source / path) as img:
        original = img.convert('RGBA')
    master_path = masters / path.name if masters else None
    master = None
    if master_path and master_path.is_file():
        with Image.open(master_path) as img:
            master = img.convert('RGBA')
    scale = 3 if spec['height'] <= 32 or master else 2
    frames = [f for action in spec['actions'].values() for f in action]
    tiles, identities, cells = [], {}, {}
    for f in frames:
        cell = (f['x'], f['y'])
        if cell in cells:
            continue
        b = f['bounds']
        left, top = cell[0] + b['x'], cell[1] + b['y']
        tile = original.crop((left, top, left + b['w'], top + b['h']))
        if master:
            cols = original.width // spec['width']
            col = cell[0] // spec['width']
            art = master.crop((round(master.width * col / cols), 0,
                               round(master.width * (col + 1) / cols), master.height))
            art = art.crop(art.getchannel('A').getbbox())
            height = tile.height * scale
            width = max(1, round(art.width * height / art.height))
            rendered = art.resize((width, height), Image.Resampling.LANCZOS)
            identity = col
        else:
            identity = (tile.size, tile.tobytes())
        if identity not in identities:
            identities[identity] = len(tiles)
            tiles.append(rendered if master else cel_sprite(tile, scale))
        idx = identities[identity]
        offset = [round((b['x'] + b['w'] / 2) * scale - tiles[idx].width / 2), b['y'] * scale]
        cells[cell] = idx, offset
    atlas, coords = pack(tiles)
    (dest / path).parent.mkdir(exist_ok=True, parents=True)
    if not master:
        atlas = atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                               dither=Image.Dither.NONE)
    atlas.save(dest / path, compress_level=9)
    for f in frames:
        idx, offset = cells[(f['x'], f['y'])]
        f['x'], f['y'] = coords[idx]
        f['w'], f['h'] = tiles[idx].size
        f['offset'] = offset
        f['bounds'] = dict(x=0, y=0, w=f['w'], h=f['h'])
    spec['width'] *= scale
    spec['height'] *= scale


# Columns of the 12-pose master strip, in animation order.
KEY_POSES = {
    'idle': (0, 0), 'blink': (0, 1), 'walk': (2, 3), 'run': (2, 3),
    'surprised': (5,), 'hit': (5,), 'jump': (4,), 'flee': (5, 3),
    'attack': (6, 7), 'attack2': (6, 8), 'attack3': (4, 7), 'attack4': (6, 7),
    'sleep': (10,), 'eat': (8, 9), 'happy': (0, 9), 'angry': (6, 8),
    'cheer': (9, 4), 'guard': (6,), 'train': (4,), 'shout': (6, 8), 'ko': (11,),
}


def bake_key_poses(spec, strip, dest, *, combat_stage=None):
    """Author in fixed-size cells, pack tight, retain the game's feet and clock."""
    with Image.open(strip) as img:
        master = img.convert('RGBA')
    count = 12
    if master.width % count:
        raise ValueError(f'{strip}: expected {count} equal cells')
    cell_width = master.width // count
    poses = []
    for index in range(count):
        art = master.crop((index * cell_width, 0, (index + 1) * cell_width, master.height))
        bounds = art.getchannel('A').getbbox()
        if not bounds:
            raise ValueError(f'{strip}: missing pose {index}')
        poses.append(art.crop(bounds))
    # Size by the idle form. Keeping one scale across the strip lets a
    # crouch lower the head and a lunge extend forward during playback.
    old_height = spec['height']
    old_width = spec['width']
    idle_height = old_height * spec['referenceHeight']
    factor = max(1, round(112 / idle_height))
    if combat_stage is not None:
        target = {1: 120, 2: 140, 3: 156, 4: 176}[combat_stage]
        # Wide wings and long tails may fill the source cell before its body
        # reaches the target height. Keep all the available native detail.
        factor = min(target, poses[0].height) / idle_height
    density = factor * idle_height / poses[0].height
    tiles, frames, baked = [], [], {}
    for action, sequence in spec['actions'].items():
        indices = KEY_POSES[action]
        for step, frame in enumerate(sequence):
            idx = indices[step % len(indices)]
            # World DS has longer cast sequences, including a recovery beat.
            if combat_stage is not None and action.startswith('attack') and len(sequence) > 2:
                if step == len(sequence) - 1:
                    idx = 0
                elif step > 0:
                    idx = indices[-1]
            breath = action == 'idle' and step % 2 == 1
            key = idx, breath
            if key not in baked:
                art = poses[idx]
                size = (max(1, round(art.width * density * (1.02 if breath else 1))),
                        max(1, round(art.height * density * (0.97 if breath else 1))))
                baked[key] = len(tiles)
                tiles.append(art.resize(size, Image.Resampling.LANCZOS))
            frames.append((frame, baked[key]))
    atlas, coords = pack(tiles, gutter=8 if combat_stage is not None else 2)
    path = dest / spec['sheet']
    path.parent.mkdir(exist_ok=True, parents=True)
    if combat_stage is not None:
        atlas = atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                               dither=Image.Dither.NONE)
    atlas.save(path, compress_level=9)
    for frame, idx in frames:
        b = frame['bounds']
        dx, dy = frame.get('offset', [0, 0])
        center = dx + b['x'] + b['w'] / 2
        foot = dy + b['y'] + b['h']
        w, h = tiles[idx].size
        x, y = coords[idx]
        frame.update(x=x, y=y, w=w, h=h, bounds=dict(x=0, y=0, w=w, h=h),
                     offset=[round(center * factor - w / 2), round(foot * factor - h)])
    spec.update(width=round(old_width * factor), height=round(old_height * factor))
    if combat_stage is not None:
        spec['referenceHeight'] = tiles[baked[(0, False)]].height / spec['height']
        spec['uniquePoses'] = count
        spec['mipmaps'] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('dest', type=Path)
    parser.add_argument('--masters', type=Path)
    parser.add_argument('--key-poses', type=Path, help='Directory of twelve-pose creature strips')
    parser.add_argument('--combat-poses', type=Path,
                        help='Directory of detailed twelve-pose strips and a species-to-stage stages.json')
    args = parser.parse_args()
    if args.source.resolve() == args.dest.resolve():
        parser.error('Keep the source sheets in a separate directory.')
    stages = (json.loads((args.combat_poses / 'stages.json').read_text(encoding='utf8'))
              if args.combat_poses else {})
    for filename in ('sprites-data.js', 'portrait-data.js'):
        path = Path('assets') / filename
        binding, raw = (args.source / path).read_text(encoding='utf8').split('=', 1)
        specs = json.loads(raw.strip().removesuffix(';'))
        for name, spec in specs.items():
            strip = args.key_poses / Path(spec['sheet']).name if args.key_poses else None
            combat = args.combat_poses / Path(spec['sheet']).name if args.combat_poses else None
            if combat and combat.is_file():
                bake_key_poses(spec, combat, args.dest, combat_stage=stages[name])
            elif strip and strip.is_file():
                bake_key_poses(spec, strip, args.dest)
            else:
                bake(spec, args.source, args.dest, args.masters)
        (args.dest / path).write_text(binding + '=' + json.dumps(specs, separators=(',', ':'))
                                      + ';\n', encoding='utf8')


if __name__ == '__main__':
    main()
