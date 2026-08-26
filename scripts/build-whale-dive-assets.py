from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

builder_path = Path(__file__).with_name("build-whale-float-assets.py")
spec = importlib.util.spec_from_file_location("whale_float_builder", builder_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load builder: {builder_path}")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


# Matched from the supplied dive clip: enter the swimming pose, one complete
# 32-frame swim cycle, then the adjacent return-to-idle section.
builder.SEGMENTS = (
    {"name": "dive_prepare", "start": 0, "end": 37, "loop": False},
    {"name": "dive_cycle", "start": 37, "end": 69, "loop": True},
    {"name": "dive_finish", "start": 69, "end": 107, "loop": False},
)
builder.MOTION_NAME = "dive_vertical"
builder.CYCLE_CONTRACT = {
    "prepareToCycle": {"sourceFrames": [36, 37], "adjacent": True},
    "cycleWrap": {"sourceFrames": [68, 37], "lagFrames": 32},
    "cycleToFinish": {"sourceFrames": [68, 69], "adjacent": True},
    "finishToIdle": {"sourceFrame": 106, "driver": "live2d"},
}


if __name__ == "__main__":
    builder.main()
