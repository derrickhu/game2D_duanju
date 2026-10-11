/**
 * 产业页：全屏等距城市地图，每家店一个定位标签，点选后底部卡片显示收益和开店 / 升级。
 * 和 Sheet 一样挂在 OverlayManager 上，接口（open / close / rebuild / refreshAffordable）保持一致。
 */
import * as PIXI from 'pixi.js';
import { CITY_MAP, ICONS, SHOP_MAP_POS, heroPortraitPath } from '@/data/art';
import { heroForShop } from '@/data/story';
import { AREAS, SHOPS, type ShopDef, type ShopId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { shopIncome, shopUpgradeCost } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { effectiveBond, isShopUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { COLORS, drawGlass, makeNumText, makeText } from '@/ui/theme';
import { gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';

const PIN_R = 34;
const CARD_H = 248;
const TOP_H = 88;

export class ShopMap extends PIXI.Container {
  private readonly _bg = new PIXI.Graphics();
  private readonly _map = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _shade = new PIXI.Graphics();
  private readonly _pins = new PIXI.Container();
  private readonly _top = new PIXI.Container();
  private readonly _card = new PIXI.Container();
  private readonly _money = makeText('', 24, COLORS.champagne, true);
  private _selected: ShopId = 'stall';
  private _isOpen = false;
  private _actionBtn: Button | null = null;

  constructor() {
    super();
    this.visible = false;
    this._bg.eventMode = 'static';
    this.addChild(this._bg, this._map, this._shade, this._pins, this._top, this._card);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this.visible = true;
    this._selected = this._defaultSelection();
    AudioManager.play('ui_open');
    this._map.texture = gameTexture(CITY_MAP);
    whenTextureReady(CITY_MAP, () => { if (this._isOpen) this.relayout(); });
    this.relayout();
    TweenManager.cancelTarget(this);
    this.alpha = 0;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.22, ease: Ease.easeOutQuad });
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (silent) {
      this.visible = false;
      return;
    }
    AudioManager.play('ui_close');
    TweenManager.to({
      target: this,
      props: { alpha: 0 },
      duration: 0.18,
      ease: Ease.easeInQuad,
      onComplete: () => { this.visible = false; this.alpha = 1; },
    });
  }

  rebuild(): void {
    if (!this._isOpen) return;
    this._buildPins();
    this._buildCard();
    this._refreshMoney();
  }

  /** 钱变化时只刷新顶栏和按钮可用状态 */
  refreshAffordable(): void {
    if (!this._isOpen) return;
    this._refreshMoney();
    const save = GameState.save;
    const level = save.shops[this._selected] ?? 0;
    this._actionBtn?.setEnabled(save.money >= shopUpgradeCost(this._selected, level));
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._bg.clear().beginFill(COLORS.glass).drawRect(0, 0, W, H).endFill();
    const tex = this._map.texture;
    if (isTextureReady(tex)) {
      // 底边对齐信息卡上沿附近，老街两家店才不会压在卡片下；多出来的高度从天空那侧裁
      const visibleH = this._cardTop() + 60;
      const scale = Math.max(W / tex.width, visibleH / tex.height);
      this._map.scale.set(scale);
      this._map.position.set((W - tex.width * scale) / 2, visibleH - tex.height * scale);
    }
    this._shade.clear();
    const fadeTop = Game.safeTop + TOP_H + 40;
    for (let i = 0; i < 12; i++) {
      this._shade.beginFill(COLORS.glass, 0.5 * (1 - i / 12)).drawRect(0, (fadeTop * i) / 12, W, fadeTop / 12).endFill();
    }
    this._buildTop();
    this.rebuild();
  }

  private _cardTop(): number {
    return Game.logicHeight - Game.safeBottom - CARD_H - 20;
  }

  private _defaultSelection(): ShopId {
    const save = GameState.save;
    const open = SHOPS.filter((s) => isShopUnlocked(save, s.id));
    const affordable = open.filter((s) => save.money >= shopUpgradeCost(s.id, save.shops[s.id] ?? 0));
    return (affordable[affordable.length - 1] ?? open[open.length - 1] ?? SHOPS[0]).id;
  }

  /** 地图原图上的归一化坐标 → 逻辑坐标 */
  private _mapPoint(id: ShopId): PIXI.Point {
    const [nx, ny] = SHOP_MAP_POS[id];
    const tex = this._map.texture;
    if (!isTextureReady(tex)) return new PIXI.Point(nx * Game.logicWidth, ny * Game.logicHeight);
    return new PIXI.Point(this._map.x + nx * tex.width * this._map.scale.x, this._map.y + ny * tex.height * this._map.scale.y);
  }

  /** 圆标中心；横向夹在屏幕内，避免地图左右被裁时圆标出界 */
  private _pinPoint(id: ShopId): PIXI.Point {
    const p = this._mapPoint(id);
    const m = PIN_R + 14;
    p.x = Math.max(m, Math.min(Game.logicWidth - m, p.x));
    return p;
  }

  private _buildTop(): void {
    const W = Game.logicWidth;
    for (const c of this._top.removeChildren()) c.destroy({ children: true });
    const y = Game.safeTop - 6;
    const bar = drawGlass(new PIXI.Graphics(), 24, y, W - 48, TOP_H, TOP_H / 2);
    const back = new PIXI.Container();
    const arrow = new PIXI.Graphics();
    arrow.lineStyle(4, COLORS.champagne, 1).moveTo(10, -16).lineTo(-6, 0).lineTo(10, 16);
    back.addChild(arrow);
    back.position.set(72, y + TOP_H / 2);
    back.hitArea = new PIXI.Rectangle(-40, -40, 100, 80);
    back.eventMode = 'static';
    back.cursor = 'pointer';
    back.on('pointertap', () => this.close());
    const title = makeText('产业', 32, COLORS.textOnGlass, true);
    title.anchor.set(0.5);
    title.position.set(W / 2, y + TOP_H / 2);
    this._money.anchor.set(1, 0.5);
    this._money.position.set(W - 56, y + TOP_H / 2);
    this._top.addChild(bar, back, title, this._money);
  }

  private _refreshMoney(): void {
    this._money.text = `¥ ${formatMoney(GameState.save.money)}   每秒 +${formatMoney(GameState.incomePerSec)}`;
  }

  private _buildPins(): void {
    for (const c of this._pins.removeChildren()) c.destroy({ children: true });
    const save = GameState.save;
    const shops = [...SHOPS].sort((a, b) => SHOP_MAP_POS[a.id][1] - SHOP_MAP_POS[b.id][1]);
    for (const shop of shops) {
      const pin = this._pin(shop, isShopUnlocked(save, shop.id), save.shops[shop.id] ?? 0);
      pin.position.copyFrom(this._pinPoint(shop.id));
      this._pins.addChild(pin);
    }
  }

  private _pin(shop: ShopDef, unlocked: boolean, level: number): PIXI.Container {
    const W = Game.logicWidth;
    const selected = shop.id === this._selected;
    const pin = new PIXI.Container();
    const g = new PIXI.Graphics();
    if (selected) g.beginFill(COLORS.champagne, 0.22).drawCircle(0, 0, PIN_R + 14).endFill();
    g.lineStyle(selected ? 4 : 2.5, unlocked ? COLORS.champagne : COLORS.textOnGlassSoft, unlocked ? 1 : 0.5);
    g.beginFill(COLORS.glass, unlocked ? 0.72 : 0.55).drawCircle(0, 0, PIN_R).endFill();
    pin.addChild(g);

    const iconPath = unlocked ? ICONS.shop : ICONS.lock;
    const icon = new PIXI.Sprite(gameTexture(iconPath));
    icon.anchor.set(0.5);
    icon.alpha = unlocked ? 1 : 0.55;
    const fit = (): void => { if (icon.texture.width > 1) icon.scale.set((PIN_R * 1.15) / icon.texture.width); };
    fit();
    whenTextureReady(iconPath, fit);
    pin.addChild(icon);

    const text = unlocked ? (level > 0 ? `${shop.name}  Lv.${level}` : `${shop.name} · 可开店`) : shop.name;
    const label = makeText(text, 20, unlocked ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    label.anchor.set(0.5);
    const tagW = label.width + 28;
    const tagY = PIN_R + 26;
    const tag = drawGlass(new PIXI.Graphics(), -tagW / 2, tagY - 18, tagW, 36, 18, unlocked ? 0.62 : 0.45);
    label.position.set(0, tagY);
    pin.addChild(tag, label);

    const px = this._pinPoint(shop.id).x;
    const overflowL = px - tagW / 2 - 12;
    const overflowR = W - 12 - (px + tagW / 2);
    const shift = overflowL < 0 ? -overflowL : overflowR < 0 ? overflowR : 0;
    tag.x = shift;
    label.x = shift;

    if (selected) pin.scale.set(1.12);
    const hitHalf = Math.max(PIN_R + 10, tagW / 2);
    pin.hitArea = new PIXI.Rectangle(-hitHalf, -PIN_R - 10, hitHalf * 2, tagY + 28 + PIN_R + 10);
    pin.eventMode = 'static';
    pin.cursor = 'pointer';
    pin.on('pointertap', () => {
      if (this._selected === shop.id) return;
      AudioManager.play('ui_click');
      this._selected = shop.id;
      this.rebuild();
    });
    return pin;
  }

  private _buildCard(): void {
    for (const c of this._card.removeChildren()) c.destroy({ children: true });
    this._actionBtn = null;
    const W = Game.logicWidth;
    const save = GameState.save;
    const shop = SHOPS.find((s) => s.id === this._selected) ?? SHOPS[0];
    const unlocked = isShopUnlocked(save, shop.id);
    const level = save.shops[shop.id] ?? 0;
    const hero = heroForShop(shop.id);
    const bond = hero ? effectiveBond(save, hero.id) : 0;
    const area = AREAS.find((a) => a.id === shop.area);

    const x = 24;
    const y = this._cardTop();
    const w = W - 48;
    this._card.addChild(drawGlass(new PIXI.Graphics(), x, y, w, CARD_H, 32, 0.66));
    this._card.eventMode = 'static';

    const name = makeText(shop.name, 34, COLORS.textOnGlass, true);
    name.position.set(x + 32, y + 28);
    this._card.addChild(name);
    if (level > 0) {
      const lv = makeNumText(`Lv.${level}`, 30);
      lv.position.set(name.x + name.width + 14, y + 30);
      this._card.addChild(lv);
    }
    const areaText = makeText(area ? area.name : '', 20, COLORS.textOnGlassSoft);
    areaText.position.set(x + 32, y + 78);
    this._card.addChild(areaText);

    let detail: string;
    if (!unlocked) detail = `身价达到 ${formatMoney(shop.unlockNetWorth)} 解锁`;
    else if (level === 0) detail = `开店后每秒 +${formatMoney(shopIncome(shop.id, 1, bond))}`;
    else detail = `每秒 +${formatMoney(shopIncome(shop.id, level, bond))}  →  +${formatMoney(shopIncome(shop.id, level + 1, bond))}`;
    const detailText = makeText(detail, 24, unlocked ? COLORS.champagne : COLORS.textOnGlassSoft);
    detailText.position.set(x + 32, y + 116);
    this._card.addChild(detailText);

    if (hero) {
      const met = bond > 0;
      const cx = x + w - 84;
      const cy = y + 72;
      const ring = new PIXI.Graphics();
      ring.lineStyle(2.5, COLORS.champagne, met ? 1 : 0.4).beginFill(COLORS.glass, 0.8).drawCircle(cx, cy, 44).endFill();
      this._card.addChild(ring);
      if (met) {
        const path = heroPortraitPath(hero.id);
        const tex = gameTexture(path);
        if (isTextureReady(tex)) {
          const face = new PIXI.Sprite(tex);
          face.anchor.set(0.5, 0.3);
          face.scale.set(92 / Math.min(tex.width, tex.height));
          face.position.set(cx, cy);
          const mask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(cx, cy, 42).endFill();
          face.mask = mask;
          this._card.addChild(mask, face);
        } else {
          whenTextureReady(path, () => { if (this._isOpen) this._buildCard(); });
        }
      } else {
        const q = makeText('？', 40, COLORS.textOnGlassSoft, true);
        q.anchor.set(0.5);
        q.position.set(cx, cy);
        this._card.addChild(q);
      }
      const heroName = makeText(met ? hero.name : '在这里相遇', 20, met ? COLORS.textOnGlass : COLORS.textOnGlassSoft);
      heroName.anchor.set(0.5, 0);
      heroName.position.set(cx, cy + 52);
      this._card.addChild(heroName);
    }

    if (unlocked) {
      const cost = shopUpgradeCost(shop.id, level);
      const btn = new Button({
        width: w - 64, height: 72, variant: 'gold', fontSize: 28,
        label: `${level === 0 ? '开店' : '升级'}  ¥ ${formatMoney(cost)}`,
        onTap: () => this._buy(shop.id),
      });
      btn.position.set(x + w / 2, y + CARD_H - 56);
      btn.setEnabled(save.money >= cost);
      this._card.addChild(btn);
      this._actionBtn = btn;
    }
  }

  private _buy(id: ShopId): void {
    const r = GameState.buyShop(id, 1);
    if (!r) {
      ToastManager.show('钱还不够');
      return;
    }
    AudioManager.play('coin_spend');
    this.rebuild();
  }
}
