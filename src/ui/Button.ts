import * as PIXI from 'pixi.js';
import { UI_SLICES } from '@/data/art';
import { AudioManager } from '@/core/AudioManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import {
  COLORS,
  createNineSlice2x,
  makeNumText,
  makeText,
  verticalGradientTexture,
  type NineSlice2xSpec,
} from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  sub?: string;
  /** 若设为 true 且提供 sub，则采用左右分栏排版（左主文案，右价格） */
  split?: boolean;
  color?: number;
  textColor?: number;
  fontSize?: number;
  /**
   * gold：流光香槟金菱格丝缎（主升级）；
   * green：清新果冻嫩绿菱格丝缎（确认/一键升级）；
   * rose：蜜桃珊瑚粉金菱格丝缎（迎战/心动/新店）；
   * glass / cream：暖奶白丝缎胶囊（次要操作）；
   * noir：酒红丝绒（男主暗面/GM）。
   */
  variant?: 'solid' | 'glass' | 'cream' | 'gold' | 'green' | 'mint' | 'rose' | 'noir';
  onTap: () => void;
}

const SLICE_SPECS: Record<'gold' | 'goldSm' | 'green' | 'mint' | 'coral' | 'coralSm' | 'cream' | 'disabled', NineSlice2xSpec> = {
  gold: { path: UI_SLICES.btnLgGold, pad2x: 36, left2x: 136, top2x: 98, right2x: 136, bottom2x: 98 },
  goldSm: { path: UI_SLICES.btnSmGold, pad2x: 36, left2x: 92, top2x: 70, right2x: 92, bottom2x: 70 },
  green: { path: UI_SLICES.btnMdGreen, pad2x: 36, left2x: 126, top2x: 92, right2x: 126, bottom2x: 92 },
  mint: { path: UI_SLICES.v8BtnMintPill, pad2x: 16, left2x: 84, top2x: 64, right2x: 84, bottom2x: 64 },
  coral: { path: UI_SLICES.btnMdCoral, pad2x: 36, left2x: 120, top2x: 88, right2x: 120, bottom2x: 88 },
  coralSm: { path: UI_SLICES.btnSmCoral, pad2x: 36, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 },
  cream: { path: UI_SLICES.btnMdCream, pad2x: 18, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 },
  disabled: { path: UI_SLICES.btnMdDisabled, pad2x: 18, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 },
};

/**
 * v6 菱格星芒柔光丝缎胶囊按钮（@2x 九宫格无损切片，带外发光柔晕、内缩白丝圈与四角星芒）。
 */
export class Button extends PIXI.Container {
  private readonly _skinLayer = new PIXI.Container();
  private readonly _extraGraphic = new PIXI.Graphics();
  private readonly _label: PIXI.Text;
  private readonly _sub: PIXI.Text | null;
  private readonly _opts: ButtonOptions;
  private _enabled = true;

  constructor(opts: ButtonOptions) {
    super();
    this._opts = opts;
    const size = opts.fontSize ?? 24;
    this._label = makeText(opts.label, size, COLORS.ink, true);
    if (opts.split && opts.sub !== undefined) {
      this._label.anchor.set(0, 0.5);
      this._sub = makeNumText(opts.sub, Math.max(19, size - 1), COLORS.ink);
      this._sub.anchor.set(1, 0.5);
    } else {
      this._label.anchor.set(0.5);
      this._sub = opts.sub !== undefined
        ? makeText(opts.sub, Math.max(13, Math.round(size * 0.66)), COLORS.inkSoft, true)
        : null;
      this._sub?.anchor.set(0.5);
    }

    this.addChild(this._skinLayer, this._extraGraphic, this._label);
    if (this._sub) this.addChild(this._sub);
    this._layout();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new PIXI.Rectangle(-opts.width / 2, -opts.height / 2, opts.width, opts.height);
    this.on('pointerdown', () => {
      if (!this._enabled) return;
      TweenManager.cancelTarget(this.scale);
      this.scale.set(0.95);
    });
    const release = (): void => {
      TweenManager.to({ target: this.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    this.on('pointerup', release);
    this.on('pointerupoutside', release);
    this.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play(this._enabled ? 'ui_click' : 'ui_deny');
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
    const variant = this._opts.variant ?? 'rose';

    for (const c of this._skinLayer.removeChildren()) c.destroy({ children: true });
    this._extraGraphic.clear();
    this._label.style.strokeThickness = 0;
    if (this._sub) this._sub.style.strokeThickness = 0;

    if (!this._enabled) {
      this._skinLayer.addChild(createNineSlice2x(SLICE_SPECS.disabled, w, h, true));
      this._label.style.fill = 0x7E746B;
      if (this._sub) this._sub.style.fill = 0x8F847A;
    } else if (variant === 'noir') {
      const r = h / 2;
      const sh = new PIXI.Graphics().beginFill(0x000000, 0.28).drawRoundedRect(-w / 2 + 2, -h / 2 + 3, w - 4, h, r).endFill();
      const sp = new PIXI.Sprite(verticalGradientTexture(0x4E2032, 0x361422, 0x240C16, 64));
      sp.anchor.set(0.5);
      sp.width = w;
      sp.height = h;
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(-w / 2, -h / 2, w, h, r).endFill();
      sp.mask = mask;
      const rim = new PIXI.Graphics().lineStyle(1.3, COLORS.borderGold, 0.85).drawRoundedRect(-w / 2, -h / 2, w, h, r);
      this._skinLayer.addChild(sh, sp, mask, rim);
      this._label.style.fill = this._opts.textColor ?? COLORS.champagne;
      if (this._sub) this._sub.style.fill = COLORS.textOnGlassSoft;
    } else if (variant === 'mint') {
      this._skinLayer.addChild(createNineSlice2x(SLICE_SPECS.mint, w, h, true));
      this._label.style.fill = this._opts.textColor ?? 0xFFFFFF;
      this._label.style.stroke = 0x266B44;
      this._label.style.strokeThickness = 3.4;
      this._label.style.lineJoin = 'round';
      if (this._sub) {
        this._sub.style.fill = 0xF5FFF8;
        this._sub.style.stroke = 0x266B44;
        this._sub.style.strokeThickness = 2.6;
        this._sub.style.lineJoin = 'round';
      }
    } else if (variant === 'green') {
      this._skinLayer.addChild(createNineSlice2x(SLICE_SPECS.green, w, h, true));
      this._label.style.fill = this._opts.textColor ?? 0x355C1E;
      if (this._sub) this._sub.style.fill = 0x456E2B;
    } else if (variant === 'gold') {
      const spec = h <= 44 ? SLICE_SPECS.goldSm : SLICE_SPECS.gold;
      this._skinLayer.addChild(createNineSlice2x(spec, w, h, true));
      this._label.style.fill = this._opts.textColor ?? 0x5C4124;
      if (this._sub) this._sub.style.fill = 0x7E5B32;
    } else if (variant === 'glass' || variant === 'cream') {
      this._skinLayer.addChild(createNineSlice2x(SLICE_SPECS.cream, w, h, true));
      this._label.style.fill = this._opts.textColor ?? 0x664F3C;
      if (this._sub) this._sub.style.fill = 0x8A715B;
    } else {
      const spec = h <= 44 ? SLICE_SPECS.coralSm : SLICE_SPECS.coral;
      this._skinLayer.addChild(createNineSlice2x(spec, w, h, true));
      this._label.style.fill = this._opts.textColor ?? 0xFFFFFF;
      this._label.style.stroke = 0x8C322B;
      this._label.style.strokeThickness = 3.6;
      this._label.style.lineJoin = 'round';
      if (this._sub) {
        this._sub.style.fill = 0xFFFDF8;
        this._sub.style.stroke = 0x8C322B;
        this._sub.style.strokeThickness = 2.8;
        this._sub.style.lineJoin = 'round';
      }
    }

    if (this._opts.split && this._sub) {
      this._label.position.set(-w / 2 + 24, -1);
      this._sub.position.set(w / 2 - 24, -1);
      const divX = w / 2 - Math.max(122, this._sub.width + 40);
      this._extraGraphic.lineStyle(1.2, 0xFFFFFF, this._enabled ? 0.45 : 0.2)
        .moveTo(divX, -h * 0.25)
        .lineTo(divX, h * 0.22);
    } else if (this._sub) {
      this._label.position.set(0, -h * 0.17);
      this._sub.position.set(0, h * 0.21);
    } else {
      this._label.position.set(0, -1);
    }
  }
}
