"""从 docs/drama/chXX_*/分镜.md 生成 Vidu 批量清单。

每章分镜表的一行 = 一段：首帧、路线（q4 / q3-turbo / q3-drama）、时长；
正文里第 N 个 ``` 代码块就是第 N 段的 Vidu 提示词。

q3-drama 只支持参考生；首帧已经把人物和构图画好，统一改走 q4 首帧图生。

用法：python3 tools/build_vidu_manifest.py ch01 ch02 ... [--force]
输出：docs/prompt/<id>_vidu_prompt.txt，game_assets/.../video/manifest_main.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT.parent / "game_assets" / "duanju" / "assets"
KEEP = "Keep all faces, hairstyles and outfits exactly as in the first frame."

ROW = re.compile(r"^\|\s*(\d+)\s*\|[^|]*\|\s*`([^`]+)`\s*\|([^|]*)\|\s*(\d+)\s*秒")


def model_for(route: str) -> str:
    if "turbo" in route:
        return "viduq3-turbo"
    return "viduq4-preview"


def parse_chapter(ch: str) -> list[dict]:
    doc = next((ROOT / "docs" / "drama").glob(f"{ch}_*/分镜.md"))
    text = doc.read_text(encoding="utf-8")
    rows = [m.groups() for line in text.splitlines() if (m := ROW.match(line))]
    blocks = re.findall(r"```[a-z]*\n(.*?)```", text, re.S)
    if len(blocks) < len(rows):
        raise SystemExit(f"{doc}: {len(rows)} 段但只有 {len(blocks)} 个提示词块")
    jobs = []
    for (seg, frame, route, dur), prompt in zip(rows, blocks):
        prompt = prompt.strip()
        if "exactly as in the first frame" not in prompt:
            prompt += "\n\n" + KEEP
        vid = f"{ch}_s{int(seg):02d}"
        jobs.append({
            "id": vid,
            "frame": frame,
            "model": model_for(route),
            "route": route.strip(),
            "duration": int(dur),
            "prompt": prompt,
        })
    return jobs


def main() -> None:
    chapters = [a for a in sys.argv[1:] if not a.startswith("--")]
    videos = []
    for ch in chapters:
        for job in parse_chapter(ch):
            frame = ASSETS / job["frame"]
            if not frame.exists():
                raise SystemExit(f"缺首帧 {frame}")
            pf = ROOT / "docs" / "prompt" / f"{job['id']}_vidu_prompt.txt"
            pf.write_text(job["prompt"] + "\n", encoding="utf-8")
            videos.append({
                "name": job["id"],
                "mode": "image",
                "model": job["model"],
                "duration": job["duration"],
                "images": [str(frame)],
                "prompt_file": str(pf),
                "output": str(ASSETS / "video" / f"{job['id']}_v1.mp4"),
            })
            print(f"{job['id']}  {job['model']:<15} {job['duration']:>2}s  {job['frame']}  [{job['route']}]")
    manifest = {"defaults": {"resolution": "720p", "aspect_ratio": "9:16"}, "videos": videos}
    out = ASSETS / "video" / "manifest_main.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(videos)} 段 → {out}")


if __name__ == "__main__":
    main()
