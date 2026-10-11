"""Assemble a chapter rough cut: concat clips, burn Chinese subtitles, append a title card.

Usage: rough_cut.py spec.json
spec: {"clips": [...mp4], "subs": [[start, end, text], ...], "title": "...", "out": "x.mp4"}
Times are on the concatenated timeline (seconds).
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 24
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"


def text_png(text, path, size=40, y=0.80, box=False):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, size)
    tw = d.textlength(text, font=f)
    x, yy = (W - tw) / 2, int(H * y)
    if box:
        d.rectangle([0, 0, W, H], fill=(0, 0, 0, 255))
    d.text((x, yy), text, font=f, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 220))
    im.save(path)


def main():
    spec = json.load(open(sys.argv[1]))
    tmp = tempfile.mkdtemp()
    clips = spec["clips"]
    inputs, filters = [], []
    for i, c in enumerate(clips):
        inputs += ["-i", c]
    n = len(clips)
    for i, c in enumerate(clips):
        has_audio = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                                    "-of", "csv=p=0", c], capture_output=True, text=True).stdout.strip()
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", c],
                                   capture_output=True, text=True).stdout)
        filters.append(f"[{i}:v]scale={W}:{H},setsar=1,fps={FPS}[v{i}]")
        if has_audio:
            filters.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo[a{i}]")
        else:
            filters.append(f"anullsrc=r=44100:cl=stereo,atrim=0:{dur}[a{i}]")
    filters.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[cv][ca]")

    last, idx = "cv", n
    for k, (a, b, text) in enumerate(spec.get("subs", [])):
        p = os.path.join(tmp, f"s{k}.png")
        text_png(text, p)
        inputs += ["-i", p]
        filters.append(f"[{last}][{idx}:v]overlay=0:0:enable='between(t,{a},{b})'[o{k}]")
        last, idx = f"o{k}", idx + 1

    if spec.get("title"):
        p = os.path.join(tmp, "title.png")
        text_png(spec["title"], p, size=44, y=0.47, box=True)
        inputs += ["-loop", "1", "-t", "2.5", "-i", p]
        filters.append(f"[{idx}:v]scale={W}:{H},setsar=1,fps={FPS},format=yuv420p[tv]")
        filters.append("anullsrc=r=44100:cl=stereo,atrim=0:2.5[ta]")
        filters.append(f"[{last}]format=yuv420p[mv]")
        filters.append("[mv][ca][tv][ta]concat=n=2:v=1:a=1[fv][fa]")
        last, alast = "fv", "fa"
    else:
        alast = "ca"

    cmd = ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filters), "-map", f"[{last}]",
           "-map", f"[{alast}]", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", spec["out"]]
    subprocess.run(cmd, check=True)
    print(spec["out"])


if __name__ == "__main__":
    main()
