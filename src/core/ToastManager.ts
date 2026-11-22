import * as PIXI from 'pixi.js';
import { Game } from './Game';
import { Ease, TweenManager } from './TweenManager';

const Z = 30000;
const FONT = 'PingFang SC, Hiragino Sans GB, sans-serif';
const HOLD = 1.65;
const IN = 0.16;
const OUT = 0.3;
const GAP = 50;
const MAX = 3;

export type ToastKind = 'success' | 'none' | 'error';

class ToastManagerClass {
  private _layer: PIXI.Container | null = null;
  private _items: PIXI.Container[] = [];
  private _bound = false;

  ensureTop(): void {
    if (!this._layer || this._layer.destroyed || !Game.stage) return;
    this._layer.zIndex = Z;
    Game.stage.sortableChildren = true;
    Game.stage.addChild(this._layer);
  }

  show(title: string, kind: ToastKind = 'none'): void {
    const text = String(title ?? '').trim();
    if (!text) return;
    if (!Game.stage) {
      console.log('[Toast]', text);
      return;
    }
    this._ensure();
    this._bump();
    const item = this._make(text, kind);
    this._items.push(item);
    this._layer!.addChild(item);
    this._place(item);
    item.alpha = 0;
    item.y += 14;
    TweenManager.to({
      target: item,
      props: { alpha: 1, y: item.y - 14 },
      duration: IN,
      ease: Ease.easeOutQuad,
      onComplete: () => this._hold(item, HOLD),
    });
    while (this._items.length > MAX) {
      const old = this._items.shift();
      if (old) this._drop(old, true);
    }
  }

  private _hold(item: PIXI.Container, duration: number): void {
    if (item.destroyed || !this._items.includes(item)) return;
    TweenManager.to({
      target: item,
      props: { alpha: item.alpha },
      duration,
      onComplete: () => this._drop(item, false),
    });
  }

  private _drop(item: PIXI.Container, instant: boolean): void {
    const idx = this._items.indexOf(item);
    if (idx !== -1) this._items.splice(idx, 1);
    TweenManager.cancelTarget(item);
    if (item.destroyed) return;
    if (instant) {
      item.destroy({ children: true });
      return;
    }
    TweenManager.to({
      target: item,
      props: { alpha: 0, y: item.y - 18 },
      duration: OUT,
      ease: Ease.easeInQuad,
      onComplete: () => {
        if (!item.destroyed) item.destroy({ children: true });
      },
    });
  }

  private _bump(): void {
    for (const item of this._items) {
      if (item.destroyed) continue;
      TweenManager.cancelTarget(item);
      TweenManager.to({
        target: item,
        props: { y: item.y - GAP, alpha: Math.min(item.alpha, 0.72) },
        duration: 0.16,
        ease: Ease.easeOutQuad,
        onComplete: () => this._hold(item, 0.7),
      });
    }
  }

  private _make(text: string, kind: ToastKind): PIXI.Container {
    const root = new PIXI.Container();
    root.eventMode = 'none';
    const textFill = kind === 'success' ? 0x2E8B52 : kind === 'error' ? 0xC84D46 : 0x584231;
    const borderCol = kind === 'success' ? 0x80CE66 : kind === 'error' ? 0xE4766E : 0xE5C17A;
    const label = new PIXI.Text(text, {
      fontFamily: FONT,
      fontSize: 22,
      fontWeight: '700',
      fill: textFill,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: Math.max(260, Game.logicWidth - 140),
      breakWords: true,
    });
    label.resolution = 2.5;
    label.anchor.set(0.5);
    const pw = Math.min(Game.logicWidth - 64, label.width + 60);
    const ph = Math.max(52, label.height + 26);
    const pill = new PIXI.Graphics();
    pill.beginFill(0x6E4F28, 0.16).drawRoundedRect(-pw / 2, -ph / 2 + 5, pw, ph, ph / 2).endFill();
    pill.beginFill(0xE5C79B, 0.96).drawRoundedRect(-pw / 2, -ph / 2 + 2.5, pw, ph, ph / 2).endFill();
    pill.lineStyle(1.8, borderCol, 0.98)
      .beginFill(0xFFFDF9, 0.98)
      .drawRoundedRect(-pw / 2, -ph / 2, pw, ph, ph / 2)
      .endFill();
    pill.lineStyle(1, 0xFFFFFF, 0.85)
      .drawRoundedRect(-pw / 2 + 3, -ph / 2 + 2.5, pw - 6, ph - 5, Math.max(10, ph / 2 - 3));
    root.addChild(pill, label);
    return root;
  }

  private _place(item: PIXI.Container): void {
    item.position.set(Game.logicWidth * 0.5, this._baseY());
  }

  private _baseY(): number {
    const top = Number.isFinite(Game.safeTop) ? Game.safeTop : 96;
    return Math.max(top + 148, Game.logicHeight * 0.28);
  }

  private _ensure(): void {
    if (!this._layer || this._layer.destroyed) {
      this._layer = new PIXI.Container();
      this._layer.eventMode = 'none';
      this._layer.sortableChildren = false;
      this._items = this._items.filter((item) => !item.destroyed);
    }
    this._layer.zIndex = Z;
    Game.stage.sortableChildren = true;
    Game.stage.addChild(this._layer);
    if (!this._bound) {
      this._bound = true;
      Game.onViewportChange(() => this._relayout());
    }
  }

  private _relayout(): void {
    if (!this._layer || this._layer.destroyed) return;
    this._layer.position.set(0, 0);
    const n = this._items.length;
    this._items.forEach((item, i) => {
      if (item.destroyed) return;
      item.x = Game.logicWidth * 0.5;
      item.y = this._baseY() - (n - 1 - i) * GAP;
    });
  }
}

export const ToastManager = new ToastManagerClass();
