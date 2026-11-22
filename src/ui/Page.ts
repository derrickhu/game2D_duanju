/**
 * 全屏二级页面基类（v8 暖象牙珠光杂志顶栏）：
 * - 自动避让微信右上角胶囊区，彻底杜绝顶栏挤压；
 * - 左上角温润圆章返回键 + 居中 32px 高对比深可可大标题 + 右侧清晰大字号双货币胶囊。
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES } from '@/data/art';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  drawLuxuryPageBg,
  drawNoirCard,
  makeNumText,
  makeStickerSprite,
  makeText,
} from './theme';

export const PAGE_PAD = 22;
const TOP_H = 62;

export function makeBackButton(onTap: () => void, label = '返回', dark = false): PIXI.Container {
  const back = new PIXI.Container();
  if (dark) {
    const w = 118;
    const g = new PIXI.Graphics();
    drawNoirCard(g, 0, 0, w, 50, 25, 0.92);
    const t = makeText(`‹ ${label}`, 21, COLORS.champagne, true);
    t.anchor.set(0.5);
    t.position.set(w / 2, 25);
    back.addChild(g, t);
    back.hitArea = new PIXI.Rectangle(-10, -10, w + 20, 70);
  } else {
    const g = new PIXI.Graphics();
    drawCreamCard(g, 0, 4, 108, 52, 26, {
      fill: 0xFFFDF9,
      alpha: 0.98,
      borderColor: 0xDFB870,
      borderWidth: 2,
    });
    const arrow = makeText(`‹ ${label}`, 21, COLORS.ink, true);
    arrow.anchor.set(0.5);
    arrow.position.set(54, 30);
    back.addChild(g, arrow);
    back.hitArea = new PIXI.Rectangle(-8, -4, 124, 68);
  }

  back.eventMode = 'static';
  back.cursor = 'pointer';
  back.on('pointerdown', () => back.scale.set(0.94));
  const release = (): void => { back.scale.set(1); };
  back.on('pointerup', release);
  back.on('pointerupoutside', release);
  back.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    onTap();
  });
  return back;
}

export function buildLightCurrencyPill(
  iconPath: string,
  valTextNode: PIXI.Text,
  w1x = 144,
  onTap?: () => void,
): PIXI.Container {
  const wrap = new PIXI.Container();
  const h1x = 44;
  const skin = createNineSlice2x(
    { path: UI_SLICES.pillCurrencyLight, pad2x: 12, left2x: 68, top2x: 42, right2x: 84, bottom2x: 44 },
    w1x,
    h1x,
    false,
  );
  const ic = makeStickerSprite(iconPath, 42, 42, true);
  ic.position.set(18, h1x / 2);

  valTextNode.style.fill = COLORS.ink;
  valTextNode.anchor.set(0.5);
  valTextNode.position.set((34 + (w1x - 36)) / 2, h1x / 2 - 0.5);

  const plus = makeText('+', 19, 0x6B4B24, true);
  plus.anchor.set(0.5);
  plus.position.set(w1x - 20, h1x / 2 - 1.5);

  wrap.addChild(skin, ic, valTextNode, plus);
  if (onTap) {
    wrap.eventMode = 'static';
    wrap.cursor = 'pointer';
    wrap.hitArea = new PIXI.Rectangle(-6, -6, w1x + 12, h1x + 12);
    wrap.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play('ui_click');
      onTap();
    });
  }
  return wrap;
}

export abstract class Page extends PIXI.Container {
  protected readonly bgLayer = new PIXI.Container();
  protected readonly body = new PIXI.Container();
  private readonly _top = new PIXI.Container();
  private readonly _moneyWrap = new PIXI.Container();
  private readonly _moneyTxt = makeNumText('0', 20, COLORS.ink);
  private readonly _roseTxt = makeNumText('0', 20, COLORS.ink);
  private _title = '';
  private _isOpen = false;
  protected isDarkTheme = false;
  protected hideDefaultBg = false;

  constructor(title: string) {
    super();
    this._title = title;
    this.visible = false;
    this.bgLayer.eventMode = 'static';
    this.addChild(this.bgLayer, this.body, this._top);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  protected get headerTopY(): number {
    return Game.safeTop > 24 ? Game.safeTop + 42 : Math.max(16, Game.safeTop + 10);
  }

  protected get contentTop(): number {
    return this.headerTopY + TOP_H + 14;
  }

  protected get contentBottom(): number {
    return Game.logicHeight - Game.safeBottom - 18;
  }

  protected setTitle(title: string): void {
    this._title = title;
    if (this._isOpen) this._buildTop();
  }

  protected setDarkTheme(dark: boolean): void {
    if (this.isDarkTheme === dark) return;
    this.isDarkTheme = dark;
    if (this._isOpen) {
      if (!this.hideDefaultBg) {
        drawLuxuryPageBg(this.bgLayer, Game.logicWidth, Game.logicHeight, this.isDarkTheme);
      }
      this._buildTop();
    }
  }

  open(): void {
    const wasOpen = this._isOpen;
    this._isOpen = true;
    this.visible = true;
    OverlayManager.bringToFront();
    if (!wasOpen) AudioManager.play('ui_open');
    this.onOpen();
    this.relayout();
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this.body);
    this.alpha = 0;
    this.body.y = 20;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.2, ease: Ease.easeOutQuad });
    TweenManager.to({ target: this.body, props: { y: 0 }, duration: 0.24, ease: Ease.easeOutQuad });
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.onClose();
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this.body);
    if (silent) {
      this.visible = false;
      this.alpha = 1;
      this.body.y = 0;
      return;
    }
    AudioManager.play('ui_close');
    TweenManager.to({ target: this.body, props: { y: 16 }, duration: 0.15, ease: Ease.easeInQuad });
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.15,
      ease: Ease.easeInQuad,
      onComplete: () => {
        this.visible = false;
        this.alpha = 1;
        this.body.y = 0;
      },
    });
  }

  relayout(): void {
    if (!this.hideDefaultBg) {
      drawLuxuryPageBg(this.bgLayer, Game.logicWidth, Game.logicHeight, this.isDarkTheme);
    } else {
      for (const c of this.bgLayer.removeChildren()) c.destroy();
      this.bgLayer.addChild(new PIXI.Graphics().beginFill(COLORS.bg).drawRect(0, 0, Game.logicWidth, Game.logicHeight).endFill());
    }
    this._buildTop();
    this.rebuild();
  }

  rebuild(): void {
    if (!this._isOpen) return;
    this.layoutBody(this.contentTop, this.contentBottom);
    this.refreshMoney();
  }

  refreshAffordable(): void {
    if (!this._isOpen) return;
    this.refreshMoney();
    this.onMoneyChanged();
  }

  protected refreshMoney(): void {
    const save = GameState.save;
    this._roseTxt.text = String(save.roses);
    this._moneyTxt.text = formatMoney(save.money);
    this._roseTxt.scale.set(1);
    this._moneyTxt.scale.set(1);
    if (this._moneyTxt.width > 74) this._moneyTxt.scale.set(74 / this._moneyTxt.width);
  }

  protected onOpen(): void {}

  protected onClose(): void {}

  protected onMoneyChanged(): void {}

  protected onBack(): void {
    this.close();
  }

  protected abstract layoutBody(top: number, bottom: number): void;

  private _buildTop(): void {
    this._roseTxt.parent?.removeChild(this._roseTxt);
    this._moneyTxt.parent?.removeChild(this._moneyTxt);
    for (const c of this._moneyWrap.removeChildren()) c.destroy({ children: true });
    this._moneyWrap.parent?.removeChild(this._moneyWrap);
    for (const c of this._top.removeChildren()) c.destroy({ children: true });

    this._top.y = this.headerTopY;
    const back = makeBackButton(() => this.onBack(), '返回', this.isDarkTheme);
    back.x = PAGE_PAD;

    const titleBg = new PIXI.Graphics();
    if (this.hideDefaultBg && !this.isDarkTheme) {
      drawCreamCard(titleBg, 152, 6, 224, 48, 24, { fill: 0xFFFDF8, alpha: 0.90, borderColor: 0xE5C17B });
      this._top.addChild(titleBg);
    }

    const title = makeText(this._title, 31, this.isDarkTheme ? COLORS.champagne : COLORS.ink, true);
    title.style.letterSpacing = 2;
    if (!this.isDarkTheme) {
      title.style.dropShadow = true;
      title.style.dropShadowColor = 0xFFFFFF;
      title.style.dropShadowAlpha = 0.92;
      title.style.dropShadowBlur = 0;
      title.style.dropShadowDistance = 1.5;
      title.style.dropShadowAngle = Math.PI / 2;
    }
    title.anchor.set(0.5);
    title.position.set(264, TOP_H / 2 - 1);

    const rosePill = buildLightCurrencyPill(ICONS.currencyRose, this._roseTxt, 128);
    const cashPill = buildLightCurrencyPill(ICONS.coins, this._moneyTxt, 156);
    rosePill.position.set(0, 0);
    cashPill.position.set(136, 0);
    this._moneyWrap.addChild(rosePill, cashPill);
    this._moneyWrap.position.set(Game.logicWidth - PAGE_PAD - 292, (TOP_H - 44) / 2);

    this._top.addChild(back, title, this._moneyWrap);
    this.refreshMoney();
  }
}
