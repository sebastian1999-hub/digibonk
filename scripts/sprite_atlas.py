"""Pack cropped animation frames into a single atlas."""

import math

import numpy as np
from PIL import Image


def pack(tiles, gutter=2):
    # A transparent gutter on all sides isolates bilinearly filtered poses.
    order = sorted(range(len(tiles)), key=lambda i: -tiles[i].height)
    padding = 2 * gutter
    area = sum((t.width + padding) * (t.height + padding) for t in tiles)
    def layout(limit):
        rows = []
        coords = {}
        height = width = 0
        for i in order:
            w, h = tiles[i].size
            for row in rows:
                if row[0] + w + padding <= limit:
                    break
            else:
                row = [0, height]
                rows.append(row)
                height += h + padding
            coords[i] = (row[0] + gutter, row[1] + gutter)
            row[0] += w + padding
            width = max(width, row[0])
        return width * height, (width, height), coords
    widest = max(t.width + padding for t in tiles)
    candidates = (layout(max(widest, math.ceil(math.sqrt(area) * factor)))
                  for factor in (0.75, 0.875, 1, 1.125, 1.25, 1.5))
    _, size, coords = min(candidates, key=lambda result: result[0])
    atlas = Image.new('RGBA', size)
    for i, tile in enumerate(tiles):
        atlas.paste(tile, coords[i])
    return atlas, coords


def indexed_atlas(atlas):
    """Encode the actual palette exactly, with a single transparent index."""
    rgba = np.ascontiguousarray(atlas)
    colors, indices = np.unique(rgba.view(np.uint32), return_inverse=True)
    if len(colors) > 256:
        raise ValueError(f'Pixel atlas contains {len(colors)} inks (expected at most 256)')
    palette = colors.view(np.uint8).reshape(-1, 4)
    indexed = Image.frombytes('P', atlas.size, indices.astype(np.uint8).tobytes())
    indexed.putpalette(palette[:, :3].tobytes())
    indexed.info['transparency'] = int(np.flatnonzero(palette[:, 3] == 0)[0])
    return indexed
