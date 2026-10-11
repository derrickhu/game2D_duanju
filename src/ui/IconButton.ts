import * as PIXI from 'pixi.js';
import { AudioManager } from '@/core/AudioManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { gameTexture, whenTextureReady } from '@/utils/assets';
import { COLORS, drawGlass, makeText } from './theme';

export interface IconButtonOptions {
  icon: string;
  label: string;
  sub?: string;
  /** 圆钮直径；不画底时只用来算点击区域 */
  size?: number;
  /** false：只有图标和文字，放在已有的玻璃底栏上 */
  plate?: boolean;
  onTap: () => void;
}

/** 金色线条图标 + 下方文字。原点在图标中心。 */
export class IconButton extends PIXI.Container {
  private readonly _plate = new PIXI.Graphics();
  private readonly _icon: PIXI.Sprite;
  private readonly _label: PIXI.Text;
  private readonly _sub: PIXI.Text | null;
  private _enabled = true;

  constructor(private readonly _opts: IconButtonOptions) {
    super();
    const size = _opts.size ?? 104;
    const plate = _opts.plate ?? true;
    if (plate) drawGlass(this._plate, -size / 2, -size / 2, size, size, size / 2);
    this._icon = new PIXI.Sprite(gameTexture(_opts.icon));
    this._icon.anchor.set(0.5);
    const iconSize = plate ? size * 0.5 : size * 0.62;
    const fit = (): void => {
      const tex = this._icon.texture;
      if (tex.width > 1) this._icon.scale.set(iconSize / tex.width);
    };
    fit();
    whenTextureReady(_opts.icon, fit);

    this._label = makeText(_opts.label, plate ? 22 : 24, COLORS.textOnGlass, true);
    this._label.anchor.set(0.5, 0);
    this._label.y = plate ? size / 2 + 6 : size * 0.36;
    this._sub = _opts.sub !== undefined ? makeText(_opts.sub, 18, COLORS.champagne) : null;
    if (this._sub) {
      this._sub.anchor.set(0.5, 0);
      this._sub.y = this._label.y + 28;
    }
    this.addChild(this._plate, this._icon, this._label);
    if (this._sub) this.addChild(this._sub);

    const hitH = plate ? size + 64 : size;
    this.hitArea = new PIXI.Rectangle(-size / 2 - 8, -size / 2, size + 16, hitH);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
      TweenManager.cancelTarget(this.scale);
      this.scale.set(0.92);
    });
    const release = (): void => {
      TweenManager.to({ target: this.scale, props: { x: 1, y: 1 }, duration: 0.18, ease: Ease.easeOutBack });
    };
    this.on('pointerup', release);
    this.on('pointerupoutside', release);
    this.on('pointertap', () => {
      AudioManager.play(this._enabled ? 'ui_click' : 'ui_deny');
      this._opts.onTap();
    });
  }

  setLabel(label: string, sub?: string): void {
    this._label.text = label;
    if (this._sub && sub !== undefined) this._sub.text = sub;
  }

  /** 不可用时变暗，但仍响应点击，由调用方提示原因 */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this._icon.alpha = enabled ? 1 : 0.45;
    if (this._sub) this._sub.alpha = enabled ? 1 : 0.6;
  }
}
