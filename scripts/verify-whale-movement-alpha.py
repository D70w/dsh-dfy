from __future__ import annotations

import json
from pathlib import Path

import av


def main() -> None:
    root = Path("artifacts/whale-click-to-run/assets/movement")
    result = {}
    for name in ("run_prepare", "run_cycle", "run_finish"):
        with av.open(str(root / f"{name}.webm")) as container:
            # FFmpeg's native VP9 decoder reports alpha WebM as yuv420p.
            # Decode the first demuxed packet through libvpx to expose the
            # BlockAdditional alpha plane as yuva420p.
            decoder = av.codec.CodecContext.create("libvpx-vp9", "r")
            frame = None
            for packet in container.demux(video=0):
                decoded = decoder.decode(packet)
                if decoded:
                    frame = decoded[0]
                    break
            if frame is None:
                raise RuntimeError(f"Unable to decode alpha frame: {name}")
            rgba = frame.to_ndarray(format="rgba")
        alpha = rgba[:, :, 3]
        result[name] = {
            "shape": list(rgba.shape),
            "cornerAlpha": int(alpha[0, 0]),
            "alphaMin": int(alpha.min()),
            "alphaMax": int(alpha.max()),
            "transparentPixels": int((alpha == 0).sum()),
            "opaquePixels": int((alpha == 255).sum()),
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
