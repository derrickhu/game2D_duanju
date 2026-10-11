/**
 * 店员页：按城区分页，每区最多 4 位，两列卡片墙不滚动。
 * 卡片上是全身立绘、星级、等级收益和录用 / 升级按钮；★3、★5 解锁小视频。
 */
import * as PIXI from 'pixi.js';
import { staffFigurePath } from '@/data/art';
import { MAX_STAR, STAFF_BALANCE } from '@/data/balance';
import { STAFF, STAFF_VIDEOS_READY, staffVideoId, type StaffDef, type StaffId } from '@/data/staff';
import { AREAS, SHOPS, shopById, type AreaId } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { OverlayManager } from '@/core/OverlayManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { VideoService } from '@/services/VideoService';
import { areaStaffMultiplier, staffIncome, staffInArea, staffStar, staffUpgradeCost } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { isStaffAvailable } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { COLORS, drawGlass, drawStars, makeNumText, makeText } from '@/ui/theme';
import { gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { HirePopup } from './HirePopup';

const TOP_H = 64;
const TAB_H = 60;
const TEAM_H = 76;
const GAP = 16;
const PAD = 24;
const INFO_H = 176;
const VIDEO_STARS = [3, 5] as const;

function shopsOf(area: AreaId): Set<string> {
  return new Set(SHOPS.filter((s) => s.area === area).map((s) => s.id));
}

function staffOf(area: AreaId): StaffDef[] {
  const shops = shopsOf(area);
  return STAFF.filter((s) => shops.has(s.shop));
}

/** 有人能录用 / 升级时，底栏入口亮红点 */
export function staffHasAffordable(): boolean {
  const save = GameState.save;
  return STAFF.some((s) => isStaffAvailable(save, s.id) && (save.staff[s.id] ?? 0) === 0 && save.money >= staffUpgradeCost(s.id, 0));
}

export class StaffSheet extends PIXI.Container {
  private readonly _bg = new PIXI.Graphics();
  private readonly _top = new PIXI.Container();
  private readonly _tabs = new PIXI.Container();
  private readonly _team = new PIXI.Container();
  private readonly _grid = new PIXI.Container();
  private readonly _money = makeText('', 24, COLORS.champagne, true);
  private readonly _popup = new HirePopup();
  private readonly _buttons = new Map<StaffId, Button>();
  private _area: AreaId = 'oldstreet';
  private _isOpen = false;

  constructor() {
    super();
    this.visible = false;
    this._bg.eventMode = 'static';
    this.addChild(this._bg, this._top, this._tabs, this._team, this._grid);
    OverlayManager.container.addChild(this);
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this.visible = true;
    this._area = this._defaultArea();
    AudioManager.play('ui_open');
    AudioManager.playBgm('romance');
    this.relayout();
    TweenManager.cancelTarget(this);
    this.alpha = 0;
    TweenManager.to({ target: this, props: { alpha: 1 }, duration: 0.22, ease: Ease.easeOutQuad });
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
      duration: 0.18,
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
    for (const [id, btn] of this._buttons) btn.setEnabled(save.money >= staffUpgradeCost(id, save.staff[id] ?? 0));
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    this._bg.clear().beginFill(COLORS.glass).drawRect(0, 0, W, H).endFill();
    for (let i = 0; i < 16; i++) {
      this._bg.beginFill(0x3a262b, 0.05).drawCircle(W / 2, H * 0.42, W * (1.1 - i * 0.06)).endFill();
    }
    this._buildTop();
    this.rebuild();
    if (this._popup.isOpen) this._popup.relayout();
  }

  /** 优先停在有人可录用的城区，否则停在最新开放的城区 */
  private _defaultArea(): AreaId {
    const save = GameState.save;
    const open = AREAS.filter((a) => staffOf(a.id).some((s) => isStaffAvailable(save, s.id)));
    const pending = open.find((a) => staffOf(a.id).some((s) => isStaffAvailable(save, s.id) && !(save.staff[s.id] ?? 0)));
    return (pending ?? open[open.length - 1] ?? AREAS[0]).id;
  }

  private _buildTop(): void {
    const W = Game.logicWidth;
    const money = this._money;
    money.parent?.removeChild(money);
    for (const c of this._top.removeChildren()) c.destroy({ children: true });
    const y = Game.safeTop + 4;
    const h = TOP_H;

    const back = new PIXI.Container();
    const backW = 156;
    back.addChild(drawGlass(new PIXI.Graphics(), 0, 0, backW, h, h / 2));
    const arrow = new PIXI.Graphics();
    arrow.lineStyle(4, COLORS.champagne).moveTo(38, h / 2 - 12).lineTo(24, h / 2).lineTo(38, h / 2 + 12);
    const backLabel = makeText('返回', 26, COLORS.textOnGlass, true);
    backLabel.anchor.set(0, 0.5);
    backLabel.position.set(54, h / 2);
    back.addChild(arrow, backLabel);
    back.position.set(PAD, y);
    back.eventMode = 'static';
    back.cursor = 'pointer';
    back.on('pointertap', () => this.close());

    const title = makeText('店员', 34, COLORS.textOnGlass, true);
    title.style.letterSpacing = 6;
    title.anchor.set(0.5);
    title.position.set(W / 2, y + h / 2);

    this._refreshMoney();
    const pillW = Math.max(168, money.width + 36);
    const pill = new PIXI.Container();
    pill.addChild(drawGlass(new PIXI.Graphics(), 0, 0, pillW, h, h / 2));
    money.anchor.set(0.5);
    money.position.set(pillW / 2, h / 2);
    pill.addChild(money);
    pill.position.set(W - PAD - pillW, y);

    this._top.addChild(back, title, pill);
  }

  private _refreshMoney(): void {
    this._money.text = `¥ ${formatMoney(GameState.save.money)}`;
  }

  private _buildTabs(): void {
    for (const c of this._tabs.removeChildren()) c.destroy({ children: true });
    const W = Game.logicWidth;
    const save = GameState.save;
    const y = Game.safeTop + 4 + TOP_H + 20;
    const w = (W - PAD * 2 - 8 * (AREAS.length - 1)) / AREAS.length;
    AREAS.forEach((area, i) => {
      const staff = staffOf(area.id);
      const open = staff.some((s) => isStaffAvailable(save, s.id));
      const selected = area.id === this._area;
      const tab = new PIXI.Container();
      const g = new PIXI.Graphics();
      if (selected) g.beginFill(COLORS.champagne).drawRoundedRect(0, 0, w, TAB_H, TAB_H / 2).endFill();
      else drawGlass(g, 0, 0, w, TAB_H, TAB_H / 2, open ? 0.6 : 0.35);
      const label = makeText(area.name, 22, selected ? COLORS.glass : open ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
      label.anchor.set(0.5);
      label.position.set(w / 2, TAB_H / 2);
      if (!open && !selected) label.alpha = 0.6;
      tab.addChild(g, label);
      const pending = staff.some((s) => isStaffAvailable(save, s.id) && !(save.staff[s.id] ?? 0) && save.money >= staffUpgradeCost(s.id, 0));
      if (pending && !selected) tab.addChild(new PIXI.Graphics().beginFill(COLORS.rose).drawCircle(w - 10, 8, 7).endFill());
      tab.position.set(PAD + i * (w + 8), y);
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
    const y = Game.safeTop + 4 + TOP_H + 20 + TAB_H + 16;
    const ids = staffInArea(this._area);
    const hired = ids.filter((id) => (save.staff[id] ?? 0) > 0).length;
    const maxed = ids.filter((id) => staffStar(save.staff[id] ?? 0) >= MAX_STAR).length;
    const mult = areaStaffMultiplier(save, this._area);
    const areaName = AREAS.find((a) => a.id === this._area)?.name ?? '';

    this._team.addChild(drawGlass(new PIXI.Graphics(), PAD, y, W - PAD * 2, TEAM_H, 24, 0.55));
    const head = makeText(`${areaName} 团建`, 24, COLORS.textOnGlass, true);
    head.position.set(PAD + 24, y + 12);
    this._team.addChild(head);

    const next = hired < ids.length
      ? `录满 ${hired}/${ids.length} → 本区门店收益 ×${STAFF_BALANCE.areaHiredMult}`
      : maxed < ids.length
        ? `全员 ★${MAX_STAR} ${maxed}/${ids.length} → 再 ×${STAFF_BALANCE.areaMaxStarMult}`
        : '团建满级';
    const tip = makeText(next, 20, COLORS.textOnGlassSoft);
    tip.position.set(PAD + 24, y + 44);
    this._team.addChild(tip);

    const multText = makeNumText(`×${mult}`, 40, mult > 1 ? COLORS.champagne : COLORS.textOnGlassSoft);
    multText.anchor.set(1, 0.5);
    multText.position.set(W - PAD - 24, y + TEAM_H / 2);
    this._team.addChild(multText);
  }

  private _buildGrid(): void {
    for (const c of this._grid.removeChildren()) c.destroy({ children: true });
    this._buttons.clear();
    const W = Game.logicWidth;
    const top = Game.safeTop + 4 + TOP_H + 20 + TAB_H + 16 + TEAM_H + 20;
    const bottom = Game.logicHeight - Game.safeBottom - 20;
    const list = staffOf(this._area);
    const rows = Math.ceil(list.length / 2);
    const cw = (W - PAD * 2 - GAP) / 2;
    const ch = Math.min(620, (bottom - top - GAP * (rows - 1)) / Math.max(rows, 2));
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

    const bg = new PIXI.Graphics();
    drawGlass(bg, 0, 0, w, h, 28, hired ? 0.62 : 0.5);
    const figH = h - INFO_H;
    for (let i = 8; i > 0; i--) bg.beginFill(COLORS.champagne, hired ? 0.03 : 0.015).drawEllipse(w / 2, figH * 0.55, (w * 0.5 * i) / 8, (figH * 0.5 * i) / 8).endFill();
    card.addChild(bg);

    const path = staffFigurePath(s.id);
    const tex = gameTexture(path);
    if (isTextureReady(tex)) {
      const fig = new PIXI.Sprite(tex);
      fig.anchor.set(0.5, 1);
      fig.scale.set(Math.min((figH - 20) / tex.height, (w - 24) / tex.width));
      fig.position.set(w / 2, figH);
      if (!available) {
        fig.tint = 0x000000;
        fig.alpha = 0.55;
      } else if (!hired) {
        fig.alpha = 0.85;
      }
      const mask = new PIXI.Graphics().beginFill(0xffffff).drawRoundedRect(2, 2, w - 4, figH, 26).endFill();
      fig.mask = mask;
      card.addChild(mask, fig);
    } else {
      whenTextureReady(path, () => { if (this._isOpen) this._buildGrid(); });
    }
    card.addChild(new PIXI.Graphics().beginFill(COLORS.glass, 0.35).drawRect(2, figH - 1, w - 4, 1).endFill());

    const stars = drawStars(new PIXI.Graphics(), star, MAX_STAR, 11, 5);
    stars.position.set(22, 26);
    card.addChild(stars);

    if (hired) this._videoChips(card, s, star, w);

    const shop = shopById(s.shop);
    const y0 = figH + 14;
    const name = makeText(available ? s.name : '？？？', 30, COLORS.textOnGlass, true);
    name.position.set(20, y0);
    card.addChild(name);
    const title = makeText(s.title, 20, COLORS.textOnGlassSoft);
    title.position.set(name.x + name.width + 10, y0 + 9);
    card.addChild(title);
    if (hired) {
      const lv = makeNumText(`Lv.${level}`, 26);
      lv.anchor.set(1, 0);
      lv.position.set(w - 20, y0 + 2);
      card.addChild(lv);
    }

    if (!available) {
      const lock = makeText(`${shop.name}开业后可招聘`, 22, COLORS.textOnGlassSoft);
      lock.position.set(20, y0 + 56);
      card.addChild(lock);
      return card;
    }

    const now = staffIncome(s.id, level);
    const after = staffIncome(s.id, level + 1);
    const detail = hired ? `每秒 +${formatMoney(now)} → +${formatMoney(after)}` : `录用后每秒 +${formatMoney(after)}`;
    const detailText = makeText(detail, 21, COLORS.champagne);
    detailText.position.set(20, y0 + 48);
    card.addChild(detailText);

    const cost = staffUpgradeCost(s.id, level);
    const btn = new Button({
      width: w - 40, height: 64, variant: 'gold', fontSize: 26,
      label: `${hired ? '升级' : '录用'}  ¥ ${formatMoney(cost)}`,
      onTap: () => this._upgrade(s.id),
    });
    btn.position.set(w / 2, h - 50);
    btn.setEnabled(save.money >= cost);
    card.addChild(btn);
    this._buttons.set(s.id, btn);
    return card;
  }

  private _videoChips(card: PIXI.Container, s: StaffDef, star: number, w: number): void {
    VIDEO_STARS.forEach((need, i) => {
      if (star < need) return;
      const vid = staffVideoId(s.id, (i + 1) as 1 | 2);
      const ready = STAFF_VIDEOS_READY.has(vid);
      const chip = new PIXI.Container();
      const label = makeText(ready ? `▶ ${i === 0 ? '日常' : '专属'}` : '视频制作中', 18, ready ? COLORS.glass : COLORS.textOnGlassSoft, true);
      label.anchor.set(0.5);
      const cw = label.width + 24;
      const g = new PIXI.Graphics();
      if (ready) g.beginFill(COLORS.champagne).drawRoundedRect(-cw / 2, -17, cw, 34, 17).endFill();
      else drawGlass(g, -cw / 2, -17, cw, 34, 17, 0.7);
      chip.addChild(g, label);
      chip.position.set(w - 20 - cw / 2, 28 + i * 42);
      chip.eventMode = 'static';
      chip.cursor = 'pointer';
      chip.on('pointertap', () => {
        if (!ready) {
          ToastManager.show(`${s.name}的小视频正在拍摄，敬请期待`);
          return;
        }
        AudioManager.play('ui_click');
        void VideoService.play(vid, GameState.save.watched.includes(vid)).then((r) => {
          if (r !== 'error') GameState.markWatched(vid);
        });
      });
      card.addChild(chip);
    });
  }

  private _upgrade(id: StaffId): void {
    const r = GameState.upgradeStaff(id);
    if (!r) {
      ToastManager.show('钱还不够');
      return;
    }
    this.rebuild();
    if (r.hired) this._popup.show(id, 0);
    else if (r.newStar) this._popup.show(id, r.newStar);
    else AudioManager.play('upgrade');
  }
}
