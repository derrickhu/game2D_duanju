/**
 * 竖向滚动区：拖动跟手，松手带惯性，拉过头有回弹。
 * 列表项判断 `dragging` 决定点按要不要响应，避免滑动时误触。
 */
import * as PIXI from 'pixi.js';
import { Game } from '@/core/Game';

const DRAG_START = 10;
const FRICTION = 0.92;
const OVERSCROLL = 0.35;
const SPRING = 0.22;

export class ScrollView extends PIXI.Container {
  readonly content = new PIXI.Container();
  private readonly _clip = new PIXI.Graphics();
  private readonly _hit = new PIXI.Graphics();
  private _viewH = 0;
  private _contentH = 0;
  private _scroll = 0;
  private _velocity = 0;
  private _pressY: number | null = null;
  private _lastY = 0;
  private _lastT = 0;
  private _dragging = false;
  private _wasDragging = false;
  private readonly _tick = (): void => this._step();

  constructor() {
    super();
    this.content.mask = this._clip;
    this.addChild(this._hit, this.content, this._clip);
    this.eventMode = 'static';
    this.on('pointerdown', this._down, this);
    this.on('globalpointermove', this._move, this);
    this.on('pointerup', this._up, this);
    this.on('pointerupoutside', this._up, this);
    this.on('added', () => Game.ticker.add(this._tick));
    this.on('removed', () => Game.ticker.remove(this._tick));
  }

  /** 正在拖动或刚拖完这一下：点按不要响应 */
  get dragging(): boolean {
    return this._dragging || this._wasDragging;
  }

  get scrollY(): number {
    return this._scroll;
  }

  setViewport(w: number, h: number): void {
    this._viewH = h;
    this._clip.clear().beginFill(0xffffff).drawRect(0, 0, w, h).endFill();
    this._hit.clear().beginFill(0x000000, 0.001).drawRect(0, 0, w, h).endFill();
    this._clampNow();
  }

  /** 内容高度；不传就按 content 实际高度算 */
  setContentHeight(h?: number): void {
    this._contentH = h ?? this.content.height;
    this._clampNow();
  }

  scrollTo(y: number, animate = false): void {
    const target = Math.max(0, Math.min(this._max(), y));
    if (!animate) {
      this._scroll = target;
      this._velocity = 0;
      this._apply();
      return;
    }
    this._velocity = 0;
    const from = this._scroll;
    let t = 0;
    const step = (): void => {
      t = Math.min(1, t + Game.ticker.deltaMS / 320);
      const e = 1 - (1 - t) ** 3;
      this._scroll = from + (target - from) * e;
      this._apply();
      if (t >= 1 || this.destroyed) Game.ticker.remove(step);
    };
    Game.ticker.add(step);
  }

  override destroy(options?: boolean | PIXI.IDestroyOptions): void {
    Game.ticker.remove(this._tick);
    super.destroy(options);
  }

  private _max(): number {
    return Math.max(0, this._contentH - this._viewH);
  }

  private _localY(e: PIXI.FederatedPointerEvent): number {
    return e.global.y / Game.scale;
  }

  private _down(e: PIXI.FederatedPointerEvent): void {
    this._pressY = this._localY(e);
    this._lastY = this._pressY;
    this._lastT = performance.now();
    this._velocity = 0;
    this._dragging = false;
  }

  private _move(e: PIXI.FederatedPointerEvent): void {
    if (this._pressY === null) return;
    const y = this._localY(e);
    if (!this._dragging && Math.abs(y - this._pressY) < DRAG_START) return;
    this._dragging = true;
    const dy = y - this._lastY;
    const now = performance.now();
    const dt = Math.max(1, now - this._lastT);
    this._velocity = this._velocity * 0.4 + (-dy / dt) * 16 * 0.6;
    this._lastY = y;
    this._lastT = now;
    const over = this._scroll < 0 || this._scroll > this._max();
    this._scroll -= over ? dy * OVERSCROLL : dy;
    this._apply();
  }

  private _up(): void {
    if (this._pressY === null) return;
    this._pressY = null;
    if (performance.now() - this._lastT > 90) this._velocity = 0;
    this._wasDragging = this._dragging;
    this._dragging = false;
    if (this._wasDragging) setTimeout(() => { this._wasDragging = false; }, 0);
  }

  private _step(): void {
    if (this._pressY !== null || !this.worldVisible) return;
    const max = this._max();
    if (this._scroll < 0 || this._scroll > max) {
      const target = this._scroll < 0 ? 0 : max;
      this._velocity = 0;
      this._scroll += (target - this._scroll) * SPRING;
      if (Math.abs(target - this._scroll) < 0.5) this._scroll = target;
      this._apply();
      return;
    }
    if (Math.abs(this._velocity) < 0.2) {
      this._velocity = 0;
      return;
    }
    this._scroll += this._velocity;
    this._velocity *= FRICTION;
    this._apply();
  }

  private _clampNow(): void {
    this._scroll = Math.max(0, Math.min(this._max(), this._scroll));
    this._apply();
  }

  private _apply(): void {
    this.content.y = -Math.round(this._scroll);
  }
}
