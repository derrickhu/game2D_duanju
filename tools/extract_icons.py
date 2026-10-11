"""把深色底的 2x2 金色线条图标网格切成透明 PNG。

亮度高于底色的像素按亮度换算成 alpha，颜色统一成香槟金，边缘的柔光保留成半透明。

用法：python3 tools/extract_icons.py <grid.jpg> <name_tl> <name_tr> <name_bl> <name_br> [-o 输出目录] [--size 128]
"""
import argparse
from pathlib import Path

from PIL import Image

GOLD = (236, 206, 150)


def extract(cell: Image.Image, size: int) -> Image.Image:
    gray = cell.convert("L")
    bg = sorted(gray.getdata())[len(gray.getdata()) // 4]
    alpha = gray.point(lambda v: max(0, min(255, int((v - bg - 6) * 255 / max(1, 200 - bg)))))
    out = Image.new("RGBA", cell.size, GOLD + (0,))
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        pad = 12
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(cell.width, box[2] + pad), min(cell.height, box[3] + pad))
        out = out.crop(box)
    side = max(out.size)
    square = Image.new("RGBA", (side, side), GOLD + (0,))
    square.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    return square.resize((size, size), Image.LANCZOS)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("grid")
    ap.add_argument("names", nargs=4)
    ap.add_argument("-o", "--out", default="minigame/subpkg_images")
    ap.add_argument("--size", type=int, default=128)
    args = ap.parse_args()
    im = Image.open(args.grid).convert("RGB")
    w, h = im.size
    cells = [(0, 0), (1, 0), (0, 1), (1, 1)]
    for name, (cx, cy) in zip(args.names, cells):
        cell = im.crop((cx * w // 2, cy * h // 2, (cx + 1) * w // 2, (cy + 1) * h // 2))
        path = Path(args.out) / f"{name}.png"
        extract(cell, args.size).save(path, optimize=True)
        print(path, path.stat().st_size)


if __name__ == "__main__":
    main()
