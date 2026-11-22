import * as PIXI from 'pixi.js';
import { COLORS } from './theme';

/**
 * 圆润果冻丝缎柔光进度条（对标参考图 1/2/4 的香槟金/鲜嫩绿高光圆胶囊进度条）
 */
export class ProgressBar extends PIXI.Container {
  private readonly _bg = new PIXI.Graphics();
  private readonly _fill = new PIXI.Graphics();

  constructor(
    private readonly _w: number,
    private readonly _h: number,
    private readonly _color: number = COLORS.mint,
    trackColor: number = 0xEAE1D3,
    trackAlpha = 0.92,
  ) {
    super();
    this._bg.lineStyle(1.2, 0xD4C3AC, 0.9)
      .beginFill(trackColor, trackAlpha)
      .drawRoundedRect(0, 0, _w, _h, _h / 2)
      .endFill();
    this.addChild(this._bg, this._fill);
  }

  set progress(p: number) {
    const v = Math.max(0, Math.min(1, p));
    this._fill.clear();
    if (v <= 0) return;
    const w = Math.max(this._h, this._w * v);
    const fillHex = this._color === COLORS.rose ? 0xF0826C : this._color === COLORS.gold ? 0xF5D26B : 0x74D46E;
    const rimHex = this._color === COLORS.rose ? 0xD46350 : this._color === COLORS.gold ? 0xD6AC47 : 0x56B25B;
    this._fill.lineStyle(1, rimHex, 0.9)
      .beginFill(fillHex)
      .drawRoundedRect(0, 0, w, this._h, this._h / 2)
      .endFill();
    this._fill.lineStyle(0);
    if (this._h >= 8 && w > this._h * 1.4) {
      this._fill.beginFill(0xFFFFFF, 0.46)
        .drawRoundedRect(3, 1.5, w - 6, Math.max(2.5, this._h * 0.34), this._h * 0.17)
        .endFill();
    }
  }
}
