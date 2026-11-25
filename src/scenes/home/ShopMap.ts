/**
 * 名下产业页（v9 全景高质感商业大地图主视图 + 10 座独立绘制 2.5D 地标建筑 + 可切换店铺列表次视图）：
 * - 主模式「商业版图」（默认展示）：900×1600 半厚涂海岸江湾等距大地图 (`v9_grand_map.jpg`)，支持丝滑纵向拖拽漫游与自动聚焦；
 * - 地图上 10 座产业全部采用独立绘制的 2.5D 等距微缩建筑 (`v9_bldg_<id>.png`) 精准落座各自广场，底座三态珠光/珊瑚铭牌（零屋顶遮挡、零文字重叠）+ 选中金环 + 升级星芒回弹动效；
 * - 次要模式「店铺列表」：保留宽幅插画门头卡片列表，随时一键切换批量管理。
 */
import * as PIXI from 'pixi.js';
import {
  GRAND_CITY_MAP,
  ICONS,
  SHOP_MAP_SPOTS,
  UI_SLICES,
  heroPortraitPath,
  shopBannerPath,
  shopBuildingPath,
} from '@/data/art';
import { heroForShop } from '@/data/story';
import { STAFF, staffById } from '@/data/staff';
import { AREAS, SHOPS, shopProductAt, type ShopDef, type ShopId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { areaCrownMultiplier, resolveShopBuyCount, shopIncomeIn, shopUpgradeCostIn } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { resolveRecipe } from '@/sim/recipeSim';
import { effectiveBond, isShopUnlocked } from '@/sim/unlocks';
import { BusinessBattleModal } from './BusinessBattleModal';
import { Button } from '@/ui/Button';
import { BuyModeBar } from '@/ui/BuyModeBar';
import { drawDiamondStar } from '@/ui/EditorialIcons';
import { buildLightCurrencyPill, makeBackButton, PAGE_PAD } from '@/ui/Page';
import { ProgressBar } from '@/ui/ProgressBar';
import { ScrollView } from '@/ui/ScrollView';
import {
  COLORS,
  createNineSlice2x,
  drawCreamCard,
  drawLuxuryPageBg,
  makeDisplayText,
  makeNumText,
  makeStickerSprite,
  makeText,
  verticalGradientTexture,
} from '@/ui/theme';
import { applyFit, applyGray, fitCover, gameTexture, isTextureReady, showFigure, whenTextureReady } from '@/utils/assets';

type ViewMode = 'map' | 'list';

const MAP_ASPECT = 2000 / 900;
const CARD_W = 704;
const CARD_H = 186;
const CARD_GAP = 16;
const DOCK_H = 188;

interface LandmarkEntry {
  id: ShopId;
  root: PIXI.Container;
  bldgWrap: PIXI.Container;
  bldgSprite: PIXI.Sprite;
  plate: PIXI.Container;
  selected: boolean;
  readyNew: boolean;
  phase: number;
}

function synergyShort(shop: ShopDef, level: number): string {
  const s = shop.synergy;
  const pct25 = `+${Math.round(s.lv25 * 100)}%`;
  const pct50 = `+${Math.round(s.lv50 * 100)}%`;
  if (level >= 50) return `✦ 满阶光环：${s.label} ${pct50}`;
  if (level >= 25) return `✦ 光环激活：${s.label} ${pct25}`;
  return `Lv.25 光环：${s.label} ${pct25}`;
}

export class ShopMap extends PIXI.Container {
  private readonly _bgLayer = new PIXI.Container();

  // 主视图：可漫游 2.5D 商业版图大地图
  private readonly _mapWrap = new PIXI.Container();
  private readonly _mapWorld = new PIXI.Container();
  private readonly _mapSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _waterGlints = new PIXI.Container();
  private readonly _landmarksLayer = new PIXI.Container();
  private readonly _fxLayer = new PIXI.Container();
  private readonly _mapBottomDock = new PIXI.Container();
  private _mapActionBtn: Button | null = null;

  // 次要视图：店铺列表
  private readonly _listWrap = new PIXI.Container();
  private readonly _listScroll = new ScrollView();
  private readonly _cardButtons = new Map<ShopId, Button>();

  // 顶部柔光导航舱
  private readonly _topFrost = new PIXI.Sprite();
  private readonly _topFrostBorder = new PIXI.Graphics();
  private readonly _headerLayer = new PIXI.Container();
  private readonly _toolbarLayer = new PIXI.Container();

  private readonly _roseTxt = makeNumText('0', 20, COLORS.ink);
  private readonly _cashTxt = makeNumText('0', 20, COLORS.ink);

  private readonly _landmarks: LandmarkEntry[] = [];
  private readonly _glintNodes: { g: PIXI.Graphics; phase: number }[] = [];

  // 默认主视图为大地图 ('map')
  private _mode: ViewMode = 'map';
  private _selected: ShopId = 'stall';
  private _isOpen = false;
  private _time = 0;

  // 大地图纵向丝滑漫游状态
  private _worldH = 1334;
  private _scrollY = 0;
  private _minScrollY = 0;
  private _maxScrollY = 0;
  private _draggingMap = false;
  private _mapMoved = false;
  private _dragStartY = 0;
  private _dragOriginScroll = 0;
  private _velY = 0;

  private readonly _tickFn = (): void => this._tick();
  private readonly _onOpenRecipe?: (shopId: ShopId) => void;
  private readonly _onOpenManagers?: () => void;

  constructor(onOpenRecipe?: (shopId: ShopId) => void, onOpenManagers?: () => void) {
    super();
    this._onOpenRecipe = onOpenRecipe;
    this._onOpenManagers = onOpenManagers;
    this.visible = false;
    this._bgLayer.eventMode = 'static';

    this._topFrost.texture = verticalGradientTexture(0xFFFDF8, 0xFCF2E1, 0xF9EBD4, 64);
    this._topFrost.alpha = 0.95;
    this._topFrost.eventMode = 'static';

    this._mapWorld.addChild(this._mapSprite, this._waterGlints, this._landmarksLayer, this._fxLayer);
    this._mapWrap.addChild(this._mapWorld, this._mapBottomDock);
    this._listWrap.addChild(this._listScroll);

    this._bindMapPan();

    this.addChild(
      this._bgLayer,
      this._mapWrap,
      this._listWrap,
      this._topFrost,
      this._topFrostBorder,
      this._toolbarLayer,
      this._headerLayer,
    );
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this.visible = true;
    this._mode = 'map';
    OverlayManager.bringToFront();
    AudioManager.play('ui_open');

    const save = GameState.save;
    const readyNew = SHOPS.find((s) => isShopUnlocked(save, s.id) && (save.shops[s.id] ?? 0) === 0);
    const highestOpen = [...SHOPS].reverse().find((s) => (save.shops[s.id] ?? 0) > 0);
    this._selected = (readyNew ?? highestOpen ?? SHOPS[0]).id;

    gameTexture(GRAND_CITY_MAP);
    for (const s of SHOPS) {
      gameTexture(shopBuildingPath(s.id));
      gameTexture(shopBannerPath(s.id));
    }
    whenTextureReady(GRAND_CITY_MAP, () => {
      if (this._isOpen) this._layoutMapWorld();
    });

    this.relayout();
    this._focusOnShop(this._selected, false);

    Game.ticker.remove(this._tickFn);
    Game.ticker.add(this._tickFn);

    TweenManager.cancelTarget(this);
    this.alpha = 0;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.2, ease: Ease.easeOutQuad });
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    Game.ticker.remove(this._tickFn);
    if (silent) {
      this.visible = false;
      return;
    }
    AudioManager.play('ui_close');
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.16,
      ease: Ease.easeInQuad,
      onComplete: () => { this.visible = false; this.alpha = 1; },
    });
  }

  private get _headerTopY(): number {
    return Game.safeTop > 24 ? Game.safeTop + 42 : Math.max(16, Game.safeTop + 10);
  }

  private get _topOverlayBottom(): number {
    return this._headerTopY + 126;
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    drawLuxuryPageBg(this._bgLayer, W, H, false);

    const topBarH = this._topOverlayBottom;
    this._topFrost.width = W;
    this._topFrost.height = topBarH;
    this._topFrostBorder.clear()
      .lineStyle(2, 0xE5C489, 0.92)
      .moveTo(0, topBarH)
      .lineTo(W, topBarH);

    this._buildHeader();
    this._layoutMapWorld();
    this.rebuild();
  }

  rebuild(): void {
    if (!this._isOpen) return;
    this._cardButtons.clear();
    this._mapActionBtn = null;

    this._mapWrap.visible = this._mode === 'map';
    this._listWrap.visible = this._mode === 'list';

    this._refreshCurrencies();
    this._buildToolbar();

    if (this._mode === 'map') {
      this._buildLandmarks();
      this._buildMapBottomDock();
    } else {
      this._buildBannerList();
    }
  }

  refreshAffordable(): void {
    if (!this._isOpen) return;
    this._refreshCurrencies();
    const save = GameState.save;
    for (const [shopId, btn] of this._cardButtons) {
      const lv = save.shops[shopId] ?? 0;
      const count = resolveShopBuyCount(save, shopId, save.buyMode);
      const cost = shopUpgradeCostIn(save, shopId, lv, count);
      btn.setEnabled(save.money >= cost);
    }
    if (this._mapActionBtn && isShopUnlocked(save, this._selected)) {
      const lv = save.shops[this._selected] ?? 0;
      const count = resolveShopBuyCount(save, this._selected, save.buyMode);
      const cost = shopUpgradeCostIn(save, this._selected, lv, count);
      this._mapActionBtn.setEnabled(save.money >= cost);
    }
  }

  private _bindMapPan(): void {
    this._mapWorld.eventMode = 'static';
    this._mapWorld.cursor = 'grab';
    this._mapWorld.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this._draggingMap = true;
      this._mapMoved = false;
      this._velY = 0;
      TweenManager.cancelTarget(this._mapWorld);
      this._dragStartY = e.global.y / Game.scale;
      this._dragOriginScroll = this._scrollY;
    });
    this._mapWorld.on('globalpointermove', (e: PIXI.FederatedPointerEvent) => {
      if (!this._draggingMap) return;
      const curY = e.global.y / Game.scale;
      const dy = curY - this._dragStartY;
      if (Math.abs(dy) > 7) this._mapMoved = true;
      const next = Math.max(this._minScrollY, Math.min(this._maxScrollY, this._dragOriginScroll + dy));
      this._velY = (next - this._scrollY) * 14;
      this._scrollY = next;
      this._mapWorld.y = this._scrollY;
    });
    const endDrag = (): void => {
      this._draggingMap = false;
    };
    this._mapWorld.on('pointerup', endDrag);
    this._mapWorld.on('pointerupoutside', endDrag);
  }

  private _layoutMapWorld(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._worldH = Math.round(W * MAP_ASPECT);

    const tex = gameTexture(GRAND_CITY_MAP);
    this._mapSprite.texture = tex;
    this._mapSprite.width = W;
    this._mapSprite.height = this._worldH;
    this._mapWorld.hitArea = new PIXI.Rectangle(0, -280, W, this._worldH + 560);

    // 900×2000 全出血韩漫落日江湾画布：上下边界严丝合缝贴合屏幕顶底，零空白露底，且首尾建筑与铭牌完全避开顶栏和底舱
    this._maxScrollY = 0;
    this._minScrollY = Math.min(0, H - this._worldH);

    this._scrollY = Math.max(this._minScrollY, Math.min(this._maxScrollY, this._scrollY));
    this._mapWorld.y = this._scrollY;

    this._rebuildWaterGlints(W, this._worldH);
  }

  private _rebuildWaterGlints(w: number, h: number): void {
    for (const c of this._waterGlints.removeChildren()) c.destroy();
    this._glintNodes.length = 0;
    const riverPts: readonly [number, number][] = [
      [0.78, 0.22], [0.83, 0.33], [0.90, 0.44],
      [0.64, 0.50], [0.28, 0.57], [0.09, 0.67],
    ];
    riverPts.forEach(([nx, ny], i) => {
      const g = new PIXI.Graphics();
      drawDiamondStar(g, 0, 0, 5 + (i % 2) * 2.5, 0xFFF5CC, 0.85);
      g.position.set(nx * w, ny * h);
      this._waterGlints.addChild(g);
      this._glintNodes.push({ g, phase: i * 1.1 });
    });
  }

  private _focusOnShop(id: ShopId, animate = true): void {
    const spot = SHOP_MAP_SPOTS[id];
    const H = Game.logicHeight;
    const visTop = this._topOverlayBottom + 20;
    const visBot = H - Game.safeBottom - DOCK_H - 24;
    const visCenterY = (visTop + visBot) * 0.53;
    const bldgCenterInWorld = spot.ny * this._worldH - spot.size * 0.35;
    const targetY = Math.max(this._minScrollY, Math.min(this._maxScrollY, Math.round(visCenterY - bldgCenterInWorld)));

    this._velY = 0;
    this._scrollY = targetY;
    TweenManager.cancelTarget(this._mapWorld);
    if (animate) {
      TweenManager.to({
        target: this._mapWorld,
        props: { y: targetY },
        duration: 0.32,
        ease: Ease.easeOutQuad,
      });
    } else {
      this._mapWorld.y = targetY;
    }
  }

  private _tick(): void {
    if (!this._isOpen || this._mode !== 'map') return;
    const dt = Math.min(0.05, Game.ticker.deltaMS / 1000);
    this._time += dt;

    if (!this._draggingMap && Math.abs(this._velY) > 1) {
      this._scrollY = Math.max(this._minScrollY, Math.min(this._maxScrollY, this._scrollY + this._velY * dt));
      this._mapWorld.y = this._scrollY;
      this._velY *= Math.exp(-7.5 * dt);
      if (this._scrollY <= this._minScrollY || this._scrollY >= this._maxScrollY) this._velY = 0;
    }

    for (const lm of this._landmarks) {
      if (lm.selected || lm.readyNew) {
        const pulse = 1 + Math.sin(this._time * 3.2 + lm.phase) * 0.018;
        lm.bldgWrap.scale.set(pulse);
      } else {
        lm.bldgWrap.scale.set(1);
      }
      if (lm.readyNew) {
        lm.plate.scale.set(1 + Math.sin(this._time * 3.8 + lm.phase) * 0.028);
      } else {
        lm.plate.scale.set(1);
      }
    }

    for (const gl of this._glintNodes) {
      gl.g.alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this._time * 2.4 + gl.phase));
    }
  }

  private _buildHeader(): void {
    this._roseTxt.parent?.removeChild(this._roseTxt);
    this._cashTxt.parent?.removeChild(this._cashTxt);
    for (const c of this._headerLayer.removeChildren()) c.destroy({ children: true });

    const W = Game.logicWidth;
    const topY = this._headerTopY;

    const back = makeBackButton(() => this.close(), '返回');
    back.position.set(PAGE_PAD, topY);

    const title = makeText('名下产业', 31, COLORS.ink, true);
    title.style.letterSpacing = 2;
    title.style.dropShadow = true;
    title.style.dropShadowColor = 0xFFFFFF;
    title.style.dropShadowAlpha = 0.95;
    title.style.dropShadowBlur = 0;
    title.style.dropShadowDistance = 1.5;
    title.style.dropShadowAngle = Math.PI / 2;
    title.anchor.set(0.5);
    title.position.set(264, topY + 30);

    const rosePill = buildLightCurrencyPill(ICONS.currencyRose, this._roseTxt, 128);
    const cashPill = buildLightCurrencyPill(ICONS.coins, this._cashTxt, 156);
    rosePill.position.set(W - PAGE_PAD - 292, topY + 9);
    cashPill.position.set(W - PAGE_PAD - 156, topY + 9);

    this._headerLayer.addChild(back, title, rosePill, cashPill);
    this._refreshCurrencies();
  }

  private _refreshCurrencies(): void {
    const save = GameState.save;
    this._roseTxt.text = String(save.roses);
    this._cashTxt.text = formatMoney(save.money);
    this._roseTxt.scale.set(1);
    this._cashTxt.scale.set(1);
    if (this._cashTxt.width > 74) this._cashTxt.scale.set(74 / this._cashTxt.width);
  }

  /** 顶部副操控条：主模式『商业版图』默认居首，次要模式『店铺列表』可一键切换 */
  private _buildToolbar(): void {
    for (const c of this._toolbarLayer.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const barY = this._headerTopY + 70;

    const modes: [ViewMode, string][] = [
      ['map', '商业版图'],
      ['list', '店铺列表'],
    ];
    modes.forEach(([m, label], idx) => {
      const active = this._mode === m;
      const tab = new PIXI.Container();
      const tw = 126;
      const th = 42;
      tab.position.set(PAGE_PAD + idx * (tw + 8), barY);

      const spec = active
        ? { path: UI_SLICES.btnSmCoral, pad2x: 16, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : { path: UI_SLICES.btnMdCream, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      tab.addChild(createNineSlice2x(spec, tw, th, false));

      const txt = active
        ? makeDisplayText(label, 18, 0xFFFFFF, 0x8C322B, 3.0)
        : makeText(label, 18, COLORS.ink, true);
      txt.anchor.set(0.5);
      txt.position.set(tw / 2, th / 2 - 0.5);
      tab.addChild(txt);

      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.on('pointertap', () => {
        if (this._mode === m) return;
        AudioManager.play('ui_click');
        this._mode = m;
        this.rebuild();
        if (m === 'map') this._focusOnShop(this._selected, false);
      });
      this._toolbarLayer.addChild(tab);
    });

    // 中部：当前选中门店所在商圈的「商圈冠名竞标战」快捷按钮
    const save = GameState.save;
    const curShop = SHOPS.find((s) => s.id === this._selected) ?? SHOPS[0];
    const areaDef = AREAS.find((a) => a.id === curShop.area) ?? AREAS[0];
    const areaOpen = save.netWorth >= areaDef.unlockNetWorth;
    const crownTier = save.areaCrownLevels?.[areaDef.id] ?? 0;
    const crownW = 216;
    const crownPill = new PIXI.Container();
    crownPill.position.set(PAGE_PAD + 268, barY);
    crownPill.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, crownW, 42, 21, {
      fill: crownTier < 3 && areaOpen ? 0xFFF4E4 : 0xFFFDF8,
      borderColor: crownTier < 3 && areaOpen ? COLORS.rose : 0xDFB870,
      borderWidth: 2,
    }));
    const crownStr = !areaOpen
      ? `${areaDef.name}·待开放`
      : crownTier >= 3
        ? `✦ ${areaDef.name}满冠+60%`
        : `✦ ${areaDef.name}竞标 ${crownTier}/3`;
    const crownTxt = makeText(crownStr, 16, crownTier < 3 && areaOpen ? COLORS.roseDeep : COLORS.goldDeep, true);
    crownTxt.anchor.set(0.5);
    crownTxt.position.set(crownW / 2, 21);
    if (crownTxt.width > crownW - 20) crownTxt.scale.set((crownW - 20) / crownTxt.width);
    crownPill.addChild(crownTxt);
    crownPill.eventMode = 'static';
    crownPill.cursor = 'pointer';
    crownPill.on('pointertap', () => {
      if (!areaOpen) {
        ToastManager.show(`身价达到 ¥${formatMoney(areaDef.unlockNetWorth)} 开放「${areaDef.name}」竞标`);
        return;
      }
      void BusinessBattleModal.showAreaCrown(areaDef.id).then((won) => {
        if (won) this.rebuild();
      });
    });
    this._toolbarLayer.addChild(crownPill);

    const buyBar = new BuyModeBar(200, 42, () => this.rebuild());
    buyBar.position.set(W - PAGE_PAD - 200, barY);
    this._toolbarLayer.addChild(buyBar);
  }

  /** 在 2.5D 大地图上按远近遮挡顺序排布 10 座独立绘制的地标建筑 */
  private _buildLandmarks(): void {
    for (const c of this._landmarksLayer.removeChildren()) c.destroy({ children: true });
    this._landmarks.length = 0;

    const W = Game.logicWidth;
    const save = GameState.save;
    const sorted = [...SHOPS].sort((a, b) => SHOP_MAP_SPOTS[a.id].ny - SHOP_MAP_SPOTS[b.id].ny);

    sorted.forEach((shop, idx) => {
      const spot = SHOP_MAP_SPOTS[shop.id];
      const unlocked = isShopUnlocked(save, shop.id);
      const level = save.shops[shop.id] ?? 0;
      const readyNew = unlocked && level === 0;
      const selected = shop.id === this._selected;

      const root = new PIXI.Container();
      const px = Math.round(spot.nx * W);
      const py = Math.round(spot.ny * this._worldH);
      root.position.set(px, py);

      // 1. 仅对当前选中的唯一地标绘制温润香槟金选中光托，杜绝满屏杂乱光圈！
      if (selected) {
        const ring = new PIXI.Graphics();
        ring.beginFill(0xFFE08C, 0.36).drawEllipse(0, -18, spot.size * 0.56, spot.size * 0.27).endFill();
        ring.lineStyle(3.2, 0xEC9B4E, 0.95).drawEllipse(0, -18, spot.size * 0.54, spot.size * 0.25);
        root.addChild(ring);
      }

      // 2. 独立绘制的扁平 2D 赛璐璐白金贴纸建筑精灵
      const bldgWrap = new PIXI.Container();
      const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
      sp.anchor.set(0.5, 1);
      sp.y = 14;
      if (!unlocked) {
        applyGray(sp);
        sp.alpha = 0.62;
      }
      bldgWrap.addChild(sp);
      root.addChild(bldgWrap);

      // 3. 干净克制的底座铭牌（白瓷底统一视觉，减少大面积红底色块喧宾夺主）
      const plate = this._buildBuildingNameplate(shop, unlocked, level, selected, readyNew);
      plate.position.set(0, 14);
      const halfW = (plate.width || 160) * 0.5;
      if (px - halfW < 10) plate.x = 10 - (px - halfW);
      if (px + halfW > W - 10) plate.x = (W - 10) - (px + halfW);
      root.addChild(plate);

      const lmEntry: LandmarkEntry = {
        id: shop.id,
        root,
        bldgWrap,
        bldgSprite: sp,
        plate,
        selected,
        readyNew,
        phase: idx * 0.85,
      };
      this._landmarks.push(lmEntry);

      const estDefaultH = spot.size * 0.94;
      root.hitArea = new PIXI.Rectangle(-spot.size * 0.56, -estDefaultH, spot.size * 1.12, estDefaultH + 42);

      const bPath = shopBuildingPath(shop.id);
      const fitBldg = (): void => {
        if (sp.destroyed) return;
        const tex = gameTexture(bPath);
        if (!isTextureReady(tex)) return;
        sp.texture = tex;
        const sc = spot.size / Math.max(1, tex.width);
        sp.scale.set(sc);
        const realH = tex.height * sc;
        root.hitArea = new PIXI.Rectangle(-spot.size * 0.56, -realH, spot.size * 1.12, realH + 42);
      };
      if (isTextureReady(gameTexture(bPath))) fitBldg();
      else whenTextureReady(bPath, fitBldg);

      root.eventMode = 'static';
      root.cursor = 'pointer';
      root.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        if (this._mapMoved) return;
        e.stopPropagation();
        AudioManager.play('ui_click');
        const wasSelected = this._selected === shop.id;
        this._selected = shop.id;
        if (readyNew && wasSelected) {
          this._buy(shop.id);
        } else {
          this.rebuild();
          this._focusOnShop(shop.id, true);
        }
      });

      this._landmarksLayer.addChild(root);
    });
  }

  private _buildBuildingNameplate(
    shop: ShopDef,
    unlocked: boolean,
    level: number,
    selected: boolean,
    readyNew: boolean,
  ): PIXI.Container {
    const save = GameState.save;
    const wrap = new PIXI.Container();

    const hero = heroForShop(shop.id);
    const showHero = Boolean(hero && unlocked);
    const avatarPad = showHero ? 26 : 0;

    const mainStr = !unlocked
      ? `${shop.name} · ¥${formatMoney(shop.unlockNetWorth)}`
      : readyNew
        ? `${shop.name} · 可开业`
        : `${shop.name} Lv.${level}`;

    const txtCol = !unlocked
      ? COLORS.inkMuted
      : selected || readyNew
        ? COLORS.roseDeep
        : COLORS.ink;
    const txt = makeText(mainStr, 15, txtCol, true);
    txt.anchor.set(0.5);

    const pw = Math.max(116, txt.width + 26 + avatarPad);
    const ph = 30;

    const bg = drawCreamCard(new PIXI.Graphics(), -pw / 2, -ph / 2, pw, ph, ph / 2, {
      fill: selected ? 0xFFF4E4 : 0xFFFDF9,
      alpha: unlocked ? 0.98 : 0.86,
      borderColor: selected ? COLORS.rose : (readyNew ? 0xEC9664 : 0xDFB870),
      borderWidth: selected ? 2.6 : 1.8,
    });
    wrap.addChild(bg);

    txt.position.set(avatarPad * 0.45, -0.5);
    wrap.addChild(txt);

    // 可开业建筑仅在铭牌右上角缀一枚精致小红点，画面清爽不杂乱
    if (readyNew) {
      const dot = new PIXI.Graphics()
        .lineStyle(1.8, 0xFFFFFF, 1)
        .beginFill(0xF0554D, 1)
        .drawCircle(pw / 2 - 6, -ph / 2 + 4, 5.5)
        .endFill();
      wrap.addChild(dot);
    }

    if (hero && showHero) {
      const met = effectiveBond(save, hero.id) > 0;
      const hx = -pw / 2 + 15;
      const ring = new PIXI.Graphics()
        .lineStyle(1.8, met ? COLORS.rose : 0xCDB89D, 1)
        .beginFill(0xFFF7EA, 1)
        .drawCircle(hx, 0, 13.5)
        .endFill();
      const face = new PIXI.Sprite();
      face.anchor.set(0.5);
      face.position.set(hx, 0);
      if (!met) {
        applyGray(face);
        face.alpha = 0.65;
      }
      const mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawCircle(hx, 0, 12).endFill();
      face.mask = mask;
      showFigure(face, heroPortraitPath(hero.id), 25, 25);
      wrap.addChild(ring, mask, face);
    }

    return wrap;
  }

  /** 大地图底部悬浮选中建筑操控卡（采用九宫格无损拉伸，绝不溢出右边界） */
  private _buildMapBottomDock(): void {
    for (const c of this._mapBottomDock.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const save = GameState.save;
    const shop = SHOPS.find((s) => s.id === this._selected) ?? SHOPS[0];
    const unlocked = isShopUnlocked(save, shop.id);
    const level = save.shops[shop.id] ?? 0;
    const readyNew = unlocked && level === 0;

    const dockW = W - 28;
    const dockX = 14;
    const dockY = H - Game.safeBottom - DOCK_H - 12;

    const card = new PIXI.Container();
    card.position.set(dockX, dockY);
    card.hitArea = new PIXI.Rectangle(0, 0, dockW, DOCK_H);
    card.eventMode = 'static';
    card.on('pointerdown', (e: PIXI.FederatedPointerEvent) => e.stopPropagation());

    const bgSkin = createNineSlice2x(
      {
        path: readyNew ? UI_SLICES.v8CardShopReady : UI_SLICES.v8CardShopBanner,
        pad2x: 20,
        left2x: 68,
        top2x: 68,
        right2x: 68,
        bottom2x: 68,
      },
      dockW,
      DOCK_H,
      false,
    );
    card.addChild(bgSkin);

    // 左侧：建筑微缩沙盘底座框 (164 × 140)
    const bx = 14;
    const by = 13;
    const bw = 164;
    const bh = DOCK_H - 26;
    const pedestalBg = new PIXI.Graphics()
      .lineStyle(1.6, 0xE2C38F, 0.95)
      .beginFill(0xF8EBD4, 0.95)
      .drawRoundedRect(bx, by, bw, bh, 18)
      .endFill();
    card.addChild(pedestalBg);

    const miniBldg = makeStickerSprite(shopBuildingPath(shop.id), bw - 14, bh - 10, true);
    miniBldg.position.set(bx + bw / 2, by + bh / 2 + 2);
    if (!unlocked) {
      applyGray(miniBldg);
      miniBldg.alpha = 0.65;
    }
    card.addChild(miniBldg);

    const hero = heroForShop(shop.id);
    if (hero) {
      const met = effectiveBond(save, hero.id) > 0;
      const hx = bx + 25;
      const hy = by + 25;
      const ring = new PIXI.Graphics()
        .lineStyle(2.2, met ? COLORS.rose : 0xD2BFA6, 1)
        .beginFill(0xFFFDF8, 1)
        .drawCircle(hx, hy, 19)
        .endFill();
      const face = new PIXI.Sprite();
      face.anchor.set(0.5);
      face.position.set(hx, hy);
      if (!met) {
        applyGray(face);
        face.alpha = 0.65;
      }
      const hMask = new PIXI.Graphics().beginFill(0xFFFFFF).drawCircle(hx, hy, 17).endFill();
      face.mask = hMask;
      showFigure(face, heroPortraitPath(hero.id), 35, 35);
      card.addChild(ring, hMask, face);
    }

    // 右侧：店名、招牌、秒伤与直达升级按钮
    const rx = 196;
    const rw = dockW - 20 - rx;

    const areaName = AREAS.find((a) => a.id === shop.area)?.name ?? '';
    const titleStr = level > 0 ? `${shop.name} · ${shopProductAt(shop, level)}` : `${shop.name} · ${areaName}`;
    const nameTxt = makeText(titleStr, 24, COLORS.ink, true);
    nameTxt.position.set(rx, 14);
    if (nameTxt.width > rw - 106) nameTxt.scale.set((rw - 106) / nameTxt.width);
    card.addChild(nameTxt);

    if (unlocked) {
      const lvTxt = makeText(level > 0 ? `Lv.${level}` : '待开业', 20, level > 0 ? COLORS.mint : COLORS.roseDeep, true);
      lvTxt.anchor.set(1, 0);
      lvTxt.position.set(rx + rw, 17);
      card.addChild(lvTxt);

      const count = resolveShopBuyCount(save, shop.id, save.buyMode);
      const curInc = shopIncomeIn(save, shop.id, level);
      const nextInc = shopIncomeIn(save, shop.id, level + count);
      const incStr = level > 0
        ? `+¥${formatMoney(curInc)}/秒  →  +¥${formatMoney(nextInc)}`
        : `开业秒伤  +¥${formatMoney(nextInc)}/秒`;
      const incNode = makeNumText(incStr, 22, 0xB8731E);
      incNode.position.set(rx, 46);
      if (incNode.width > rw) incNode.scale.set(rw / incNode.width);
      card.addChild(incNode);

      if (level > 0) {
        // 已开业门店：展示可点击的「镇店爆品」与「驻店店长」双槽位快捷签
        const eqKey = save.equippedRecipes?.[shop.id];
        const eqLv = eqKey ? (save.discoveredRecipes?.[eqKey] ?? 0) : 0;
        const eqRec = eqKey && eqLv > 0 ? resolveRecipe(eqKey, eqLv) : null;
        const mgrId = save.shopManagers?.[shop.id];
        const mgrDef = mgrId && (save.staff[mgrId] ?? 0) > 0 ? staffById(mgrId) : null;

        const chipGap = 8;
        const chipW = Math.floor((rw - chipGap) / 2);
        const chipH = 32;
        const chipY = 82;

        const buildSlotChip = (x: number, label: string, active: boolean, onTap?: () => void): void => {
          const ch = new PIXI.Container();
          ch.position.set(x, chipY);
          ch.addChild(drawCreamCard(new PIXI.Graphics(), 0, 0, chipW, chipH, 16, {
            fill: active ? 0xFFF4E4 : 0xFFFDF8,
            borderColor: active ? COLORS.rose : 0xDFB870,
            borderWidth: 1.6,
          }));
          const t = makeText(label, 15, active ? COLORS.roseDeep : COLORS.inkSoft, true);
          t.anchor.set(0.5);
          t.position.set(chipW / 2, chipH / 2);
          if (t.width > chipW - 16) t.scale.set((chipW - 16) / t.width);
          ch.addChild(t);
          if (onTap) {
            ch.eventMode = 'static';
            ch.cursor = 'pointer';
            ch.on('pointertap', () => {
              AudioManager.play('ui_click');
              onTap();
            });
          }
          card.addChild(ch);
        };

        buildSlotChip(rx, eqRec ? `✦ 镇店:${eqRec.name}` : '+ 挂载镇店爆品', Boolean(eqRec), () => {
          this.close(true);
          this._onOpenRecipe?.(shop.id);
        });
        buildSlotChip(rx + chipW + chipGap, mgrDef ? `✦ 店长:${mgrDef.name}` : '+ 委任驻店店长', Boolean(mgrDef), () => {
          const hasAnyStaff = STAFF.some((s) => (save.staff[s.id] ?? 0) > 0);
          if (!hasAnyStaff) {
            ToastManager.show('先去「店员」录用一位精英店员即可委任店长！');
            return;
          }
          this.close(true);
          this._onOpenManagers?.();
        });
      } else {
        const synNode = makeText(synergyShort(shop, level), 15, level >= 25 ? COLORS.mint : COLORS.inkSoft, true);
        synNode.position.set(rx, 86);
        if (synNode.width > rw) synNode.scale.set(rw / synNode.width);
        card.addChild(synNode);
      }

      const cost = shopUpgradeCostIn(save, shop.id, level, count);
      const btnLabel = level === 0
        ? `新店开业 · ¥${formatMoney(cost)}`
        : count > 1
          ? `连升+${count} · ¥${formatMoney(cost)}`
          : `一键升级 · ¥${formatMoney(cost)}`;

      const btn = new Button({
        width: rw,
        height: 48,
        variant: level === 0 ? 'rose' : 'mint',
        fontSize: 20,
        label: btnLabel,
        onTap: () => this._buy(shop.id),
      });
      btn.setEnabled(save.money >= cost);
      btn.position.set(rx + rw / 2, DOCK_H - 34);
      card.addChild(btn);
      this._mapActionBtn = btn;
    } else {
      const needTxt = makeText(`解锁门槛：身价达到 ¥${formatMoney(shop.unlockNetWorth)}`, 18, COLORS.inkSoft, true);
      needTxt.position.set(rx, 54);
      if (needTxt.width > rw) needTxt.scale.set(rw / needTxt.width);
      card.addChild(needTxt);

      const bar = new ProgressBar(rw, 22, COLORS.mint, 0xE7D7C0, 0.95);
      bar.progress = save.netWorth / Math.max(1, shop.unlockNetWorth);
      bar.position.set(rx, 92);
      card.addChild(bar);

      const progTxt = makeText(`当前 ¥${formatMoney(save.netWorth)} / ¥${formatMoney(shop.unlockNetWorth)}`, 15, COLORS.inkSoft, true);
      progTxt.position.set(rx, 122);
      card.addChild(progTxt);
    }

    this._mapBottomDock.addChild(card);
  }

  /** 次要模式：宽幅插画门头卡片列表 */
  private _buildBannerList(): void {
    for (const c of this._listScroll.content.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const listTop = this._topOverlayBottom + 12;
    const listH = H - Game.safeBottom - 16 - listTop;

    this._listScroll.position.set(0, listTop);
    this._listScroll.setViewport(W, listH);

    const cardX = Math.round((W - CARD_W) / 2);
    SHOPS.forEach((shop, idx) => {
      const card = this._buildStorefrontCard(shop);
      card.position.set(cardX, 4 + idx * (CARD_H + CARD_GAP));
      this._listScroll.content.addChild(card);
    });
    this._listScroll.setContentHeight(SHOPS.length * (CARD_H + CARD_GAP) + 24);
  }

  private _buildStorefrontCard(shop: ShopDef): PIXI.Container {
    const save = GameState.save;
    const unlocked = isShopUnlocked(save, shop.id);
    const level = save.shops[shop.id] ?? 0;
    const readyNew = unlocked && level === 0;

    const card = new PIXI.Container();
    const bgSkin = createNineSlice2x(
      {
        path: readyNew ? UI_SLICES.v8CardShopReady : UI_SLICES.v8CardShopBanner,
        pad2x: 20,
        left2x: 68,
        top2x: 68,
        right2x: 68,
        bottom2x: 68,
      },
      CARD_W,
      CARD_H,
      false,
    );
    card.addChild(bgSkin);

    const px = 12;
    const py = 12;
    const pw = 296;
    const ph = CARD_H - 24;

    const photoBg = new PIXI.Graphics().beginFill(0xEFE3CE, 1).drawRoundedRect(px, py, pw, ph, 18).endFill();
    const photoMask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRoundedRect(px, py, pw, ph, 18).endFill();
    const photo = new PIXI.Sprite();
    photo.mask = photoMask;
    if (!unlocked) {
      applyGray(photo);
      photo.alpha = 0.56;
    }

    const bannerPath = shopBannerPath(shop.id);
    const fitBanner = (): void => {
      if (photo.destroyed) return;
      const tex = gameTexture(bannerPath);
      if (!isTextureReady(tex)) return;
      photo.texture = tex;
      const fit = fitCover(tex.width, tex.height, pw, ph);
      applyFit(photo, { ...fit, x: px + fit.x, y: py + fit.y });
    };
    if (isTextureReady(gameTexture(bannerPath))) fitBanner();
    else whenTextureReady(bannerPath, fitBanner);

    const photoRim = new PIXI.Graphics()
      .lineStyle(1.8, readyNew ? 0xEA935E : 0xDFC08E, 0.92)
      .drawRoundedRect(px, py, pw, ph, 18);

    card.addChild(photoBg, photoMask, photo, photoRim);

    const hero = heroForShop(shop.id);
    if (hero) {
      const met = effectiveBond(save, hero.id) > 0;
      const hx = px + 30;
      const hy = py + 30;
      const ring = new PIXI.Graphics()
        .lineStyle(2.6, met ? 0xFFFDF8 : 0xD8C6AD, 1)
        .beginFill(0xFFF6E6, 1)
        .drawCircle(hx, hy, 24)
        .endFill();
      const face = new PIXI.Sprite();
      face.anchor.set(0.5);
      face.position.set(hx, hy);
      if (!met) {
        applyGray(face);
        face.alpha = 0.65;
      }
      const hMask = new PIXI.Graphics().beginFill(0xFFFFFF).drawCircle(hx, hy, 21.5).endFill();
      face.mask = hMask;
      showFigure(face, heroPortraitPath(hero.id), 45, 45);
      card.addChild(ring, hMask, face);
    }

    const areaName = AREAS.find((a) => a.id === shop.area)?.name ?? '';
    const tagStr = level > 0 ? `招牌 · ${shopProductAt(shop, level)}` : `${areaName}`;
    const tagTxt = makeText(tagStr, 14, 0xFFFDF8, true);
    const tagW = Math.min(pw - 20, tagTxt.width + 20);
    const tagBg = new PIXI.Graphics()
      .beginFill(0x362415, 0.72)
      .drawRoundedRect(px + 10, py + ph - 32, tagW, 24, 12)
      .endFill();
    tagTxt.anchor.set(0.5);
    tagTxt.position.set(px + 10 + tagW / 2, py + ph - 20);
    if (tagTxt.width > tagW - 14) tagTxt.scale.set((tagW - 14) / tagTxt.width);
    card.addChild(tagBg, tagTxt);

    if (!unlocked) {
      const lockIco = makeStickerSprite(ICONS.lock, 48, 48, true);
      lockIco.position.set(px + pw / 2, py + ph / 2 - 4);
      card.addChild(lockIco);
    }

    const rx = 328;
    const rw = CARD_W - 22 - rx;

    const nameTxt = makeText(shop.name, 26, COLORS.ink, true);
    nameTxt.position.set(rx, 18);
    card.addChild(nameTxt);

    if (unlocked) {
      const lvTxt = makeText(level > 0 ? `Lv.${level}` : '新店待开业', 20, level > 0 ? COLORS.mint : COLORS.roseDeep, true);
      lvTxt.anchor.set(1, 0);
      lvTxt.position.set(rx + rw, 23);
      card.addChild(lvTxt);

      const count = resolveShopBuyCount(save, shop.id, save.buyMode);
      const curInc = shopIncomeIn(save, shop.id, level);
      const nextInc = shopIncomeIn(save, shop.id, level + count);
      const displayInc = level > 0 ? curInc : nextInc;

      const incNum = makeNumText(`+¥${formatMoney(displayInc)}/秒`, 28, 0xB8731E);
      incNum.position.set(rx, 54);
      if (incNum.width > rw) incNum.scale.set(rw / incNum.width);
      card.addChild(incNum);

      const synTxt = makeText(synergyShort(shop, level), 15, level >= 25 ? COLORS.mint : COLORS.inkSoft, true);
      synTxt.position.set(rx, 92);
      if (synTxt.width > rw) synTxt.scale.set(rw / synTxt.width);
      card.addChild(synTxt);

      const cost = shopUpgradeCostIn(save, shop.id, level, count);
      const btnLabel = level === 0
        ? `新店开业 · ¥${formatMoney(cost)}`
        : count > 1
          ? `连升+${count} · ¥${formatMoney(cost)}`
          : `一键升级 · ¥${formatMoney(cost)}`;

      const btn = new Button({
        width: rw,
        height: 54,
        variant: level === 0 ? 'rose' : 'mint',
        fontSize: 20,
        label: btnLabel,
        onTap: () => {
          if (this._listScroll.dragging) return;
          this._selected = shop.id;
          this._buy(shop.id);
        },
      });
      btn.setEnabled(save.money >= cost);
      btn.position.set(rx + rw / 2, CARD_H - 39);
      card.addChild(btn);
      this._cardButtons.set(shop.id, btn);
    } else {
      const needTxt = makeText(`解锁条件：身价达 ¥${formatMoney(shop.unlockNetWorth)}`, 18, COLORS.inkSoft, true);
      needTxt.position.set(rx, 60);
      if (needTxt.width > rw) needTxt.scale.set(rw / needTxt.width);
      card.addChild(needTxt);

      const bar = new ProgressBar(rw, 22, COLORS.mint, 0xE7D7C0, 0.95);
      bar.progress = save.netWorth / Math.max(1, shop.unlockNetWorth);
      bar.position.set(rx, 98);
      card.addChild(bar);

      const progTxt = makeText(`¥${formatMoney(save.netWorth)} / ¥${formatMoney(shop.unlockNetWorth)}`, 15, COLORS.inkSoft, true);
      progTxt.position.set(rx, 130);
      card.addChild(progTxt);
    }

    return card;
  }

  private _spawnUpgradeSparkles(id: ShopId): void {
    const spot = SHOP_MAP_SPOTS[id];
    const cx = spot.nx * Game.logicWidth;
    const cy = spot.ny * this._worldH - spot.size * 0.45;
    for (let i = 0; i < 7; i++) {
      const g = new PIXI.Graphics();
      drawDiamondStar(g, 0, 0, 7 + (i % 2) * 3, i % 2 === 0 ? 0xFFE680 : 0xFFFFFF, 0.98);
      g.position.set(cx, cy);
      this._fxLayer.addChild(g);
      const ang = (Math.PI * 2 * i) / 7 - Math.PI / 2;
      const tx = cx + Math.cos(ang) * (46 + Math.random() * 24);
      const ty = cy + Math.sin(ang) * (36 + Math.random() * 20) - 24;
      TweenManager.to({
        target: g,
        props: { x: tx, y: ty, alpha: 0 },
        duration: 0.44,
        ease: Ease.easeOutQuad,
        onComplete: () => g.destroy(),
      });
    }
  }

  private _buy(id: ShopId): void {
    const r = GameState.buyShop(id, GameState.save.buyMode);
    if (!r) {
      ToastManager.show('现金还差一点点，回首页点单或稍候即可升级');
      return;
    }
    AudioManager.play(r.milestoneReached > 0 ? 'level_up' : 'coin_spend');
    if (r.milestoneReached > 0) {
      ToastManager.show(`✦ 突破 Lv.${r.milestoneReached} 质变！收益翻倍 · 玫瑰+${r.rosesGained}`, 'success');
    }
    this.rebuild();
    if (this._mode === 'map') {
      this._spawnUpgradeSparkles(id);
      const lm = this._landmarks.find((x) => x.id === id);
      if (lm) {
        const sx = lm.bldgSprite.scale.x;
        const sy = lm.bldgSprite.scale.y;
        lm.bldgSprite.scale.set(sx * 1.09, sy * 1.09);
        TweenManager.to({
          target: lm.bldgSprite.scale,
          props: { x: sx, y: sy },
          duration: 0.24,
          ease: Ease.easeOutBack,
        });
      }
    }
  }
}
