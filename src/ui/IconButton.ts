import * as PIXI from 'pixi.js';
import { UI_SLICES } from '@/data/art';
import { AudioManager } from '@/core/AudioManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { drawEditorialIcon, type EditorialIconId } from './EditorialIcons';
import { COLORS, makeStickerSprite, makeText } from './theme';

export interface IconButtonOptions {
  icon?: string;
  offIcon?: string;
  iconId?: EditorialIconId;
  glyph?: string;
  accentColor?: number;
  label: string;
  sub?: string;
  badgeCount?: number;
  size?: number;
  plate?: boolean;
  active?: boolean;
  onTap: () => void;
}

/**
 * v7 破框贴纸白边图标按钮：
 * - 侧栏模式（plate=true）：奶白金边圆珠底座 + 破框糖果珐琅贴纸图标 + 单行 16px 清晰描边标题 + 右上红点数字角标（彻底取消拥挤的底部双层小胶囊！）；
 * - 底栏导航模式（plate=false）：选中态发光金盘 + 全彩贴纸图标 / 未选态瓷白亮银贴纸图标 + 19px 清晰描边标题。
 */
export class IconButton extends PIXI.Container {
  private readonly _haloLayer = new PIXI.Container();
  private readonly _plateLayer = new PIXI.Container();
  private readonly _iconLayer = new PIXI.Container();
  private readonly _badgeLayer = new PIXI.Container();
  private readonly _label: PIXI.Text;
  private readonly _size: number;
  private readonly _hasPlate: boolean;
  private _active: boolean;
  private _enabled = true;
  private _badgeCount = 0;

  constructor(private readonly _opts: IconButtonOptions) {
    super();
    const size = _opts.size ?? 58;
    const plate = _opts.plate ?? true;
    this._size = size;
    this._hasPlate = plate;
    this._active = _opts.active ?? false;
    this._badgeCount = _opts.badgeCount ?? 0;

    this.addChild(this._haloLayer, this._plateLayer, this._iconLayer, this._badgeLayer);

    this._label = makeText(_opts.label, plate ? 16 : 19, COLORS.white, true);
    this._label.anchor.set(0.5, 0);
    this._label.style.stroke = 0x523924;
    this._label.style.strokeThickness = plate ? 4.2 : 4.8;
    this._label.style.lineJoin = 'round';
    this.addChild(this._label);

    this._rebuildVisuals();

    const hitW = Math.max(size + 32, 94);
    const hitH = size + 46;
    this.hitArea = new PIXI.Rectangle(-hitW / 2, -size / 2 - 20, hitW, hitH);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', () => {
      TweenManager.cancelTarget(this.scale);
      this.scale.set(0.92);
    });
    const release = (): void => {
      TweenManager.to({ target: this.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    this.on('pointerup', release);
    this.on('pointerupoutside', release);
    this.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      AudioManager.play(this._enabled ? 'ui_click' : 'ui_deny');
      this._opts.onTap();
    });
  }

  setActive(active: boolean): void {
    if (this._active === active) return;
    this._active = active;
    this._rebuildVisuals();
  }

  setBadgeCount(count: number): void {
    const c = Math.max(0, Math.floor(count));
    if (this._badgeCount === c) return;
    this._badgeCount = c;
    this._rebuildBadge();
  }

  private _rebuildBadge(): void {
    for (const c of this._badgeLayer.removeChildren()) c.destroy({ children: true });
    if (this._badgeCount <= 0) return;

    const str = this._badgeCount > 99 ? '99+' : String(this._badgeCount);
    const txt = makeText(str, 12, 0xFFFFFF, true);
    txt.anchor.set(0.5);
    const bw = Math.max(22, txt.width + 12);
    const bh = 22;
    const bx = this._size * 0.36;
    const by = -this._size * 0.36;

    const g = new PIXI.Graphics()
      .lineStyle(2, 0xFFFFFF, 1)
      .beginFill(0xF0554D, 1)
      .drawRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2)
      .endFill();
    txt.position.set(bx, by - 0.5);
    this._badgeLayer.addChild(g, txt);
  }

  private _rebuildVisuals(): void {
    for (const c of this._haloLayer.removeChildren()) c.destroy();
    for (const c of this._plateLayer.removeChildren()) c.destroy();
    for (const c of this._iconLayer.removeChildren()) c.destroy();

    const size = this._size;
    if (this._hasPlate) {
      const pearl = makeStickerSprite(UI_SLICES.badgeSidePearl, size + 16, size + 16, true);
      this._plateLayer.addChild(pearl);

      if (this._opts.icon) {
        const ic = makeStickerSprite(this._opts.icon, size + 6, size + 6, true);
        ic.y = -3;
        this._iconLayer.addChild(ic);
      } else if (this._opts.iconId) {
        const g = new PIXI.Graphics();
        drawEditorialIcon(g, this._opts.iconId, size * 0.52, COLORS.ink, this._opts.accentColor ?? COLORS.rose);
        this._iconLayer.addChild(g);
      } else if (this._opts.glyph) {
        const gl = makeText(this._opts.glyph, Math.round(size * 0.44), COLORS.ink, true);
        gl.anchor.set(0.5);
        this._iconLayer.addChild(gl);
      }
      this._label.style.fill = 0xFFFDF8;
      this._label.y = size / 2 - 3;
    } else {
      if (this._active) {
        const halo = makeStickerSprite(UI_SLICES.navActiveHalo, 118, 118, true);
        halo.y = -18;
        this._haloLayer.addChild(halo);
      }
      const chosenIcon = this._active
        ? this._opts.icon
        : (this._opts.offIcon ?? this._opts.icon);

      if (chosenIcon) {
        const iconSz = this._active ? 88 : 78;
        const ic = makeStickerSprite(chosenIcon, iconSz, iconSz, true);
        ic.y = this._active ? -22 : -15;
        this._iconLayer.addChild(ic);
      }
      this._label.style.fill = this._active ? 0xFFE89E : 0xFFFDF8;
      this._label.y = 17;
    }

    this._iconLayer.alpha = this._enabled ? 1 : 0.55;
    this._rebuildBadge();
  }

  setLabel(label: string, _sub?: string): void {
    this._label.text = label;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this._iconLayer.alpha = enabled ? 1 : 0.55;
  }
}
