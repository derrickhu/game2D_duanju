"""给剧情原片烧字幕，输出到 minigame/videos/<id>.mp4（走 CDN，不进包）。

字幕表 docs/drama/subs.json：{id: [[start, end, text], ...]}
原片 game_assets/duanju/assets/video/<id>_v1.mp4；已存在的输出跳过，--force 覆盖。

用法：python3 tools/burn_subs.py [id ...] [--force]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "game_assets" / "duanju" / "assets" / "video"
OUT = ROOT / "minigame" / "videos"


def main() -> None:
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    subs = json.loads((ROOT / "docs" / "drama" / "subs.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for vid, lines in subs.items():
        if only and vid not in only:
            continue
        src, out = SRC / f"{vid}_v1.mp4", OUT / f"{vid}.mp4"
        if not src.exists():
            print(f"缺原片 {vid}")
            continue
        if out.exists() and not force:
            continue
        spec = {"clips": [str(src)], "subs": lines, "out": str(out)}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(spec, f, ensure_ascii=False)
        subprocess.run([sys.executable, str(ROOT / "tools" / "rough_cut.py"), f.name], check=True)


if __name__ == "__main__":
    main()
