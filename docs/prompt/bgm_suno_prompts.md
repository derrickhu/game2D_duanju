# BGM · Suno 提示词

Suno 没有公开 API，在 suno.com 用 Custom 模式手动生成。下载 mp3 后放到 `minigame/subpkg_audio/`，文件名如下，再跑 `node scripts/stage_cdn.mjs` 上传 CDN。

两首共用标志性乐器：**钢琴 + 拨弦 + 轻柔弦乐**，只改速度和配器密度。

## bgm_home.mp3 · 主界面挂机

- Style：`warm modern C-drama soundtrack, light piano, pizzicato strings, soft acoustic guitar, gentle glockenspiel, cozy dessert shop, hopeful, instrumental, no vocals`
- BPM / 调性：96 BPM，D major
- Lyrics 栏填结构：

```
[Intro]
[Loop A: light piano melody over pizzicato]
[Loop B: strings join, glockenspiel sparkles]
[Loop A]
[Outro: soft piano, ends on the same chord as the intro for seamless loop]
```

- 时长 1:30–2:00；首尾和弦一致，方便无缝循环。

## bgm_romance.mp3 · 男主羁绊 / 心动

- Style：`romantic C-drama love theme, tender piano, warm cello and violin, soft pizzicato, music box, heartfelt, slow, instrumental, no vocals`
- BPM / 调性：72 BPM，A major
- Lyrics 栏：

```
[Intro: music box]
[Loop A: tender piano melody]
[Loop B: cello and violin duet swell]
[Loop A]
[Outro: music box, resolves to the intro chord]
```

- 时长 1:30–2:00。
