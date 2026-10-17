#!/usr/bin/env bash
# 批量 q4 图生视频（自带音效、不出人声）。每行一个 "<镜头名> <秒数>"，并行 4 路，失败自动重试。
# 首帧 style_v2/keyframe/kf_<镜头名>.jpg，提示词 docs/prompt/<镜头名>_v3_vidu_prompt.txt，
# 输出 style_v2/video/<镜头名>_v3.mp4，已存在就跳过。
# 用法：tools/run_clips.sh ch02_s01:8 ch02_s02:8 ...；已提交的任务写成 名:秒:task_id 只取回不重提
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A=/Users/rosa/rosa_games/game_assets/duanju/assets/style_v2
GEN=~/.cursor/skills/vidu-video-gen/scripts/generate_video.py

one() {
  local name sec task
  IFS=: read -r name sec task <<<"$1"
  local out="$A/video/${name}_v3.mp4"
  [ -f "$out" ] && { echo "skip $name"; return; }
  if [ -n "$task" ]; then
    python3 "$GEN" --task-id "$task" --output "$out" >"/tmp/vidu_${name}.log" 2>&1
    [ -f "$out" ] && { echo "done $name (resumed)"; return; }
  fi
  for try in 1 2 3 4 5; do
    python3 "$GEN" --mode image --image "$A/keyframe/kf_${name}.jpg" \
      --prompt-file "$ROOT/docs/prompt/${name}_v3_vidu_prompt.txt" --output "$out" \
      --model viduq4-preview --duration "$sec" --resolution 720p --aspect-ratio 9:16 \
      --audio --audio-type sound_effect_only >"/tmp/vidu_${name}.log" 2>&1
    [ -f "$out" ] && { echo "done $name"; return; }
    echo "retry $name ($try): $(tail -1 /tmp/vidu_${name}.log)"
    sleep 20
  done
  echo "FAIL $name"
}
export -f one
export ROOT A GEN
printf '%s\n' "$@" | xargs -P 4 -I{} bash -c 'one "$@"' _ {}
