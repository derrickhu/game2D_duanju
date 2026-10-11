/**
 * 玻璃风格确认框，替代微信原生 showModal，和游戏内页面同一套样式。
 * 返回 true 表示点了确认；点遮罩或取消都算 false。
 */
import * as PIXI from 'pixi.js';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { Button } from './Button';
import { COLORS, drawGlass, makeText } from './theme';

export interface DialogOptions {
  title: string;
  content: string;
  confirmText?: string;
  /** 不传就只有一个按钮 */
  cancelText?: string;
}

const CARD_W = 600;

class DialogView extends PIXI.Container {
  private readonly _dim = new PIXI.Graphics();
  private readonly _card = new PIXI.Container();
  private _resolve: ((ok: boolean) => void) | null = null;
  private _opts: DialogOptions | null = null;

  constructor() {
    super();
    this.visible = false;
    this.zIndex = 80;
    this._dim.eventMode = 'static';
    this._dim.on('pointertap', () => this._finish(false));
    this._card.eventMode = 'static';
    this.addChild(this._dim, this._card);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return !!this._resolve;
  }

  show(opts: DialogOptions): Promise<boolean> {
    this._finish(false);
    this._opts = opts;
    this.visible = true;
    AudioManager.play('ui_open');
    this.relayout();
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this._card.scale);
    this.alpha = 0;
    this._card.scale.set(0.9);
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.18, ease: Ease.easeOutQuad });
    TweenManager.to({ target: this._card.scale, props: { x: 1, y: 1 }, duration: 0.26, ease: Ease.easeOutBack });
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  close(silent = false): void {
    this._finish(false, silent);
  }

  relayout(): void {
    const opts = this._opts;
    if (!opts) return;
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._dim.clear().beginFill(0x0c0809, 0.72).drawRect(0, 0, W, H).endFill();
    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const title = makeText(opts.title, 34, COLORS.champagne, true);
    title.style.letterSpacing = 4;
    title.anchor.set(0.5, 0);
    const content = makeText(opts.content, 26, COLORS.textOnGlass);
    content.style.wordWrap = true;
    content.style.wordWrapWidth = CARD_W - 96;
    content.style.breakWords = true;
    content.style.align = 'center';
    content.style.lineHeight = 40;
    content.anchor.set(0.5, 0);

    const cardH = 48 + title.height + 28 + content.height + 48 + 80 + 40;
    const bg = drawGlass(new PIXI.Graphics(), -CARD_W / 2, -cardH / 2, CARD_W, cardH, 32, 0.92);
    title.position.set(0, -cardH / 2 + 48);
    content.position.set(0, title.y + title.height + 28);
    this._card.addChild(bg, title, content);

    const btnY = cardH / 2 - 40 - 40;
    const confirm = new Button({
      width: opts.cancelText ? 240 : 360, height: 80, variant: 'gold', fontSize: 30,
      label: opts.confirmText ?? '好的', onTap: () => this._finish(true),
    });
    if (opts.cancelText) {
      const cancel = new Button({
        width: 240, height: 80, variant: 'glass', fontSize: 28,
        label: opts.cancelText, onTap: () => this._finish(false),
      });
      cancel.position.set(-136, btnY);
      confirm.position.set(136, btnY);
      this._card.addChild(cancel);
    } else {
      confirm.position.set(0, btnY);
    }
    this._card.addChild(confirm);
    this._card.position.set(W / 2, H / 2);
  }

  private _finish(ok: boolean, silent = false): void {
    const resolve = this._resolve;
    if (!resolve) return;
    this._resolve = null;
    if (silent) {
      this.visible = false;
    } else {
      TweenManager.to({
        target: this,
        props: { alpha: 0 },
        duration: 0.16,
        ease: Ease.easeInQuad,
        onComplete: () => { if (!this._resolve) this.visible = false; this.alpha = 1; },
      });
    }
    resolve(ok);
  }
}

let view: DialogView | null = null;

export function showDialog(opts: DialogOptions): Promise<boolean> {
  view ??= new DialogView();
  return view.show(opts);
}
