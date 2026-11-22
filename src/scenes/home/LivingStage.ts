/**
 * 主舞台（v9 原设场景 `scene_<id>.jpg` + 原设站立立绘 `suwan_<id>.png` + 柔光氛围与金币粒子）：
 * - 100% 保持苏晚原设韩漫半厚涂立绘比例与五官，与男主立绘画风完全统一，零重绘走形；
 * - 叠加自然呼吸轻盈起伏、点触回弹、丁达尔柔光束、星尘微粒与抛物线飞入钱包的金币粒子。
 */
import * as PIXI from 'pixi.js';
import {
  ICONS,
  outfitFigurePath,
  outfitScenePath,
} from '@/data/art';
import { Game } from '@/core/Game';
import type { OutfitId } from '@/data/world';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import { makeStickerSprite, verticalGradientTexture } from '@/ui/theme';
import { applyFit, fitCover, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

interface Mote {
  g: PIXI.Graphics;
  x: number;
  y: number;
  vy: number;
  amp: number;
  phase: number;
  maxAlpha: number;
}

interface FlyingCoin {
  sp: PIXI.Sprite;
  t: number;
  dur: number;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
}

export class LivingStage extends PIXI.Container {
  private readonly _bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _backGlow = new PIXI.Graphics();
  private readonly _sunRay = new PIXI.Sprite();
  private readonly _figureWrap = new PIXI.Container();
  private readonly _figure = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _vfxLayer = new PIXI.Container();
  private readonly _coinLayer = new PIXI.Container();

  private _outfit: OutfitId = 'tee';
  private _time = 0;
  private _figureBaseY = 1120;
  private _figureBaseScale = 1;
  private _stageTop = 196;
  private _stageBottom = 1110;

  private readonly _motes: Mote[] = [];
  private readonly _coins: FlyingCoin[] = [];

  constructor(onStageTap: (e: PIXI.FederatedPointerEvent) => void) {
    super();

    this._sunRay.texture = verticalGradientTexture(0xFFF6D2, 0xFFE8A3, 0xFFE8A3, 64);
    this._sunRay.anchor.set(0.5, 0);
    this._sunRay.rotation = -0.32;
    this._sunRay.alpha = 0.11;
    this._sunRay.blendMode = PIXI.BLEND_MODES.ADD;

    this._figure.anchor.set(0.5, 1);
    this._figureWrap.addChild(this._figure);

    this.addChild(
      this._bgSprite,
      this._sunRay,
      this._backGlow,
      this._figureWrap,
      this._vfxLayer,
      this._coinLayer,
    );

    this._initMotes();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', onStageTap);
  }

  get figureTexture(): PIXI.Texture {
    return this._figure.texture;
  }

  setStageBounds(top: number, bottom: number): void {
    this._stageTop = top;
    this._stageBottom = bottom;
    this._layoutFigure();
  }

  setOutfit(id: OutfitId, onFigureReady?: (tex: PIXI.Texture) => void): void {
    this._outfit = id;
    const bgPath = outfitScenePath(id);
    const figPath = outfitFigurePath(id);

    const applyBg = (): void => {
      if (this.destroyed || this._outfit !== id) return;
      const tex = gameTexture(bgPath);
      if (!isTextureReady(tex)) return;
      this._bgSprite.texture = tex;
      this.relayout();
    };

    const applyFig = (): void => {
      if (this.destroyed || this._outfit !== id) return;
      const tex = gameTexture(figPath);
      if (!isTextureReady(tex)) return;
      this._figure.texture = tex;
      this._layoutFigure();
      onFigureReady?.(tex);
    };

    if (isTextureReady(gameTexture(bgPath))) applyBg();
    else whenTextureReady(bgPath, applyBg);

    if (isTextureReady(gameTexture(figPath))) applyFig();
    else whenTextureReady(figPath, applyFig);
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this.hitArea = new PIXI.Rectangle(0, 0, W, H);

    if (isTextureReady(this._bgSprite.texture)) {
      applyFit(this._bgSprite, fitCover(this._bgSprite.texture.width, this._bgSprite.texture.height, W, H));
    }

    this._sunRay.position.set(W * 0.24, -40);
    this._sunRay.width = W * 0.52;
    this._sunRay.height = H * 0.56;

    this._backGlow.clear()
      .beginFill(0xFFF3D1, 0.09)
      .drawEllipse(W / 2, (this._stageTop + this._stageBottom) * 0.48, 210, 340)
      .endFill();

    this._layoutFigure();
  }

  private _layoutFigure(): void {
    const W = Game.logicWidth;
    const stageH = Math.max(360, this._stageBottom - this._stageTop);
    // 让全身立绘小腿下部自然衔接到双层底栏后方，上半身与面部在中央通透呈现
    const targetH = Math.min(stageH * 1.16, 1140);
    const headTopY = this._stageTop + Math.max(12, stageH * 0.03);

    if (isTextureReady(this._figure.texture)) {
      const tex = this._figure.texture;
      const scale = Math.min(targetH / tex.height, (W - 200) / tex.width);
      this._figureBaseScale = scale;
      this._figure.scale.set(scale);
      this._figureBaseY = headTopY + tex.height * scale;
      this._figureWrap.position.set(W / 2, this._figureBaseY);
    } else {
      this._figureBaseY = headTopY + targetH;
      this._figureWrap.position.set(W / 2, this._figureBaseY);
    }
  }

  triggerJoyReaction(globalPos?: PIXI.Point, walletTarget?: PIXI.Point, coinCount = 4): void {
    // 轻盈回弹缩放（保持五官与原画 100% 锐利不走形）
    this._figure.scale.set(this._figureBaseScale * 0.978, this._figureBaseScale * 1.015);
    let elapsed = 0;
    const restore = (): void => {
      if (this._figure.destroyed) return;
      elapsed += Game.ticker.deltaMS / 1000 / 0.18;
      if (elapsed >= 1) {
        Game.ticker.remove(restore);
        this._figure.scale.set(this._figureBaseScale);
        return;
      }
      const u = 1 - (1 - elapsed) * (1 - elapsed);
      this._figure.scale.set(
        this._figureBaseScale * (0.978 + 0.022 * u),
        this._figureBaseScale * (1.015 - 0.015 * u),
      );
    };
    Game.ticker.remove(restore);
    Game.ticker.add(restore);

    if (globalPos) {
      const local = this.toLocal(globalPos);
      this._spawnSparkleBurst(local.x, local.y);
      if (walletTarget && coinCount > 0) {
        const dst = this.toLocal(walletTarget);
        this._spawnCoins(local.x, local.y, dst.x, dst.y, coinCount);
      }
    }
  }

  update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    this._time += clampedDt;

    // 柔和呼吸起伏
    this._figureWrap.y = this._figureBaseY + Math.sin(this._time * 2.05) * 2.6;
    this._sunRay.alpha = 0.09 + Math.sin(this._time * 1.1) * 0.03;

    const W = Game.logicWidth;
    const H = Game.logicHeight;
    for (const m of this._motes) {
      m.y -= m.vy * clampedDt;
      if (m.y < H * 0.14) {
        m.y = H * 0.78;
        m.x = W * (0.12 + Math.random() * 0.76);
      }
      m.g.position.set(m.x + Math.sin(this._time * 1.7 + m.phase) * m.amp, m.y);
      m.g.alpha = m.maxAlpha * (0.55 + 0.45 * Math.sin(this._time * 2.6 + m.phase));
    }

    for (let i = this._coins.length - 1; i >= 0; i--) {
      const c = this._coins[i];
      c.t += clampedDt / c.dur;
      if (c.t >= 1) {
        c.sp.destroy();
        this._coins.splice(i, 1);
        continue;
      }
      const u = 1 - (1 - c.t) * (1 - c.t);
      const inv = 1 - u;
      c.sp.position.set(
        inv * inv * c.x0 + 2 * inv * u * c.cx + u * u * c.x1,
        inv * inv * c.y0 + 2 * inv * u * c.cy + u * u * c.y1,
      );
      c.sp.rotation += 8 * clampedDt;
      c.sp.alpha = c.t > 0.82 ? (1 - c.t) / 0.18 : 1;
    }
  }

  private _initMotes(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    for (let i = 0; i < 12; i++) {
      const g = new PIXI.Graphics();
      if (i % 3 === 0) {
        drawDiamondStar(g, 0, 0, 4.5 + (i % 3) * 1.5, 0xFFF4C4, 0.9);
      } else {
        g.beginFill(0xFFF3C8, 0.82).drawCircle(0, 0, 2.2 + (i % 3) * 1.2).endFill();
      }
      const m: Mote = {
        g,
        x: W * (0.12 + Math.random() * 0.76),
        y: H * (0.20 + Math.random() * 0.56),
        vy: 14 + Math.random() * 16,
        amp: 8 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        maxAlpha: 0.36 + Math.random() * 0.34,
      };
      this._vfxLayer.addChild(g);
      this._motes.push(m);
    }
  }

  private _spawnSparkleBurst(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const g = new PIXI.Graphics();
      drawDiamondStar(g, 0, 0, 6 + (i % 2) * 3, i % 2 === 0 ? 0xFFE999 : 0xFFFFFF, 0.95);
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      g.position.set(x, y);
      this._vfxLayer.addChild(g);
      const tx = x + Math.cos(ang) * (28 + Math.random() * 20);
      const ty = y + Math.sin(ang) * (28 + Math.random() * 20) - 14;
      let t = 0;
      const tick = (): void => {
        if (g.destroyed) return;
        t += Game.ticker.deltaMS / 1000 / 0.34;
        if (t >= 1) {
          Game.ticker.remove(tick);
          g.destroy();
          return;
        }
        g.position.set(x + (tx - x) * t, y + (ty - y) * t);
        g.alpha = 1 - t;
        g.scale.set(1.1 - 0.4 * t);
      };
      Game.ticker.add(tick);
    }
  }

  private _spawnCoins(x0: number, y0: number, x1: number, y1: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const sp = makeStickerSprite(ICONS.coins, 32, 32, true);
      sp.position.set(x0, y0);
      this._coinLayer.addChild(sp);
      const spread = (i - (count - 1) / 2) * 34;
      this._coins.push({
        sp,
        t: -i * 0.05,
        dur: 0.46 + i * 0.04,
        x0,
        y0,
        cx: (x0 + x1) * 0.5 + spread - 36,
        cy: Math.min(y0, y1) - 60 - Math.abs(spread),
        x1,
        y1,
      });
    }
  }
}
