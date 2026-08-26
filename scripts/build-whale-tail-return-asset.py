from __future__ import annotations

import importlib.util
from pathlib import Path

builder_path = Path(__file__).with_name("build-whale-float-assets.py")
spec = importlib.util.spec_from_file_location("whale_tail_builder", builder_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load builder: {builder_path}")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


# Trim the long left/right holds while preserving the complete authored
# left-tail -> behind-body -> right-tail transition.
builder.SEGMENTS = (
    # Keep the final settled hold through the last decoded source frame. The
    # tail reaches the right-side pose before this, but it does not look
    # fully planted until the remaining hold is included.
    {"name": "tail_return_right", "start": 12, "end": 107, "loop": False},
)
builder.MOTION_NAME = "tail_return_right"
builder.METADATA_FILENAME = "tail-return.json"
builder.CYCLE_CONTRACT = {
    "entry": {"sourceFrame": 12, "tailSide": "left"},
    "exit": {"sourceFrame": 106, "tailSide": "right", "driver": "live2d"},
}


if __name__ == "__main__":
    builder.main()
