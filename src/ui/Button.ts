import * as PIXI from 'pixi.js';
import { Ease, TweenManager } from '@/core/TweenManager';
import { COLORS, makeText } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  sub?: string;
  color?: number;
  textColor?: number;
  fontSize?: number;
  onTap: () => void;
}

/** 圆角色块按钮，可带一行小字（价格、倒计时）。原点在中心。 */
export class Button extends PIXI.Container {
  private readonly _bg = new PIXI.Graphics();
  private readonly _label: PIXI.Text;
  private readonly _sub: PIXI.Text | null;
  private readonly _opts: ButtonOptions;
  private _enabled = true;

  constructor(opts: ButtonOptions) {
    super();
    this._opts = opts;
    const size = opts.fontSize ?? 30;
    this._label = makeText(opts.label, size, opts.textColor ?? COLORS.white, true);
    this._label.anchor.set(0.5);
    this._sub = opts.sub !== undefined ? makeText(opts.sub, Math.round(size * 0.72), opts.textColor ?? COLORS.white) : null;
    this._sub?.anchor.set(0.5);
    this.addChild(this._bg, this._label);
    if (this._sub) this.addChild(this._sub);
    this._layout();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
      if (!this._enabled) return;
      TweenManager.cancelTarget(this.scale);
      this.scale.set(0.94);
    });
    const release = (): void => {
      TweenManager.to({ target: this.scale, props: { x: 1, y: 1 }, duration: 0.18, ease: Ease.easeOutBack });
    };
    this.on('pointerup', release);
    this.on('pointerupoutside', release);
    this.on('pointertap', () => {
      if (this._enabled) this._opts.onTap();
    });
  }

  setLabel(label: string, sub?: string): void {
    this._label.text = label;
    if (this._sub && sub !== undefined) this._sub.text = sub;
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    this._layout();
  }

  private _layout(): void {
    const { width: w, height: h } = this._opts;
    const color = this._enabled ? this._opts.color ?? COLORS.rose : COLORS.disabled;
    this._bg.clear().beginFill(color).drawRoundedRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 24)).endFill();
    if (this._sub) {
      this._label.y = -h * 0.16;
      this._sub.y = h * 0.24;
    }
  }
}
