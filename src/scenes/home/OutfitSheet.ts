/**
 * 衣橱：上面大预览（这套造型的场景 + 全身立绘），下面五套缩略图，最下面“换上”。
 * 预览区左右滑动也能切换。
 */
import * as PIXI from 'pixi.js';
import { ICONS, outfitFigurePath, outfitScenePath } from '@/data/art';
import { OUTFITS, type OutfitDef, type OutfitId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { COLORS, drawGlass, makeText } from '@/ui/theme';
import { applyFit, fitCover, gameTexture, isTextureReady, showFigure, whenTextureReady } from '@/utils/assets';

const THUMB_H = 176;
const THUMB_GAP = 12;
const BTN_H = 92;
const SWIPE = 64;

function isOpen(o: OutfitDef): boolean {
  return GameState.save.netWorth >= o.unlockNetWorth;
}

export class OutfitSheet extends Page {
  private readonly _preview = new PIXI.Container();
  private readonly _scene = new PIXI.Sprite();
  private readonly _sceneShade = new PIXI.Graphics();
  private readonly _figure = new PIXI.Sprite();
  private readonly _frame = new PIXI.Graphics();
  private readonly _frameMask = new PIXI.Graphics();
  private readonly _label = new PIXI.Container();
  private readonly _thumbs = new PIXI.Container();
  private readonly _action = new PIXI.Container();
  private _selected: OutfitId = 'tee';
  private _box = new PIXI.Rectangle();
  private _pressX: number | null = null;
  private _pressY = 0;

  constructor() {
    super('衣橱');
    this._figure.anchor.set(0.5, 1);
    this._preview.addChild(this._scene, this._sceneShade, this._figure, this._frameMask, this._frame, this._label);
    this._scene.mask = this._frameMask;
    this._preview.eventMode = 'static';
    this._preview.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this._pressX = e.global.x / Game.scale;
      this._pressY = e.global.y / Game.scale;
    });
    const end = (e: PIXI.FederatedPointerEvent): void => {
      if (this._pressX === null) return;
      const dx = e.global.x / Game.scale - this._pressX;
      const dy = e.global.y / Game.scale - this._pressY;
      this._pressX = null;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) this._step(dx < 0 ? 1 : -1);
    };
    this._preview.on('pointerup', end);
    this._preview.on('pointerupoutside', end);
    this.body.addChild(this._preview, this._thumbs, this._action);
  }

  protected override onOpen(): void {
    this._selected = GameState.save.outfit;
    for (const o of OUTFITS) {
      gameTexture(outfitFigurePath(o.id));
      gameTexture(outfitScenePath(o.id));
    }
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    const btnY = bottom - BTN_H / 2;
    const thumbTop = btnY - BTN_H / 2 - 20 - THUMB_H;
    this._box = new PIXI.Rectangle(PAGE_PAD, top, W - PAGE_PAD * 2, thumbTop - 20 - top);
    this._layoutPreview();
    this._layoutThumbs(thumbTop);
    this._layoutAction(btnY);
  }

  private _step(dir: 1 | -1): void {
    const i = OUTFITS.findIndex((o) => o.id === this._selected);
    const next = OUTFITS[(i + dir + OUTFITS.length) % OUTFITS.length];
    this._select(next.id, dir);
  }

  private _select(id: OutfitId, dir = 0): void {
    if (id === this._selected) return;
    AudioManager.play('ui_click');
    this._selected = id;
    this.rebuild();
    const fx = this._figure.x;
    const alpha = this._figure.alpha;
    TweenManager.cancelTarget(this._figure);
    TweenManager.cancelTarget(this._scene);
    this._figure.x = fx + dir * 70;
    this._figure.alpha = 0;
    TweenManager.to({ target: this._figure, props: { x: fx, alpha }, duration: 0.28, ease: Ease.easeOutQuad });
    this._scene.alpha = 0.3;
    TweenManager.to({ target: this._scene, props: { alpha: 1 }, duration: 0.3, ease: Ease.easeOutQuad });
  }

  private _layoutPreview(): void {
    const o = OUTFITS.find((x) => x.id === this._selected) ?? OUTFITS[0];
    const open = isOpen(o);
    const { x, y, width: w, height: h } = this._box;
    this._frameMask.clear().beginFill(0xffffff).drawRoundedRect(x, y, w, h, 32).endFill();
    this._frame.clear().lineStyle(2.5, COLORS.champagne, 0.95).drawRoundedRect(x, y, w, h, 32);
    this._figure.mask = null;

    const scenePath = outfitScenePath(o.id);
    this._scene.texture = gameTexture(scenePath);
    const fitScene = (): void => {
      if (this._scene.destroyed || this._selected !== o.id) return;
      this._scene.texture = gameTexture(scenePath);
      const tex = this._scene.texture;
      if (!isTextureReady(tex)) return;
      const fit = fitCover(tex.width, tex.height, w, h);
      applyFit(this._scene, { ...fit, x: x + fit.x, y: y + fit.y });
      this._scene.visible = true;
    };
    this._scene.visible = false;
    if (isTextureReady(this._scene.texture)) fitScene();
    else whenTextureReady(scenePath, fitScene);

    this._sceneShade.clear();
    if (!open) this._sceneShade.beginFill(COLORS.glass, 0.72).drawRoundedRect(x, y, w, h, 32).endFill();
    for (let i = 0; i < 10; i++) {
      this._sceneShade.beginFill(COLORS.glass, 0.05 * (i + 1)).drawRect(x, y + h - 140 + i * 14, w, 14).endFill();
    }

    TweenManager.cancelTarget(this._figure);
    this._figure.position.set(x + w / 2, y + h - 10);
    this._figure.tint = open ? 0xffffff : 0x000000;
    this._figure.alpha = open ? 1 : 0.6;
    showFigure(this._figure, outfitFigurePath(o.id), w * 0.7, h - 70);

    for (const c of this._label.removeChildren()) c.destroy({ children: true });
    const name = makeText(o.name, 30, COLORS.textOnGlass, true);
    const sub = makeText(open ? `场景 · ${o.scene}` : `身价达到 ${formatMoney(o.unlockNetWorth)} 解锁`, 20, open ? COLORS.champagne : COLORS.textOnGlassSoft);
    const lw = Math.max(name.width, sub.width) + 40;
    this._label.addChild(drawGlass(new PIXI.Graphics(), x + 20, y + 20, lw, 92, 24, 0.72));
    name.position.set(x + 40, y + 32);
    sub.position.set(x + 40, y + 74);
    this._label.addChild(name, sub);
    if (GameState.save.outfit === o.id) {
      const tag = makeText('穿着中', 20, COLORS.glass, true);
      const tw = tag.width + 24;
      this._label.addChild(new PIXI.Graphics().beginFill(COLORS.champagne).drawRoundedRect(x + w - 20 - tw, y + 24, tw, 36, 18).endFill());
      tag.anchor.set(0.5);
      tag.position.set(x + w - 20 - tw / 2, y + 42);
      this._label.addChild(tag);
    }
  }

  private _layoutThumbs(top: number): void {
    for (const c of this._thumbs.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const n = OUTFITS.length;
    const tw = (W - PAGE_PAD * 2 - THUMB_GAP * (n - 1)) / n;
    OUTFITS.forEach((o, i) => {
      const open = isOpen(o);
      const selected = o.id === this._selected;
      const wearing = GameState.save.outfit === o.id;
      const t = new PIXI.Container();
      const g = drawGlass(new PIXI.Graphics(), 0, 0, tw, THUMB_H, 20, selected ? 0.75 : 0.5);
      if (selected) g.lineStyle(3, COLORS.champagne, 1).drawRoundedRect(0, 0, tw, THUMB_H, 20);
      t.addChild(g);
      const fig = new PIXI.Sprite();
      fig.anchor.set(0.5, 1);
      fig.position.set(tw / 2, THUMB_H - 8);
      if (!open) {
        fig.tint = 0x000000;
        fig.alpha = 0.55;
      }
      t.addChild(fig);
      showFigure(fig, outfitFigurePath(o.id), tw - 16, THUMB_H - 20);
      if (!open) {
        const lock = new PIXI.Sprite();
        lock.anchor.set(0.5);
        showFigure(lock, ICONS.lock, 34, 34);
        lock.position.set(tw / 2, THUMB_H / 2);
        t.addChild(lock);
      }
      if (wearing) {
        t.addChild(new PIXI.Graphics().beginFill(COLORS.champagne).drawCircle(tw - 18, 18, 11).endFill());
        t.addChild(new PIXI.Graphics().lineStyle(3, COLORS.glass).moveTo(tw - 23, 18).lineTo(tw - 19, 22).lineTo(tw - 12, 14));
      }
      t.pivot.set(tw / 2, THUMB_H / 2);
      t.position.set(PAGE_PAD + i * (tw + THUMB_GAP) + tw / 2, top + THUMB_H / 2);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointerdown', () => {
        TweenManager.cancelTarget(t.scale);
        t.scale.set(0.94);
      });
      const release = (): void => {
        TweenManager.to({ target: t.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
      };
      t.on('pointerup', release);
      t.on('pointerupoutside', release);
      t.on('pointertap', () => {
        const cur = OUTFITS.findIndex((x) => x.id === this._selected);
        this._select(o.id, Math.sign(i - cur));
      });
      this._thumbs.addChild(t);
    });
  }

  private _layoutAction(y: number): void {
    for (const c of this._action.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const o = OUTFITS.find((x) => x.id === this._selected) ?? OUTFITS[0];
    const w = W - PAGE_PAD * 2;
    if (!isOpen(o)) {
      this._action.addChild(drawGlass(new PIXI.Graphics(), PAGE_PAD, y - BTN_H / 2, w, BTN_H, BTN_H / 2, 0.45));
      const t = makeText(`身价达到 ${formatMoney(o.unlockNetWorth)} 解锁`, 28, COLORS.textOnGlassSoft, true);
      t.anchor.set(0.5);
      t.position.set(W / 2, y);
      this._action.addChild(t);
      return;
    }
    const wearing = GameState.save.outfit === o.id;
    const btn = new Button({
      width: w, height: BTN_H, variant: 'gold', fontSize: 32,
      label: wearing ? '正在穿' : '换上这套',
      onTap: () => {
        if (GameState.save.outfit === o.id) return;
        GameState.setOutfit(o.id);
        AudioManager.play('item_reveal');
        ToastManager.show(`换上了${o.name}`, 'success');
        this.rebuild();
      },
    });
    btn.setEnabled(!wearing);
    btn.position.set(W / 2, y);
    this._action.addChild(btn);
  }
}
