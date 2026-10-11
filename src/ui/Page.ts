/**
 * 全屏页面：烟灰底 + 顶部返回 / 标题 / 余额，和产业页、店员页同一套样式。
 * 子类在 layoutBody(top, bottom) 里摆内容；数据变化时调 rebuild()，钱变化时调 refreshAffordable()。
 */
import * as PIXI from 'pixi.js';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { COLORS, drawGlass, makeText } from './theme';

export const PAGE_PAD = 24;
const TOP_H = 64;

/** 返回键：玻璃胶囊 + 香槟金箭头 */
export function makeBackButton(onTap: () => void, label = '返回'): PIXI.Container {
  const h = TOP_H;
  const back = new PIXI.Container();
  const text = makeText(label, 26, COLORS.textOnGlass, true);
  const w = Math.max(156, text.width + 84);
  back.addChild(drawGlass(new PIXI.Graphics(), 0, 0, w, h, h / 2));
  const arrow = new PIXI.Graphics();
  arrow.lineStyle(4, COLORS.champagne).moveTo(38, h / 2 - 12).lineTo(24, h / 2).lineTo(38, h / 2 + 12);
  text.anchor.set(0, 0.5);
  text.position.set(54, h / 2);
  back.addChild(arrow, text);
  back.eventMode = 'static';
  back.cursor = 'pointer';
  back.hitArea = new PIXI.Rectangle(-12, -12, w + 24, h + 24);
  back.on('pointerdown', () => back.scale.set(0.95));
  const release = (): void => { back.scale.set(1); };
  back.on('pointerup', release);
  back.on('pointerupoutside', release);
  back.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    onTap();
  });
  return back;
}

export abstract class Page extends PIXI.Container {
  protected readonly bg = new PIXI.Graphics();
  protected readonly body = new PIXI.Container();
  private readonly _top = new PIXI.Container();
  private readonly _money = makeText('', 24, COLORS.champagne, true);
  private readonly _moneyPill = new PIXI.Graphics();
  private _title = '';
  private _isOpen = false;

  constructor(title: string) {
    super();
    this._title = title;
    this.visible = false;
    this.bg.eventMode = 'static';
    this._money.anchor.set(0.5);
    this.addChild(this.bg, this.body, this._top);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  /** 顶部栏下沿，子类从这里往下摆 */
  protected get contentTop(): number {
    return Game.safeTop + 4 + TOP_H + 20;
  }

  protected get contentBottom(): number {
    return Game.logicHeight - Game.safeBottom - 20;
  }

  protected setTitle(title: string): void {
    this._title = title;
    if (this._isOpen) this._buildTop();
  }

  open(): void {
    const wasOpen = this._isOpen;
    this._isOpen = true;
    this.visible = true;
    if (!wasOpen) AudioManager.play('ui_open');
    this.onOpen();
    this.relayout();
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this.body);
    this.alpha = 0;
    this.body.y = 28;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.2, ease: Ease.easeOutQuad });
    TweenManager.to({ target: this.body, props: { y: 0 }, duration: 0.28, ease: Ease.easeOutQuad });
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
    TweenManager.to({ target: this.body, props: { y: 20 }, duration: 0.18, ease: Ease.easeInQuad });
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.18,
      ease: Ease.easeInQuad,
      onComplete: () => {
        this.visible = false;
        this.alpha = 1;
        this.body.y = 0;
      },
    });
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this.bg.clear().beginFill(COLORS.glass).drawRect(0, 0, W, H).endFill();
    for (let i = 0; i < 16; i++) {
      this.bg.beginFill(0x3a262b, 0.05).drawCircle(W / 2, H * 0.42, W * (1.1 - i * 0.06)).endFill();
    }
    this._buildTop();
    this.rebuild();
  }

  rebuild(): void {
    if (!this._isOpen) return;
    this.layoutBody(this.contentTop, this.contentBottom);
    this.refreshMoney();
  }

  /** 钱变化：只刷余额和按钮可用状态，不重建页面 */
  refreshAffordable(): void {
    if (!this._isOpen) return;
    this.refreshMoney();
    this.onMoneyChanged();
  }

  protected refreshMoney(): void {
    this._money.text = `¥ ${formatMoney(GameState.save.money)}`;
    const h = TOP_H;
    const w = Math.max(168, this._money.width + 36);
    this._moneyPill.clear();
    drawGlass(this._moneyPill, 0, 0, w, h, h / 2);
    this._moneyPill.x = Game.logicWidth - PAGE_PAD - w;
    this._money.position.set(this._moneyPill.x + w / 2, h / 2);
  }

  protected onOpen(): void {}

  protected onClose(): void {}

  protected onMoneyChanged(): void {}

  /** 返回键默认关页；子页面可以改成退回上一级 */
  protected onBack(): void {
    this.close();
  }

  protected abstract layoutBody(top: number, bottom: number): void;

  private _buildTop(): void {
    this._money.parent?.removeChild(this._money);
    this._moneyPill.parent?.removeChild(this._moneyPill);
    for (const c of this._top.removeChildren()) c.destroy({ children: true });
    this._top.y = Game.safeTop + 4;
    const back = makeBackButton(() => this.onBack());
    back.x = PAGE_PAD;
    const title = makeText(this._title, 34, COLORS.textOnGlass, true);
    title.style.letterSpacing = 6;
    title.anchor.set(0.5);
    title.position.set(Game.logicWidth / 2, TOP_H / 2);
    this._top.addChild(back, title, this._moneyPill, this._money);
    this.refreshMoney();
  }
}
