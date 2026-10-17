"""给一章视频配音、加音效和配乐，烧字幕，导出整章版和游戏分段版。

用法：python3 tools/dub_mix.py docs/drama/dub/ch01.json [--only-audio]

配置：
{
  "title": "第1章 · 摆摊第一天",
  "clips": [
    {"file": "ch01_s01_v2.mp4",                 # 相对 style_v2/video/
     "sfx": "busy night market chatter ...",     # 整段环境音，可省
     "lines": [{"at": 1.2, "who": "路人女孩", "text": "快来！", "emotion": "surprised"},
               {"at": 0.0, "until": 2.5, "text": "云城 · 苏家订婚宴"}]}      # 没有 who = 纯字幕
  ],
  "music": [{"from": 0, "to": 1, "prompt": "warm cheerful acoustic guitar ..."}],  # 按 clip 下标，含两端
  "segments": {"ch01_s01": [0, 0], "ch01_s04": [3, 5]},                        # 游戏分段，按 clip 下标
  "out": "ch01",
  "native": 1.0                                                                # 保留 clip 自带音轨（q4 原生音效），clip 里可单独覆盖
}
角色音色见 docs/drama/voices.json。台词、音效、配乐都缓存在 style_v2/audio/<out>/，改了文案才会重新生成。
有 "video" 字段的 clip 用它替代 file 的画面（对口型后的成片）。
"""
import array
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V2 = ROOT.parent / "game_assets" / "duanju" / "assets" / "style_v2"
VIDU_AUDIO = Path.home() / ".cursor/skills/vidu-video-gen/scripts/vidu_audio.py"
TITLE_SEC = 2.5
GAIN = {"voice": 1.6, "sfx": 0.45, "music": 0.28}


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return float(out)


def has_audio(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout
    return bool(out.strip())


def key(*parts):
    return hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:10]


def vidu(args, out):
    if out.exists():
        return
    env = {**os.environ, "VIDU_NO_PROXY": "1"}
    subprocess.run([sys.executable, str(VIDU_AUDIO), *args, "--out", str(out)], check=True, env=env)


def tts(line, voices, cache):
    v = voices[line["who"]]
    emo = line.get("emotion")
    speed = v.get("speed")
    pitch = v.get("pitch")
    parts = [v["voice"], line["text"], emo, speed] + ([pitch] if pitch else [])
    out = cache / f"vo_{key(*parts)}.mp3"
    args = ["tts", "--voice", v["voice"], "--text", line["text"]]
    if emo:
        args += ["--emotion", emo]
    if speed:
        args += ["--speed", str(speed)]
    if pitch:
        args += ["--pitch", str(pitch)]
    vidu(args, out)
    return out


def levels(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-f", "s16le", "-"],
                         capture_output=True).stdout
    samples = array.array("h")
    samples.frombytes(raw[:len(raw) // 2 * 2])
    if not samples:
        return -1.0, -20.0
    peak = max(abs(s) for s in samples) / 32768 or 1e-9
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768 or 1e-9
    return 20 * math.log10(peak), 20 * math.log10(rms)


def voice_gain(path):
    """台词拉到能听清的音量。过轻的声线（如短句、轻声）按响度补上，峰值不超过 -1 dB。"""
    peak, rms = levels(path)
    gain = 10 ** ((-16 - rms) / 20)
    cap = 10 ** ((-1.0 - peak) / 20)
    return max(0.5, min(gain, cap))


def sound(prompt, seconds, cache, tag):
    seconds = max(2.0, min(10.0, round(seconds, 1)))
    out = cache / f"{tag}_{key(prompt, seconds)}.wav"
    vidu(["sfx", "--prompt", prompt, "--duration", str(seconds)], out)
    return out


def main():
    spec_path = Path(sys.argv[1])
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    voices = json.loads((ROOT / "docs/drama/voices.json").read_text(encoding="utf-8"))
    name = spec["out"]
    cache = V2 / "audio" / name
    cache.mkdir(parents=True, exist_ok=True)
    out_dir = V2 / "video" / "dub"
    out_dir.mkdir(parents=True, exist_ok=True)

    clips, starts, t = [], [], 0.0
    for c in spec["clips"]:
        f = V2 / "video" / c.get("video", c["file"])
        clips.append(str(f))
        starts.append(t)
        t += dur(f)
    total = t

    tracks, subs = [], []
    for c, st, f in zip(spec["clips"], starts, clips):
        d = dur(f)
        native = c.get("native", spec.get("native"))
        if native and has_audio(f):
            tracks.append((Path(f), st, native, d, "loudnorm=I=-20:TP=-2:LRA=11,"))
        if c.get("sfx"):
            tracks.append((sound(c["sfx"], d, cache, "sfx"), st, GAIN["sfx"], d))
        cursor = 0.0
        for ln in c.get("lines", []):
            if "who" not in ln:
                subs.append([round(st + ln["at"], 2), round(st + ln["until"], 2), ln["text"]])
                continue
            vo = tts(ln, voices, cache)
            at = max(ln["at"], cursor)
            ld = dur(vo)
            tracks.append((vo, st + at, voice_gain(vo) * ln.get("gain", 1.0), ld))
            subs.append([round(st + at, 2), round(st + at + ld + 0.25, 2), ln.get("sub", ln["text"])])
            cursor = at + ld + 0.15
            if cursor > d + 0.3:
                print(f"  注意：{c['file']} 的台词「{ln['text']}」超出画面 {cursor - d:.1f}s")

    for m in spec.get("music", []):
        a, b = starts[m["from"]], starts[m["to"]] + dur(clips[m["to"]])
        span = b - a + (TITLE_SEC if m["to"] == len(clips) - 1 else 0)
        tracks.append((sound(m["prompt"], span, cache, "bgm"), a, GAIN["music"] * m.get("gain", 1.0), span))

    full_len = total + (TITLE_SEC if spec.get("title") else 0)
    tmp = Path(tempfile.mkdtemp())
    mix = tmp / "mix.wav"
    inputs, flt = [], []
    for i, (f, at, g, length, *pre) in enumerate(tracks):
        length = min(length, dur(f))
        inputs += ["-i", str(f)]
        ms = int(at * 1000)
        fade_in, fade_out_d = (0.04, 0.10) if length < 1.8 else (0.12, 0.35)
        fade_out = max(0.0, length - fade_out_d)
        flt.append(f"[{i}:a]{''.join(pre)}aresample=44100,aformat=channel_layouts=stereo,atrim=0:{length:.2f},"
                   f"afade=t=in:d={fade_in:.2f},afade=t=out:st={fade_out:.2f}:d={fade_out_d:.2f},volume={g},adelay={ms}|{ms}[t{i}]")
    flt.append("".join(f"[t{i}]" for i in range(len(tracks)))
               + f"amix=inputs={len(tracks)}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,"
               f"aresample=44100,alimiter=limit=0.95,"
               f"apad,atrim=0:{full_len:.2f}[m]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(flt), "-map", "[m]",
                    str(mix)], check=True)

    if "--only-audio" in sys.argv:
        print(mix)
        return

    silent = tmp / "picture.mp4"
    cut = {"clips": clips, "subs": subs, "title": spec.get("title"), "out": str(silent)}
    (tmp / "cut.json").write_text(json.dumps(cut, ensure_ascii=False), encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "tools/rough_cut.py"), str(tmp / "cut.json")], check=True)

    full = out_dir / f"{name}_full.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(silent), "-i", str(mix), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(full)],
                   check=True)
    print(full)

    for seg, (a, b) in spec.get("segments", {}).items():
        s0, s1 = starts[a], starts[b] + dur(clips[b])
        out = out_dir / f"{seg}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s0:.3f}", "-to", f"{s1:.3f}", "-i", str(full),
                        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "21",
                        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)], check=True)
        print(out)


if __name__ == "__main__":
    main()
