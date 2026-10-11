import * as PIXI from 'pixi.js';
import type { Scene } from '@/core/SceneManager';
import { Game } from '@/core/Game';
import { ProgressBar } from '@/ui/ProgressBar';
import { COLORS, makeText } from '@/ui/theme';
import { applyFit, fitCover, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

const LOADING_BG = 'boot/loading.jpg';
const NOTICE_H = 168;

/** 国家新闻出版署《健康游戏忠告》，启动页底部原样展示。 */
const NOTICE_LINES = [
  '抵制不良游戏，拒绝盗版游戏。',
  '注意自我保护，谨防受骗上当。',
  '适度游戏益脑，沉迷游戏伤身。',
  '合理安排时间，享受健康生活。',
] as const;

/** 首屏：boot/loading.jpg 盖满，标题已经做在图里。图还没到时用纯色加游戏名兜底。 */
export class LoadingScene implements Scene {
  readonly name = 'loading';
  readonly container = new PIXI.Container();
  private readonly _bg = new PIXI.Graphics();
  private readonly _photo = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _title = makeText('假千金逆袭', 64, COLORS.champagne, true);
  private readonly _tip = makeText('正在加载…', 26, COLORS.textOnGlassSoft);
  private readonly _bar = new ProgressBar(460, 18, COLORS.champagne, COLORS.white, 0.28);
  private readonly _notice = new PIXI.Container();
  private readonly _noticeBg = new PIXI.Graphics();
  private readonly _noticeTitle = makeText('健康游戏忠告', 22, COLORS.champagne, true);
  private readonly _noticeLines = NOTICE_LINES.map((line) => makeText(line, 20, COLORS.textOnGlass));

  constructor() {
    this._title.anchor.set(0.5);
    this._tip.anchor.set(0.5);
    this._tip.style.dropShadow = true;
    this._tip.style.dropShadowColor = COLORS.glass;
    this._tip.style.dropShadowBlur = 6;
    this._tip.style.dropShadowDistance = 0;
    this._tip.style.dropShadowAlpha = 0.85;
    this._photo.texture = gameTexture(LOADING_BG);
    whenTextureReady(LOADING_BG, () => {
      this._title.visible = false;
      this._tip.style.fill = COLORS.champagne;
      this.relayout();
    });
    this._noticeTitle.anchor.set(0.5, 0);
    for (const line of this._noticeLines) line.anchor.set(0.5, 0);
    this._notice.addChild(this._noticeBg, this._noticeTitle, ...this._noticeLines);
    this.container.addChild(this._bg, this._photo, this._title, this._bar, this._tip, this._notice);
  }

  onEnter(): void {
    this.relayout();
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._bg.clear().beginFill(COLORS.glass).drawRect(0, 0, W, H).endFill();
    const ready = isTextureReady(this._photo.texture);
    this._photo.visible = ready;
    this._title.visible = !ready;
    if (ready) {
      applyFit(this._photo, fitCover(this._photo.texture.width, this._photo.texture.height, W, H));
      this._tip.style.fill = COLORS.champagne;
    }
    this._title.position.set(W / 2, H * 0.38);
    const noticeTop = H - Game.safeBottom - NOTICE_H;
    this._noticeBg.clear()
      .beginFill(0x0c0809, 0.82)
      .drawRect(0, noticeTop, W, NOTICE_H + Game.safeBottom)
      .endFill();
    this._noticeBg.lineStyle(1, COLORS.champagne, 0.35)
      .moveTo(48, noticeTop)
      .lineTo(W - 48, noticeTop);
    this._noticeTitle.position.set(W / 2, noticeTop + 14);
    this._noticeLines.forEach((line, i) => line.position.set(W / 2, noticeTop + 48 + i * 28));
    const barY = noticeTop - 78;
    this._bar.position.set((W - 460) / 2, barY);
    this._tip.position.set(W / 2, barY + 40);
  }

  setProgress(p: number): void {
    this._bar.progress = p;
    this._tip.text = `正在加载… ${Math.round(p * 100)}%`;
  }
}
