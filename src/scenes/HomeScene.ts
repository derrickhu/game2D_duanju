/**
 * 主界面：顶部身价 / 钱 / 每秒收益，中间是当前造型的女主立绘（点她赚钱），
 * 背景随造型切换，两侧广告加速，底部四个面板入口。布局按 750 设计宽。
 */
import * as PIXI from 'pixi.js';
import { outfitFigurePath, outfitScenePath } from '@/data/art';
import { BALANCE } from '@/data/balance';
import { CHAPTERS, heroById, type HeroId } from '@/data/story';
import type { AreaDef, OutfitDef } from '@/data/world';
import { EV } from '@/config/events';
import { EventBus } from '@/core/EventBus';
import { Game } from '@/core/Game';
import { Platform } from '@/core/PlatformService';
import type { Scene } from '@/core/SceneManager';
import { ToastManager } from '@/core/ToastManager';
import { Ease, TweenManager } from '@/core/TweenManager';
import { GameState } from '@/managers/GameState';
import { TUTORIAL_DONE } from '@/managers/SaveManager';
import { playStory, playStorySequence } from '@/services/StoryService';
import { computeOffline, earn, rushOrderCooldownLeft, rushOrderReward, rushOrdersLeftToday } from '@/sim/actions';
import { skillUpgradeCost } from '@/sim/economy';
import { formatDuration, formatMoney } from '@/sim/format';
import type { ChapterDef } from '@/data/story';
import { nextGoal } from '@/sim/unlocks';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import { COLORS, makeText, roundRect } from '@/ui/theme';
import { fitCover, applyFit, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { HeroSheet } from './home/HeroSheet';
import { OutfitSheet } from './home/OutfitSheet';
import { ShopSheet } from './home/ShopSheet';
import { StorySheet } from './home/StorySheet';

const OFFLINE_MIN_SEC = 60;
const NAV_H = 132;

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private readonly _bg = new PIXI.Graphics();
  private readonly _bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _hudCard = new PIXI.Graphics();
  private readonly _figure = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _tapPill = new PIXI.Graphics();
  private readonly _netWorth = makeText('', 56, COLORS.roseDeep, true);
  private readonly _netWorthLabel = makeText('身价', 24, COLORS.inkSoft);
  private readonly _money = makeText('', 30, COLORS.ink, true);
  private readonly _income = makeText('', 24, COLORS.inkSoft);
  private readonly _goalLabel = makeText('', 22, COLORS.inkSoft);
  private readonly _goalBar = new ProgressBar(560, 16, COLORS.gold);
  private readonly _tapArea = new PIXI.Container();
  private readonly _tapLabel = makeText('点我做甜品', 28, COLORS.white, true);
  private readonly _floatLayer = new PIXI.Container();
  private readonly _skillBtn: Button;
  private readonly _boostBtn: Button;
  private readonly _rushBtn: Button;
  private readonly _nav = new PIXI.Container();
  private readonly _gm: Button | null = null;

  private readonly _shopSheet = new ShopSheet();
  private readonly _heroSheet = new HeroSheet();
  private readonly _storySheet = new StorySheet();
  private readonly _outfitSheet = new OutfitSheet();

  private _tickerBound = false;
  private _hudTimer = 0;
  private _busy = false;

  constructor() {
    this._netWorthLabel.anchor.set(0.5, 0);
    this._netWorth.anchor.set(0.5, 0);
    this._money.anchor.set(0.5, 0);
    this._income.anchor.set(0.5, 0);
    this._goalLabel.anchor.set(0.5, 0);
    this._tapLabel.anchor.set(0.5);

    this._buildTapArea();

    this._skillBtn = new Button({ width: 360, height: 96, label: '', sub: '', color: COLORS.rose, onTap: () => this._upgradeSkill() });
    this._boostBtn = new Button({ width: 150, height: 120, label: '直播带货', sub: '收益×2', color: COLORS.gold, fontSize: 26, onTap: () => this._liveBoost() });
    this._rushBtn = new Button({ width: 150, height: 120, label: '接急单', sub: '', color: COLORS.gold, fontSize: 26, onTap: () => this._rushOrder() });

    this._buildNav();

    this.container.addChild(
      this._bg, this._bgSprite, this._hudCard, this._netWorthLabel, this._netWorth, this._money, this._income,
      this._goalLabel, this._goalBar, this._tapArea, this._floatLayer,
      this._skillBtn, this._boostBtn, this._rushBtn, this._nav,
    );

    if (Platform.isDevtools) {
      this._gm = new Button({
        width: 96, height: 56, label: 'GM', color: COLORS.mask, fontSize: 24,
        onTap: () => {
          earn(GameState.save, Math.max(1e4, GameState.save.netWorth * 9));
          EventBus.emit(EV.moneyChanged);
          ToastManager.show('GM：身价 ×10');
        },
      });
      this._gm.alpha = 0.6;
      this.container.addChild(this._gm);
    }
  }

  onEnter(): void {
    this._applyOutfit();
    this._refreshHud();
    if (!this._tickerBound) {
      this._tickerBound = true;
      Game.ticker.add(() => this._update(Game.ticker.deltaMS / 1000));
      EventBus.on(EV.moneyChanged, () => this._shopSheet.refreshAffordable());
      EventBus.on(EV.saveChanged, () => this._applyOutfit());
      EventBus.on(EV.chapterUnlocked, (ch: ChapterDef) => this._onChapter(ch));
      EventBus.on(EV.areaUnlocked, (a: AreaDef) => ToastManager.show(`新城区开放：${a.name}`, 'success'));
      EventBus.on(EV.outfitUnlocked, (o: OutfitDef) => {
        GameState.setOutfit(o.id);
        ToastManager.show(`换上新造型：${o.name}`, 'success');
      });
      EventBus.on(EV.shopChanged, () => this._shopSheet.rebuild());
      EventBus.on(EV.heroChanged, (id: HeroId, met: boolean) => { if (met) this._onMeetHero(id); });
    }
    void this._enterFlow();
  }

  relayout(): void {
    const W = Game.logicWidth;
    const H = Game.logicHeight;
    const top = Game.safeTop;
    const bottom = H - Game.safeBottom;
    this._bg.clear().beginFill(COLORS.bg).drawRect(0, 0, W, H).endFill();
    if (isTextureReady(this._bgSprite.texture)) {
      applyFit(this._bgSprite, fitCover(this._bgSprite.texture.width, this._bgSprite.texture.height, W, H));
    }
    this._hudCard.clear().beginFill(COLORS.white, 0.82).drawRoundedRect(24, top - 12, W - 48, 262, 28).endFill();

    this._netWorthLabel.position.set(W / 2, top);
    this._netWorth.position.set(W / 2, top + 30);
    this._money.position.set(W / 2, top + 100);
    this._income.position.set(W / 2, top + 142);
    this._goalLabel.position.set(W / 2, top + 186);
    this._goalBar.position.set((W - 560) / 2, top + 220);

    const navTop = bottom - NAV_H;
    const midY = (top + 260 + navTop - 140) / 2;
    this._layoutFigure(top + 270, navTop - 140);
    this._boostBtn.position.set(96, midY - 80);
    this._rushBtn.position.set(W - 96, midY - 80);
    this._skillBtn.position.set(W / 2, navTop - 80);
    this._nav.position.set(0, navTop);
    this._gm?.position.set(W - 70, top + 20);
  }

  private _buildTapArea(): void {
    this._figure.anchor.set(0.5, 1);
    this._tapPill.beginFill(COLORS.roseDeep, 0.92).drawRoundedRect(-110, -28, 220, 56, 28).endFill();
    this._tapArea.addChild(this._figure, this._tapPill, this._tapLabel);
    this._tapArea.eventMode = 'static';
    this._tapArea.cursor = 'pointer';
    this._tapArea.on('pointerdown', (e: PIXI.FederatedPointerEvent) => this._onTap(e));
  }

  /** 立绘脚底贴 bottom，高度占满 top~bottom；贴图未就绪时只留按钮 */
  private _layoutFigure(top: number, bottom: number): void {
    const W = Game.logicWidth;
    const boxH = Math.max(320, bottom - top);
    this._tapArea.position.set(W / 2, bottom);
    let w = 360;
    let h = boxH;
    if (isTextureReady(this._figure.texture)) {
      const tex = this._figure.texture;
      const scale = Math.min(boxH / tex.height, (W - 340) / tex.width);
      this._figure.scale.set(scale);
      w = tex.width * scale;
      h = tex.height * scale;
    }
    this._tapPill.position.set(0, -24);
    this._tapLabel.position.set(0, -24);
    this._tapArea.hitArea = new PIXI.Rectangle(-Math.max(w, 240) / 2, -h, Math.max(w, 240), h + 20);
  }

  private _applyOutfit(): void {
    const id = GameState.save.outfit;
    const bgPath = outfitScenePath(id);
    const figPath = outfitFigurePath(id);
    this._bgSprite.texture = gameTexture(bgPath);
    this._figure.texture = gameTexture(figPath);
    whenTextureReady(bgPath, () => this.relayout());
    whenTextureReady(figPath, () => this.relayout());
    this.relayout();
  }

  private _buildNav(): void {
    const W = Game.logicWidth;
    this._nav.addChild(roundRect(W, NAV_H + 200, 0, COLORS.card));
    const items: [string, () => void][] = [
      ['产业', () => this._shopSheet.open()],
      ['男主', () => this._heroSheet.open()],
      ['剧情', () => this._storySheet.open()],
      ['衣橱', () => this._outfitSheet.open()],
    ];
    const w = W / items.length;
    items.forEach(([label, open], i) => {
      const btn = new Button({ width: w - 24, height: 96, label, color: COLORS.roseDeep, fontSize: 30, onTap: open });
      btn.position.set(w * i + w / 2, NAV_H / 2);
      this._nav.addChild(btn);
    });
  }

  private _onTap(e: PIXI.FederatedPointerEvent): void {
    const amount = GameState.tap();
    Platform.vibrateShort('light');
    TweenManager.cancelTarget(this._tapArea.scale);
    this._tapArea.scale.set(0.95);
    TweenManager.to({ target: this._tapArea.scale, props: { x: 1, y: 1 }, duration: 0.15, ease: Ease.easeOutBack });

    const p = this._floatLayer.toLocal(e.global);
    const label = makeText(`+${formatMoney(amount)}`, GameState.comboActive ? 40 : 32, GameState.comboActive ? COLORS.roseDeep : COLORS.gold, true);
    label.anchor.set(0.5);
    label.position.set(p.x, p.y - 30);
    this._floatLayer.addChild(label);
    TweenManager.to({
      target: label,
      props: { y: label.y - 120, alpha: 0 },
      duration: 0.8,
      ease: Ease.easeOutQuad,
      onComplete: () => label.destroy(),
    });
    this._refreshHud();
  }

  private _upgradeSkill(): void {
    if (!GameState.upgradeSkill()) ToastManager.show('钱还不够');
    this._refreshHud();
  }

  private _liveBoost(): void {
    Platform.showRewardedVideo('liveBoost', () => {
      GameState.startLiveBoost();
      ToastManager.show(`直播开始！收益 ×${BALANCE.liveBoostMultiplier}`, 'success');
    });
  }

  private _rushOrder(): void {
    const now = Date.now();
    if (rushOrdersLeftToday(GameState.save, now) <= 0) {
      ToastManager.show('今天的急单接完了');
      return;
    }
    if (rushOrderCooldownLeft(GameState.save, now) > 0) {
      ToastManager.show('急单还在路上');
      return;
    }
    Platform.showRewardedVideo('rushOrder', () => {
      const amount = GameState.claimRushOrder();
      ToastManager.show(`急单完成 +${formatMoney(amount)}`, 'success');
    });
  }

  private _update(dt: number): void {
    if (!this.container.visible || !this.container.parent) return;
    this._hudTimer += dt;
    if (this._hudTimer >= 0.2) {
      this._hudTimer = 0;
      this._refreshHud();
    }
  }

  private _refreshHud(): void {
    const save = GameState.save;
    const now = Date.now();
    this._netWorth.text = formatMoney(save.netWorth);
    this._money.text = `¥ ${formatMoney(save.money)}`;
    const boostLeft = (save.boostUntil - now) / 1000;
    this._income.text = `每秒 +${formatMoney(GameState.incomePerSec)}${boostLeft > 0 ? `（直播中 ${formatDuration(boostLeft)}）` : ''}`;

    const goal = nextGoal(save);
    this._goalLabel.text = goal ? `下一章：${goal.label}  ${formatMoney(save.netWorth)} / ${formatMoney(goal.target)}` : '全部章节已解锁';
    this._goalBar.progress = goal ? goal.progress : 1;

    const cost = skillUpgradeCost(save.skillLevel);
    this._skillBtn.setLabel(`手艺 Lv.${save.skillLevel}`, `升级 ¥${formatMoney(cost)}`);
    this._skillBtn.setEnabled(save.money >= cost);

    const cd = rushOrderCooldownLeft(save, now);
    this._rushBtn.setLabel('接急单', cd > 0 ? formatDuration(cd) : `+${formatMoney(rushOrderReward(save))}`);
    this._rushBtn.setEnabled(cd <= 0 && rushOrdersLeftToday(save, now) > 0);
    this._boostBtn.setLabel('直播带货', boostLeft > 0 ? '续播 +10分' : '收益×2');
  }

  /** 首次进入播序章；之后检查离线收益 */
  private async _enterFlow(): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    try {
      const save = GameState.save;
      if (save.tutorialStep === 0) {
        await playStorySequence(CHAPTERS[0].videos);
        GameState.setTutorialStep(1);
        ToastManager.show('点击中间的按钮，摆摊赚第一桶金', 'success');
        return;
      }
      await this._offlinePopup();
    } finally {
      this._busy = false;
    }
  }

  private async _offlinePopup(): Promise<void> {
    const off = computeOffline(GameState.save, Date.now());
    if (off.seconds < OFFLINE_MIN_SEC || off.amount <= 0) {
      GameState.flush();
      return;
    }
    const double = await Platform.showModal({
      title: '离线收益',
      content: `你离开的 ${formatDuration(off.seconds)} 里，店里赚了 ¥${formatMoney(off.amount)}`,
      confirmText: '看广告翻倍',
      cancelText: '直接领取',
    });
    if (!double) {
      GameState.claimOffline(1);
      return;
    }
    let rewarded = false;
    await new Promise<void>((resolve) => {
      Platform.showRewardedVideo('offlineDouble', () => { rewarded = true; }, resolve);
    });
    const got = GameState.claimOffline(rewarded ? 2 : 1);
    ToastManager.show(`领取 ¥${formatMoney(got)}`, 'success');
  }

  private _onChapter(ch: ChapterDef): void {
    if (GameState.save.tutorialStep < TUTORIAL_DONE && ch.id >= 1) GameState.setTutorialStep(TUTORIAL_DONE);
    void Platform.showModal({
      title: `第 ${ch.id} 章解锁`,
      content: `「${ch.title}」剧情已更新，现在观看吗？`,
      confirmText: '去看',
      cancelText: '稍后',
    }).then((ok) => { if (ok) void playStorySequence(ch.videos); });
  }

  private _onMeetHero(id: HeroId): void {
    const hero = heroById(id);
    ToastManager.show(`遇见了${hero.name}`, 'success');
    void playStory(hero.bondVideos[0]);
  }
}
