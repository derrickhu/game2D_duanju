/**
 * 主界面：顶部身价 / 钱 / 每秒收益，中间是当前造型的女主立绘（点她赚钱），
 * 背景随造型切换，两侧广告加速，主线任务卡片在右下，底部五个面板入口。布局按 750 设计宽。
 */
import * as PIXI from 'pixi.js';
import { ICONS, outfitFigurePath, outfitScenePath } from '@/data/art';
import { BALANCE } from '@/data/balance';
import { CHAPTERS, heroById, type HeroId } from '@/data/story';
import type { AreaDef, OutfitDef } from '@/data/world';
import { EV } from '@/config/events';
import { AudioManager } from '@/core/AudioManager';
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
import { IconButton } from '@/ui/IconButton';
import { ProgressBar } from '@/ui/ProgressBar';
import { COLORS, drawGlass, makeNumText, makeText } from '@/ui/theme';
import { fitCover, applyFit, gameTexture, isTextureReady, whenTextureReady } from '@/utils/assets';
import { HeroSheet } from './home/HeroSheet';
import { OutfitSheet } from './home/OutfitSheet';
import { ShopMap } from './home/ShopMap';
import { StaffSheet, staffHasAffordable } from './home/StaffSheet';
import { StorySheet } from './home/StorySheet';

const OFFLINE_MIN_SEC = 60;
const NAV_H = 120;
const HUD_H = 168;
const GOAL_BAR_INSET = 56;
const QUEST_W = 292;
const QUEST_H = 152;

export class HomeScene implements Scene {
  readonly name = 'home';
  readonly container = new PIXI.Container();

  private readonly _bg = new PIXI.Graphics();
  private readonly _bgSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _hudCard = new PIXI.Graphics();
  private readonly _figure = new PIXI.Sprite(PIXI.Texture.EMPTY);
  private readonly _tapPill = new PIXI.Graphics();
  private readonly _netWorth = makeNumText('', 56);
  private readonly _netWorthLabel = makeText('身价', 20, COLORS.textOnGlassSoft);
  private readonly _money = makeText('', 30, COLORS.textOnGlass, true);
  private readonly _income = makeText('', 22, COLORS.textOnGlassSoft);
  private readonly _goalLabel = makeText('', 20, COLORS.textOnGlassSoft);
  private readonly _goalBar = new ProgressBar(Game.logicWidth - GOAL_BAR_INSET * 2, 6, COLORS.champagne, COLORS.white, 0.18);
  private readonly _tapArea = new PIXI.Container();
  private readonly _tapLabel = makeText('点我做甜品', 26, COLORS.champagne, true);
  private readonly _floatLayer = new PIXI.Container();
  private readonly _skillBtn: Button;
  private readonly _boostBtn: IconButton;
  private readonly _rushBtn: IconButton;
  private readonly _nav = new PIXI.Container();
  private readonly _gm: Button | null = null;

  private readonly _shopSheet = new ShopMap();
  private readonly _heroSheet = new HeroSheet();
  private readonly _storySheet = new StorySheet();
  private readonly _outfitSheet = new OutfitSheet();
  private readonly _staffSheet = new StaffSheet();
  private readonly _staffDot = new PIXI.Graphics();

  private readonly _quest = new PIXI.Container();
  private readonly _questBg = new PIXI.Graphics();
  private readonly _questTag = makeText('任务', 20, COLORS.glass, true);
  private readonly _questTitle = makeText('', 24, COLORS.textOnGlass, true);
  private readonly _questInfo = makeText('', 20, COLORS.champagne);
  private readonly _questBtn: Button;

  private _tickerBound = false;
  private _hudTimer = 0;
  private _busy = false;

  constructor() {
    this._money.anchor.set(1, 0);
    this._income.anchor.set(1, 0);
    this._tapLabel.anchor.set(0.5);

    this._buildTapArea();

    this._skillBtn = new Button({ width: 380, height: 84, label: '', sub: '', variant: 'glass', fontSize: 28, onTap: () => this._upgradeSkill() });
    this._boostBtn = new IconButton({ icon: ICONS.live, label: '直播带货', sub: '收益×2', size: 96, onTap: () => this._liveBoost() });
    this._rushBtn = new IconButton({ icon: ICONS.gift, label: '接急单', sub: '', size: 96, onTap: () => this._rushOrder() });

    this._questBtn = new Button({ width: 220, height: 46, label: '领取', variant: 'gold', fontSize: 24, onTap: () => this._claimQuest() });
    this._buildQuest();
    this._buildNav();

    this.container.addChild(
      this._bg, this._bgSprite, this._hudCard, this._netWorthLabel, this._netWorth, this._money, this._income,
      this._goalLabel, this._goalBar, this._tapArea, this._floatLayer, this._quest,
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
      EventBus.on(EV.moneyChanged, () => {
        this._shopSheet.refreshAffordable();
        this._staffSheet.refreshAffordable();
      });
      EventBus.on(EV.saveChanged, () => this._applyOutfit());
      EventBus.on(EV.chapterUnlocked, (ch: ChapterDef) => this._onChapter(ch));
      EventBus.on(EV.areaUnlocked, (a: AreaDef) => {
        AudioManager.play('level_up');
        ToastManager.show(`新城区开放：${a.name}`, 'success');
      });
      EventBus.on(EV.outfitUnlocked, (o: OutfitDef) => {
        AudioManager.play('item_reveal');
        GameState.setOutfit(o.id);
        ToastManager.show(`换上新造型：${o.name}`, 'success');
      });
      EventBus.on(EV.shopChanged, () => {
        this._shopSheet.rebuild();
        this._staffSheet.rebuild();
      });
      EventBus.on(EV.staffChanged, () => this._shopSheet.rebuild());
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
    const hudY = top - 8;
    drawGlass(this._hudCard.clear(), 24, hudY, W - 48, HUD_H, 28);
    this._netWorthLabel.position.set(GOAL_BAR_INSET, hudY + 18);
    this._netWorth.position.set(GOAL_BAR_INSET - 2, hudY + 40);
    this._money.position.set(W - GOAL_BAR_INSET, hudY + 26);
    this._income.position.set(W - GOAL_BAR_INSET, hudY + 68);
    this._goalLabel.position.set(GOAL_BAR_INSET, hudY + 114);
    this._goalBar.position.set(GOAL_BAR_INSET, hudY + 146);

    const hudBottom = hudY + HUD_H;
    const navTop = bottom - NAV_H - 16;
    const skillY = navTop - 62;
    // 贴在点按提示上方、靠右，避开顶部信息条和正中的手艺按钮
    const tapPillTop = skillY - 116;
    this._quest.position.set(W - 20 - QUEST_W, tapPillTop - 12 - QUEST_H);
    this._layoutFigure(hudBottom + 8, skillY - 52);
    const sideY = hudBottom + (skillY - hudBottom) * 0.42;
    this._boostBtn.position.set(80, sideY);
    this._rushBtn.position.set(W - 80, sideY);
    this._skillBtn.position.set(W / 2, skillY);
    this._nav.position.set(0, navTop);
    this._gm?.position.set(W - 80, hudBottom + 260);
  }

  private _buildTapArea(): void {
    this._figure.anchor.set(0.5, 1);
    drawGlass(this._tapPill, -110, -28, 220, 56, 28, 0.58);
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
      const scale = Math.min(boxH / tex.height, (W - 300) / tex.width);
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
    this._nav.addChild(drawGlass(new PIXI.Graphics(), 24, 0, W - 48, NAV_H, NAV_H / 2, 0.58));
    const items: [string, string, () => void][] = [
      [ICONS.shop, '产业', () => this._shopSheet.open()],
      [ICONS.rose, '男主', () => this._heroSheet.open()],
      [ICONS.staff, '店员', () => this._staffSheet.open()],
      [ICONS.story, '剧情', () => this._storySheet.open()],
      [ICONS.wardrobe, '衣橱', () => this._outfitSheet.open()],
    ];
    const w = (W - 48) / items.length;
    items.forEach(([icon, label, open], i) => {
      const btn = new IconButton({ icon, label, size: 80, plate: false, onTap: open });
      btn.position.set(24 + w * i + w / 2, NAV_H / 2 - 12);
      this._nav.addChild(btn);
      if (label === '店员') {
        this._staffDot.beginFill(COLORS.rose).drawCircle(0, 0, 8).endFill();
        this._staffDot.position.set(btn.x + 26, btn.y - 26);
        this._staffDot.visible = false;
        this._nav.addChild(this._staffDot);
      }
      if (i > 0) {
        const sep = new PIXI.Graphics().beginFill(COLORS.champagne, 0.25).drawRect(24 + w * i, 30, 1, NAV_H - 60).endFill();
        this._nav.addChild(sep);
      }
    });
  }

  private _buildQuest(): void {
    drawGlass(this._questBg, 0, 0, QUEST_W, QUEST_H, 28, 0.72);
    const tagBg = new PIXI.Graphics().beginFill(COLORS.champagne).drawRoundedRect(16, 14, 72, 32, 16).endFill();
    this._questTag.anchor.set(0.5);
    this._questTag.position.set(52, 30);
    this._questTitle.anchor.set(0, 0.5);
    this._questTitle.position.set(16, 68);
    this._questInfo.anchor.set(0, 0.5);
    this._questInfo.position.set(16, 116);
    this._questBtn.position.set(QUEST_W / 2, 116);
    this._quest.addChild(this._questBg, tagBg, this._questTag, this._questTitle, this._questInfo, this._questBtn);
    this._quest.eventMode = 'static';
    this._quest.hitArea = new PIXI.Rectangle(0, 0, QUEST_W, QUEST_H);
  }

  private _fitLine(text: PIXI.Text, maxW: number): void {
    text.scale.set(1);
    if (text.width > maxW) text.scale.set(maxW / text.width);
  }

  private _refreshQuest(): void {
    const q = GameState.quest;
    this._quest.visible = !!q;
    if (!q) return;
    this._questTitle.text = q.quest.title;
    this._fitLine(this._questTitle, QUEST_W - 32);
    this._questBtn.visible = q.done;
    this._questInfo.visible = !q.done;
    this._questInfo.text = `${formatMoney(q.current)}/${formatMoney(q.target)}  ·  奖励 ¥${formatMoney(q.reward)}`;
    this._fitLine(this._questInfo, QUEST_W - 32);
  }

  private _claimQuest(): void {
    const got = GameState.claimQuest();
    if (got <= 0) return;
    AudioManager.play('coin_gain');
    ToastManager.show(`任务完成 +¥${formatMoney(got)}`, 'success');
    this._refreshHud();
  }

  private _onTap(e: PIXI.FederatedPointerEvent): void {
    const amount = GameState.tap();
    AudioManager.play('coin_tap');
    Platform.vibrateShort('light');
    TweenManager.cancelTarget(this._tapArea.scale);
    this._tapArea.scale.set(0.95);
    TweenManager.to({ target: this._tapArea.scale, props: { x: 1, y: 1 }, duration: 0.15, ease: Ease.easeOutBack });

    const p = this._floatLayer.toLocal(e.global);
    const label = makeNumText(`+${formatMoney(amount)}`, GameState.comboActive ? 44 : 36, GameState.comboActive ? COLORS.white : COLORS.champagne);
    label.style.dropShadow = true;
    label.style.dropShadowColor = COLORS.glass;
    label.style.dropShadowBlur = 6;
    label.style.dropShadowDistance = 0;
    label.style.dropShadowAlpha = 0.9;
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
    if (GameState.upgradeSkill()) AudioManager.play('upgrade');
    else ToastManager.show('钱还不够');
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
      AudioManager.play('coin_gain');
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
    this._income.text = `${boostLeft > 0 ? `直播中 ${formatDuration(boostLeft)} · ` : ''}每秒 +${formatMoney(GameState.incomePerSec)}`;

    const goal = nextGoal(save);
    this._goalLabel.text = goal ? `下一章 · ${goal.label}    ${formatMoney(save.netWorth)} / ${formatMoney(goal.target)}` : '全部章节已解锁';
    this._goalBar.progress = goal ? goal.progress : 1;

    const cost = skillUpgradeCost(save.skillLevel);
    this._skillBtn.setLabel(`手艺 Lv.${save.skillLevel}`, `升级  ¥ ${formatMoney(cost)}`);
    this._skillBtn.setEnabled(save.money >= cost);

    const cd = rushOrderCooldownLeft(save, now);
    this._rushBtn.setLabel('接急单', cd > 0 ? formatDuration(cd) : `+${formatMoney(rushOrderReward(save))}`);
    this._rushBtn.setEnabled(cd <= 0 && rushOrdersLeftToday(save, now) > 0);
    this._boostBtn.setLabel('直播带货', boostLeft > 0 ? '续播 +10分' : '收益×2');
    this._refreshQuest();
    this._staffDot.visible = staffHasAffordable();
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
      AudioManager.play('coin_gain');
      return;
    }
    let rewarded = false;
    await new Promise<void>((resolve) => {
      Platform.showRewardedVideo('offlineDouble', () => { rewarded = true; }, resolve);
    });
    const got = GameState.claimOffline(rewarded ? 2 : 1);
    AudioManager.play('coin_gain');
    ToastManager.show(`领取 ¥${formatMoney(got)}`, 'success');
  }

  private _onChapter(ch: ChapterDef): void {
    if (GameState.save.tutorialStep < TUTORIAL_DONE && ch.id >= 1) GameState.setTutorialStep(TUTORIAL_DONE);
    AudioManager.play('chapter_unlock');
    void Platform.showModal({
      title: `第 ${ch.id} 章解锁`,
      content: `「${ch.title}」剧情已更新，现在观看吗？`,
      confirmText: '去看',
      cancelText: '稍后',
    }).then((ok) => { if (ok) void playStorySequence(ch.videos); });
  }

  private _onMeetHero(id: HeroId): void {
    const hero = heroById(id);
    AudioManager.play('meet_hero');
    ToastManager.show(`遇见了${hero.name}`, 'success');
    void playStory(hero.bondVideos[0]);
  }
}
