/**
 * 韩漫心动 CG 剧场 & 暗面条漫剧场（替代未拍的 76 段男主视频）。
 * - 若 `subpkg_images/cg_<videoId>.jpg` 已存在则全屏展示定制插画并做缓慢推镜；
 * - 若尚未生图，则自动用 v10 韩漫高清立绘（男主 + 女主）搭建带景深光斑、樱花/星光粒子、呼吸推镜与分镜台词的沉浸舞台。
 */
import * as PIXI from 'pixi.js';
import { heroFigurePath, outfitFigurePath, outfitScenePath } from '@/data/art';
import { getHeroScript, speakerLabel, type HeroEpisodeScript } from '@/data/heroScripts';
import { VIDEOS, heroById, heroCgPath } from '@/data/story';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import type { VideoResult } from '@/services/VideoService';
import { Button } from '@/ui/Button';
import { COLORS, drawCreamCard, drawNoirCard, makeText, verticalGradientTexture } from '@/ui/theme';
import { applyFit, fitCover, gameTexture, isTextureFailed, isTextureReady, showFigure, whenTextureReady } from '@/utils/assets';

interface Particle {
  g: PIXI.Graphics;
  vx: number;
  vy: number;
  phase: number;
}

class CGTheaterClass extends PIXI.Container {
  private readonly _bgGrad = new PIXI.Sprite();
  private readonly _sceneBg = new PIXI.Sprite();
  private readonly _tintOverlay = new PIXI.Graphics();
  private readonly _stage = new PIXI.Container();
  private readonly _suwan = new PIXI.Sprite();
  private readonly _hero = new PIXI.Sprite();
  private readonly _cgSprite = new PIXI.Sprite();
  private readonly _particlesLayer = new PIXI.Container();
  private readonly _letterbox = new PIXI.Graphics();
  private readonly _ui = new PIXI.Container();
  private readonly _dialogBox = new PIXI.Container();
  private readonly _choicesBox = new PIXI.Container();

  private _particles: Particle[] = [];
  private _script: HeroEpisodeScript | null = null;
  private _videoId = '';
  private _beatIdx = 0;
  private _choosing = false;
  private _resolve: ((r: VideoResult) => void) | null = null;
  private _time = 0;
  private readonly _tickFn = (): void => this._tick();

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 19500;
    this._suwan.anchor.set(0.5, 1);
    this._hero.anchor.set(0.5, 1);
    this._cgSprite.anchor.set(0.5);
    this._stage.addChild(this._sceneBg, this._tintOverlay, this._suwan, this._hero, this._cgSprite);
    this.addChild(this._bgGrad, this._stage, this._particlesLayer, this._letterbox, this._ui, this._dialogBox, this._choicesBox);
    this.eventMode = 'static';
    this.on('pointertap', () => this._advance());
    OverlayManager.container.addChild(this);
  }

  play(videoId: string): Promise<VideoResult> {
    if (this._resolve) this._finish('skipped');
    const script = getHeroScript(videoId) ?? this._fallbackScript(videoId);
    this._script = script;
    this._videoId = videoId;
    this._beatIdx = 0;
    this._choosing = false;
    this._time = 0;
    this.visible = true;
    OverlayManager.bringToFront();
    AudioManager.playBgm('romance');

    this._setupVisuals(script);
    this._renderBeat();

    this.alpha = 0;
    TweenManager.cancelTarget(this);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.28, ease: Ease.easeOutQuad });
    Game.ticker.add(this._tickFn);

    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  private _fallbackScript(videoId: string): HeroEpisodeScript {
    const def = VIDEOS.get(videoId);
    return {
      videoId,
      heroId: 'luyu',
      mood: 'sweet',
      location: '云城 · 心动时刻',
      withSuwan: true,
      suwanOutfit: GameState.save.outfit,
      beats: [{ speaker: 'narrator', text: def?.title ?? '一段值得珍藏的心动回忆。' }],
    };
  }

  private _setupVisuals(script: HeroEpisodeScript): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const hero = heroById(script.heroId);
    const isDark = script.mood === 'dark';
    const isEnding = script.mood === 'ending';

    // 渐变底色
    this._bgGrad.texture = isDark
      ? verticalGradientTexture(0x160C14, 0x2B1422, 0x12090F, 128)
      : isEnding
        ? verticalGradientTexture(0x2A1E3D, 0x5E3A58, 0xFCE4EC, 128)
        : verticalGradientTexture(0xFFF3F6, 0xFADCE4, 0xF5E6D3, 128);
    this._bgGrad.width = W;
    this._bgGrad.height = H;

    // 借用对应阶段场景做柔焦远景衬底
    const outfit = script.suwanOutfit ?? GameState.save.outfit;
    const bgPath = outfitScenePath(outfit);
    this._sceneBg.texture = gameTexture(bgPath);
    const applyScene = (): void => {
      if (!this.visible || !isTextureReady(this._sceneBg.texture)) return;
      applyFit(this._sceneBg, fitCover(this._sceneBg.texture.width, this._sceneBg.texture.height, W, H));
      this._sceneBg.alpha = isDark ? 0.24 : 0.32;
    };
    this._sceneBg.alpha = 0;
    if (isTextureReady(this._sceneBg.texture)) applyScene();
    else whenTextureReady(bgPath, applyScene);

    // 漫感滤镜遮罩 + 角色氛围光晕
    this._tintOverlay.clear();
    if (isDark) {
      this._tintOverlay.beginFill(0x160B12, 0.72).drawRect(0, 0, W, H).endFill();
      this._tintOverlay.beginFill(hero.accentColor, 0.22).drawCircle(W * 0.5, H * 0.38, W * 0.48).endFill();
    } else {
      this._tintOverlay.beginFill(0xFFF6F8, 0.55).drawRect(0, 0, W, H).endFill();
      this._tintOverlay.beginFill(hero.accentColor, 0.18).drawCircle(W * 0.62, H * 0.36, W * 0.45).endFill();
      this._tintOverlay.beginFill(COLORS.goldLight, 0.38).drawCircle(W * 0.28, H * 0.28, W * 0.36).endFill();
    }

    // 优先检查是否有定制 CG 图，无则用 v10 韩漫双人/单人中近景构图
    const cgPath = heroCgPath(script.videoId);
    this._cgSprite.visible = false;
    if (!isTextureFailed(cgPath)) {
      const tex = gameTexture(cgPath);
      const useCg = (): void => {
        if (!this.visible || this._videoId !== script.videoId || !isTextureReady(gameTexture(cgPath))) return;
        this._cgSprite.texture = gameTexture(cgPath);
        const s = Math.max(W / this._cgSprite.texture.width, H / this._cgSprite.texture.height);
        this._cgSprite.scale.set(s);
        this._cgSprite.position.set(W / 2, H / 2);
        this._cgSprite.visible = true;
        this._hero.visible = false;
        this._suwan.visible = false;
      };
      if (isTextureReady(tex)) useCg();
      else whenTextureReady(cgPath, useCg);
    }

    // 立绘舞台站位（放大为胸腰以上韩漫剧照构图，突出五官与眼神）
    const stageBottom = H + 210;
    const charBoxH = H * 0.96;
    if (script.withSuwan) {
      this._suwan.visible = true;
      this._suwan.position.set(W * 0.30, stageBottom + 40);
      showFigure(this._suwan, outfitFigurePath(outfit), W * 0.66, charBoxH * 0.92, undefined, 'height');

      this._hero.visible = true;
      this._hero.position.set(W * 0.68, stageBottom);
      showFigure(this._hero, heroFigurePath(script.heroId), W * 0.72, charBoxH, undefined, 'height');
    } else {
      this._suwan.visible = false;
      this._hero.visible = true;
      this._hero.position.set(W * 0.52, stageBottom);
      showFigure(this._hero, heroFigurePath(script.heroId), W * 0.82, charBoxH * 1.02, undefined, 'height');
    }

    // 电影感遮幅（暗面线更深邃）
    this._letterbox.clear();
    if (isDark) {
      const barH = Game.safeTop + 72;
      this._letterbox.beginFill(0x0D060A, 0.85).drawRect(0, 0, W, barH).endFill();
    }

    // 氛围粒子（樱花瓣 / 星芒光斑）
    for (const c of this._particlesLayer.removeChildren()) c.destroy();
    this._particles = [];
    for (let i = 0; i < 18; i++) {
      const g = new PIXI.Graphics();
      const col = isDark ? COLORS.champagne : i % 2 === 0 ? COLORS.roseSoft : COLORS.goldLight;
      g.beginFill(col, isDark ? 0.35 : 0.65).drawCircle(0, 0, 3 + (i % 4) * 2).endFill();
      g.position.set(Math.random() * W, Math.random() * H * 0.75);
      this._particlesLayer.addChild(g);
      this._particles.push({
        g,
        vx: (Math.random() - 0.5) * 18,
        vy: isDark ? -12 - Math.random() * 15 : 16 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // 顶部标题胶囊 + 跳过按钮
    for (const c of this._ui.removeChildren()) c.destroy({ children: true });
    const topY = Game.safeTop + 14;
    const def = VIDEOS.get(script.videoId);
    const badgeStr = isDark ? `暗面档案 · ${def?.title ?? ''}` : isEnding ? `👑 专属终章 · ${def?.title ?? ''}` : `💖 心动剧场 · ${def?.title ?? ''}`;
    const titleTxt = makeText(badgeStr, 22, isDark ? COLORS.champagne : COLORS.ink, true);
    const locTxt = makeText(`📍 ${script.location}`, 18, isDark ? COLORS.textOnGlassSoft : COLORS.inkSoft);
    const pillW = Math.max(titleTxt.width, locTxt.width) + 44;
    const pillBg = new PIXI.Graphics();
    if (isDark) drawNoirCard(pillBg, 24, topY, pillW, 68, 22, 0.88);
    else drawCreamCard(pillBg, 24, topY, pillW, 68, 22, { borderColor: COLORS.borderGold });
    titleTxt.position.set(44, topY + 10);
    locTxt.position.set(44, topY + 40);
    this._ui.addChild(pillBg, titleTxt, locTxt);

    const skip = new Button({
      width: 132,
      height: 54,
      variant: isDark ? 'noir' : 'glass',
      fontSize: 22,
      label: '跳过 ▸',
      onTap: () => this._finish('skipped'),
    });
    skip.position.set(W - 90, topY + 34);
    skip.on('pointertap', (e: PIXI.FederatedPointerEvent) => e.stopPropagation());
    this._ui.addChild(skip);
  }

  private _renderBeat(): void {
    const script = this._script;
    if (!script) return;
    for (const c of this._dialogBox.removeChildren()) c.destroy({ children: true });
    for (const c of this._choicesBox.removeChildren()) c.destroy({ children: true });

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const isDark = script.mood === 'dark';
    const beat = script.beats[Math.min(this._beatIdx, script.beats.length - 1)];

    // 说话人焦点高亮
    if (!this._cgSprite.visible && script.withSuwan) {
      const heroTurn = beat.speaker === 'hero';
      const suwanTurn = beat.speaker === 'suwan';
      this._hero.alpha = suwanTurn ? 0.84 : 1;
      this._suwan.alpha = heroTurn ? 0.84 : 1;
    }

    const boxW = W - 48;
    const boxH = 228;
    const boxX = 24;
    const boxY = H - Game.safeBottom - boxH - 28;

    const card = new PIXI.Graphics();
    if (isDark) drawNoirCard(card, boxX, boxY, boxW, boxH, 32, 0.93);
    else drawCreamCard(card, boxX, boxY, boxW, boxH, 32, { fill: COLORS.bg, alpha: 0.96, borderColor: COLORS.borderGold, borderWidth: 2 });
    this._dialogBox.addChild(card);

    const who = speakerLabel(script, beat);
    if (who) {
      const nameTag = new PIXI.Graphics();
      const nameText = makeText(who, 24, COLORS.white, true);
      const nw = Math.max(128, nameText.width + 44);
      const tagCol = beat.speaker === 'hero' ? heroById(script.heroId).accentColor : beat.speaker === 'suwan' ? COLORS.rose : COLORS.inkSoft;
      nameTag.beginFill(tagCol).drawRoundedRect(boxX + 28, boxY - 22, nw, 44, 22).endFill();
      nameText.anchor.set(0.5);
      nameText.position.set(boxX + 28 + nw / 2, boxY);
      this._dialogBox.addChild(nameTag, nameText);
    }

    const bodyText = makeText(
      beat.speaker === 'narrator' ? beat.text : `「${beat.text}」`,
      26,
      isDark ? (beat.speaker === 'narrator' ? COLORS.textOnGlassSoft : COLORS.textOnGlass) : (beat.speaker === 'narrator' ? COLORS.inkSoft : COLORS.ink),
      beat.speaker !== 'narrator',
    );
    bodyText.style.wordWrap = true;
    bodyText.style.wordWrapWidth = boxW - 64;
    bodyText.style.breakWords = true;
    bodyText.style.lineHeight = 40;
    bodyText.position.set(boxX + 32, boxY + 38);
    this._dialogBox.addChild(bodyText);

    const stepStr = `${this._beatIdx + 1} / ${script.beats.length}  ·  轻触继续 ▾`;
    const hint = makeText(stepStr, 19, isDark ? COLORS.champagne : COLORS.roseDeep, true);
    hint.anchor.set(1, 1);
    hint.position.set(boxX + boxW - 28, boxY + boxH - 18);
    this._dialogBox.addChild(hint);

    this._dialogBox.alpha = 0;
    TweenManager.cancelTarget(this._dialogBox);
    TweenManager.to({ target: this._dialogBox, props: { alpha: 1 }, duration: 0.18, ease: Ease.easeOutQuad });

    if (this._choosing && script.choice) {
      hint.visible = false;
      this._renderChoices(script.choice, boxY - 24, isDark);
    }
  }

  private _renderChoices(choices: readonly [string, string], bottomY: number, isDark: boolean): void {
    const W = Game.logicWidth;
    choices.forEach((label, idx) => {
      const btn = new Button({
        width: W - 96,
        height: 76,
        variant: idx === 0 ? 'rose' : isDark ? 'noir' : 'gold',
        fontSize: 25,
        label: `✦ ${label}`,
        onTap: () => {
          AudioManager.play('bond_up');
          this._finish('ended');
        },
      });
      btn.position.set(W / 2, bottomY - (1 - idx) * 92 - 38);
      btn.on('pointertap', (e: PIXI.FederatedPointerEvent) => e.stopPropagation());
      this._choicesBox.addChild(btn);
    });
  }

  private _advance(): void {
    const script = this._script;
    if (!script || this._choosing) return;
    AudioManager.play('ui_click');
    if (this._beatIdx + 1 < script.beats.length) {
      this._beatIdx += 1;
      this._renderBeat();
      return;
    }
    if (script.choice) {
      this._choosing = true;
      this._renderBeat();
      return;
    }
    this._finish('ended');
  }

  private _tick(): void {
    if (!this.visible) return;
    const dt = Game.ticker.deltaMS / 1000;
    this._time += dt;
    const W = Game.logicWidth;
    const H = Game.logicHeight;

    // 缓慢推镜呼吸感（Ken Burns）
    const zoom = 1 + Math.sin(this._time * 0.45) * 0.018;
    this._stage.pivot.set(W / 2, H / 2);
    this._stage.position.set(W / 2, H / 2);
    this._stage.scale.set(zoom);

    for (const p of this._particles) {
      p.g.x += p.vx * dt + Math.sin(this._time * 1.5 + p.phase) * 0.35;
      p.g.y += p.vy * dt;
      if (p.vy > 0 && p.g.y > H * 0.8) p.g.y = -10;
      if (p.vy < 0 && p.g.y < 0) p.g.y = H * 0.78;
      if (p.g.x < -10) p.g.x = W + 10;
      if (p.g.x > W + 10) p.g.x = -10;
    }
  }

  private _finish(result: VideoResult): void {
    const resolve = this._resolve;
    if (!resolve) return;
    this._resolve = null;
    Game.ticker.remove(this._tickFn);
    AudioManager.playBgm('home');
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.18,
      ease: Ease.easeInQuad,
      onComplete: () => {
        if (!this._resolve) this.visible = false;
      },
    });
    resolve(result);
  }
}

export const CGTheater = new CGTheaterClass();
