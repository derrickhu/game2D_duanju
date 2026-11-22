/**
 * 批量购买档位珠光香槟胶囊开关：[×1] [×10] [质变]
 * v7 升级为暖白金边立体胶囊底座 + 流光香槟金选中滑块，告别灰暗半透底色与微小字。
 */
import * as PIXI from 'pixi.js';
import { AudioManager } from '@/core/AudioManager';
import { GameState } from '@/managers/GameState';
import type { BuyMode } from '@/sim/save';
import { COLORS, makeText, verticalGradientTexture } from './theme';

const MODES: readonly [BuyMode, string][] = [
  ['1', '×1'],
  ['10', '×10'],
  ['next', '质变'],
];

export class BuyModeBar extends PIXI.Container {
  private readonly _onChange?: () => void;
  private readonly _w: number;
  private readonly _h: number;

  constructor(width = 196, height = 36, onChange?: () => void) {
    super();
    this._w = width;
    this._h = height;
    this._onChange = onChange;
    this.refresh();
  }

  refresh(): void {
    for (const c of this.removeChildren()) c.destroy({ children: true });
    const r = this._h / 2;
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.shadow, 0.12).drawRoundedRect(0, 3, this._w, this._h, r).endFill();
    bg.beginFill(0xE4C698, 0.96).drawRoundedRect(0, 2, this._w, this._h, r).endFill();
    bg.lineStyle(1.5, COLORS.borderGold, 0.96)
      .beginFill(0xFFFBF2, 0.97)
      .drawRoundedRect(0, 0, this._w, this._h, r)
      .endFill();
    this.addChild(bg);

    const cur = GameState.save.buyMode;
    const pad = 3;
    const segW = (this._w - pad * 2) / MODES.length;
    const segH = this._h - pad * 2;
    MODES.forEach(([mode, label], i) => {
      const active = cur === mode;
      const item = new PIXI.Container();
      item.position.set(pad + i * segW, pad);
      const pr = segH / 2;
      if (active) {
        const sp = new PIXI.Sprite(verticalGradientTexture(0xFF9F88, 0xEA6F5E, 0xD85847, 32));
        sp.width = segW;
        sp.height = segH;
        const m = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(0, 0, segW, segH, pr).endFill();
        sp.mask = m;
        const rim = new PIXI.Graphics().lineStyle(1, 0xFFF5EE, 0.82).drawRoundedRect(0.5, 0.5, segW - 1, segH - 1, pr);
        item.addChild(sp, m, rim);
      } else {
        const hit = new PIXI.Graphics().beginFill(0x000000, 0.001).drawRoundedRect(0, 0, segW, segH, pr).endFill();
        item.addChild(hit);
      }
      const fSize = Math.max(15, Math.min(18, Math.round(this._h * 0.46)));
      const txt = makeText(label, fSize, active ? 0xFFFDF9 : 0x6E533B, true);
      txt.anchor.set(0.5);
      txt.position.set(segW / 2, segH / 2 - 0.5);
      item.addChild(txt);
      item.eventMode = 'static';
      item.cursor = 'pointer';
      item.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        if (GameState.save.buyMode === mode) return;
        AudioManager.play('ui_click');
        GameState.setBuyMode(mode);
        this.refresh();
        this._onChange?.();
      });
      this.addChild(item);
    });
  }
}
