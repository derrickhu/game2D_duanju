/**
 * 千金衣橱（`OutfitSheet` · v13 扩充高定 + 广告免费解锁 + 横向滑动缩略图版）：
 * - 包含 5 套身价里程碑高定 + 4 套广告免费解锁主题高定（均带独立精绘 2D 唯美背景）；
 * - 每一套解锁均可永久提升帝国总收益 +8%，支持左右滑动舞台与底部横向滑动缩略图带。
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES, outfitFigurePath, outfitScenePath } from '@/data/art';
import { BALANCE } from '@/data/balance';
import { OUTFITS, type OutfitDef, type OutfitId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { formatMoney } from '@/sim/format';
import { isOutfitUnlocked, unlockedOutfits } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import { PAGE_PAD, Page } from '@/ui/Page';
import {
  COLORS,
  createNineSlice2x,
  makeDisplayText,
  makeRibbonBanner,
  makeStageNameplate,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import {
  applyFit,
  applyGray,
  fitCover,
  gameTexture,
  isTextureReady,
  showFigure,
  watchTextures,
  whenTextureReady,
} from '@/utils/assets';

const THUMB_H = 114;
const THUMB_W = 122;
const THUMB_GAP = 10;
const BTN_H = 74;
const SWIPE = 48;

export class OutfitSheet extends Page {
  private readonly _banner = new PIXI.Container();
  private readonly _preview = new PIXI.Container();
  private readonly _scene = new PIXI.Sprite();
  private readonly _sceneShade = new PIXI.Graphics();
  private readonly _figure = new PIXI.Sprite();
  private readonly _frame = new PIXI.Graphics();
  private readonly _frameMask = new PIXI.Graphics();
  private readonly _label = new PIXI.Container();
  private readonly _thumbs = new PIXI.Container();
  private readonly _thumbTrack = new PIXI.Container();
  private readonly _thumbMask = new PIXI.Graphics();
  private readonly _action = new PIXI.Container();

  private _selected: OutfitId = 'tee';
  private _box = new PIXI.Rectangle();
  private _pressX: number | null = null;
  private _pressY = 0;

  private _thumbScrollX = 0;
  private _thumbMinX = 0;
  private _thumbPressX: number | null = null;
  private _thumbOriginX = 0;
  private _thumbMoved = false;

  constructor() {
    super('千金衣橱');
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

    this._thumbTrack.mask = this._thumbMask;
    this._thumbs.addChild(this._thumbTrack, this._thumbMask);
    this._bindThumbDrag();

    this.body.addChild(this._banner, this._preview, this._thumbs, this._action);
  }

  private _bindThumbDrag(): void {
    this._thumbs.eventMode = 'static';
    this._thumbs.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this._thumbPressX = e.global.x / Game.scale;
      this._thumbOriginX = this._thumbScrollX;
      this._thumbMoved = false;
      TweenManager.cancelTarget(this._thumbTrack);
    });
    this._thumbs.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
      if (this._thumbPressX === null) return;
      const dx = e.global.x / Game.scale - this._thumbPressX;
      if (Math.abs(dx) > 8) this._thumbMoved = true;
      this._thumbScrollX = Math.max(this._thumbMinX, Math.min(0, this._thumbOriginX + dx));
      this._thumbTrack.x = this._thumbScrollX;
    });
    const endThumbDrag = (): void => {
      this._thumbPressX = null;
    };
    this._thumbs.on('pointerup', endThumbDrag);
    this._thumbs.on('pointerupoutside', endThumbDrag);
  }

  protected override onOpen(): void {
    this._selected = GameState.save.outfit;
    const allPaths = OUTFITS.flatMap((o) => [outfitFigurePath(o.id), outfitScenePath(o.id)]);
    watchTextures(allPaths, () => {
      if (this.isOpen) this.rebuild();
    });
  }

  protected layoutBody(top: number, bottom: number): void {
    const W = Game.logicWidth;
    this._buildBanner(top);
    const previewTop = top + 66;
    const btnY = bottom - BTN_H / 2;
    const thumbTop = btnY - BTN_H / 2 - 16 - THUMB_H;
    this._box = new PIXI.Rectangle(PAGE_PAD, previewTop, W - PAGE_PAD * 2, thumbTop - 18 - previewTop);
    this._layoutPreview();
    this._layoutThumbs(thumbTop);
    this._layoutAction(btnY);
  }

  private _buildBanner(top: number): void {
    for (const c of this._banner.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const unlockedCount = unlockedOutfits(GameState.save).length;
    const pct = Math.round(Math.max(0, unlockedCount - 1) * BALANCE.outfitEmpireBonus * 100);
    const bw = W - PAGE_PAD * 2;
    const bh = 54;

    const ribbon = makeRibbonBanner(bw, bh, false);
    ribbon.position.set(PAGE_PAD, top);

    const ico = makeStickerSprite(ICONS.wardrobe, 44, 44, true);
    ico.position.set(PAGE_PAD + 44, top + bh / 2);

    const txt = makeText(
      `高定魅力图鉴 ${unlockedCount}/${OUTFITS.length}  ·  帝国总收益 +${pct}%`,
      21,
      COLORS.goldDeep,
      true,
    );
    txt.anchor.set(0.5);
    txt.position.set(W / 2 + 18, top + bh / 2);
    this._banner.addChild(ribbon, ico, txt);
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
    TweenManager.to({ target: this._figure, props: { x: fx, alpha }, duration: 0.26, ease: Ease.easeOutQuad });
    this._scene.alpha = 0.4;
    TweenManager.to({ target: this._scene, props: { alpha: 1 }, duration: 0.28, ease: Ease.easeOutQuad });
  }

  private _layoutPreview(): void {
    const o = OUTFITS.find((x) => x.id === this._selected) ?? OUTFITS[0];
    const open = isOutfitUnlocked(GameState.save, o);
    const { x, y, width: w, height: h } = this._box;
    this._frameMask.clear().beginFill(0xffffff).drawRoundedRect(x, y, w, h, 30).endFill();

    this._frame.clear();
    this._frame.lineStyle(3.4, COLORS.borderGold, 0.98).drawRoundedRect(x, y, w, h, 30);
    this._frame.lineStyle(1.2, 0xFFF7E2, 0.78).drawRoundedRect(x + 6, y + 6, w - 12, h - 12, 25);
    drawDiamondStar(this._frame, x + 22, y + 22, 6, 0xFFE6A3, 0.92);
    drawDiamondStar(this._frame, x + w - 22, y + 22, 6, 0xFFE6A3, 0.92);

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
    if (!open) this._sceneShade.beginFill(0x3D2E22, 0.34).drawRoundedRect(x, y, w, h, 30).endFill();

    TweenManager.cancelTarget(this._figure);
    this._figure.position.set(x + w / 2, y + h - 4);
    this._figure.filters = null;
    if (!open) applyGray(this._figure);
    this._figure.alpha = open ? 1 : 0.62;
    showFigure(this._figure, outfitFigurePath(o.id), w * 0.74, h - 24);

    for (const c of this._label.removeChildren()) c.destroy({ children: true });

    if (GameState.save.outfit === o.id) {
      const badgeW = 136;
      const badgeH = 40;
      const bx = x + w - 18 - badgeW;
      const by = y + 18;
      const badgeSkin = createNineSlice2x(
        { path: UI_SLICES.btnSmCoral, pad2x: 18, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 },
        badgeW,
        badgeH,
        false,
      );
      badgeSkin.position.set(bx, by);
      const tag = makeDisplayText('当前穿搭', 18, 0xFFFFFF, 0x8C322B, 3.4);
      tag.anchor.set(0.5);
      tag.position.set(bx + badgeW / 2, by + badgeH / 2 - 0.5);
      this._label.addChild(badgeSkin, tag);
    } else if (!open && o.unlockByAd) {
      const badgeW = 148;
      const badgeH = 40;
      const bx = x + w - 18 - badgeW;
      const by = y + 18;
      const badgeSkin = createNineSlice2x(
        { path: UI_SLICES.btnSmGold, pad2x: 16, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 },
        badgeW,
        badgeH,
        false,
      );
      badgeSkin.position.set(bx, by);
      const tag = makeDisplayText('广告限定款', 17, 0xFFFDF8, 0x8B5516, 2.8);
      tag.anchor.set(0.5);
      tag.position.set(bx + badgeW / 2, by + badgeH / 2 - 0.5);
      this._label.addChild(badgeSkin, tag);
    }

    const plateW = w - 44;
    const plateH = 90;
    const px = x + 22;
    const py = y + h - plateH - 16;
    const plate = makeStageNameplate(plateW, plateH, false);
    plate.position.set(px, py);

    const name = makeText(o.name, 26, COLORS.ink, true);
    name.anchor.set(0.5, 0);
    name.position.set(x + w / 2, py + 12);

    const lockSub = o.unlockByAd
      ? `${o.scene}  ·  看广告解锁（帝国收益 +8%）`
      : `身价达 ¥${formatMoney(o.unlockNetWorth)} 解锁 · 帝国收益 +8%`;
    const sub = makeText(
      open ? `${o.scene}  ·  ${o.counterName}` : lockSub,
      18,
      open ? COLORS.roseDeep : COLORS.inkSoft,
      true,
    );
    sub.anchor.set(0.5, 0);
    sub.position.set(x + w / 2, py + 50);
    if (sub.width > plateW - 40) sub.scale.set((plateW - 40) / sub.width);

    this._label.addChild(plate, name, sub);
  }

  private _layoutThumbs(top: number): void {
    for (const c of this._thumbTrack.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const viewW = W - PAGE_PAD * 2;
    const n = OUTFITS.length;
    const contentW = n * THUMB_W + (n - 1) * THUMB_GAP;

    this._thumbs.position.set(PAGE_PAD, top);
    this._thumbs.hitArea = new PIXI.Rectangle(0, 0, viewW, THUMB_H);
    this._thumbMask.clear().beginFill(0xffffff).drawRect(-4, -4, viewW + 8, THUMB_H + 8).endFill();

    this._thumbMinX = Math.min(0, viewW - contentW);

    // 选中项自动居中进入可视窗口
    const selIdx = Math.max(0, OUTFITS.findIndex((x) => x.id === this._selected));
    const selCenter = selIdx * (THUMB_W + THUMB_GAP) + THUMB_W / 2;
    const idealX = Math.max(this._thumbMinX, Math.min(0, viewW / 2 - selCenter));
    this._thumbScrollX = idealX;
    this._thumbTrack.x = idealX;

    OUTFITS.forEach((o, i) => {
      const open = isOutfitUnlocked(GameState.save, o);
      const selected = o.id === this._selected;
      const wearing = GameState.save.outfit === o.id;
      const t = new PIXI.Container();

      const spec = !open
        ? { path: UI_SLICES.cardGridLocked, pad2x: 10, left2x: 60, top2x: 60, right2x: 60, bottom2x: 144 }
        : selected
          ? { path: UI_SLICES.cardGridReady, pad2x: 20, left2x: 68, top2x: 68, right2x: 68, bottom2x: 68 }
          : { path: UI_SLICES.cardGridUnlocked, pad2x: 16, left2x: 64, top2x: 64, right2x: 64, bottom2x: 64 };
      t.addChild(createNineSlice2x(spec, THUMB_W, THUMB_H, false));

      if (selected) {
        const rim = new PIXI.Graphics()
          .lineStyle(3.0, COLORS.rose, 0.98)
          .drawRoundedRect(1, 1, THUMB_W - 2, THUMB_H - 2, 16);
        t.addChild(rim);
      }

      const fig = new PIXI.Sprite();
      fig.anchor.set(0.5, 1);
      fig.position.set(THUMB_W / 2, THUMB_H - 8);
      if (!open) {
        applyGray(fig);
        fig.alpha = 0.56;
      }
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(4, 4, THUMB_W - 8, THUMB_H - 8, 14).endFill();
      fig.mask = mask;
      t.addChild(mask, fig);
      showFigure(fig, outfitFigurePath(o.id), THUMB_W - 12, THUMB_H - 18);

      if (!open && o.unlockByAd) {
        const adTag = new PIXI.Graphics()
          .lineStyle(1.4, 0xFFF7E0, 1)
          .beginFill(COLORS.rose, 0.96)
          .drawRoundedRect(THUMB_W / 2 - 36, THUMB_H - 30, 72, 22, 11)
          .endFill();
        const adTxt = makeText('▶ 广告', 12, 0xFFFFFF, true);
        adTxt.anchor.set(0.5);
        adTxt.position.set(THUMB_W / 2, THUMB_H - 19);
        t.addChild(adTag, adTxt);
      } else if (!open) {
        const lock = makeStickerSprite(ICONS.lock, 40, 40, true);
        lock.position.set(THUMB_W / 2, THUMB_H / 2);
        t.addChild(lock);
      }

      if (wearing) {
        t.addChild(new PIXI.Graphics().lineStyle(2, 0xFFFFFF).beginFill(COLORS.rose).drawCircle(THUMB_W - 18, 18, 12).endFill());
        t.addChild(new PIXI.Graphics().lineStyle(2.6, COLORS.white).moveTo(THUMB_W - 23, 18).lineTo(THUMB_W - 19, 22).lineTo(THUMB_W - 12, 14));
      }

      t.pivot.set(THUMB_W / 2, THUMB_H / 2);
      t.position.set(i * (THUMB_W + THUMB_GAP) + THUMB_W / 2, THUMB_H / 2);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointertap', () => {
        if (this._thumbMoved) return;
        const cur = OUTFITS.findIndex((x) => x.id === this._selected);
        this._select(o.id, Math.sign(i - cur));
      });
      this._thumbTrack.addChild(t);
    });
  }

  private _layoutAction(y: number): void {
    for (const c of this._action.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const o = OUTFITS.find((x) => x.id === this._selected) ?? OUTFITS[0];
    const open = isOutfitUnlocked(GameState.save, o);
    const w = W - PAGE_PAD * 2;

    if (!open && o.unlockByAd) {
      const btn = new Button({
        width: w,
        height: BTN_H,
        variant: 'rose',
        fontSize: 25,
        label: '▶ 观看激励视频免费解锁（帝国收益 +8%）',
        onTap: () => {
          Platform.showRewardedVideo('wardrobeOutfit', () => {
            GameState.unlockOutfitByAd(o.id);
            AudioManager.play('level_up');
            ToastManager.show(`✦ 解锁并换上「${o.name}」（帝国总收益 +8%）`, 'success');
            this.rebuild();
          });
        },
      });
      btn.position.set(W / 2, y);
      this._action.addChild(btn);
      return;
    }

    if (!open) {
      const banner = makeRibbonBanner(w, BTN_H - 8, false);
      banner.position.set(PAGE_PAD, y - (BTN_H - 8) / 2);
      const lockIco = makeStickerSprite(ICONS.lock, 36, 36, true);
      const t = makeText(`身价达到 ¥${formatMoney(o.unlockNetWorth)} 自动解锁`, 23, COLORS.ink, true);
      t.anchor.set(0.5);
      const totalW = 36 + 10 + t.width;
      lockIco.position.set(W / 2 - totalW / 2 + 18, y);
      t.position.set(W / 2 - totalW / 2 + 46 + t.width / 2, y);
      this._action.addChild(banner, lockIco, t);
      return;
    }

    const wearing = GameState.save.outfit === o.id;
    const btn = new Button({
      width: w,
      height: BTN_H,
      variant: wearing ? 'gold' : 'rose',
      fontSize: 27,
      label: wearing ? '✦ 当前穿搭中' : '换上这套高定造型',
      onTap: () => {
        if (GameState.save.outfit === o.id) return;
        GameState.setOutfit(o.id);
        AudioManager.play('item_reveal');
        ToastManager.show(`✦ 已换上「${o.name}」`, 'success');
        this.rebuild();
      },
    });
    btn.position.set(W / 2, y);
    this._action.addChild(btn);
  }
}
