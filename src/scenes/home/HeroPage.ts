/**
 * 男主个人页：左边全身像，右边名字、羁绊进度、五段羁绊剧情、番外和投资按钮。
 * 在立绘区域左右滑动或点两侧箭头切换男主。
 */
import * as PIXI from 'pixi.js';
import { ICONS, heroFigurePath } from '@/data/art';
import { BOND_LEVELS, MAX_BOND } from '@/data/balance';
import { HEROES, heroById, type HeroDef, type HeroId } from '@/data/story';
import { shopById } from '@/data/world';
import { AudioManager } from '@/core/AudioManager';
import { Game } from '@/core/Game';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { playStory } from '@/services/StoryService';
import { bondUpgradeCost } from '@/sim/economy';
import { formatMoney } from '@/sim/format';
import { bondBlockReason, effectiveBond, isVideoAdPending, isVideoUnlocked } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { PAGE_PAD, Page } from '@/ui/Page';
import { COLORS, drawGlass, drawHearts, makeNumText, makeText } from '@/ui/theme';
import { gameTexture, showFigure } from '@/utils/assets';
import { bondVideoCondition, metCondition } from './heroInfo';

const FIG_COL = 384;
const ROW_H = 76;
const ROW_GAP = 10;
const SWIPE = 64;

export class HeroPage extends Page {
  private readonly _figure = new PIXI.Sprite();
  private readonly _stage = new PIXI.Graphics();
  private readonly _swipeZone = new PIXI.Graphics();
  private readonly _arrows = new PIXI.Container();
  private readonly _info = new PIXI.Container();
  private readonly _rows: PIXI.Container[] = [];
  private _investBtn: Button | null = null;
  private _id: HeroId = HEROES[0].id;
  private _pressX: number | null = null;
  private _pressY = 0;

  constructor(private readonly _onChanged: () => void) {
    super('男主档案');
    this._figure.anchor.set(0.5, 1);
    this._swipeZone.eventMode = 'static';
    this._swipeZone.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
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
    this._swipeZone.on('pointerup', end);
    this._swipeZone.on('pointerupoutside', end);
    this.body.addChild(this._stage, this._figure, this._swipeZone, this._arrows, this._info);
  }

  show(id: HeroId): void {
    if (this.isOpen && this._id !== id) {
      this._switchTo(id, 0);
      return;
    }
    this._id = id;
    this.open();
  }

  protected override onClose(): void {
    this._onChanged();
  }

  protected override onMoneyChanged(): void {
    const hero = heroById(this._id);
    if (!this._investBtn || !hero.shop) return;
    const save = GameState.save;
    this._investBtn.setEnabled(save.money >= bondUpgradeCost(hero.id, effectiveBond(save, hero.id)));
  }

  protected layoutBody(top: number, bottom: number): void {
    const hero = heroById(this._id);
    const met = effectiveBond(GameState.save, hero.id) > 0;
    this._layoutFigure(hero, met, top, bottom);
    this._layoutArrows(top, bottom);
    this._layoutInfo(hero, met, top, bottom);
  }

  private _step(dir: 1 | -1): void {
    const i = HEROES.findIndex((h) => h.id === this._id);
    const next = HEROES[(i + dir + HEROES.length) % HEROES.length];
    AudioManager.play('ui_click');
    this._switchTo(next.id, dir);
  }

  /** 立绘从滑动方向进场，右侧信息淡入 */
  private _switchTo(id: HeroId, dir: number): void {
    this._id = id;
    this.rebuild();
    const fx = this._figure.x;
    TweenManager.cancelTarget(this._figure);
    TweenManager.cancelTarget(this._info);
    const figAlpha = this._figure.alpha;
    this._figure.x = fx + dir * 90;
    this._figure.alpha = 0;
    TweenManager.to({ target: this._figure, props: { x: fx, alpha: figAlpha }, duration: 0.28, ease: Ease.easeOutQuad });
    this._info.alpha = 0;
    this._info.x = dir * 24;
    TweenManager.to({ target: this._info, props: { alpha: 1, x: 0 }, duration: 0.26, ease: Ease.easeOutQuad });
  }

  private _layoutFigure(hero: HeroDef, met: boolean, top: number, bottom: number): void {
    const cx = FIG_COL / 2 + 8;
    const figBottom = bottom - 8;
    const figH = bottom - top - 24;
    const g = this._stage.clear();
    const cy = top + figH * 0.45;
    for (let i = 10; i > 0; i--) {
      g.beginFill(COLORS.champagne, met ? 0.022 : 0.01).drawEllipse(cx, cy, (FIG_COL * 0.62 * i) / 10, (figH * 0.5 * i) / 10).endFill();
    }
    g.lineStyle(2, COLORS.champagne, met ? 0.55 : 0.25).drawEllipse(cx, figBottom - 4, 130, 24);
    g.lineStyle(1, COLORS.champagne, met ? 0.3 : 0.15).drawEllipse(cx, figBottom - 4, 172, 34);
    g.lineStyle(0);

    TweenManager.cancelTarget(this._figure);
    this._figure.position.set(cx, figBottom);
    this._figure.tint = met ? 0xffffff : 0x000000;
    this._figure.alpha = met ? 1 : 0.55;
    showFigure(this._figure, heroFigurePath(hero.id), FIG_COL - 20, figH);

    this._swipeZone.clear().beginFill(0x000000, 0.001).drawRect(0, top, FIG_COL + 16, bottom - top).endFill();
  }

  private _layoutArrows(top: number, bottom: number): void {
    for (const c of this._arrows.removeChildren()) c.destroy({ children: true });
    const y = top + (bottom - top) * 0.46;
    const make = (x: number, dir: 1 | -1): void => {
      const btn = new PIXI.Container();
      btn.addChild(drawGlass(new PIXI.Graphics(), -28, -28, 56, 56, 28, 0.6));
      const a = new PIXI.Graphics().lineStyle(4, COLORS.champagne);
      a.moveTo(-dir * 6, -12).lineTo(dir * 6, 0).lineTo(-dir * 6, 12);
      btn.addChild(a);
      btn.position.set(x, y);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.hitArea = new PIXI.Circle(0, 0, 44);
      btn.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        this._step(dir);
      });
      this._arrows.addChild(btn);
    };
    make(PAGE_PAD + 20, -1);
    make(FIG_COL - 4, 1);
  }

  private _layoutInfo(hero: HeroDef, met: boolean, top: number, bottom: number): void {
    for (const c of this._info.removeChildren()) c.destroy({ children: true });
    this._rows.length = 0;
    this._investBtn = null;
    const save = GameState.save;
    const bond = effectiveBond(save, hero.id);
    const x0 = FIG_COL + 8;
    const w = Game.logicWidth - PAGE_PAD - x0;
    let y = top + 4;

    const name = makeText(met ? hero.name : '？？？', 56, met ? COLORS.champagne : COLORS.textOnGlassSoft, true);
    name.style.letterSpacing = 6;
    name.position.set(x0, y);
    this._info.addChild(name);
    y += name.height + 4;

    const where = hero.shop ? shopById(hero.shop).name : '主线';
    const sub = makeText(met ? `${hero.title} · ${where}` : metCondition(hero), 22, COLORS.textOnGlassSoft);
    sub.position.set(x0, y);
    this._info.addChild(sub);
    y += 44;

    const hearts = drawHearts(new PIXI.Graphics(), bond, MAX_BOND, 15, 9);
    hearts.position.set(x0 + 15, y + 15);
    this._info.addChild(hearts);
    const stageName = bond > 0 ? BOND_LEVELS[bond - 1].stage : '未相遇';
    const stage = makeText(stageName, 22, bond > 0 ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    stage.anchor.set(0, 0.5);
    stage.position.set(x0 + hearts.width + 18, y + 15);
    this._info.addChild(stage);
    y += 48;

    if (hero.shop && bond > 0) {
      const mult = makeNumText(`门店收益 ×${BOND_LEVELS[bond - 1].incomeMult}`, 26, COLORS.champagne);
      mult.position.set(x0, y);
      this._info.addChild(mult);
      y += 44;
    }

    y += 8;
    const label = makeText('羁绊剧情', 22, COLORS.textOnGlassSoft, true);
    label.position.set(x0, y);
    this._info.addChild(label);
    this._info.addChild(new PIXI.Graphics().beginFill(COLORS.champagne, 0.3).drawRect(x0 + label.width + 14, y + 15, w - label.width - 14, 1).endFill());
    y += 42;

    hero.bondVideos.forEach((vid, i) => {
      const row = this._episodeRow(hero, vid, i, w);
      row.position.set(x0 + w / 2, y + ROW_H / 2);
      this._info.addChild(row);
      this._rows.push(row);
      y += ROW_H + ROW_GAP;
    });
    const extra = this._extraRow(hero, w);
    extra.position.set(x0 + w / 2, y + ROW_H / 2);
    this._info.addChild(extra);

    this._layoutInvest(hero, met, x0, w, bottom);
  }

  private _episodeRow(hero: HeroDef, vid: string, i: number, w: number): PIXI.Container {
    const save = GameState.save;
    const open = isVideoUnlocked(save, vid);
    const seen = save.watched.includes(vid);
    const row = new PIXI.Container();
    row.addChild(drawGlass(new PIXI.Graphics(), 0, 0, w, ROW_H, 22, open ? 0.62 : 0.38));

    const icon = new PIXI.Graphics();
    const r = 22;
    const cx = 18 + r;
    const cy = ROW_H / 2;
    if (open && !seen) {
      icon.beginFill(COLORS.champagne).drawCircle(cx, cy, r).endFill();
      icon.beginFill(COLORS.glass).drawPolygon([cx - 6, cy - 10, cx - 6, cy + 10, cx + 10, cy]).endFill();
    } else if (open) {
      icon.lineStyle(2, COLORS.champagne).drawCircle(cx, cy, r);
      icon.lineStyle(3, COLORS.champagne).moveTo(cx - 9, cy).lineTo(cx - 2, cy + 7).lineTo(cx + 10, cy - 7);
    } else {
      icon.lineStyle(1.5, COLORS.textOnGlassSoft, 0.5).drawCircle(cx, cy, r);
    }
    row.addChild(icon);
    if (!open) {
      const lock = new PIXI.Sprite();
      lock.anchor.set(0.5);
      showFigure(lock, ICONS.lock, 24, 24);
      lock.position.set(cx, cy);
      lock.alpha = 0.6;
      row.addChild(lock);
    }

    const title = makeText(`${i + 1}. ${BOND_LEVELS[i].stage}`, 25, open ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    title.position.set(cx + r + 16, 10);
    row.addChild(title);
    const hint = open ? (seen ? '已看 · 点击重温' : '新剧情') : bondVideoCondition(hero, i);
    const hintText = makeText(hint, 18, open && !seen ? COLORS.rose : COLORS.textOnGlassSoft);
    hintText.position.set(cx + r + 16, 44);
    if (hintText.width > w - cx - r - 28) hintText.scale.set((w - cx - r - 28) / hintText.width);
    row.addChild(hintText);
    if (open && !seen) row.addChild(new PIXI.Graphics().beginFill(COLORS.rose).drawCircle(w - 18, 18, 7).endFill());

    this._makeTappable(row, w, () => {
      if (!open) {
        AudioManager.play('ui_deny');
        ToastManager.show(bondVideoCondition(hero, i));
        return;
      }
      void playStory(vid).then(() => this.rebuild());
    });
    return row;
  }

  private _extraRow(hero: HeroDef, w: number): PIXI.Container {
    const save = GameState.save;
    const open = isVideoUnlocked(save, hero.extraVideo);
    const pending = isVideoAdPending(save, hero.extraVideo);
    const row = new PIXI.Container();
    const bg = drawGlass(new PIXI.Graphics(), 0, 0, w, ROW_H, 22, open || pending ? 0.7 : 0.38);
    if (open || pending) bg.lineStyle(2, COLORS.rose, 0.8).drawRoundedRect(0, 0, w, ROW_H, 22);
    row.addChild(bg);
    const title = makeText(hero.chapterBond ? '番外 · 另一个结局' : '番外 · 专属番外', 25, open || pending ? COLORS.textOnGlass : COLORS.textOnGlassSoft, true);
    title.position.set(20, 10);
    row.addChild(title);
    const hint = open ? '已解锁 · 点击观看' : pending ? '看一段广告解锁' : '羁绊满级后开放';
    const hintText = makeText(hint, 18, pending ? COLORS.champagne : COLORS.textOnGlassSoft);
    hintText.position.set(20, 44);
    row.addChild(hintText);
    if (pending) row.addChild(new PIXI.Graphics().beginFill(COLORS.rose).drawCircle(w - 18, 18, 7).endFill());
    this._makeTappable(row, w, () => {
      if (!open && !pending) {
        AudioManager.play('ui_deny');
        ToastManager.show('羁绊满级后开放');
        return;
      }
      void playStory(hero.extraVideo).then(() => this.rebuild());
    });
    return row;
  }

  private _layoutInvest(hero: HeroDef, met: boolean, x0: number, w: number, bottom: number): void {
    const save = GameState.save;
    const bond = effectiveBond(save, hero.id);
    const block = met ? bondBlockReason(save, hero.id) : metCondition(hero);
    const y = bottom - 52;
    if (hero.shop && !block) {
      const cost = bondUpgradeCost(hero.id, bond);
      const next = BOND_LEVELS[bond];
      const btn = new Button({
        width: w, height: 96, variant: 'gold', fontSize: 30,
        label: `投资 ¥ ${formatMoney(cost)}`,
        sub: `升到「${next.stage}」· 收益 ×${next.incomeMult}`,
        onTap: () => this._invest(hero),
      });
      btn.position.set(x0 + w / 2, y);
      btn.setEnabled(save.money >= cost);
      this._info.addChild(btn);
      this._investBtn = btn;
      return;
    }
    const pill = drawGlass(new PIXI.Graphics(), x0, y - 40, w, 80, 40, 0.5);
    const text = makeText(block ?? '', 24, COLORS.textOnGlassSoft, true);
    text.anchor.set(0.5);
    text.position.set(x0 + w / 2, y);
    if (text.width > w - 32) text.scale.set((w - 32) / text.width);
    this._info.addChild(pill, text);
  }

  private _invest(hero: HeroDef): void {
    if (!GameState.investBond(hero.id)) {
      ToastManager.show('钱还不够');
      return;
    }
    const bond = effectiveBond(GameState.save, hero.id);
    AudioManager.play('bond_up');
    ToastManager.show(`与${hero.name}更近了 · 解锁「${BOND_LEVELS[bond - 1].stage}」剧情`, 'success');
    this.rebuild();
    const row = this._rows[bond - 1];
    if (!row) return;
    const w = row.pivot.x * 2;
    const glow = new PIXI.Graphics().lineStyle(3, COLORS.champagne, 1).drawRoundedRect(0, 0, w, ROW_H, 22);
    glow.beginFill(COLORS.champagne, 0.18).drawRoundedRect(0, 0, w, ROW_H, 22).endFill();
    row.addChild(glow);
    TweenManager.to({ target: glow, props: { alpha: 0 }, duration: 1.1, ease: Ease.easeInQuad });
  }

  /** 按下缩一点，松手回弹；点按才触发 */
  private _makeTappable(target: PIXI.Container, w: number, onTap: () => void): void {
    target.pivot.set(w / 2, ROW_H / 2);
    target.eventMode = 'static';
    target.cursor = 'pointer';
    target.on('pointerdown', () => {
      TweenManager.cancelTarget(target.scale);
      target.scale.set(0.97);
    });
    const release = (): void => {
      TweenManager.to({ target: target.scale, props: { x: 1, y: 1 }, duration: 0.16, ease: Ease.easeOutBack });
    };
    target.on('pointerup', release);
    target.on('pointerupoutside', release);
    target.on('pointertap', () => {
      AudioManager.play('ui_click');
      onTap();
    });
  }
}
