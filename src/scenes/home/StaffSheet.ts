/**
 * 店员页（v7 高定双金线雕花卡 + 珠光顶栏货币胶囊 + 零 Emoji 精修版）：
 * - 顶栏统一采用珠光暖白双货币胶囊 (`buildLightCurrencyPill`)，告别单薄文字块；
 * - 城区切换采用丝缎胶囊，团建面板与店员卡全部升级为 @2x 双金线柔光雕花牌 (`v7_card_couture_plaque`)；
 * - ★3 解锁「日常拍立得」，★5 解锁「专属私藏」，字号加大、彻底移除廉价系统 Emoji！
 */
import * as PIXI from 'pixi.js';
import { ICONS, UI_SLICES, staffFigurePath } from '@/data/art';
import { MAX_STAR, STAFF_BALANCE } from '@/data/balance';
import { STAFF, type StaffDef, type StaffId } from '@/data/staff';
import { AREAS, SHOPS, shopById, type AreaId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import {
  areaStaffMultiplier, resolveStaffBuyCount, staffIncomeIn,
  staffInArea, staffStar, staffUpgradeCost, staffUpgradeCostN,
} from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { isStaffAvailable } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { BuyModeBar } from '@/ui/BuyModeBar';
import { buildLightCurrencyPill, makeBackButton, PAGE_PAD } from '@/ui/Page';
import {
  COLORS,
  createNineSlice2x,
  drawLuxuryPageBg,
  drawStars,
  makeCouturePlaque,
  makeNumText,
  makeStickerSprite,
  makeText,
} from '@/ui/theme';
import { applyGray, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { HirePopup } from './HirePopup';
import { StaffPolaroidModal } from './StaffPolaroidModal';

const TOP_H = 58;
const TAB_H = 48;
const TEAM_H = 84;
const GAP = 16;
const PAD = PAGE_PAD;
const INFO_H = 180;
const CARD_STARS = [3, 5] as const;

function shopsOf(area: AreaId): Set<string> {
  return new Set(SHOPS.filter((s) => s.area === area).map((s) => s.id));
}

function staffOf(area: AreaId): StaffDef[] {
  const shops = shopsOf(area);
  return STAFF.filter((s) => shops.has(s.shop));
}

/** 有人能新录用时，底栏入口亮红点 */
export function staffHasAffordable(): boolean {
  const save = GameState.save;
  return STAFF.some((s) => isStaffAvailable(save, s.id) && (save.staff[s.id] ?? 0) === 0 && save.money >= staffUpgradeCost(s.id, 0));
}

export class StaffSheet extends PIXI.Container {
  private readonly _bgLayer = new PIXI.Container();
  private readonly _top = new PIXI.Container();
  private readonly _tabs = new PIXI.Container();
  private readonly _team = new PIXI.Container();
  private readonly _grid = new PIXI.Container();
  private readonly _moneyWrap = new PIXI.Container();
  private readonly _roseTxt = makeNumText('0', 20, COLORS.ink);
  private readonly _moneyTxt = makeNumText('0', 20, COLORS.ink);
  private readonly _popup = new HirePopup();
  private readonly _buttons = new Map<StaffId, Button>();
  private _area: AreaId = 'oldstreet';
  private _isOpen = false;

  constructor() {
    super();
    this.visible = false;
    this._bgLayer.eventMode = 'static';
    this.addChild(this._bgLayer, this._top, this._tabs, this._team, this._grid);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this.visible = true;
    OverlayManager.bringToFront();
    this._area = this._defaultArea();
    AudioManager.play('ui_open');
    AudioManager.playBgm('romance');
    this.relayout();
    TweenManager.cancelTarget(this);
    this.alpha = 0;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.2, ease: Ease.easeOutQuad });
  }

  close(silent = false): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._popup.close(true);
    AudioManager.playBgm('home');
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

  rebuild(): void {
    if (!this._isOpen) return;
    this._buildTabs();
    this._buildTeam();
    this._buildGrid();
    this._refreshMoney();
  }

  refreshAffordable(): void {
    if (!this._isOpen) return;
    this._refreshMoney();
    const save = GameState.save;
    for (const [id, btn] of this._buttons) {
      const lv = save.staff[id] ?? 0;
      const count = resolveStaffBuyCount(save, id, save.buyMode);
      btn.setEnabled(save.money >= staffUpgradeCostN(id, lv, count));
    }
  }

  relayout(): void {
    drawLuxuryPageBg(this._bgLayer, Game.logicWidth, Game.logicHeight, false);
    this._buildTop();
    this.rebuild();
    if (this._popup.isOpen) this._popup.relayout();
  }

  private _defaultArea(): AreaId {
    const save = GameState.save;
    const open = AREAS.filter((a) => staffOf(a.id).some((s) => isStaffAvailable(save, s.id)));
    const pending = open.find((a) => staffOf(a.id).some((s) => isStaffAvailable(save, s.id) && !(save.staff[s.id] ?? 0)));
    return (pending ?? open[open.length - 1] ?? AREAS[0]).id;
  }

  private get _headerTopY(): number {
    return Game.safeTop > 24 ? Game.safeTop + 42 : Math.max(16, Game.safeTop + 10);
  }

  private _buildTop(): void {
    this._roseTxt.parent?.removeChild(this._roseTxt);
    this._moneyTxt.parent?.removeChild(this._moneyTxt);
    for (const c of this._moneyWrap.removeChildren()) c.destroy({ children: true });
    this._moneyWrap.parent?.removeChild(this._moneyWrap);
    for (const c of this._top.removeChildren()) c.destroy({ children: true });
    const y = this._headerTopY;

    const back = makeBackButton(() => this.close(), '返回');
    back.position.set(PAD, y);

    const title = makeText('精英店员', 31, COLORS.ink, true);
    title.style.letterSpacing = 2;
    title.style.dropShadow = true;
    title.style.dropShadowColor = 0xFFFFFF;
    title.style.dropShadowAlpha = 0.92;
    title.style.dropShadowBlur = 0;
    title.style.dropShadowDistance = 1.5;
    title.style.dropShadowAngle = Math.PI / 2;
    title.anchor.set(0.5);
    title.position.set(264, y + TOP_H / 2);

    const rosePill = buildLightCurrencyPill(ICONS.currencyRose, this._roseTxt, 128);
    const cashPill = buildLightCurrencyPill(ICONS.coins, this._moneyTxt, 156);
    rosePill.position.set(0, 0);
    cashPill.position.set(136, 0);
    this._moneyWrap.addChild(rosePill, cashPill);
    this._moneyWrap.position.set(Game.logicWidth - PAD - 292, y + (TOP_H - 44) / 2);

    const sep = new PIXI.Graphics()
      .lineStyle(1.4, 0xEAD7B9, 0.9)
      .moveTo(PAD, y + TOP_H + 8)
      .lineTo(Game.logicWidth - PAD, y + TOP_H + 8);

    this._top.addChild(back, title, this._moneyWrap, sep);
    this._refreshMoney();
  }

  private _refreshMoney(): void {
    const save = GameState.save;
    this._roseTxt.text = String(save.roses);
    this._moneyTxt.text = formatMoney(save.money);
    this._roseTxt.scale.set(1);
    this._moneyTxt.scale.set(1);
    if (this._moneyTxt.width > 74) this._moneyTxt.scale.set(74 / this._moneyTxt.width);
  }

  private _buildTabs(): void {
    for (const c of this._tabs.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;
    const y = this._headerTopY + TOP_H + 16;
    const w = (W - PAD * 2 - 10 * (AREAS.length - 1)) / AREAS.length;
    AREAS.forEach((area, i) => {
      const staff = staffOf(area.id);
      const open = staff.some((s) => isStaffAvailable(save, s.id));
      const selected = area.id === this._area;
      const tab = new PIXI.Container();

      const spec = selected
        ? { path: UI_SLICES.btnSmCoral, pad2x: 20, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 }
        : open
          ? { path: UI_SLICES.btnMdCream, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 }
          : { path: UI_SLICES.btnMdDisabled, pad2x: 12, left2x: 102, top2x: 70, right2x: 102, bottom2x: 70 };
      tab.addChild(createNineSlice2x(spec, w, TAB_H, false));

      const label = makeText(area.name, 19, selected ? COLORS.white : open ? COLORS.ink : COLORS.inkMuted, true);
      if (selected) {
        label.style.stroke = 0x8C322B;
        label.style.strokeThickness = 3.2;
        label.style.lineJoin = 'round';
      }
      label.anchor.set(0.5);
      label.position.set(w / 2, TAB_H / 2 - 0.5);
      tab.addChild(label);

      const pending = staff.some((s) => isStaffAvailable(save, s.id) && !(save.staff[s.id] ?? 0) && save.money >= staffUpgradeCost(s.id, 0));
      if (pending && !selected) {
        tab.addChild(new PIXI.Graphics().lineStyle(2, 0xFFFFFF).beginFill(0xF0554D).drawCircle(w - 12, 10, 6).endFill());
      }
      tab.position.set(PAD + i * (w + 10), y);
      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.on('pointertap', () => {
        if (this._area === area.id) return;
        AudioManager.play('ui_click');
        this._area = area.id;
        this.rebuild();
      });
      this._tabs.addChild(tab);
    });
  }

  private _buildTeam(): void {
    for (const c of this._team.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;
    const y = this._headerTopY + TOP_H + 16 + TAB_H + 14;
    const ids = staffInArea(this._area);
    const hired = ids.filter((id) => (save.staff[id] ?? 0) > 0).length;
    const maxed = ids.filter((id) => staffStar(save.staff[id] ?? 0) >= MAX_STAR).length;
    const mult = areaStaffMultiplier(save, this._area);
    const areaName = AREAS.find((a) => a.id === this._area)?.name ?? '';

    const plaque = makeCouturePlaque(W - PAD * 2, TEAM_H, mult > 1, false);
    plaque.position.set(PAD, y);
    this._team.addChild(plaque);

    const ico = makeStickerSprite(ICONS.staff, 52, 52, true);
    ico.position.set(PAD + 40, y + TEAM_H / 2);
    this._team.addChild(ico);

    const head = makeText(`${areaName}团建  ×${mult.toFixed(mult % 1 ? 1 : 0)}`, 23, COLORS.ink, true);
    head.position.set(PAD + 76, y + 14);
    this._team.addChild(head);

    const next = hired < ids.length
      ? `录满 ${hired}/${ids.length} → 本区收益 ×${STAFF_BALANCE.areaHiredMult}`
      : maxed < ids.length
        ? `全员 ★${MAX_STAR} (${maxed}/${ids.length}) → 再 ×${STAFF_BALANCE.areaMaxStarMult}`
        : '✦ 本区团建已登顶满级！';
    const tip = makeText(next, 17, COLORS.inkSoft, true);
    tip.position.set(PAD + 76, y + 48);
    if (tip.width > W - PAD * 2 - 310) tip.scale.set((W - PAD * 2 - 310) / tip.width);
    this._team.addChild(tip);

    const buyBar = new BuyModeBar(206, 40, () => this.rebuild());
    buyBar.position.set(W - PAD - 224, y + (TEAM_H - 40) / 2);
    this._team.addChild(buyBar);
  }

  private _buildGrid(): void {
    for (const c of this._grid.removeChildren()) c.destroy({ children: true });
    this._buttons.clear();
    const W = Game.logicWidth;
    const top = this._headerTopY + TOP_H + 16 + TAB_H + 14 + TEAM_H + 16;
    const bottom = Game.logicHeight - Game.safeBottom - 16;
    const list = staffOf(this._area);
    const rows = Math.ceil(list.length / 2);
    const cw = (W - PAD * 2 - GAP) / 2;
    const ch = Math.min(600, (bottom - top - GAP * (rows - 1)) / Math.max(rows, 2));
    list.forEach((s, i) => {
      const card = this._card(s, cw, ch);
      card.position.set(PAD + (i % 2) * (cw + GAP), top + Math.floor(i / 2) * (ch + GAP));
      this._grid.addChild(card);
    });
  }

  private _card(s: StaffDef, w: number, h: number): PIXI.Container {
    const save = GameState.save;
    const level = save.staff[s.id] ?? 0;
    const hired = level > 0;
    const available = isStaffAvailable(save, s.id);
    const star = staffStar(level);
    const card = new PIXI.Container();

    card.addChild(makeCouturePlaque(w, h, available && !hired, false));

    const figH = h - INFO_H;
    const stageBg = new PIXI.Graphics()
      .lineStyle(1.2, 0xEAD6B8, 0.85)
      .beginFill(hired ? 0xFFF7EE : available ? 0xFFF3EB : 0xEFE7DC, 0.88)
      .drawRoundedRect(12, 12, w - 24, figH - 12, 20)
      .endFill();
    card.addChild(stageBg);

    const path = staffFigurePath(s.id);
    const tex = gameTexture(path);
    if (isTextureReady(tex)) {
      const fig = new PIXI.Sprite(tex);
      fig.anchor.set(0.5, 1);
      fig.scale.set(Math.min((figH - 18) / tex.height, (w - 28) / tex.width));
      fig.position.set(w / 2, figH);
      if (!available) {
        applyGray(fig);
        fig.alpha = 0.48;
      } else if (!hired) {
        fig.alpha = 0.9;
      }
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(12, 12, w - 24, figH - 12, 20).endFill();
      fig.mask = mask;
      card.addChild(mask, fig);
    } else {
      whenTextureReady(path, () => { if (this._isOpen) this._buildGrid(); });
    }

    const stars = drawStars(new PIXI.Graphics(), star, MAX_STAR, 10.5, 5);
    stars.position.set(26, 28);
    card.addChild(stars);

    if (hired) this._polaroidChips(card, s, star, w);

    const shop = shopById(s.shop);
    const y0 = figH + 10;
    const name = makeText(available ? s.name : '？？？', 27, COLORS.ink, true);
    name.position.set(20, y0);
    card.addChild(name);

    const title = makeText(s.title, 18, COLORS.inkSoft, true);
    title.position.set(name.x + name.width + 8, y0 + 7);
    if (title.x + title.width > w - 88) title.scale.set(Math.max(0.75, (w - 88 - title.x) / title.width));
    card.addChild(title);

    if (hired) {
      const lv = makeNumText(`Lv.${level}`, 23, COLORS.roseDeep);
      lv.anchor.set(1, 0);
      lv.position.set(w - 20, y0 + 3);
      card.addChild(lv);
    }

    if (!available) {
      const lockIco = makeStickerSprite(ICONS.lock, 30, 30, true);
      lockIco.position.set(34, y0 + 66);
      const lock = makeText(`${shop.name}开业后招聘`, 19, COLORS.inkSoft, true);
      lock.position.set(54, y0 + 53);
      if (lock.width > w - 72) lock.scale.set((w - 72) / lock.width);
      card.addChild(lockIco, lock);
      return card;
    }

    const count = resolveStaffBuyCount(save, s.id, save.buyMode);
    const nowInc = staffIncomeIn(save, s.id, level);
    const afterInc = staffIncomeIn(save, s.id, level + count);
    const detail = hired ? `+¥${formatMoney(nowInc)} → +¥${formatMoney(afterInc)}/s` : `录用每秒 +¥${formatMoney(afterInc)}`;
    const detailText = makeText(detail, 19, COLORS.goldDeep, true);
    if (detailText.width > w - 40) detailText.scale.set((w - 40) / detailText.width);
    detailText.position.set(20, y0 + 46);
    card.addChild(detailText);

    const cost = staffUpgradeCostN(s.id, level, count);
    const btnLabel = !hired ? '录用 玫瑰+1' : count > 1 ? `升+${count}级` : '升级';
    const btn = new Button({
      width: w - 36,
      height: 60,
      variant: !hired ? 'rose' : 'gold',
      fontSize: 21,
      label: `${btnLabel}  ¥${formatMoney(cost)}`,
      onTap: () => this._upgrade(s.id),
    });
    btn.position.set(w / 2, h - 46);
    btn.setEnabled(save.money >= cost);
    card.addChild(btn);
    this._buttons.set(s.id, btn);
    return card;
  }

  /** ★3 解锁日常拍立得，★5 解锁专属私藏卡面 */
  private _polaroidChips(card: PIXI.Container, s: StaffDef, star: number, w: number): void {
    CARD_STARS.forEach((need, i) => {
      const slot = (i + 1) as 1 | 2;
      const open = star >= need;
      const seen = GameState.save.watched.includes(`staff_${s.id}_${slot}`);
      const chip = new PIXI.Container();
      const textStr = open ? (slot === 1 ? '✦ 日常' : '♥ 私藏') : `★${need}卡面`;
      const label = makeText(textStr, 15, open ? (slot === 1 ? COLORS.ink : COLORS.white) : COLORS.inkSoft, true);
      label.anchor.set(0.5);
      const cw = label.width + 24;

      if (open) {
        const spec = slot === 1
          ? { path: UI_SLICES.btnSmGold, pad2x: 12, left2x: 92, top2x: 70, right2x: 92, bottom2x: 70 }
          : { path: UI_SLICES.btnSmCoral, pad2x: 12, left2x: 88, top2x: 68, right2x: 88, bottom2x: 68 };
        chip.addChild(createNineSlice2x(spec, cw, 30, true));
      } else {
        const g = new PIXI.Graphics()
          .lineStyle(1.3, COLORS.borderGold)
          .beginFill(0xFFFDF8, 0.94)
          .drawRoundedRect(-cw / 2, -15, cw, 30, 15)
          .endFill();
        chip.addChild(g);
      }

      chip.addChild(label);
      if (open && !seen) {
        chip.addChild(new PIXI.Graphics().lineStyle(1.5, 0xFFFFFF).beginFill(0xF0554D).drawCircle(cw / 2 - 4, -12, 5.5).endFill());
      }
      chip.position.set(w - 18 - cw / 2, 28 + i * 38);
      chip.eventMode = 'static';
      chip.cursor = 'pointer';
      chip.on('pointertap', () => {
        if (!open) {
          ToastManager.show(`${s.name}升至 ★${need}（Lv.${need === 3 ? 25 : 100}）解锁拍立得卡面`);
          return;
        }
        StaffPolaroidModal.show(s.id, slot);
        this.rebuild();
      });
      card.addChild(chip);
    });
  }

  private _upgrade(id: StaffId): void {
    const r = GameState.upgradeStaff(id, GameState.save.buyMode);
    if (!r) {
      ToastManager.show('现金还不够');
      return;
    }
    this.rebuild();
    if (r.hired) this._popup.show(id, 0);
    else if (r.newStar) this._popup.show(id, r.newStar);
    else AudioManager.play('upgrade');
  }
}
