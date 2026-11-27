"""Import named GIF action folders into a Digibonk game directory."""

import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from PIL import Image, ImageOps, ImageSequence

from sprite_atlas import indexed_atlas, pack


ALIASES = {
    'demimon': 'DemiDevimon',
    'goblimon': 'Goburimon',
    'bigmamenon': 'BigMamemon',
    'blackmetalgarurumon': 'MetalGarurumon (Black)',
    'grankugawamon': 'GranKuwagamon',
    'gryphomon': 'Gryphonmon',
    'imperialdramon': 'Imperialdramon (Fighter Mode)',
    'lilymon': 'Lillymon',
    'metalgreymon(virus)': 'MetalGreymon (Virus)',
    'metaltyranomon': 'MetalTyrannomon',
    'machgaomon': 'MachGaogamon',
    'miragegaomon': 'MirageGaogamon',
    'valkyridramon': 'Valkyrimon',
}

# The engine mirrors a left-facing atlas. Normalise the source poses that
# face right before packing; forward-facing poses use the supplied drawing.
RIGHT_FACING = {
    'Coronamon': {'atacar'},
    'Greymon': {'atacar', 'caminar'},
    'Guilmon': {'atacar'},
    'Andromon': {'atacar'},
    'BanchoLeomon': {'atacar'},
    'Crescemon': {'atacar'},
    'Cyberdramon': {'atacar'},
    'Dianamon': {'atacar'},
    'Etemon': {'atacar'},
    'HerculesKabuterimon': {'atacar'},
    'LadyDevimon': {'atacar'},
    'MetalEtemon': {'caminar', 'atacar', 'saltar'},
    'MetalGreymon': {'caminar', 'saltar'},
    'MetalGreymon (Virus)': {'caminar', 'saltar'},
    'MetalGarurumon': {'caminar', 'atacar'},
    'MetalGarurumon (Black)': {'caminar', 'atacar'},
    'Pharaohmon': {'atacar'},
    'Phantomon': {'atacar'},
}


def read_clip(path, mirror):
    frames = []
    with Image.open(path) as gif:
        for frame in ImageSequence.Iterator(gif):
            rgba = frame.convert('RGBA')
            if mirror:
                rgba = ImageOps.mirror(rgba)
            if not rgba.getbbox():
                raise ValueError(f'Empty frame in {path}')
            duration = frame.info['duration'] / 1000
            if duration <= 0:
                raise ValueError(f'Invalid timing in {path}')
            frames.append((rgba, duration))
    return frames


def build_species(name, folder, previous, output, pack_name):
    clips = {}
    for path in sorted(folder.glob('*.gif')):
        action = path.stem.casefold().removesuffix(' - copia')
        if action in clips:
            raise ValueError(f'{folder}: duplicate {action} animation')
        clips[action] = read_clip(path, action in RIGHT_FACING.get(name, ()))
    movement = clips.keys() & {'caminar', 'volar', 'flotar'}
    if len(movement) != 1 or clips.keys() != movement | {'atacar', 'saltar'}:
        raise ValueError(f'{folder}: expected movement, attack and jump')
    move = movement.pop()

    # Preserve motion inside the GIF canvas. One walk cycle in the pack
    # has a smaller canvas, so align its first footfall with the others.
    canvas = clips['saltar'][0][0].size
    ground = clips['saltar'][0][0].getbbox()[3]
    width, height = canvas
    tiles, sequences = [], {}
    for action, frames in clips.items():
        first = frames[0][0]
        x = (width - first.width) // 2
        y = ground - first.getbbox()[3] if first.size != canvas else 0
        registered = []
        for rgba, duration in frames:
            page = Image.new('RGBA', canvas)
            box = rgba.getbbox()
            if not (0 <= x + box[0] < x + box[2] <= width and
                    0 <= y + box[1] < y + box[3] <= height):
                raise ValueError(f'{name}: clipped pose in {action}')
            tile = rgba.crop(box)
            page.paste(tile, (x + box[0], y + box[1]), tile.getchannel('A'))
            registered.append((page, duration))
        sequences[action] = registered

    # The renderer grounds the bottom centre of its quad. Keep a common
    # baseline and symmetric edges, including the air below a jumping pose.
    bottom = max(page.getbbox()[3] for seq in sequences.values() for page, _ in seq)
    animations = {}
    for action, frames in sequences.items():
        boxes = [page.getbbox() for page, _ in frames]
        left = min(min(b[0], width - b[2]) for b in boxes)
        top = min(b[1] for b in boxes)
        region = (left, top, width - left, bottom)
        animations[action] = []
        for page, duration in frames:
            tile = page.crop(region)
            record = dict(w=tile.width, h=tile.height, duration=duration, offset=[left, top],
                          bounds=dict(x=0, y=0, w=tile.width, h=tile.height))
            animations[action].append(record)
            tiles.append((tile, record))

    atlas, coords = pack([tile for tile, _ in tiles], gutter=8)
    for i, (_, record) in enumerate(tiles):
        record['x'], record['y'] = coords[i]
    # Some GIFs change palette between frames. Use truecolour if the
    # combined inks exceed PNG's indexed limit; preserve every source pixel.
    if atlas.getcolors(256) is not None:
        atlas = indexed_atlas(atlas)
    path = output / previous['sheet']
    path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(path, compress_level=9)
    walk, jump, attack = animations[move], animations['saltar'], animations['atacar']
    rest = walk[:1] if move == 'caminar' else walk
    actions = dict(idle=rest, blink=rest, walk=walk, run=walk, flee=walk, jump=jump,
                   attack=attack, attack2=attack, attack3=attack, attack4=attack,
                   guard=attack[:1], shout=attack, angry=attack, train=jump, happy=jump,
                   cheer=jump, hit=jump[:1], surprised=jump[:1], sleep=walk[:1],
                   eat=rest, ko=walk[:1])
    if actions.keys() != previous['actions'].keys():
        raise ValueError(f'{name}: unmapped game animation')
    idle_box = sequences[move][0][0].getbbox()
    return dict(sheet=previous['sheet'], width=width, height=height, actions=actions,
                referenceHeight=(idle_box[3] - idle_box[1]) / height, mipmaps=True,
                sourcePack=pack_name, dashClipDuration=sum(f['duration'] for f in jump))


def read_catalog(path):
    binding, data = path.read_text(encoding='utf8').split('=', 1)
    return binding, json.loads(data.strip().removesuffix(';'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('game', type=Path)
    parser.add_argument('--pack-name', default='REWORK GIFS 1', help='Name credited to new or revised artwork')
    args = parser.parse_args()
    assets = Path('assets')
    world = assets / 'sprites-data.js'
    portraits = assets / 'portrait-data.js'
    world_binding, specs = read_catalog(args.game / world)
    portrait_binding, overrides = read_catalog(args.game / portraits)
    names = {name.casefold(): name for name in specs}
    folders = sorted({p.parent for p in args.folder.rglob('*.gif')})
    if not folders:
        parser.error('No GIFs found')
    with TemporaryDirectory(dir=args.game.parent) as scratch:
        stage = Path(scratch)
        imported = set()
        for folder in folders:
            key = folder.name.casefold()
            name = ALIASES.get(key, names.get(key))
            if name not in specs or name in imported:
                raise ValueError(f'Unknown or duplicated species folder: {folder}')
            previous = specs[name]
            spec = build_species(name, folder, previous, stage, args.pack_name)
            # Keep the original credit when two packs supply the same animation.
            sheet = Path(spec['sheet'])
            if (previous.get('sourcePack') and dict(previous, sourcePack=args.pack_name) == spec
                    and (stage / sheet).read_bytes() == (args.game / sheet).read_bytes()):
                (stage / sheet).unlink()
            else:
                specs[name] = spec
            overrides.pop(name, None)  # The menu uses the new world sprite.
            imported.add(name)
        for path, binding, data in ((world, world_binding, specs), (portraits, portrait_binding, overrides)):
            (stage / path).write_text(binding + '=' + json.dumps(data, separators=(',', ':')) + ';\n',
                                      encoding='utf8')
        for path in sorted(stage.rglob('*.png')) + [stage / world, stage / portraits]:
            target = args.game / path.relative_to(stage)
            # A file moved out of a private temp directory retains its ACL
            # on Windows. Create the replacement beside the shipped assets.
            sibling = target.with_name(target.name + '.' + uuid4().hex + '.tmp')
            try:
                with sibling.open('xb') as stream:
                    stream.write(path.read_bytes())
                sibling.replace(target)
            finally:
                sibling.unlink(missing_ok=True)
    print(f'Imported GIF animations for {len(imported)} species.')


if __name__ == '__main__':
    main()
