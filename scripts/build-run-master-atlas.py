from __future__ import annotations

import argparse
from hashlib import sha256
from io import BytesIO
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack the approved front pose and coherent run-master frames.")
    parser.add_argument("canonical", type=Path)
    parser.add_argument("frames", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--cell", type=int, default=224)
    parser.add_argument("--columns", type=int, default=5)
    parser.add_argument("--colors", type=int, default=192)
    args = parser.parse_args()

    paths = sorted(args.frames.glob("frame-*.png"))
    if len(paths) != 24:
        parser.error(f"expected exactly 24 run frames, got {len(paths)}")
    if args.cell <= 0 or args.columns <= 0 or not 16 <= args.colors <= 256:
        parser.error("invalid atlas settings")

    sprites = [Image.open(args.canonical).convert("RGBA")]
    sprites.extend(Image.open(path).convert("RGBA") for path in paths)
    rows = (len(sprites) + args.columns - 1) // args.columns
    atlas = Image.new("RGBA", (args.columns * args.cell, rows * args.cell))
    for index, sprite in enumerate(sprites):
        if sprite.size != (args.cell, args.cell):
            sprite = sprite.resize((args.cell, args.cell), Image.Resampling.LANCZOS)
        atlas.alpha_composite(sprite, ((index % args.columns) * args.cell, (index // args.columns) * args.cell))

    runtime = atlas.quantize(
        colors=args.colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )
    payload = BytesIO()
    runtime.save(payload, format="PNG", optimize=True)
    contents = payload.getvalue()
    digest = sha256(contents).hexdigest()[:12]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / f"character-motion-atlas.{digest}.png"
    output.write_bytes(contents)
    print(output)
    print(f"size={atlas.width}x{atlas.height} bytes={len(contents)} sha256={sha256(contents).hexdigest()}")


if __name__ == "__main__":
    main()
