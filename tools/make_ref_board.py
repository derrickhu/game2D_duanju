"""Lay out reference images side by side on white, for multi-reference keyframe prompts.

Usage:
    .venv/bin/python tools/make_ref_board.py -o BOARD.png IMG1 IMG2 ...

Panels are scaled to the same height and numbered left to right in the order given,
so the prompt can refer to them as "panel 1", "panel 2", ...
"""
import argparse

from PIL import Image

HEIGHT = 1024
GAP = 48


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("-o", "--out", required=True)
    args = ap.parse_args()

    panels = []
    for path in args.images:
        im = Image.open(path).convert("RGB")
        panels.append(im.resize((round(im.width * HEIGHT / im.height), HEIGHT), Image.LANCZOS))

    width = sum(p.width for p in panels) + GAP * (len(panels) + 1)
    board = Image.new("RGB", (width, HEIGHT + 2 * GAP), (255, 255, 255))
    x = GAP
    for p in panels:
        board.paste(p, (x, GAP))
        x += p.width + GAP
    board.save(args.out)
    print(args.out, board.size)


if __name__ == "__main__":
    main()
