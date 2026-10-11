import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { COLORS, makeText } from './theme';

/**
 * 底部弹出面板：半透明遮罩 + 圆角卡片 + 标题 + 可拖动滚动的内容区。
 * 子类实现 build(content, width) 填内容，数据变化时调 rebuild()。
 */
export abstract class Sheet extends PIXI.Container {
  protected readonly content = new PIXI.Container();
  private readonly _shade = new PIXI.Graphics();
  private readonly _card = new PIXI.Container();
  private readonly _cardBg = new PIXI.Graphics();
  private readonly _clip = new PIXI.Graphics();
  private readonly _title: PIXI.Text;
  private _isOpen = false;
  private _scrollY = 0;
  private _dragFrom: number | null = null;
  private _dragMoved = false;

  constructor(title: string, private readonly _heightRatio = 0.72) {
    super();
    this.visible = false;
    this._title = makeText(title, 34, COLORS.ink, true);
    this._shade.eventMode = 'static';
    this._shade.on('pointertap', () => this.close());
    this._card.eventMode = 'static';
    this._card.addChild(this._cardBg, this._title, this.content, this._clip);
    this.content.mask = this._clip;
    this.addChild(this._shade, this._card);
    this._bindScroll();
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  /** 拖动滚动时会触发 pointertap，列表按钮用这个判断要不要响应 */
  get dragging(): boolean {
    return this._dragMoved;
  }

  open(): void {
    this._isOpen = true;
    this.visible = true;
    this._scrollY = 0;
    this.relayout();
    const target = this._card.y;
    this._card.y = Game.logicHeight;
    TweenManager.to({ target: this._card, props: { y: target }, duration: 0.26, ease: Ease.easeOutQuad });
    this.onOpen();
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (silent) {
      this.visible = false;
      return;
    }
    TweenManager.to({
      target: this._card,
      props: { y: Game.logicHeight },
      duration: 0.2,
      ease: Ease.easeInQuad,
      onComplete: () => { this.visible = false; },
    });
  }

  rebuild(): void {
    if (!this._isOpen) return;
    for (const c of this.content.removeChildren()) c.destroy({ children: true });
    this.build(this.content, Game.logicWidth - 48);
    this._clampScroll();
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const h = Math.round(H * this._heightRatio);
    this._shade.clear().beginFill(COLORS.mask, 0.45).drawRect(0, 0, W, H).endFill();
    this._cardBg.clear().beginFill(COLORS.bg).drawRoundedRect(0, 0, W, h + 40, 36).endFill();
    this._card.y = H - h;
    this._title.position.set(32, 28);
    this.content.position.set(24, 96);
    this._clip.clear().beginFill(0xffffff).drawRect(0, 96, W, h - 96 - Game.safeBottom).endFill();
    this.rebuild();
  }

  protected onOpen(): void {}

  protected abstract build(content: PIXI.Container, width: number): void;

  private _viewportHeight(): number {
    return Math.round(Game.logicHeight * this._heightRatio) - 96 - Game.safeBottom;
  }

  private _clampScroll(): void {
    const max = Math.max(0, this.content.height + 40 - this._viewportHeight());
    this._scrollY = Math.max(0, Math.min(max, this._scrollY));
    this.content.y = 96 - this._scrollY;
  }

  private _bindScroll(): void {
    this._card.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this._dragFrom = e.global.y / Game.scale;
      this._dragMoved = false;
    });
    this._card.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
      if (this._dragFrom === null) return;
      const y = e.global.y / Game.scale;
      const dy = y - this._dragFrom;
      if (Math.abs(dy) > 8) this._dragMoved = true;
      if (!this._dragMoved) return;
      this._scrollY -= dy;
      this._dragFrom = y;
      this._clampScroll();
    });
    const end = (): void => {
      this._dragFrom = null;
      setTimeout(() => { this._dragMoved = false; }, 0);
    };
    this._card.on('pointerup', end);
    this._card.on('pointerupoutside', end);
  }
}
