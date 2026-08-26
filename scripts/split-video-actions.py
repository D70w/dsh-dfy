from __future__ import annotations

import argparse
from fractions import Fraction
from pathlib import Path

import av


def parse_range(value: str) -> tuple[str, int, int]:
    try:
        name, start, end = value.split(":")
        start_frame = int(start)
        end_frame = int(end)
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "Ranges must use NAME:START_FRAME:END_FRAME"
        ) from error
    if start_frame < 0 or end_frame < start_frame:
        raise argparse.ArgumentTypeError(f"Invalid frame range: {value}")
    return name, start_frame, end_frame


def encode_clip(
    frames: list[av.VideoFrame],
    output: Path,
    fps: Fraction,
    width: int,
    height: int,
) -> None:
    container = av.open(str(output), mode="w", options={"movflags": "+faststart"})
    stream = container.add_stream("libx264", rate=fps)
    stream.width = width
    stream.height = height
    stream.pix_fmt = "yuv420p"
    stream.options = {"crf": "18", "preset": "slow"}

    for index, frame in enumerate(frames):
        frame.pts = index
        frame.time_base = Fraction(fps.denominator, fps.numerator)
        for packet in stream.encode(frame):
            container.mux(packet)
    for packet in stream.encode():
        container.mux(packet)
    container.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split a video into exact, independently decodable action clips."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("ranges", nargs="+", type=parse_range)
    args = parser.parse_args()

    input_container = av.open(str(args.input))
    input_stream = input_container.streams.video[0]
    fps = input_stream.average_rate or input_stream.guessed_rate
    if fps is None:
        raise SystemExit("Unable to determine source frame rate")
    fps = Fraction(fps)

    decoded = [frame for frame in input_container.decode(input_stream)]
    input_container.close()
    if not decoded:
        raise SystemExit("No video frames decoded")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, start_frame, end_frame in args.ranges:
        if end_frame >= len(decoded):
            raise SystemExit(
                f"Range {name} ends at {end_frame}, but video has {len(decoded)} frames"
            )
        output = args.output_dir / f"{name}.mp4"
        clip_frames = [frame.reformat(format="yuv420p") for frame in decoded[start_frame : end_frame + 1]]
        encode_clip(
            clip_frames,
            output,
            fps,
            input_stream.width,
            input_stream.height,
        )
        duration = len(clip_frames) / float(fps)
        print(
            f"{output.name}: frames {start_frame}-{end_frame}, "
            f"{len(clip_frames)} frames, {duration:.3f}s"
        )


if __name__ == "__main__":
    main()
