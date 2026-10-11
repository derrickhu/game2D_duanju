import * as PIXI from 'pixi.js';
import { COLORS } from './theme';

export class ProgressBar extends PIXI.Container {
  private readonly _bg = new PIXI.Graphics();
  private readonly _fill = new PIXI.Graphics();

  constructor(private readonly _w: number, private readonly _h: number, private readonly _color: number = COLORS.rose) {
    super();
    this._bg.beginFill(COLORS.cardMuted).drawRoundedRect(0, 0, _w, _h, _h / 2).endFill();
    this.addChild(this._bg, this._fill);
  }

  set progress(p: number) {
    const v = Math.max(0, Math.min(1, p));
    this._fill.clear();
    if (v <= 0) return;
    const w = Math.max(this._h, this._w * v);
    this._fill.beginFill(this._color).drawRoundedRect(0, 0, w, this._h, this._h / 2).endFill();
  }
}
