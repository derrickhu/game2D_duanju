"""Split a white-background character turnaround sheet into single-view images.

Usage:
    .venv/bin/python tools/split_turnaround.py SHEET.png -o OUT_DIR [--names face,front,34,side,back]

Views are detected by scanning for near-white vertical gutters; the result is
expected to contain exactly as many segments as names.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

WHITE_LEVEL = 235
DIFF_LEVEL = 30
MIN_SEGMENT_FRAC = 0.04
PAD_FRAC = 0.04


def content_mask(gray: np.ndarray) -> np.ndarray:
    """Pixels clearly darker than the (possibly off-white, gradient) backdrop."""
    backdrop = np.percentile(gray, 90, axis=0, keepdims=True)
    return gray < np.minimum(backdrop - DIFF_LEVEL, WHITE_LEVEL)


def find_segments(mask: np.ndarray) -> list[tuple[int, int]]:
    h, w = mask.shape
    content = mask.sum(axis=0) > h * 0.01
    segments, start = [], None
    for x, filled in enumerate(content):
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            segments.append((start, x))
            start = None
    if start is not None:
        segments.append((start, w))
    return [s for s in segments if s[1] - s[0] > w * MIN_SEGMENT_FRAC]


def split_widest(mask: np.ndarray, segments: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Views that touch each other: cut the widest segment at its emptiest column."""
    i = max(range(len(segments)), key=lambda k: segments[k][1] - segments[k][0])
    x0, x1 = segments[i]
    lo, hi = x0 + (x1 - x0) // 5, x1 - (x1 - x0) // 5
    cut = lo + int(np.argmin(mask[:, lo:hi].sum(axis=0)))
    return segments[:i] + [(x0, cut), (cut, x1)] + segments[i + 1:]


def crop_view(img: Image.Image, mask: np.ndarray, x0: int, x1: int) -> Image.Image:
    h, w = mask.shape
    rows = np.where(mask[:, x0:x1].sum(axis=1) > (x1 - x0) * 0.01)[0]
    y0, y1 = int(rows[0]), int(rows[-1]) + 1
    view = img.crop((x0, y0, x1, y1))
    pad = int(max(x1 - x0, y1 - y0) * PAD_FRAC)
    canvas = Image.new("RGB", (view.width + 2 * pad, view.height + 2 * pad), (255, 255, 255))
    canvas.paste(view, (pad, pad))
    return canvas


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--names", default="face,front,34,side,back")
    args = ap.parse_args()

    names = args.names.split(",")
    img = Image.open(args.sheet).convert("RGB")
    mask = content_mask(np.asarray(img.convert("L")).astype(np.int16))
    segments = find_segments(mask)
    while 0 < len(segments) < len(names):
        segments = split_widest(mask, segments)
    if len(segments) != len(names):
        raise SystemExit(f"found {len(segments)} views {segments}, expected {len(names)}")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stem = Path(args.sheet).stem.replace("turnaround_", "").rsplit("_v", 1)[0]
    for name, (x0, x1) in zip(names, segments):
        path = out / f"{stem}_{name}.png"
        crop_view(img, mask, x0, x1).save(path)
        print(path)


if __name__ == "__main__":
    main()
