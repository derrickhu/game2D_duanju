/**
 * 暖奶白柔光金边确认框（对标参考图 3『提示 / 同意』：48% 暖棕虚化遮罩 + 蜜桃杏色内衬框 + 果冻嫩绿丝缎按钮）。
 */
import * as PIXI from 'pixi.js';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { Button } from './Button';
import { COLORS, makeOrnatePanel, makeRibbonHeader, makeText } from './theme';

export interface DialogOptions {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}

const CARD_W = 636;

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
    OverlayManager.bringToFront();
    AudioManager.play('ui_open');
    this.relayout();
    TweenManager.cancelTarget(this);
    TweenManager.cancelTarget(this._card.scale);
    this.alpha = 0;
    this._card.scale.set(0.92);
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
    // 参考图 2/3 同款 48% 暖棕半透遮罩 + Bokeh 散景圆斑
    this._dim.clear()
      .beginFill(COLORS.mask, 0.48)
      .drawRect(0, 0, W, H)
      .endFill();
    this._dim.beginFill(0xFFE8A6, 0.28).drawCircle(86, H * 0.28, 22).endFill();
    this._dim.beginFill(0xFFE8A6, 0.18).drawCircle(140, H * 0.29, 34).endFill();
    this._dim.beginFill(0xFFE8A6, 0.22).drawCircle(W - 68, H * 0.72, 26).endFill();

    for (const c of this._card.removeChildren()) c.destroy({ children: true });

    const content = makeText(opts.content, 23, COLORS.ink);
    content.style.wordWrap = true;
    content.style.wordWrapWidth = CARD_W - 120;
    content.style.breakWords = true;
    content.style.align = 'center';
    content.style.lineHeight = 36;
    content.anchor.set(0.5, 0);

    const wellH = content.height + 44;
    const cardH = 92 + wellH + 34 + 78 + 38;
    const panel = makeOrnatePanel(CARD_W, cardH);
    panel.position.set(-CARD_W / 2, -cardH / 2);

    const ribbon = makeRibbonHeader(opts.title, CARD_W - 64);
    ribbon.position.set(0, -cardH / 2 + 12);

    // 参考图 3 同款暖蜜桃杏仁色内衬文字底框 (`#FDF0DE`)
    const well = new PIXI.Graphics()
      .beginFill(0xFCEFE0, 0.92)
      .drawRoundedRect(-CARD_W / 2 + 34, -cardH / 2 + 90, CARD_W - 68, wellH, 16)
      .endFill();

    content.position.set(0, -cardH / 2 + 112);
    this._card.addChild(panel, ribbon, well, content);

    const btnY = cardH / 2 - 38 - 39;
    const confirm = new Button({
      width: opts.cancelText ? 252 : 300,
      height: 70,
      variant: 'green',
      fontSize: 25,
      label: opts.confirmText ?? '同意',
      onTap: () => this._finish(true),
    });
    if (opts.cancelText) {
      const cancel = new Button({
        width: 232,
        height: 70,
        variant: 'cream',
        fontSize: 23,
        label: opts.cancelText,
        onTap: () => this._finish(false),
      });
      cancel.position.set(-132, btnY);
      confirm.position.set(132, btnY);
      this._card.addChild(cancel);
    } else {
      confirm.position.set(0, btnY);
    }
    this._card.addChild(confirm);
    this._card.position.set(W / 2, H / 2 + 12);
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
